import { describe, expect, it } from 'vitest';
import type { NormalizedProxyConfig } from '../src/config/types.js';
import { buildPassthroughUrl, decideRoute, detectEndpointGroup } from '../src/proxy/endpoints.js';

const baseConfig: NormalizedProxyConfig = {
  version: 1,
  sourceProtocol: 'openai',
  targetProtocol: 'openai',
  targetBaseUrl: 'https://api.groq.com/openai/v1',
  auth: { type: 'bearer', token: 'test' },
  provider: 'groq',
  model: { mode: 'passThrough', stripClientSuffix: true },
  endpoints: { mode: 'auto' },
};

describe('detectEndpointGroup', () => {
  it('detects translatable chat endpoints', () => {
    expect(detectEndpointGroup('/v1/chat/completions')).toBe('chat');
    expect(detectEndpointGroup('/v1/messages')).toBe('chat');
    expect(detectEndpointGroup('/v1beta/models/gemini-2.5-flash:generateContent')).toBe('chat');
    expect(detectEndpointGroup('/api/chat')).toBe('chat');
  });

  it('detects native passthrough endpoint groups', () => {
    expect(detectEndpointGroup('/v1/responses')).toBe('responses');
    expect(detectEndpointGroup('/v1/embeddings')).toBe('embeddings');
    expect(detectEndpointGroup('/v1/files')).toBe('files');
    expect(detectEndpointGroup('/v1/vector_stores')).toBe('vectorStores');
  });
});

describe('decideRoute', () => {
  it('translates chat in auto mode', () => {
    expect(decideRoute(baseConfig, '/v1/chat/completions')).toEqual({ action: 'translate', endpointGroup: 'chat' });
  });

  it('passes through native OpenAI-compatible endpoints when wire-compatible', () => {
    expect(decideRoute(baseConfig, '/v1/embeddings')).toMatchObject({ action: 'passthrough', endpointGroup: 'embeddings' });
  });

  it('rejects passthrough when protocols are not wire-compatible', () => {
    const config = { ...baseConfig, sourceProtocol: 'anthropic' as const };
    expect(decideRoute(config, '/v1/embeddings')).toMatchObject({ action: 'reject', endpointGroup: 'embeddings' });
  });

  it('rejects unsupported provider endpoint groups', () => {
    const config = { ...baseConfig, provider: 'nvidia' as const, targetBaseUrl: 'https://integrate.api.nvidia.com/v1' };
    expect(decideRoute(config, '/v1/files')).toMatchObject({ action: 'reject', endpointGroup: 'files' });
  });
});

describe('buildPassthroughUrl', () => {
  it('does not duplicate /v1 for OpenAI-compatible base URLs', () => {
    expect(buildPassthroughUrl(baseConfig, '/v1/models', '?limit=10')).toBe('https://api.groq.com/openai/v1/models?limit=10');
  });
});
