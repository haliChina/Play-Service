/**
 * LLM 代理 API — Vercel Serverless Function
 * 从环境变量读取硅基流动 API Key，转发请求，避免前端暴露 Key
 * 环境变量：SILICONFLOW_API_KEY
 */
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';
const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: '服务端未配置 SILICONFLOW_API_KEY 环境变量',
      hint: '请在 Vercel 项目设置中添加环境变量 SILICONFLOW_API_KEY'
    });
  }

  try {
    const body = req.body || {};
    const payload = {
      model: body.model || DEFAULT_MODEL,
      messages: body.messages || [],
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens || 2000,
    };

    if (body.response_format) {
      payload.response_format = body.response_format;
    }

    // 转发 tools/tool_choice（Agent ToolCall 必需，否则 Function Calling 失效）
    if (Array.isArray(body.tools) && body.tools.length > 0) {
      payload.tools = body.tools;
      payload.tool_choice = body.tool_choice || 'auto';
    }

    // 流式输出：转发 stream 标志，并以 SSE 管道回传
    const wantStream = body.stream === true;
    if (wantStream) {
      payload.stream = true;
    }

    const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `硅基流动API错误 (${response.status})`,
        detail: errorText.slice(0, 500),
      });
    }

    // 流式：直接管道上游 SSE 响应体到客户端
    if (wantStream && response.body) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 禁用代理缓冲，确保实时推送
      // 立即发送 200，让前端开始读取
      res.writeHead(200);
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } catch (e) {
          console.error('[llm] 流式管道异常:', e.message);
        } finally {
          res.end();
        }
      };
      return pump();
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'LLM代理请求失败',
      detail: error.message,
    });
  }
}
