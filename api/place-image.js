/**
 * 图片搜索 API — Vercel Serverless Function
 * 优先使用360图片（高质量、无水印），必应作为后备
 * 返回 JSON {url, source, thumb, width, height}
 */

// 有水印的图库网站域名
const WATERMARK_DOMAINS = [
  '699pic', 'shutterstock', 'gettyimages', 'visualchina', 'icphoto',
  'veer', 'tuchong', 'huaban', 'duitang', 'nipic', '58pic', 'redocn',
  'tu123', '898pic', '16pic', '588pic', '199pic', '99pic', 'picphoto',
  'photophoto', 'tooopen', 'pic11', 'pic12', 'pic13', 'pic14', 'pic15',
  'lanfw', 'fang.com', 'leju', 'anjuke', '58.com', 'ganji',
  'house', 'fangdd', 'lianjia', 'beike',
  'pconline', 'zcool', 'uisdc', 'th7', 'pic1.', 'pic2.', 'pic3.',
  'ent.', 'ydstatic', 'sinaimg', 'sina.com',
  'avatar', 'logo', 'icon',
];

// 优质图片来源域名
const GOOD_SOURCE_DOMAINS = [
  'ctrip', 'mafengwo', 'qyer', 'dianping', 'tripadvisor',
  'visitbeijing', 'gov.cn', 'baike.baidu', 'wikimedia', 'wikipedia',
  'amap', 'meituan', 'poco', 'lofter',
  'zhihu.com', 'zhimg.com', 'weixin',
  'sohu.com', 'sina.com.cn', 'ifeng.com', '163.com',
  'people.com.cn', 'xinhuanet', 'chinanews',
  'beijing.gov', 'china.com.cn',
];

// 内存缓存（serverless 实例级别）
const _cache = new Map();
const CACHE_TTL = 3600000; // 1小时

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { name, city = '', address = '', type = '', lat, lng } = req.query;

  if (!name) {
    return res.status(200).json({ url: '', source: '', thumb: '', width: 0, height: 0 });
  }

  const normalizedName = name.trim();
  const locationHint = [city, address].filter(Boolean).join(' ').trim();
  const queryContext = [city, normalizedName, type, '景点 实景 环境'].filter(Boolean).join(' ');

  // 检查缓存（地点名必须带城市/地址，避免不同城市同名 POI 共用错图）
  const cacheKey = [city, address, normalizedName, type].filter(Boolean).join('|');
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  // 策略0：仅采用标题与地点实体高度一致的百科图片。
  const wikiResult = await searchWikiImage(normalizedName, locationHint);
  if (wikiResult) {
    const data = {
      url: wikiResult.url,
      source: 'wiki',
      thumb: wikiResult.url,
      width: 600,
      height: 400,
      title: wikiResult.title,
      query: wikiResult.query,
      confidence: 100
    };
    _cache.set(cacheKey, { data, ts: Date.now() });
    return res.status(200).json(data);
  }

  // 策略1：通用图片搜索必须带地点上下文和“实景环境”约束。
  let result = await search360Images(queryContext, normalizedName, locationHint);
  if (result) {
    const data = {
      url: result.img || '', source: '360', thumb: result.thumb,
      width: result.width || 0, height: result.height || 0,
      title: result.title || '', query: queryContext, confidence: result.score || 0
    };
    _cache.set(cacheKey, { data, ts: Date.now() });
    return res.status(200).json(data);
  }

  // 策略2：放宽类型词，但仍保留城市与“公园/景区/地点实景”语义。
  const fallbackQuery = [city, normalizedName, '地点 实景 全景'].filter(Boolean).join(' ');
  result = await search360Images(fallbackQuery, normalizedName, locationHint);
  if (result) {
    const data = {
      url: result.img || '', source: '360', thumb: result.thumb,
      width: result.width || 0, height: result.height || 0,
      title: result.title || '', query: fallbackQuery, confidence: result.score || 0
    };
    _cache.set(cacheKey, { data, ts: Date.now() });
    return res.status(200).json(data);
  }

  // 策略3：必应图片搜索（高分辨率缩略图 800x600）
  result = await searchBingImages(queryContext, normalizedName, locationHint);
  if (result) {
    const data = {
      url: result.murl, source: 'bing', thumb: result.thumb,
      width: 800, height: 600, title: result.title || '',
      query: queryContext, confidence: result.score || 0
    };
    _cache.set(cacheKey, { data, ts: Date.now() });
    return res.status(200).json(data);
  }

  // 策略4：必应图片搜索（原始搜索词）
  result = await searchBingImages(fallbackQuery, normalizedName, locationHint);
  if (result) {
    const data = {
      url: result.murl, source: 'bing', thumb: result.thumb,
      width: 800, height: 600, title: result.title || '',
      query: fallbackQuery, confidence: result.score || 0
    };
    _cache.set(cacheKey, { data, ts: Date.now() });
    return res.status(200).json(data);
  }

  // 全部失败
  const data = { url: '', source: '', thumb: '', width: 0, height: 0 };
  _cache.set(cacheKey, { data, ts: Date.now() });
  return res.status(200).json(data);
}

/**
 * 从 Wikivoyage/Wikipedia 获取景点准确配图
 * 知名景点的百科图片准确率远高于通用图片搜索（避免动漫/卡通/无关内容错配）
 */
async function searchWikiImage(name, locationHint = '') {
  const query = [locationHint, name].filter(Boolean).join(' ');
  for (const wiki of ['zh.wikivoyage', 'zh.wikipedia']) {
    try {
      const url = `https://${wiki}.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|info&pithumbsize=600&piprop=thumbnail&inprop=url&redirects=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'yihui-qu-na-er/1.0 (tourism app)' },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const pages = Object.values(data?.query?.pages || {});
      const exact = pages.find(page => isRelevantPlaceTitle(name, page.title));
      if (exact?.thumbnail?.source) {
        return { url: exact.thumbnail.source, title: exact.title, query };
      }
    } catch (e) {
      // 单个 wiki 失败继续尝试下一个
    }
  }
  return null;
}

function normalizePlaceName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s·•()（）\-_—]/g, '')
    .replace(/(旅游景区|风景名胜区|风景区|景区)$/g, '');
}

function isRelevantPlaceTitle(placeName, title) {
  const place = normalizePlaceName(placeName);
  const page = normalizePlaceName(title);
  if (!place || !page) return false;
  if (!(page.includes(place) || place.includes(page))) return false;
  return page.length >= Math.max(3, Math.ceil(place.length * 0.72));
}

/**
 * 360图片搜索API
 */
async function search360Images(keyword, placeName = '', locationHint = '') {
  try {
    const url = `https://image.so.com/j?q=${encodeURIComponent(keyword)}&src=srp&pn=0&sn=30`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://image.so.com/',
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    const items = data.list || [];

    if (!items.length) return null;

    // 收集所有合格候选图片
    const candidates = [];
    for (const item of items) {
      const thumb = item.thumb || '';
      const img = item.img || '';
      const w = parseInt(item.width, 10) || 0;
      const h = parseInt(item.height, 10) || 0;

      if (!thumb) continue;
      if (w > 0 && h > 0 && (w < 400 || h < 300)) continue;

      const imgLower = (img || '').toLowerCase();
      const thumbLower = thumb.toLowerCase();
      if (WATERMARK_DOMAINS.some(bd => imgLower.includes(bd) || thumbLower.includes(bd))) continue;

      const title = String(item.title || item.litetitle || '');
      const pageText = `${title} ${item.site || ''} ${item.link || ''}`.toLowerCase();
      const normalizedPlace = normalizePlaceName(placeName);
      const normalizedTitle = normalizePlaceName(title);
      const locationToken = normalizePlaceName(locationHint).replace(/[省市区县].*$/g, '');

      // 纯主体图/素材图的标题风险高：例如“向日葵图片、花朵特写”。
      const subjectOnly = /图片|壁纸|素材|头像|插画|花语|植物图鉴|png|免抠/i.test(title)
        && !/公园|景区|景点|广场|园区|游玩|旅游|实景|全景|环境/i.test(title);
      if (subjectOnly) continue;

      // 计算来源与语义质量分
      let score = 0;
      if (GOOD_SOURCE_DOMAINS.some(gd => imgLower.includes(gd) || pageText.includes(gd))) score += 100;
      if (normalizedPlace && normalizedTitle.includes(normalizedPlace)) score += 90;
      else if (placeName && title.includes(placeName)) score += 70;
      if (/公园|景区|景点|广场|园区|游玩|旅游|实景|全景|环境/.test(title)) score += 25;
      if (locationToken && pageText.includes(locationToken)) score += 20;
      if (thumbLower.includes('qhimgs') || thumbLower.includes('qihoo')) score += 20;
      if (w > 0 && h > 0) score += Math.min(Math.floor(w * h / 10000), 30);
      if (w > 0 && h > 0 && w / h >= 1.25) score += 15;
      if (w > 0 && h > 0 && h > w * 1.25) score -= 20;

      candidates.push({ thumb, img, width: w, height: h, title, score });
    }

    if (!candidates.length) return null;

    // 按分数排序，选择最佳候选
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return {
      thumb: best.thumb,
      img: best.img,
      width: best.width,
      height: best.height,
      title: best.title,
      score: best.score
    };
  } catch (e) {
    console.error('[360图片] 搜索失败:', e.message);
  }
  return null;
}

/**
 * 必应图片搜索 async API
 */
async function searchBingImages(keyword) {
  try {
    const url = `https://cn.bing.com/images/async?q=${encodeURIComponent(keyword)}&first=1&count=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    });

    const rawHtml = await response.text();

    // 解码HTML实体
    const decoded = rawHtml.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    // 提取 murl（原始图片URL）
    const murlMatches = [...decoded.matchAll(/"murl":"(https?:\/\/[^"]+)"/g)].map(m => m[1]);

    // 过滤水印来源
    const filteredMurls = murlMatches.filter(u =>
      !WATERMARK_DOMAINS.some(bd => u.toLowerCase().includes(bd))
    );

    // 提取 OIP-C 缩略图URL
    const thumbMatches = [...rawHtml.matchAll(/(https:\/\/tse\d+-mm\.cn\.bing\.net\/th\/id\/OIP-C\.[^"?]+\?[^"]*w=(\d+)[^"]*h=(\d+)[^"]*)/g)];

    // 过滤出较大的缩略图，修改尺寸为 800x600
    const goodThumbs = [];
    for (const match of thumbMatches) {
      const fullUrl = match[1];
      const w = parseInt(match[2], 10);
      if (w >= 200) {
        let enlarged = fullUrl.replace(/w=\d+/, 'w=800').replace(/h=\d+/, 'h=600').replace(/&amp;/g, '&');
        goodThumbs.push(enlarged);
      }
    }

    const murl = filteredMurls[0] || murlMatches[0] || '';
    const thumb = goodThumbs[0] || '';

    if (murl || thumb) {
      return { murl, thumb };
    }
  } catch (e) {
    console.error('[必应图片] 搜索失败:', e.message);
  }
  return null;
}
