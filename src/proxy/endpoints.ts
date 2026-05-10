import { getProviderPreset, type EndpointGroup } from '../config/catalog.js';
import type { NormalizedProxyConfig, ProtocolId } from '../config/types.js';

export type RouteDecision =
  | { action: 'translate'; endpointGroup: EndpointGroup }
  | { action: 'passthrough'; endpointGroup: EndpointGroup; reason: string }
  | { action: 'reject'; endpointGroup: EndpointGroup; message: string; docsUrl?: string };

const OPENAI_COMPATIBLE_PROTOCOLS = new Set<ProtocolId>(['openai', 'mistral']);

export function detectEndpointGroup(path: string): EndpointGroup {
  if (
    path.endsWith('/chat/completions') ||
    path === '/v1/messages' ||
    path === '/api/chat' ||
    path === '/v2/chat' ||
    /\/models\/[^/]+:(streamGenerateContent|generateContent)/.test(path) ||
    /\/model\/[^/]+\/invoke/.test(path)
  ) return 'chat';

  if (path === '/v1/responses' || path.startsWith('/v1/responses/')) return 'responses';
  if (path.endsWith('/models') || path.includes('/models/')) return 'models';
  if (path.endsWith('/embeddings') || path.includes(':embedContent') || path.includes(':batchEmbedContents')) return 'embeddings';
  if (path.includes(':countTokens') || path.endsWith('/tokens') || path.includes('/tokenize') || path.includes('/detokenize')) return 'tokenCount';
  if (path.includes('/files')) return 'files';
  if (path.includes('/uploads')) return 'uploads';
  if (path.includes('/batches')) return 'batches';
  if (path.includes('/moderations')) return 'moderations';
  if (path.includes('/images')) return 'images';
  if (path.includes('/audio')) return 'audio';
  if (path.includes('/videos') || path.includes('/video')) return 'video';
  if (path.includes('/fine_tuning') || path.includes('/fine-tuning') || path.includes('/fine_tunes')) return 'fineTuning';
  if (path.includes('/vector_stores') || path.includes('/vector-stores')) return 'vectorStores';

  return 'unknown';
}

export function decideRoute(config: NormalizedProxyConfig, upstreamPath: string): RouteDecision {
  const endpointGroup = detectEndpointGroup(upstreamPath);
  const provider = getProviderPreset(config.provider);
  const support = provider?.endpointSupport[endpointGroup] ?? 'unsupported';

  if (endpointGroup === 'chat') {
    if (config.endpoints.mode === 'passthrough') {
      return canPassthrough(config)
        ? { action: 'passthrough', endpointGroup, reason: 'Endpoint mode is passthrough and protocols are wire-compatible.' }
        : unsupportedPassthrough(config, endpointGroup, provider?.docsUrl);
    }
    return { action: 'translate', endpointGroup };
  }

  if (config.endpoints.mode === 'translate') {
    return {
      action: 'reject',
      endpointGroup,
      message: `${endpointGroup} is not safely translatable between ${config.sourceProtocol} and ${config.targetProtocol}. Use auto or passthrough mode with wire-compatible protocols.`,
      docsUrl: provider?.docsUrl,
    };
  }

  if (support === 'unsupported') {
    return {
      action: 'reject',
      endpointGroup,
      message: `${provider?.name ?? config.provider} does not advertise support for the ${endpointGroup} endpoint group in this bridge catalog.`,
      docsUrl: provider?.docsUrl,
    };
  }

  if (!canPassthrough(config)) {
    return unsupportedPassthrough(config, endpointGroup, provider?.docsUrl);
  }

  return { action: 'passthrough', endpointGroup, reason: `${endpointGroup} uses provider-native wire format.` };
}

export function canPassthrough(config: NormalizedProxyConfig): boolean {
  if (config.sourceProtocol === config.targetProtocol) return true;
  return OPENAI_COMPATIBLE_PROTOCOLS.has(config.sourceProtocol) && OPENAI_COMPATIBLE_PROTOCOLS.has(config.targetProtocol);
}

export function buildPassthroughUrl(config: NormalizedProxyConfig, upstreamPath: string, search: string): string {
  const base = config.targetBaseUrl.replace(/\/+$/, '');
  const path = normalizePassthroughPath(config, upstreamPath);
  return `${base}${path}${search}`;
}

function normalizePassthroughPath(config: NormalizedProxyConfig, upstreamPath: string): string {
  if (OPENAI_COMPATIBLE_PROTOCOLS.has(config.targetProtocol) && upstreamPath.startsWith('/v1/')) {
    return stripVersionIfBaseHasVersion(config.targetBaseUrl, upstreamPath);
  }
  return upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
}

function stripVersionIfBaseHasVersion(baseUrl: string, path: string): string {
  if (/\/v\d+\/?$/.test(baseUrl)) return path.replace(/^\/v\d+/, '');
  return path;
}

function unsupportedPassthrough(config: NormalizedProxyConfig, endpointGroup: EndpointGroup, docsUrl?: string): RouteDecision {
  return {
    action: 'reject',
    endpointGroup,
    message: `${endpointGroup} requires native passthrough, but source protocol ${config.sourceProtocol} is not wire-compatible with target protocol ${config.targetProtocol}.`,
    docsUrl,
  };
}
