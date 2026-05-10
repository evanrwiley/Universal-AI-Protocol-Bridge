import type { ProtocolId } from '../canonical/types.js';
import { getProviderPreset } from '../config/catalog.js';
import type { ProxyConfigInput } from '../config/types.js';

export interface ConfigSnippets {
  proxyUrl: string;
  claudeCode?: string;
  openaiPython?: string;
  openaiTS?: string;
  envBlock: string;
  curlExample: string;
  notes: string[];
}

export function generateConfigSnippets(proxyUrl: string, config: ProxyConfigInput | ProtocolId): ConfigSnippets {
  const sourceProtocol = typeof config === 'string'
    ? config
    : config.version === 2 ? config.source.protocol : config.sourceProtocol;
  const providerId = typeof config === 'string' ? undefined : config.version === 2 ? config.target.provider : config.targetProtocol;
  const provider = providerId ? getProviderPreset(providerId) : undefined;
  const model = getExampleModel(config);
  const snippets: ConfigSnippets = {
    proxyUrl,
    envBlock: '',
    curlExample: '',
    notes: [
      'proxy-placeholder can be any non-empty value; the upstream secret is encrypted in the proxy token.',
      ...(provider ? [`Target provider: ${provider.name} (${provider.docsUrl})`] : []),
    ],
  };

  if (sourceProtocol === 'anthropic') {
    snippets.claudeCode = `export ANTHROPIC_BASE_URL="${proxyUrl}"
export ANTHROPIC_API_KEY="proxy-placeholder"`;

    snippets.envBlock = `ANTHROPIC_BASE_URL="${proxyUrl}"
ANTHROPIC_API_KEY="proxy-placeholder"`;

    snippets.curlExample = `curl -X POST "${proxyUrl}/v1/messages" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: proxy-placeholder" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{"model":"${model}","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'`;
  } else if (sourceProtocol === 'openai' || sourceProtocol === 'mistral' || sourceProtocol === 'azure') {
    snippets.openaiPython = `from openai import OpenAI

client = OpenAI(
    base_url="${proxyUrl}/v1",
    api_key="proxy-placeholder"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello!"}]
)`;

    snippets.openaiTS = `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${proxyUrl}/v1',
  apiKey: 'proxy-placeholder',
});

const response = await client.chat.completions.create({
  model: '${model}',
  messages: [{ role: 'user', content: 'Hello!' }],
});`;

    snippets.envBlock = `OPENAI_BASE_URL="${proxyUrl}/v1"
OPENAI_API_KEY="proxy-placeholder"`;

    snippets.curlExample = `curl -X POST "${proxyUrl}/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer proxy-placeholder" \\
  -d '{"model":"${model}","messages":[{"role":"user","content":"Hello!"}]}'`;
  } else if (sourceProtocol === 'gemini') {
    snippets.envBlock = `GEMINI_BASE_URL="${proxyUrl}"`;
    snippets.curlExample = `curl -X POST "${proxyUrl}/v1beta/models/${model}:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: proxy-placeholder" \\
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello!"}]}]}'`;
  } else if (sourceProtocol === 'ollama') {
    snippets.envBlock = `OLLAMA_HOST="${proxyUrl}"`;
    snippets.curlExample = `curl -X POST "${proxyUrl}/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model}","messages":[{"role":"user","content":"Hello!"}],"stream":false}'`;
  } else {
    snippets.envBlock = `API_BASE_URL="${proxyUrl}"`;
    snippets.curlExample = `curl -X POST "${proxyUrl}" -H "Content-Type: application/json" -d '{}'`;
  }

  return snippets;
}

function getExampleModel(config: ProxyConfigInput | ProtocolId): string {
  if (typeof config === 'string') {
    if (config === 'anthropic') return 'claude-sonnet-4-5';
    if (config === 'gemini') return 'gemini-2.5-flash';
    if (config === 'ollama') return 'llama3.2';
    return 'gpt-4.1';
  }

  const force = config.version === 2 && config.model.mode === 'force' ? config.model.force : undefined;
  if (force) return force;

  const providerId = config.version === 2 ? config.target.provider : config.targetProtocol;
  return getProviderPreset(providerId)?.modelExamples[0] ?? 'gpt-4.1';
}
