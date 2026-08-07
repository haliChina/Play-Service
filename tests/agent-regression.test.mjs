import assert from 'node:assert/strict';

class StorageMock {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
globalThis.localStorage = new StorageMock();

const { detectModelBrand } = await import('../js/modules/modelBrands.js');
const brandCases = [
  ['mimo-v2-flash', '', 'xiaomimimo'],
  ['deepseek-chat', '', 'deepseek'],
  ['claude-sonnet-4-5', '', 'claude'],
  ['Qwen/Qwen3-VL-32B', 'https://api.siliconflow.cn/v1', 'qwen'],
  ['doubao-seed-1-6-vision', '', 'doubao'],
  ['glm-4.5v', '', 'chatglm'],
  ['kimi-k2.5', '', 'kimi'],
  ['step-3.5-flash', '', 'stepfun'],
  ['gpt-5.5', '', 'openai'],
  ['unknown', 'https://api.deepseek.com/v1', 'deepseek'],
];
for (const [model, url, expected] of brandCases) {
  assert.equal(detectModelBrand(model, url).id, expected, `${model} should map to ${expected}`);
}

const { renderAgentProcessing, renderAgentStep } = await import('../js/modules/renderer.js');
const initial = renderAgentProcessing([{ type: 'thinking', content: '初始步骤' }], '启动中');
assert.match(initial, /id="agentCurrentStatus"/);
assert.match(initial, /初始步骤/);
assert.match(renderAgentStep({ type: 'tool_call', toolName: 'search_places', toolArgs: { keywords: '公园', city: '北京' } }), /搜索地点/);
assert.match(renderAgentStep({ type: 'final', content: '生成完成' }), /生成完成/);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const value = String(url);
  if (value.includes('zh.wikivoyage.org')) return { ok: true, json: async () => ({ query: { pages: {} } }) };
  if (value.includes('zh.wikipedia.org')) {
    return {
      ok: true,
      json: async () => ({ query: { pages: {
        1: { title: '向日葵', thumbnail: { source: 'https://example.com/flower.jpg' } }
      } } })
    };
  }
  if (value.startsWith('/api/place-image?')) {
    return {
      ok: true,
      json: async () => ({
        source: '360',
        thumb: 'https://p.ssl.qhimgs.example/park.jpg',
        url: 'https://example.com/park.jpg',
        title: '北京向日葵公园实景',
        query: '北京 向日葵公园 景点 实景 环境',
        confidence: 120
      })
    };
  }
  throw new Error(`Unexpected fetch: ${value}`);
};
const { enrichPOIsWithImages } = await import('../js/services/mapService.js');
const pois = [{ name: '向日葵公园', cityname: '北京', address: '北京市朝阳区', type: '公园', lat: 39.9, lng: 116.4, photos: [] }];
await enrichPOIsWithImages(pois, 1);
assert.match(pois[0].photos[0], /^\/api\/proxy-image\?/);
assert.equal(pois[0].visionPhotoUrl, 'https://p.ssl.qhimgs.example/park.jpg');
assert.notEqual(pois[0].visionPhotoUrl, pois[0].photos[0]);
assert.equal(pois[0].photoMeta.source, '360');

globalThis.fetch = originalFetch;
console.log('agent-regression: all assertions passed');
