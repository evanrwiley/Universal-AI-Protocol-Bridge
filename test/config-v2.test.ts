import { describe, expect, it } from 'vitest';
import { PROVIDER_PRESETS, getProviderPreset } from '../src/config/catalog.js';
import { normalizeProxyConfig } from '../src/config/normalize.js';
import type { ProxyConfig, ProxyConfigV2 } from '../src/config/types.js';

describe('provider catalog', () => {
  it('splits OpenAI-compatible providers into concrete presets', () => {
    const ids = PROVIDER_PRESETS.map(provider => provider.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('deepseek');
    expect(ids).toContain('groq');
    expect(ids).toContain('nvidia');
  });

  it('declares auth and endpoint support for Gemini', () => {
    const gemini = getProviderPreset('gemini');
    expect(gemini?.authType).toBe('bearer');
    expect(gemini?.endpointSupport.chat).toBe('translate');
    expect(gemini?.endpointSupport.models).toBe('passthrough');
  });
});

describe('normalizeProxyConfig', () => {
  it('normalizes v1 config into internal shape', () => {
    const config: ProxyConfig = {
      version: 1,
      sourceProtocol: 'anthropic',
      targetProtocol: 'openai',
      targetBaseUrl: 'https://api.openai.com/v1',
      auth: { type: 'bearer', token: 'sk-test' },
      modelMap: { 'claude-sonnet-4-5': 'gpt-4.1' },
    };

    const normalized = normalizeProxyConfig(config);
    expect(normalized.provider).toBe('openai');
    expect(normalized.sourceProtocol).toBe('anthropic');
    expect(normalized.model.mode).toBe('map');
    expect(normalized.endpoints.mode).toBe('auto');
  });

  it('normalizes v2 config into v1-compatible adapter fields', () => {
    const config: ProxyConfigV2 = {
      version: 2,
      source: { protocol: 'anthropic', provider: 'anthropic' },
      target: {
        protocol: 'openai',
        provider: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        auth: { type: 'bearer', token: 'gsk-test' },
      },
      model: { mode: 'force', force: 'llama-3.3-70b-versatile', stripClientSuffix: true },
      endpoints: { mode: 'auto' },
    };

    const normalized = normalizeProxyConfig(config);
    expect(normalized.version).toBe(1);
    expect(normalized.targetProtocol).toBe('openai');
    expect(normalized.provider).toBe('groq');
    expect(normalized.forceModel).toBe('llama-3.3-70b-versatile');
  });
});
