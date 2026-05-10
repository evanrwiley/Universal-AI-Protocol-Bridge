import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/frontend/App';

describe('App', () => {
  it('renders the console with provider presets and endpoint controls', () => {
    const html = renderToString(<App />);
    expect(html).toContain('UAIPB 控制台');
    expect(html).toContain('DeepSeek');
    expect(html).toContain('端点能力');
    expect(html).toContain('生成代理 URL');
  });
});
