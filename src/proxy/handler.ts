import type { NormalizedProxyConfig, ProtocolAuth } from '../config/types.js';
import { ErrorCode, createErrorResponse } from '../config/errors.js';
import { getAdapter } from '../protocols/registry.js';
import { createStreamingResponse } from '../streaming/pipeline.js';
import { resolveModel } from './model-map.js';
import { signRequest } from '../protocols/bedrock/sigv4.js';
import { getEffectiveAuth } from './key-rotation.js';
import { withRetry } from './retry.js';
import { buildPassthroughUrl, decideRoute } from './endpoints.js';

export async function handleProxyRequest(
  request: Request,
  config: NormalizedProxyConfig,
  upstreamPath: string
): Promise<Response> {
  const route = decideRoute(config, upstreamPath);
  if (route.action === 'reject') {
    return createErrorResponse(ErrorCode.UNSUPPORTED_ENDPOINT, route.message, undefined, {
      provider: config.provider,
      endpointGroup: route.endpointGroup,
      requestId: crypto.randomUUID(),
      docsUrl: route.docsUrl,
    });
  }

  if (route.action === 'passthrough') {
    return handlePassthroughRequest(request, config, upstreamPath, route.endpointGroup);
  }

  const sourceAdapter = getAdapter(config.sourceProtocol);
  const targetAdapter = getAdapter(config.targetProtocol);

  // Apply key rotation: select effective auth from keys array if configured
  const effectiveAuth = getEffectiveAuth(config.auth);

  // Parse incoming request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(ErrorCode.INVALID_JSON, 'Invalid JSON body');
  }

  // Translate to canonical format
  const canonical = await sourceAdapter.parseRequest(body, request.headers, upstreamPath);

  // Apply model mapping (with wildcard support)
  canonical.model = resolveModel(canonical.model, config.targetProtocol, config.modelMap, config.forceModel);

  // Serialize to target format with effective auth
  const serialized = await targetAdapter.serializeRequest(canonical, { ...config, auth: effectiveAuth });

  // Handle Bedrock SigV4 signing (special case: signing requires async crypto)
  if (config.targetProtocol === 'bedrock') {
    const bedrockAuthStr = serialized.headers['__bedrock_auth__'];
    if (bedrockAuthStr) {
      delete serialized.headers['__bedrock_auth__'];
      const bedrockAuth = JSON.parse(bedrockAuthStr) as { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region: string };
      const bodyStr = JSON.stringify(serialized.body);
      const url = new URL(serialized.url);
      const signedHeaders = await signRequest('POST', url, serialized.headers, bodyStr, {
        ...bedrockAuth,
        service: 'bedrock-runtime',
      });
      Object.assign(serialized.headers, signedHeaders);
    }
  }

  // Forward to upstream with retry
  let upstreamResponse: Response;
  try {
    upstreamResponse = await withRetry(() =>
      fetch(serialized.url, {
        method: 'POST',
        headers: serialized.headers,
        body: JSON.stringify(serialized.body),
      })
    );
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === ErrorCode.RETRY_EXHAUSTED) {
      throw err; // Re-throw to be caught by index.ts
    }
    throw new Error(err instanceof Error ? err.message : 'Upstream request failed');
  }

  if (!upstreamResponse.ok) {
    const errBody = await upstreamResponse.text();
    if (upstreamResponse.status === 429) {
      const retryAfter = upstreamResponse.headers.get('Retry-After');
      return createErrorResponse(
        ErrorCode.RATE_LIMITED,
        `Upstream rate limited: ${errBody}`,
        retryAfter ? parseInt(retryAfter, 10) : undefined,
      );
    }
    return createErrorResponse(ErrorCode.UPSTREAM_ERROR, `Upstream error ${upstreamResponse.status}: ${errBody}`);
  }

  // Handle streaming
  if (canonical.stream && upstreamResponse.body) {
    const messageId = `msg_${crypto.randomUUID().replace(/-/g, '')}`;
    const contentType = config.sourceProtocol === 'anthropic'
      ? 'text/event-stream'
      : config.sourceProtocol === 'ollama'
        ? 'application/x-ndjson'
        : 'text/event-stream';

    return createStreamingResponse(
      upstreamResponse.body,
      targetAdapter.createInboundStreamTransformer(),
      sourceAdapter.createOutboundStreamTransformer(canonical.model, messageId),
      contentType
    );
  }

  // Non-streaming: parse and re-serialize
  const upstreamBody = await upstreamResponse.json();
  const canonicalResponse = await targetAdapter.parseResponse(upstreamBody, upstreamResponse.status);

  // Preserve the model name the client requested
  canonicalResponse.model = canonical.model;

  return sourceAdapter.serializeResponse(canonicalResponse);
}

async function handlePassthroughRequest(
  request: Request,
  config: NormalizedProxyConfig,
  upstreamPath: string,
  endpointGroup: string,
): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = buildPassthroughUrl(config, upstreamPath, url.search);
  const effectiveAuth = getEffectiveAuth(config.auth);
  const headers = buildPassthroughHeaders(request.headers, effectiveAuth, config.targetProtocol);
  const init: RequestInit = { method: request.method, headers };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (effectiveAuth.type === 'aws') {
      const body = await request.text();
      const signed = await signRequest('POST', new URL(targetUrl), headers, body, {
        accessKeyId: effectiveAuth.accessKeyId,
        secretAccessKey: effectiveAuth.secretAccessKey,
        sessionToken: effectiveAuth.sessionToken,
        region: effectiveAuth.region,
        service: 'bedrock-runtime',
      });
      Object.assign(headers, signed);
      init.body = body;
    } else {
      init.body = request.body;
    }
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await withRetry(() => fetch(targetUrl, init));
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === ErrorCode.RETRY_EXHAUSTED) throw err;
    throw new Error(err instanceof Error ? err.message : 'Upstream passthrough request failed');
  }

  if (!upstreamResponse.ok) {
    const errBody = await upstreamResponse.text();
    if (upstreamResponse.status === 429) {
      const retryAfter = upstreamResponse.headers.get('Retry-After');
      return createErrorResponse(ErrorCode.RATE_LIMITED, `Upstream rate limited: ${errBody}`, retryAfter ? parseInt(retryAfter, 10) : undefined, {
        provider: config.provider,
        endpointGroup,
        requestId: crypto.randomUUID(),
      });
    }
    return createErrorResponse(ErrorCode.UPSTREAM_ERROR, `Upstream error ${upstreamResponse.status}: ${errBody}`, undefined, {
      provider: config.provider,
      endpointGroup,
      requestId: crypto.randomUUID(),
    });
  }

  return upstreamResponse;
}

function buildPassthroughHeaders(incoming: Headers, auth: ProtocolAuth, targetProtocol: string): Record<string, string> {
  const headers: Record<string, string> = {};
  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (['host', 'content-length', 'authorization', 'x-api-key', 'api-key', 'x-goog-api-key'].includes(lower)) return;
    headers[key] = value;
  });

  if (auth.type === 'bearer') {
    if (targetProtocol === 'gemini') headers['x-goog-api-key'] = auth.token;
    else headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'x-api-key') {
    headers['x-api-key'] = auth.key;
    if (targetProtocol === 'anthropic' && !headers['anthropic-version']) headers['anthropic-version'] = '2023-06-01';
  } else if (auth.type === 'azure') {
    headers['api-key'] = auth.apiKey;
  }

  return headers;
}
