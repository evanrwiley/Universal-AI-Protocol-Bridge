import type { EndpointMode, ProviderId, ProtocolAuth, ProtocolId } from './types.js';

export type AuthType = ProtocolAuth['type'];

export type EndpointGroup =
  | 'chat'
  | 'responses'
  | 'models'
  | 'embeddings'
  | 'tokenCount'
  | 'files'
  | 'uploads'
  | 'batches'
  | 'moderations'
  | 'images'
  | 'audio'
  | 'video'
  | 'fineTuning'
  | 'vectorStores'
  | 'unknown';

export interface ProviderPreset {
  id: ProviderId;
  name: string;
  protocol: ProtocolId;
  authType: AuthType;
  defaultBaseUrl: string;
  docsUrl: string;
  modelExamples: string[];
  openAICompatible: boolean;
  endpointSupport: Record<EndpointGroup, EndpointMode | 'unsupported'>;
  notes?: string;
}

const openAIEndpointSupport: ProviderPreset['endpointSupport'] = {
  chat: 'translate',
  responses: 'passthrough',
  models: 'passthrough',
  embeddings: 'passthrough',
  tokenCount: 'unsupported',
  files: 'passthrough',
  uploads: 'passthrough',
  batches: 'passthrough',
  moderations: 'passthrough',
  images: 'passthrough',
  audio: 'passthrough',
  video: 'passthrough',
  fineTuning: 'passthrough',
  vectorStores: 'passthrough',
  unknown: 'passthrough',
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai',
    authType: 'bearer',
    defaultBaseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    modelExamples: ['gpt-5.4', 'gpt-4.1', 'gpt-4o-mini'],
    openAICompatible: true,
    endpointSupport: openAIEndpointSupport,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai',
    authType: 'bearer',
    defaultBaseUrl: 'https://api.deepseek.com',
    docsUrl: 'https://api-docs.deepseek.com/',
    modelExamples: ['deepseek-chat', 'deepseek-reasoner'],
    openAICompatible: true,
    endpointSupport: { ...openAIEndpointSupport, responses: 'unsupported', images: 'unsupported', audio: 'unsupported', video: 'unsupported', vectorStores: 'unsupported' },
    notes: 'OpenAI-compatible chat endpoint. Base URL intentionally omits /v1 per DeepSeek examples.',
  },
  {
    id: 'groq',
    name: 'Groq',
    protocol: 'openai',
    authType: 'bearer',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/docs/openai',
    modelExamples: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
    openAICompatible: true,
    endpointSupport: { ...openAIEndpointSupport, responses: 'unsupported', video: 'unsupported', vectorStores: 'unsupported', fineTuning: 'unsupported' },
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    protocol: 'openai',
    authType: 'bearer',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    docsUrl: 'https://docs.api.nvidia.com/nim/reference/llm-apis',
    modelExamples: ['nvidia/llama-3.1-nemotron-70b-instruct', 'meta/llama-3.1-70b-instruct'],
    openAICompatible: true,
    endpointSupport: { ...openAIEndpointSupport, responses: 'unsupported', files: 'unsupported', uploads: 'unsupported', batches: 'unsupported', audio: 'unsupported', video: 'unsupported', fineTuning: 'unsupported', vectorStores: 'unsupported' },
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    protocol: 'anthropic',
    authType: 'x-api-key',
    defaultBaseUrl: 'https://api.anthropic.com',
    docsUrl: 'https://docs.anthropic.com/en/api/messages',
    modelExamples: ['claude-sonnet-4-5', 'claude-3-5-haiku-latest'],
    openAICompatible: false,
    endpointSupport: {
      chat: 'translate',
      responses: 'unsupported',
      models: 'passthrough',
      embeddings: 'unsupported',
      tokenCount: 'passthrough',
      files: 'passthrough',
      uploads: 'unsupported',
      batches: 'passthrough',
      moderations: 'unsupported',
      images: 'unsupported',
      audio: 'unsupported',
      video: 'unsupported',
      fineTuning: 'unsupported',
      vectorStores: 'unsupported',
      unknown: 'passthrough',
    },
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    protocol: 'gemini',
    authType: 'bearer',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    modelExamples: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    openAICompatible: false,
    endpointSupport: {
      chat: 'translate',
      responses: 'unsupported',
      models: 'passthrough',
      embeddings: 'passthrough',
      tokenCount: 'passthrough',
      files: 'passthrough',
      uploads: 'unsupported',
      batches: 'passthrough',
      moderations: 'unsupported',
      images: 'passthrough',
      audio: 'passthrough',
      video: 'passthrough',
      fineTuning: 'passthrough',
      vectorStores: 'unsupported',
      unknown: 'passthrough',
    },
    notes: 'The UI labels this as an API key; the adapter sends it as x-goog-api-key.',
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    protocol: 'azure',
    authType: 'azure',
    defaultBaseUrl: 'https://YOUR-RESOURCE.openai.azure.com',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai/reference',
    modelExamples: ['deployment-name'],
    openAICompatible: false,
    endpointSupport: { ...openAIEndpointSupport, responses: 'passthrough' },
  },
  {
    id: 'bedrock',
    name: 'AWS Bedrock',
    protocol: 'bedrock',
    authType: 'aws',
    defaultBaseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    docsUrl: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_Operations_Amazon_Bedrock_Runtime.html',
    modelExamples: ['us.anthropic.claude-sonnet-4-5', 'anthropic.claude-3-5-sonnet-20241022-v2:0'],
    openAICompatible: false,
    endpointSupport: {
      chat: 'translate',
      responses: 'unsupported',
      models: 'unsupported',
      embeddings: 'passthrough',
      tokenCount: 'unsupported',
      files: 'unsupported',
      uploads: 'unsupported',
      batches: 'unsupported',
      moderations: 'unsupported',
      images: 'passthrough',
      audio: 'unsupported',
      video: 'passthrough',
      fineTuning: 'unsupported',
      vectorStores: 'unsupported',
      unknown: 'passthrough',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama',
    protocol: 'ollama',
    authType: 'none',
    defaultBaseUrl: 'http://localhost:11434',
    docsUrl: 'https://docs.ollama.com/api',
    modelExamples: ['llama3.2', 'qwen2.5', 'mistral'],
    openAICompatible: false,
    endpointSupport: {
      chat: 'translate',
      responses: 'unsupported',
      models: 'passthrough',
      embeddings: 'passthrough',
      tokenCount: 'unsupported',
      files: 'unsupported',
      uploads: 'unsupported',
      batches: 'unsupported',
      moderations: 'unsupported',
      images: 'unsupported',
      audio: 'unsupported',
      video: 'unsupported',
      fineTuning: 'unsupported',
      vectorStores: 'unsupported',
      unknown: 'passthrough',
    },
  },
  {
    id: 'cohere',
    name: 'Cohere',
    protocol: 'cohere',
    authType: 'bearer',
    defaultBaseUrl: 'https://api.cohere.com',
    docsUrl: 'https://docs.cohere.com/v2/reference/chat',
    modelExamples: ['command-a-03-2025', 'command-r-plus'],
    openAICompatible: false,
    endpointSupport: {
      chat: 'translate',
      responses: 'unsupported',
      models: 'passthrough',
      embeddings: 'passthrough',
      tokenCount: 'passthrough',
      files: 'unsupported',
      uploads: 'unsupported',
      batches: 'unsupported',
      moderations: 'unsupported',
      images: 'unsupported',
      audio: 'unsupported',
      video: 'unsupported',
      fineTuning: 'unsupported',
      vectorStores: 'unsupported',
      unknown: 'passthrough',
    },
  },
  {
    id: 'mistral',
    name: 'Mistral',
    protocol: 'mistral',
    authType: 'bearer',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    docsUrl: 'https://docs.mistral.ai/api/',
    modelExamples: ['mistral-large-latest', 'codestral-latest'],
    openAICompatible: true,
    endpointSupport: { ...openAIEndpointSupport, responses: 'unsupported', video: 'unsupported', vectorStores: 'unsupported' },
  },
];

export function getProviderPreset(id: ProviderId): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(provider => provider.id === id);
}

export function getDefaultProviderForProtocol(protocol: ProtocolId): ProviderPreset {
  return PROVIDER_PRESETS.find(provider => provider.id === protocol) ?? PROVIDER_PRESETS.find(provider => provider.protocol === protocol)!;
}

export const PROTOCOL_INFO = {
  protocols: PROVIDER_PRESETS
    .filter(provider => provider.id === provider.protocol)
    .map(provider => ({
      id: provider.protocol,
      name: provider.name,
      authType: provider.authType,
      defaultUrl: provider.defaultBaseUrl,
    })),
};
