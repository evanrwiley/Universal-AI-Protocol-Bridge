export function getUITemplate(workerUrl: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UAIPB Console</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #111316; color: #eef2f4; }
    main { width: min(720px, calc(100% - 32px)); border: 1px solid #313943; border-radius: 8px; padding: 28px; background: #191d22; }
    h1 { margin: 0 0 12px; font-size: 2rem; }
    p { color: #9aa7b2; line-height: 1.65; }
    code { display: block; margin-top: 16px; padding: 14px; border-radius: 8px; background: #11161a; color: #80e39a; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>UAIPB Console assets are not bound</h1>
    <p>React 控制台已从 Worker 字符串模板迁移到 Vite 静态资源。请先运行 <code>npm run build:ui</code>，并确保 Cloudflare Workers assets binding 指向 <code>dist/client</code>。</p>
    <p>当前 Worker 地址：</p>
    <code>${escapeHtml(workerUrl)}</code>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
