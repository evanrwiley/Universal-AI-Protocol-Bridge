# Compatibility

UAIPB 不把所有端点强行翻译成统一格式。规则是：

1. 聊天端点可以跨协议转换。
2. 非聊天端点只在协议线格式兼容时原生透传。
3. 不能安全处理时返回 `UNSUPPORTED_ENDPOINT`。

## Translatable

| Source / Target family | Endpoint examples |
| --- | --- |
| OpenAI-compatible | `/v1/chat/completions` |
| Anthropic | `/v1/messages` |
| Gemini | `/v1beta/models/{model}:generateContent` |
| Ollama | `/api/chat` |
| Cohere | `/v2/chat` |
| Bedrock | `/model/{modelId}/invoke` and streaming invoke |

这些端点会转换 request body、response body、流式事件、工具调用和基础图片输入。

## Native passthrough

| Endpoint group | Examples |
| --- | --- |
| `responses` | OpenAI `/v1/responses` |
| `models` | `/v1/models`, Gemini model paths, Ollama tags |
| `embeddings` | `/v1/embeddings`, Gemini embedContent, Ollama embeddings |
| `tokenCount` | Anthropic count tokens, Gemini countTokens, Cohere tokenize |
| `files` | OpenAI files, Anthropic files |
| `uploads` | OpenAI uploads |
| `batches` | OpenAI batches, Anthropic batches |
| `moderations` | OpenAI moderations |
| `images` | OpenAI images, Gemini media, Bedrock image models |
| `audio` | OpenAI audio, Gemini audio inputs |
| `video` | Gemini video inputs, Bedrock video models |
| `fineTuning` | Provider-native fine-tuning endpoints |
| `vectorStores` | OpenAI vector stores |

Passthrough works when the client already speaks the target wire format. Examples:

- OpenAI SDK to Groq `/v1/models`: allowed.
- OpenAI SDK to DeepSeek `/v1/chat/completions`: chat can translate or pass through.
- Claude Code to OpenAI `/v1/embeddings`: rejected because Anthropic Messages input is not OpenAI embeddings input.

## Endpoint modes

| Mode | Behavior |
| --- | --- |
| `auto` | Chat translates; non-chat tries native passthrough when compatible |
| `translate` | Only translatable chat endpoints are allowed |
| `passthrough` | Request is forwarded without body translation when protocols are compatible |

## Known limitations

- Tool schemas are normalized for chat, but provider-specific schema extensions may be lost.
- Responses API is currently passthrough, not translated into Anthropic/Gemini/Cohere formats.
- Multipart upload and binary payloads are passthrough only.
- Bedrock passthrough signs requests, but provider-specific payload shape remains the caller's responsibility.
