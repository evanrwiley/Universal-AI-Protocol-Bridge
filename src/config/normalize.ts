import { getDefaultProviderForProtocol, getProviderPreset } from './catalog.js';
import type { NormalizedProxyConfig, ProtocolAuth, ProxyConfig, ProxyConfigInput, ProxyConfigV2 } from './types.js';

const DEFAULT_MODEL_CONFIG = {
  mode: 'passThrough' as const,
  stripClientSuffix: true,
};

export function normalizeProxyConfig(input: ProxyConfigInput): NormalizedProxyConfig {
  if ((input as ProxyConfigV2).version === 2) {
    return normalizeV2(input as ProxyConfigV2);
  }
  return normalizeV1(input as ProxyConfig);
}

function normalizeV1(config: ProxyConfig): NormalizedProxyConfig {
  const provider = getDefaultProviderForProtocol(config.targetProtocol);
  const sourceProvider = getDefaultProviderForProtocol(config.sourceProtocol);
  return {
    ...config,
    provider: provider.id,
    sourceProvider: sourceProvider.id,
    model: {
      mode: config.forceModel ? 'force' : config.modelMap ? 'map' : 'passThrough',
      map: config.modelMap,
      force: config.forceModel,
      stripClientSuffix: true,
    },
    endpoints: { mode: 'auto' },
  };
}

function normalizeV2(config: ProxyConfigV2): NormalizedProxyConfig {
  const targetProvider = getProviderPreset(config.target.provider);
  const apiVersion = config.target.apiVersion;
  const auth = withTargetAuthDefaults(config.target.auth, apiVersion);

  return {
    version: 1,
    sourceProtocol: config.source.protocol,
    targetProtocol: config.target.protocol,
    targetBaseUrl: config.target.baseUrl,
    auth,
    modelMap: config.model.mode === 'map' ? config.model.map : undefined,
    forceModel: config.model.mode === 'force' ? config.model.force : undefined,
    provider: config.target.provider,
    sourceProvider: config.source.provider,
    model: {
      mode: config.model.mode,
      map: config.model.map,
      force: config.model.force,
      stripClientSuffix: config.model.stripClientSuffix,
    },
    endpoints: config.endpoints,
    ...(targetProvider?.protocol !== config.target.protocol ? { targetProtocol: targetProvider?.protocol ?? config.target.protocol } : {}),
  };
}

function withTargetAuthDefaults(auth: ProtocolAuth, apiVersion?: string): ProtocolAuth {
  if (auth.type === 'azure' && apiVersion && auth.apiVersion !== apiVersion) {
    return { ...auth, apiVersion };
  }
  return auth;
}

export function denormalizeForToken(config: ProxyConfigInput): ProxyConfigInput {
  if ((config as ProxyConfigV2).version === 2) return config;
  return { ...(config as ProxyConfig), version: 1 };
}
