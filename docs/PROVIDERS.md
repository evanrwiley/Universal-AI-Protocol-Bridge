# Providers

UAIPB 的服务商目录在 `src/config/catalog.ts` 中维护，前端通过 `GET /api/catalog` 获取同一份数据。

| Provider | Protocol | Auth | Default Base URL | Notes |
| --- | --- | --- | --- | --- |
| OpenAI | `openai` | Bearer | `https://api.openai.com/v1` | 官方 OpenAI API |
| DeepSeek | `openai` | Bearer | `https://api.deepseek.com` | OpenAI-compatible chat |
| Groq | `openai` | Bearer | `https://api.groq.com/openai/v1` | OpenAI-compatible |
| NVIDIA NIM | `openai` | Bearer | `https://integrate.api.nvidia.com/v1` | OpenAI-compatible LLM APIs |
| Anthropic | `anthropic` | x-api-key | `https://api.anthropic.com` | Messages API |
| Gemini | `gemini` | API key | `https://generativelanguage.googleapis.com` | Adapter sends `x-goog-api-key` |
| Azure OpenAI | `azure` | api-key + api-version | `https://YOUR-RESOURCE.openai.azure.com` | Deployment name is the model |
| AWS Bedrock | `bedrock` | AWS SigV4 | `https://bedrock-runtime.us-east-1.amazonaws.com` | Runtime InvokeModel |
| Ollama | `ollama` | none | `http://localhost:11434` | Worker must be able to reach the host |
| Cohere | `cohere` | Bearer | `https://api.cohere.com` | v2 Chat |
| Mistral | `mistral` | Bearer | `https://api.mistral.ai/v1` | OpenAI-like chat completions |

## Auth notes

- Bearer providers use `Authorization: Bearer <key>`, except Gemini where the bridge stores the key in the same UI slot but sends `x-goog-api-key`.
- Anthropic uses `x-api-key` and the bridge adds `anthropic-version: 2023-06-01` for outbound Anthropic requests.
- Azure uses `api-key`; `api-version` is part of the request URL.
- Bedrock requests are signed with AWS SigV4 in the Worker.

## Official docs

- OpenAI: https://platform.openai.com/docs/api-reference
- DeepSeek: https://api-docs.deepseek.com/
- Groq: https://console.groq.com/docs/openai
- NVIDIA NIM: https://docs.api.nvidia.com/nim/reference/llm-apis
- Anthropic: https://docs.anthropic.com/en/api/messages
- Gemini: https://ai.google.dev/gemini-api/docs
- Azure OpenAI: https://learn.microsoft.com/azure/ai-services/openai/reference
- AWS Bedrock Runtime: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_Operations_Amazon_Bedrock_Runtime.html
- Ollama: https://docs.ollama.com/api
- Cohere: https://docs.cohere.com/v2/reference/chat
- Mistral: https://docs.mistral.ai/api/
