import type { Env } from '../config/types.js';
import type { ProxyConfigInput } from '../config/types.js';
import { PROVIDER_PRESETS, PROTOCOL_INFO } from '../config/catalog.js';
import { encryptConfig } from '../config/crypto.js';
import { ErrorCode, createErrorResponse } from '../config/errors.js';
import { generateConfigSnippets } from './config-generator.js';
import { getUITemplate } from './template.js';

export async function handleUIRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/') {
    if (env.ASSETS) return env.ASSETS.fetch(request);
    const workerUrl = `${url.protocol}//${url.host}`;
    return new Response(getUITemplate(workerUrl), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/generate-url') {
    return handleGenerateUrl(request, env);
  }

  if (request.method === 'GET' && url.pathname === '/api/protocols') {
    return new Response(JSON.stringify(PROTOCOL_INFO), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/catalog') {
    return new Response(JSON.stringify({ providers: PROVIDER_PRESETS, protocols: PROTOCOL_INFO.protocols }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleGenerateUrl(request: Request, env: Env): Promise<Response> {
  let config: ProxyConfigInput;
  try {
    config = await request.json() as ProxyConfigInput;
  } catch {
    return createErrorResponse(ErrorCode.INVALID_JSON, 'Invalid JSON');
  }

  const validationError = validateConfig(config);
  if (validationError) return createErrorResponse(ErrorCode.INVALID_JSON, validationError);

  // Remove trailing slash from base URL
  if (config.version === 2) config.target.baseUrl = config.target.baseUrl.replace(/\/$/, '');
  else config.targetBaseUrl = config.targetBaseUrl.replace(/\/$/, '');

  const token = await encryptConfig(config, env.WORKER_SECRET);
  const workerUrl = new URL(request.url);
  const proxyUrl = `${workerUrl.protocol}//${workerUrl.host}/proxy/${token}`;

  const snippets = generateConfigSnippets(proxyUrl, config);

  return new Response(JSON.stringify({ proxyUrl, snippets }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateConfig(config: ProxyConfigInput): string | null {
  if (config.version === 2) {
    if (!config.source?.protocol) return 'source.protocol is required';
    if (!config.target?.protocol) return 'target.protocol is required';
    if (!config.target?.provider) return 'target.provider is required';
    if (!config.target?.baseUrl) return 'target.baseUrl is required';
    if (!config.target?.auth) return 'target.auth is required';
    if (!config.model?.mode) return 'model.mode is required';
    if (!config.endpoints?.mode) return 'endpoints.mode is required';
    return null;
  }

  if (!config.targetBaseUrl) return 'targetBaseUrl is required';
  if (!config.sourceProtocol) return 'sourceProtocol is required';
  if (!config.targetProtocol) return 'targetProtocol is required';
  return null;
}
