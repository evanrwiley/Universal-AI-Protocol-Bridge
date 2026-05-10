import { useEffect, useMemo, useState } from 'react';

type ProtocolId = 'anthropic' | 'openai' | 'gemini' | 'bedrock' | 'azure' | 'ollama' | 'cohere' | 'mistral';
type AuthType = 'bearer' | 'x-api-key' | 'aws' | 'azure' | 'multiKey' | 'none';
type EndpointMode = 'translate' | 'passthrough' | 'auto';
type ModelMode = 'passThrough' | 'map' | 'force';

interface ProviderPreset {
  id: string;
  name: string;
  protocol: ProtocolId;
  authType: AuthType;
  defaultBaseUrl: string;
  docsUrl: string;
  modelExamples: string[];
  openAICompatible: boolean;
  endpointSupport: Record<string, EndpointMode | 'unsupported'>;
  notes?: string;
}

interface CatalogResponse {
  providers: ProviderPreset[];
}

interface Snippets {
  proxyUrl: string;
  claudeCode?: string;
  openaiPython?: string;
  openaiTS?: string;
  envBlock: string;
  curlExample: string;
  notes: string[];
}

interface GenerateResponse {
  proxyUrl: string;
  snippets: Snippets;
}

interface ModelMapRow {
  id: number;
  from: string;
  to: string;
}

const FALLBACK_PROVIDERS: ProviderPreset[] = [
  { id: 'openai', name: 'OpenAI', protocol: 'openai', authType: 'bearer', defaultBaseUrl: 'https://api.openai.com/v1', docsUrl: 'https://platform.openai.com/docs/api-reference', modelExamples: ['gpt-4.1'], openAICompatible: true, endpointSupport: { chat: 'translate' } },
  { id: 'deepseek', name: 'DeepSeek', protocol: 'openai', authType: 'bearer', defaultBaseUrl: 'https://api.deepseek.com', docsUrl: 'https://api-docs.deepseek.com/', modelExamples: ['deepseek-chat'], openAICompatible: true, endpointSupport: { chat: 'translate' } },
  { id: 'groq', name: 'Groq', protocol: 'openai', authType: 'bearer', defaultBaseUrl: 'https://api.groq.com/openai/v1', docsUrl: 'https://console.groq.com/docs/openai', modelExamples: ['llama-3.3-70b-versatile'], openAICompatible: true, endpointSupport: { chat: 'translate' } },
  { id: 'anthropic', name: 'Anthropic', protocol: 'anthropic', authType: 'x-api-key', defaultBaseUrl: 'https://api.anthropic.com', docsUrl: 'https://docs.anthropic.com/en/api/messages', modelExamples: ['claude-sonnet-4-5'], openAICompatible: false, endpointSupport: { chat: 'translate' } },
];

const SOURCE_PROTOCOLS: Array<{ id: ProtocolId; label: string; hint: string }> = [
  { id: 'anthropic', label: 'Anthropic / Claude Code', hint: 'Claude Code、Anthropic SDK、/v1/messages' },
  { id: 'openai', label: 'OpenAI Chat Completions', hint: 'OpenAI SDK、兼容 /v1/chat/completions 的客户端' },
  { id: 'gemini', label: 'Google Gemini', hint: 'generateContent / streamGenerateContent' },
  { id: 'ollama', label: 'Ollama', hint: '/api/chat 本地或远端 Ollama' },
  { id: 'cohere', label: 'Cohere v2', hint: '/v2/chat' },
  { id: 'mistral', label: 'Mistral', hint: 'OpenAI-compatible chat completions' },
  { id: 'azure', label: 'Azure OpenAI', hint: 'Azure deployment chat completions' },
];

export function App() {
  const [providers, setProviders] = useState<ProviderPreset[]>(FALLBACK_PROVIDERS);
  const [sourceProtocol, setSourceProtocol] = useState<ProtocolId>('anthropic');
  const [targetProviderId, setTargetProviderId] = useState('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [multiKeys, setMultiKeys] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [azureApiVersion, setAzureApiVersion] = useState('2024-10-21');
  const [endpointMode, setEndpointMode] = useState<EndpointMode>('auto');
  const [modelMode, setModelMode] = useState<ModelMode>('passThrough');
  const [forceModel, setForceModel] = useState('');
  const [modelRows, setModelRows] = useState<ModelMapRow[]>([{ id: 1, from: 'claude-sonnet-4-5', to: 'gpt-4.1' }]);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState('curl');

  useEffect(() => {
    fetch('/api/catalog')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('catalog unavailable')))
      .then((catalog: CatalogResponse) => {
        setProviders(catalog.providers);
        const current = catalog.providers.find(provider => provider.id === targetProviderId);
        if (current) setBaseUrl(current.defaultBaseUrl);
      })
      .catch(() => setBaseUrl(FALLBACK_PROVIDERS[0]!.defaultBaseUrl));
  }, []);

  const targetProvider = useMemo(
    () => providers.find(provider => provider.id === targetProviderId) ?? providers[0]!,
    [providers, targetProviderId],
  );

  useEffect(() => {
    setBaseUrl(targetProvider.defaultBaseUrl);
    setForceModel(targetProvider.modelExamples[0] ?? '');
  }, [targetProvider.id]);

  const endpointRows = useMemo(() => Object.entries(targetProvider.endpointSupport)
    .filter(([group]) => group !== 'unknown')
    .sort(([a], [b]) => a.localeCompare(b)), [targetProvider]);

  const snippets = result?.snippets;
  const snippetTabs = snippets ? [
    snippets.claudeCode ? ['claude', 'Claude Code', snippets.claudeCode] : null,
    snippets.openaiPython ? ['python', 'Python', snippets.openaiPython] : null,
    snippets.openaiTS ? ['ts', 'TypeScript', snippets.openaiTS] : null,
    ['env', '环境变量', snippets.envBlock],
    ['curl', 'curl', snippets.curlExample],
  ].filter(Boolean) as Array<[string, string, string]> : [];

  async function generateUrl() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/generate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildConfig()),
      });
      const data = await response.json() as GenerateResponse | { message?: string; error_code?: string };
      if (!response.ok) throw new Error('message' in data && data.message ? data.message : '生成失败');
      setResult(data as GenerateResponse);
      setActiveSnippet((data as GenerateResponse).snippets.claudeCode ? 'claude' : 'curl');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setBusy(false);
    }
  }

  function buildConfig() {
    const keys = multiKeys.split('\n').map(key => key.trim()).filter(Boolean);
    const auth = buildAuth(keys);
    const map = Object.fromEntries(modelRows.filter(row => row.from.trim() && row.to.trim()).map(row => [row.from.trim(), row.to.trim()]));
    return {
      version: 2,
      source: { protocol: sourceProtocol, provider: sourceProtocol },
      target: {
        protocol: targetProvider.protocol,
        provider: targetProvider.id,
        baseUrl,
        auth,
        ...(targetProvider.authType === 'azure' ? { apiVersion: azureApiVersion } : {}),
        ...(targetProvider.authType === 'aws' ? { region: awsRegion } : {}),
      },
      model: {
        mode: modelMode,
        ...(modelMode === 'map' ? { map } : {}),
        ...(modelMode === 'force' ? { force: forceModel } : {}),
        stripClientSuffix: true,
      },
      endpoints: { mode: endpointMode },
    };
  }

  function buildAuth(keys: string[]) {
    if (targetProvider.authType === 'bearer') return { type: 'bearer', token: apiKey || keys[0] || '', ...(keys.length ? { keys } : {}) };
    if (targetProvider.authType === 'x-api-key') return { type: 'x-api-key', key: apiKey || keys[0] || '', ...(keys.length ? { keys } : {}) };
    if (targetProvider.authType === 'aws') return { type: 'aws', accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey, sessionToken: awsSessionToken || undefined, region: awsRegion };
    if (targetProvider.authType === 'azure') return { type: 'azure', apiKey, apiVersion: azureApiVersion };
    return { type: 'none' };
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Universal AI Protocol Bridge</p>
          <h1>UAIPB 控制台</h1>
          <p className="lead">选择客户端协议和目标服务商，生成加密代理 URL。聊天端点会自动转换，其他官方端点按能力矩阵原生透传或明确报错。</p>
        </div>
        <div className="heroFacts" aria-label="核心能力">
          <span>AES-GCM token</span>
          <span>零服务端存储</span>
          <span>v2 配置 schema</span>
          <span>Provider presets</span>
        </div>
      </section>

      <section className="grid">
        <Panel step="1" title="客户端协议">
          <div className="choiceGrid">
            {SOURCE_PROTOCOLS.map(item => (
              <button key={item.id} className={sourceProtocol === item.id ? 'choice active' : 'choice'} onClick={() => setSourceProtocol(item.id)}>
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel step="2" title="目标服务商">
          <div className="providerGrid">
            {providers.map(provider => (
              <button key={provider.id} className={targetProviderId === provider.id ? 'provider active' : 'provider'} onClick={() => setTargetProviderId(provider.id)}>
                <strong>{provider.name}</strong>
                <span>{provider.openAICompatible ? 'OpenAI-compatible' : provider.protocol}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>目标 Base URL</span>
            <input value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder={targetProvider.defaultBaseUrl} />
          </label>
          <p className="hint">官方文档：<a href={targetProvider.docsUrl} target="_blank" rel="noreferrer">{targetProvider.docsUrl}</a></p>
        </Panel>

        <Panel step="3" title="认证">
          <AuthFields
            authType={targetProvider.authType}
            apiKey={apiKey}
            setApiKey={setApiKey}
            multiKeys={multiKeys}
            setMultiKeys={setMultiKeys}
            awsAccessKeyId={awsAccessKeyId}
            setAwsAccessKeyId={setAwsAccessKeyId}
            awsSecretAccessKey={awsSecretAccessKey}
            setAwsSecretAccessKey={setAwsSecretAccessKey}
            awsRegion={awsRegion}
            setAwsRegion={setAwsRegion}
            awsSessionToken={awsSessionToken}
            setAwsSessionToken={setAwsSessionToken}
            azureApiVersion={azureApiVersion}
            setAzureApiVersion={setAzureApiVersion}
          />
        </Panel>

        <Panel step="4" title="端点能力">
          <div className="segmented">
            <ToggleButton active={endpointMode === 'auto'} onClick={() => setEndpointMode('auto')}>自动</ToggleButton>
            <ToggleButton active={endpointMode === 'translate'} onClick={() => setEndpointMode('translate')}>仅转换</ToggleButton>
            <ToggleButton active={endpointMode === 'passthrough'} onClick={() => setEndpointMode('passthrough')}>仅透传</ToggleButton>
          </div>
          <div className="capabilityTable">
            {endpointRows.map(([group, mode]) => (
              <div key={group}>
                <span>{group}</span>
                <code className={mode === 'unsupported' ? 'bad' : ''}>{mode}</code>
              </div>
            ))}
          </div>
        </Panel>

        <Panel step="5" title="模型策略">
          <div className="segmented">
            <ToggleButton active={modelMode === 'passThrough'} onClick={() => setModelMode('passThrough')}>透传</ToggleButton>
            <ToggleButton active={modelMode === 'map'} onClick={() => setModelMode('map')}>映射</ToggleButton>
            <ToggleButton active={modelMode === 'force'} onClick={() => setModelMode('force')}>强制</ToggleButton>
          </div>
          {modelMode === 'force' && (
            <label className="field">
              <span>强制目标模型</span>
              <input value={forceModel} onChange={event => setForceModel(event.target.value)} placeholder={targetProvider.modelExamples[0]} />
            </label>
          )}
          {modelMode === 'map' && (
            <div className="mapRows">
              {modelRows.map(row => (
                <div className="mapRow" key={row.id}>
                  <input value={row.from} onChange={event => updateMapRow(row.id, 'from', event.target.value)} placeholder="client-model" />
                  <span>to</span>
                  <input value={row.to} onChange={event => updateMapRow(row.id, 'to', event.target.value)} placeholder={targetProvider.modelExamples[0]} />
                  <button className="iconButton" onClick={() => setModelRows(rows => rows.filter(item => item.id !== row.id))} aria-label="删除映射">x</button>
                </div>
              ))}
              <button className="secondary" onClick={() => setModelRows(rows => [...rows, { id: Date.now(), from: '', to: targetProvider.modelExamples[0] ?? '' }])}>添加映射</button>
            </div>
          )}
          <p className="hint">示例模型：{targetProvider.modelExamples.join(' / ')}</p>
        </Panel>
      </section>

      <section className="actions">
        <button className="primary" disabled={busy || !baseUrl} onClick={generateUrl}>{busy ? '生成中...' : '生成代理 URL'}</button>
        {error && <p className="error">{error}</p>}
      </section>

      {result && snippets && (
        <section className="result">
          <div className="resultHeader">
            <div>
              <p className="eyebrow">Ready</p>
              <h2>代理 URL 已生成</h2>
            </div>
            <CopyButton text={result.proxyUrl} />
          </div>
          <code className="urlBox">{result.proxyUrl}</code>
          <div className="tabs">
            {snippetTabs.map(([id, label]) => (
              <button key={id} className={activeSnippet === id ? 'tab active' : 'tab'} onClick={() => setActiveSnippet(id)}>{label}</button>
            ))}
          </div>
          {snippetTabs.map(([id, , content]) => (
            <div key={id} className={activeSnippet === id ? 'snippet active' : 'snippet'}>
              <CopyButton text={content} />
              <pre><code>{content}</code></pre>
            </div>
          ))}
          <ul className="notes">
            {snippets.notes.map(note => <li key={note}>{note}</li>)}
          </ul>
        </section>
      )}
    </main>
  );

  function updateMapRow(id: number, key: 'from' | 'to', value: string) {
    setModelRows(rows => rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  }
}

function Panel(props: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panelTitle"><span>{props.step}</span><h2>{props.title}</h2></div>
      {props.children}
    </section>
  );
}

function ToggleButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={props.active ? 'toggle active' : 'toggle'} onClick={props.onClick}>{props.children}</button>;
}

function AuthFields(props: {
  authType: AuthType;
  apiKey: string;
  setApiKey: (value: string) => void;
  multiKeys: string;
  setMultiKeys: (value: string) => void;
  awsAccessKeyId: string;
  setAwsAccessKeyId: (value: string) => void;
  awsSecretAccessKey: string;
  setAwsSecretAccessKey: (value: string) => void;
  awsRegion: string;
  setAwsRegion: (value: string) => void;
  awsSessionToken: string;
  setAwsSessionToken: (value: string) => void;
  azureApiVersion: string;
  setAzureApiVersion: (value: string) => void;
}) {
  if (props.authType === 'none') return <p className="hint strong">该目标无需认证。Ollama 本地服务通常只需要网络可达。</p>;
  if (props.authType === 'aws') {
    return (
      <div className="twoCol">
        <label className="field"><span>AWS Access Key ID</span><input value={props.awsAccessKeyId} onChange={event => props.setAwsAccessKeyId(event.target.value)} /></label>
        <label className="field"><span>AWS Secret Access Key</span><input type="password" value={props.awsSecretAccessKey} onChange={event => props.setAwsSecretAccessKey(event.target.value)} /></label>
        <label className="field"><span>Region</span><input value={props.awsRegion} onChange={event => props.setAwsRegion(event.target.value)} /></label>
        <label className="field"><span>Session Token 可选</span><input type="password" value={props.awsSessionToken} onChange={event => props.setAwsSessionToken(event.target.value)} /></label>
      </div>
    );
  }
  return (
    <>
      <label className="field">
        <span>{props.authType === 'azure' ? 'Azure API Key' : props.authType === 'x-api-key' ? 'API Key (x-api-key)' : 'API Key'}</span>
        <input type="password" value={props.apiKey} onChange={event => props.setApiKey(event.target.value)} autoComplete="off" />
      </label>
      {props.authType === 'azure' && (
        <label className="field">
          <span>API Version</span>
          <input value={props.azureApiVersion} onChange={event => props.setAzureApiVersion(event.target.value)} />
        </label>
      )}
      {(props.authType === 'bearer' || props.authType === 'x-api-key') && (
        <label className="field">
          <span>多 Key 轮询，可选，每行一个</span>
          <textarea value={props.multiKeys} onChange={event => props.setMultiKeys(event.target.value)} rows={4} placeholder="key-1&#10;key-2" />
        </label>
      )}
    </>
  );
}

function CopyButton(props: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="copy" onClick={async () => {
      await navigator.clipboard.writeText(props.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }}>{copied ? '已复制' : '复制'}</button>
  );
}
