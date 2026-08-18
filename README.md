# Universal AI Protocol Bridge

> [!WARNING]
> **本项目已归档 (Archived)**
>
> 归档原因：现在的替代品太多了，没必要用，半年过去了。不再进行任何维护与更新。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/LING71671/Universal-AI-Protocol-Bridge)

UAIPB 是一个运行在 Cloudflare Workers 上的 AI 协议网关。它把聊天类 API 在 OpenAI、Anthropic、Gemini、Bedrock、Azure OpenAI、Ollama、Cohere、Mistral 等协议之间转换，同时对不能安全互转的官方端点提供原生透传或明确错误。

## 快速开始

```bash
git clone https://github.com/LING71671/Universal-AI-Protocol-Bridge.git
cd Universal-AI-Protocol-Bridge
npm install
npx wrangler secret put WORKER_SECRET
npm run build
npm run deploy
```

本地调试：

```bash
npm run build:ui
npm run dev
```

打开 Worker 域名后，React 控制台会引导你完成：

1. 选择客户端协议，例如 Claude Code 使用 `Anthropic`，OpenAI SDK 使用 `OpenAI Chat Completions`。
2. 选择目标服务商预设，例如 OpenAI、DeepSeek、Groq、NVIDIA NIM、Anthropic、Gemini。
3. 填写目标 Base URL 和认证。
4. 选择端点模式：自动、仅转换、仅透传。
5. 选择模型策略：透传、映射或强制模型。

## 核心概念

代理 URL 格式：

```text
https://your-worker.workers.dev/proxy/{encrypted_token}/{upstream_path}
```

`encrypted_token` 内包含目标服务商、认证、模型策略和端点策略。Worker 不写数据库，不保存 API Key；每次请求都从 token 中解密配置并转发。

## 端点策略

UAIPB 将端点分成两类：

| 类型 | 行为 |
| --- | --- |
| 可转换端点 | 聊天类接口：OpenAI chat completions、Anthropic Messages、Gemini generateContent、Ollama chat、Cohere v2 chat、Bedrock InvokeModel 等 |
| 原生透传端点 | models、embeddings、responses、token count、files、uploads、batches、moderations、images、audio、video、fine-tuning、vector stores 等 |

原生透传只在源协议和目标协议线格式兼容时启用。例如 OpenAI SDK 调 Groq `/v1/embeddings` 可以透传；Claude Code 调 Groq embeddings 会返回 `UNSUPPORTED_ENDPOINT`，因为 Anthropic 请求格式不能安全变成 OpenAI embeddings。

详见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)。

## 常见场景

### Claude Code 调 OpenAI

控制台选择：

| 字段 | 值 |
| --- | --- |
| 客户端协议 | Anthropic / Claude Code |
| 目标服务商 | OpenAI |
| Base URL | `https://api.openai.com/v1` |
| 模型策略 | 映射或强制，例如 `gpt-4.1` |

生成后设置：

```bash
export ANTHROPIC_BASE_URL="https://your-worker.workers.dev/proxy/{token}"
export ANTHROPIC_API_KEY="proxy-placeholder"
```

### OpenAI SDK 调 Anthropic

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://your-worker.workers.dev/proxy/{token}/v1",
    api_key="proxy-placeholder",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Hello"}],
)
```

### Claude Code 调 DeepSeek / Groq / NVIDIA NIM

这些服务商按 OpenAI-compatible 预设拆开显示，控制台会自动填入官方 Base URL：

| 服务商 | Base URL |
| --- | --- |
| DeepSeek | `https://api.deepseek.com` |
| Groq | `https://api.groq.com/openai/v1` |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` |

## API

- `POST /api/generate-url`：生成代理 URL，支持 v1 和 v2 配置。
- `GET /api/catalog`：返回协议、服务商预设、认证方式和端点能力矩阵。
- `GET /api/protocols`：旧接口，保留兼容。

详见 [docs/API.md](docs/API.md)。

## 开发

```bash
npm test
npm run type-check
npm run build
```

项目结构：

```text
src/
  canonical/      # 协议无关的中间格式
  config/         # token、catalog、v1/v2 配置归一化、错误类型
  frontend/       # React + Vite 控制台
  protocols/      # 各协议 adapter
  proxy/          # 模型映射、端点路由、重试、密钥轮询
  streaming/      # SSE、NDJSON、Bedrock event stream
  ui/             # Worker UI/API handler 和降级 HTML
```

## 限制

- 聊天端点会尽力转换，但各家高级参数并非完全等价。
- 文件、音频、视频、图片生成、批处理、向量库等端点默认只做原生透传。
- Token 内含上游密钥，请像对待 API Key 一样保护代理 URL。
- Cloudflare Workers 无法直接访问用户本机 `localhost`；Ollama 本地地址只适合部署在能访问该地址的环境中。

## 官方文档来源

- OpenAI API Reference: https://platform.openai.com/docs/api-reference
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- Azure OpenAI REST API: https://learn.microsoft.com/azure/ai-services/openai/reference
- AWS Bedrock Runtime: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_Operations_Amazon_Bedrock_Runtime.html
- Cohere v2 Chat: https://docs.cohere.com/v2/reference/chat
- Mistral API: https://docs.mistral.ai/api/
- Ollama API: https://docs.ollama.com/api
- DeepSeek API: https://api-docs.deepseek.com/
- Groq OpenAI compatibility: https://console.groq.com/docs/openai
- NVIDIA NIM LLM APIs: https://docs.api.nvidia.com/nim/reference/llm-apis

## License

GPL-3.0
