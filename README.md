# 一会去哪儿 🗺️

> 不知道去哪玩？输入一句话，AI 帮你安排。

**一会去哪儿** 是一个个性化出游推荐 Web 应用。输入"想带女朋友去个安静的地方散步"，它就能结合你的位置、实时天气、预算，从地图上真实的地点里给你挑出最合适的，一键导航出发。

界面采用 **Vercel 极简配色**（黑白高对比 + 蓝色强调），支持 **流式输出** 实时展示 AI 推理过程，并通过 **多模态视觉理解** 对景点配图进行真实校验。全程用 [TRAE](https://www.trae.cn/) 完成开发，参加了 TRAE AI 创造力大赛。

---

## 致谢 / 原作者

本项目 Fork 自 [@Baijidot/qunawan](https://github.com/Baijidot/qunawan)，在原作基础上进行了配色重构、流式输出、视觉确认、模板规范化等多项优化。

> 原作者仓库：https://github.com/Baijidot/qunawan

---

## 它能做什么

- **一句话理解需求** — 说人话就行。"带娃放电"能猜到是要去户外儿童友好的地方
- **真实地图 POI 搜索** — 基于 OpenStreetMap 数据，搜方圆 8 公里内的公园、博物馆、湖边等真实地点
- **多维匹配打分** — 结合距离、兴趣匹配度、天气（下雨不推户外）、交通、预算，算出最适合你的
- **高清配图** — 从 360 图片和必应自动抓取对应地点的实景图，过滤水印来源
- **实时天气** — 自动获取当地天气，天气不好不推爬山
- **灵感预设** — 上班族周末、带娃家庭、大学生探索、外地游客四种场景一键填充

---

## 快速体验

### 本地开发

```bash
# 方式一：Python 服务器（推荐，支持图片搜索）
python server.py
# → http://localhost:8765/

# 方式二：Vercel CLI
vercel dev
# → http://localhost:3000/
```

---

## 项目结构

```
一会去哪儿/
├── index.html           # 入口页面
├── server.py            # 本地开发服务器（图片搜索代理）
├── vercel.json          # Vercel 部署配置
├── package.json
├── .env.example         # 环境变量模板
├── css/
│   ├── tokens.css       # 设计令牌（色彩/间距/字体）
│   ├── base.css         # 基础样式
│   ├── layout.css       # 布局
│   ├── components.css   # 组件样式
│   └── motion.css       # 动效
├── js/
│   ├── app.js           # 主流程入口
│   ├── modules/
│   │   ├── state.js     # 全局状态管理
│   │   ├── renderer.js  # 渲染层（首页/推荐结果/设置弹窗）
│   │   ├── settings.js  # 用户设置管理
│   │   └── recommender.js # 静态推荐引擎
│   ├── services/
│   │   ├── mapService.js   # 地图 POI 搜索 + 图片获取
│   │   ├── llmService.js   # 大模型调用（硅基流动/DeepSeek等）
│   │   ├── localNlp.js     # 本地 NLP 解析（LLM 降级兜底）
│   │   └── weatherService.js # 天气获取
│   └── data/
│       ├── destinations.js  # 精选景点数据
│       └── weather.js       # 天气条件映射
├── api/                # Vercel Serverless Functions
│   ├── llm.js          # LLM 代理（环境变量读 Key）
│   ├── place-image.js  # 图片搜索（360/必应）
│   └── proxy-image.js  # 图片代理（解决跨域防盗链）
└── sw.js               # Service Worker（绕过缓存）
```

---

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | 原生 JavaScript + CSS（无框架） |
| 设计 | Vercel 极简配色（黑白 + #0070f3 蓝色强调） |
| 地图数据 | OpenStreetMap / Overpass API / Nominatim |
| 图片搜索 | 360 图片搜索 + 必应图片 async API + Wikimedia |
| AI 推荐 | 用户自定义（硅基流动/DeepSeek/智谱等） |
| 流式输出 | OpenAI SSE 流式协议 + 增量 DOM patch |
| 视觉确认 | OpenAI Vision 多模态（image_url + detail:low） |
| 天气 | wttr.in（免费） |
| 部署 | Vercel（Serverless Functions + SSE 透传） |

---

## 架构概要

```
用户浏览器
  ├── 静态文件 → Vercel CDN
  ├── /api/llm → 用户自定义大模型（Key 在服务端环境变量）
  ├── /api/place-image → 360图片 / 必应图片搜索
  └── /api/proxy-image → 图片代理中转

AI 流程：
  用户输入 → LLM 解析（或本地 NLP 降级）→ POI 搜索（Overpass API）
  → 图片获取 → 多维打分排序 → 展示推荐卡片
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `SILICONFLOW_API_KEY` | 推荐 | 硅基流动 API Key，用于 AI 推荐 |
| `AMAP_API_KEY` | 否 | 高德地图 Key（OSM 已有免费数据，非必需） |
| `BAIDU_API_KEY` | 否 | 百度地图 Key（备用） |

---

## 关于 TRAE

这个项目从头到尾都是跟 [TRAE](https://www.trae.cn/) 聊出来的。它就像一个不用说话的结对编程伙伴——我告诉它想要什么效果，它出代码，我调方向、修 bug、反复迭代。从"有个想法"到"能跑起来"，再到部署上线，全程没自己写过一行完整的代码文件，但每一行都是自己决策的结果。

---

## License

MIT