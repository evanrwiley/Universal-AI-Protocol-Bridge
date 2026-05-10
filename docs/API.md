# API

## `POST /api/generate-url`

生成加密代理 URL。请求体支持 v1 和 v2。

### v2 request

```json
{
  "version": 2,
  "source": {
    "protocol": "anthropic",
    "provider": "anthropic"
  },
  "target": {
    "protocol": "openai",
    "provider": "groq",
    "baseUrl": "https://api.groq.com/openai/v1",
    "auth": {
      "type": "bearer",
      "token": "gsk_xxx"
    }
  },
  "model": {
    "mode": "force",
    "force": "llama-3.3-70b-versatile",
    "stripClientSuffix": true
  },
  "endpoints": {
    "mode": "auto"
  }
}
```

### v1 request

旧格式继续可用，服务端会归一化为内部配置：

```json
{
  "version": 1,
  "sourceProtocol": "anthropic",
  "targetProtocol": "openai",
  "targetBaseUrl": "https://api.openai.com/v1",
  "auth": {
    "type": "bearer",
    "token": "sk_xxx"
  },
  "modelMap": {
    "claude-sonnet-4-5": "gpt-4.1"
  }
}
```

### response

```json
{
  "proxyUrl": "https://your-worker.workers.dev/proxy/{token}",
  "snippets": {
    "proxyUrl": "https://your-worker.workers.dev/proxy/{token}",
    "envBlock": "...",
    "curlExample": "...",
    "notes": []
  }
}
```

## `GET /api/catalog`

返回 React 控制台和自动化客户端共用的服务商目录。

字段包括：

- `id`：服务商预设 ID。
- `protocol`：协议 adapter ID。
- `authType`：`bearer`、`x-api-key`、`aws`、`azure` 或 `none`。
- `defaultBaseUrl`：官方或事实标准 Base URL。
- `endpointSupport`：每个端点组的 `translate`、`passthrough` 或 `unsupported`。
- `docsUrl`：官方文档入口。

## Proxy URL

```text
/proxy/{token}/{upstream_path}
```

聊天端点在 `endpoints.mode = "auto"` 或 `"translate"` 时走协议转换。非聊天端点在 `auto` 或 `passthrough` 时只有线格式兼容才会原生透传。

## Error response

```json
{
  "error_code": "UNSUPPORTED_ENDPOINT",
  "message": "embeddings requires native passthrough...",
  "provider": "groq",
  "endpoint_group": "embeddings",
  "request_id": "uuid",
  "docs_url": "https://console.groq.com/docs/openai"
}
```

错误码：

| Code | HTTP | Meaning |
| --- | --- | --- |
| `INVALID_JSON` | 400 | 请求 JSON 无效或缺字段 |
| `MISSING_TOKEN` | 400 | 缺少 token |
| `INVALID_TOKEN` | 401 | token 无法解密或版本不支持 |
| `UNSUPPORTED_ENDPOINT` | 400 | 端点不支持转换或透传 |
| `RATE_LIMITED` | 429 | 上游限流 |
| `UPSTREAM_ERROR` | 502 | 上游返回非成功状态 |
| `RETRY_EXHAUSTED` | 503 | 自动重试耗尽 |
