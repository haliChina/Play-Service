// ============================================
// 地图服务 — 默认免费(OpenStreetMap) + 可选增强(高德/百度)
// 零配置开箱即用，功能不缩水
// 一会去哪儿 · Map Service
// ============================================

import { getSettings } from '../modules/settings.js';
import { cityCoordinates } from '../data/userProfile.js';

// 高德地图 POI 类型编码映射
const AMAP_TYPE_MAP = {
  park: '110100', museum: '140100', restaurant: '050000', cafe: '050500',
  shopping: '060000', attraction: '110200', historic: '110300',
  cinema: '080600', library: '141100', sports: '150900',
};

// POI 类型 → 渐变色 + 图标映射（用于无图片时的视觉区分）
const POI_TYPE_VISUAL = {
  park:     { gradient: ['#43c463', '#2a9d4f'], icon: '🌿' },
  garden:   { gradient: ['#7bc67b', '#4ba84b'], icon: '🌸' },
  museum:   { gradient: ['#9b6dd4', '#7b4fb0'], icon: '🏛️' },
  restaurant: { gradient: ['#ff8a5b', '#e8673a'], icon: '🍜' },
  cafe:     { gradient: ['#c9a063', '#a67c42'], icon: '☕' },
  bar:      { gradient: ['#e85a8a', '#c43d6e'], icon: '🍸' },
  cinema:   { gradient: ['#5b6ee8', '#3d50c4'], icon: '🎬' },
  theatre:  { gradient: ['#e85a5a', '#c43d3d'], icon: '🎭' },
  library:  { gradient: ['#5b9be8', '#3d7bc4'], icon: '📚' },
  attraction: { gradient: ['#f5a623', '#d4860a'], icon: '⭐' },
  viewpoint:  { gradient: ['#5bc8e8', '#3da8c4'], icon: '👁️' },
  peak:     { gradient: ['#8ab85b', '#6a983b'], icon: '⛰️' },
  waterfall:{ gradient: ['#5bc8e8', '#3da8c4'], icon: '💦' },
  castle:   { gradient: ['#a06b5b', '#804b3b'], icon: '🏰' },
  tomb:     { gradient: ['#8a8a8a', '#6a6a6a'], icon: '🏛️' },
  mall:     { gradient: ['#e85ab8', '#c43d96'], icon: '🛍️' },
  sports:   { gradient: ['#5be8a8', '#3dc486'], icon: '⚽' },
  zoo:      { gradient: ['#e8b85b', '#c4963d'], icon: '🦁' },
  water:    { gradient: ['#5bc8e8', '#3da8c4'], icon: '🌊' },
  default:  { gradient: ['#6e8af5', '#4a6cd4'], icon: '📍' },
};

// 根据 OSM tags 获取 POI 视觉类型
function getPOIVisualType(tags) {
  // 自然类
  if (tags.leisure === 'park') return 'park';
  if (tags.leisure === 'garden') return 'garden';
  if (tags.natural === 'peak') return 'peak';
  if (tags.natural === 'water') return 'water';
  if (tags.natural === 'wood') return 'wood';
  if (tags.natural === 'wetland') return 'wetland';
  if (tags.waterway === 'waterfall') return 'waterfall';
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'national_park') return 'nature';
  if (tags.leisure === 'playground') return 'playground';
  if (tags.leisure === 'marina') return 'water';
  // 文化类
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'gallery') return 'gallery';
  if (tags.tourism === 'attraction') return 'attraction';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.tourism === 'zoo') return 'zoo';
  if (tags.tourism === 'theme_park') return 'attraction';
  if (tags.historic === 'castle') return 'castle';
  if (tags.historic === 'tomb') return 'tomb';
  if (tags.historic === 'ruins') return 'ruins';
  if (tags.historic === 'archaeological_site') return 'ruins';
  if (tags.amenity === 'library') return 'library';
  if (tags.amenity === 'arts_centre') return 'arts_centre';
  if (tags.amenity === 'theatre') return 'theatre';
  if (tags.amenity === 'place_of_worship') return 'temple';
  // 餐饮类
  if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food') return 'restaurant';
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'bar';
  if (tags.amenity === 'ice_cream' || tags.shop === 'bakery' || tags.shop === 'confectionery') return 'cafe';
  // 娱乐购物类
  if (tags.amenity === 'cinema') return 'cinema';
  if (tags.amenity === 'nightclub') return 'nightclub';
  if (tags.leisure === 'escape_game' || tags.leisure === 'amusement_arcade' || tags.leisure === 'water_park') return 'amusement';
  if (tags.shop === 'mall' || tags.shop === 'department_store') return 'shopping';
  if (tags.amenity === 'marketplace') return 'marketplace';
  // 体育类
  if (tags.leisure === 'sports_centre' || tags.leisure === 'pitch' || tags.leisure === 'swimming_pool' || tags.leisure === 'fitness_centre') return 'sports';
  return 'default';
}

// 从 OSM tags 提取图片 URL
function extractImageFromTags(tags) {
  // image 标签直接是图片URL
  if (tags.image && tags.image.startsWith('http')) return tags.image;
  // image:URL 标签
  if (tags['image:URL'] && tags['image:URL'].startsWith('http')) return tags['image:URL'];
  // wikimedia_commons 标签 — 直接用 Commons API 获取图片
  if (tags.wikimedia_commons) {
    const file = tags.wikimedia_commons.replace(/^File:/, '').replace(/\s/g, '_');
    // 使用 Wikimedia Special:FilePath 重定向（无需MD5计算）
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=400`;
  }
  return '';
}

// 为 POI 生成配图URL（基于类型和名称）
function generatePOIImage(poi, tags) {
  // 1. 先尝试从 OSM 标签提取真实图片
  const realImage = extractImageFromTags(tags);
  if (realImage) return realImage;

  // 2. 没有真实图片，返回空字符串（由前端用渐变+图标替代）
  return '';
}

// OSM Overpass 兴趣标签映射（免费，无需Key）— 基于兴趣类型，更全面
const OSM_INTEREST_TAG_MAP = {
  nature: ['leisure=park', 'leisure=garden', 'natural=peak', 'natural=wood', 'leisure=nature_reserve', 'boundary=national_park', 'natural=water', 'leisure=marina', 'natural=wetland'],
  culture: ['historic=castle', 'historic=tomb', 'tourism=museum', 'amenity=theatre', 'amenity=place_of_worship', 'historic=ruins', 'historic=archaeological_site'],
  food: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar', 'amenity=pub', 'amenity=food_court', 'amenity=ice_cream', 'shop=bakery', 'shop=confectionery'],
  photo: ['tourism=viewpoint', 'tourism=attraction', 'natural=peak', 'waterway=waterfall', 'leisure=park', 'tourism=museum', 'historic=castle', 'leisure=garden', 'natural=water', 'amenity=arts_centre'],
  kids: ['tourism=museum', 'leisure=park', 'amenity=library', 'tourism=zoo', 'leisure=playground', 'leisure=amusement_arcade', 'leisure=water_park'],
  indoor: ['tourism=museum', 'amenity=library', 'leisure=sports_centre', 'amenity=cinema', 'shop=mall', 'shop=department_store', 'leisure=escape_game', 'amenity=arts_centre'],
  sports: ['leisure=pitch', 'leisure=sports_centre', 'leisure=swimming_pool', 'leisure=fitness_centre', 'leisure=track', 'leisure=water_park', 'leisure=golf_course'],
  art: ['tourism=museum', 'amenity=arts_centre', 'amenity=theatre', 'amenity=cinema', 'tourism=gallery', 'shop=art'],
  entertainment: ['amenity=cinema', 'amenity=theatre', 'leisure=escape_game', 'amenity=nightclub', 'amenity=bar', 'amenity=pub', 'leisure=amusement_arcade', 'tourism=theme_park', 'leisure=water_park', 'shop=mall'],
  shopping: ['shop=mall', 'shop=department_store', 'shop=supermarket', 'shop=clothes', 'shop=electronics', 'amenity=marketplace'],
};

// 关键词到兴趣类型的映射（用于从中文关键词推断 OSM 标签）
const KEYWORD_TO_INTEREST = {
  '公园': 'nature', '植物园': 'nature', '湿地': 'nature', '风景区': 'nature', '自然': 'nature', '户外': 'nature', '森林': 'nature', '绿地': 'nature',
  '博物馆': 'indoor', '美术馆': 'art', '展览': 'art', '艺术': 'art',
  '美食': 'food', '餐厅': 'food', '小吃': 'food', '咖啡': 'food', '酒吧': 'food',
  '商场': 'indoor', '购物': 'indoor',
  '古迹': 'culture', '胡同': 'culture', '寺庙': 'culture', '历史': 'culture',
  '动物园': 'kids', '海洋馆': 'kids', '亲子': 'kids', '儿童': 'kids',
  '运动': 'sports', '徒步': 'sports', '健身': 'sports',
  '图书馆': 'indoor', '书店': 'indoor',
  '拍照': 'photo', '打卡': 'photo', '网红': 'photo',
};

// Overpass API 端点（多个镜像轮询）
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// Nominatim 端点
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

/**
 * 检查是否配置了地图API Key
 */
function hasMapApiKey() {
  const settings = getSettings();
  return !!(settings.mapApiKey && settings.mapApiKey.trim());
}

// ============================================
// 地理编码：地址 → 坐标
// ============================================
export async function geocode(address, city = '') {
  const settings = getSettings();

  // 优先使用配置的地图API（数据更准）
  if (hasMapApiKey()) {
    try {
      if (settings.mapProvider === 'amap') {
        return await amapGeocode(address, city, settings.mapApiKey);
      } else {
        return await baiduGeocode(address, city, settings.mapApiKey);
      }
    } catch (e) {
      console.warn('地图API地理编码失败，降级到Nominatim:', e.message);
    }
  }

  // 默认：使用 Nominatim 免费服务（无需Key）
  return await nominatimGeocode(address, city);
}

// ============================================
// 逆地理编码：坐标 → 地址
// ============================================
export async function reverseGeocode(lat, lng) {
  const settings = getSettings();

  if (hasMapApiKey()) {
    try {
      if (settings.mapProvider === 'amap') {
        return await amapReverseGeocode(lat, lng, settings.mapApiKey);
      } else {
        return await baiduReverseGeocode(lat, lng, settings.mapApiKey);
      }
    } catch (e) {
      console.warn('地图API逆地理编码失败，降级到Nominatim:', e.message);
    }
  }

  return await nominatimReverseGeocode(lat, lng);
}

// ============================================
// POI 关键词搜索
// ============================================
export async function searchPOIs(keywords, city = '', types = [], page = 1) {
  const settings = getSettings();

  if (hasMapApiKey()) {
    try {
      if (settings.mapProvider === 'amap') {
        return await amapSearchPOIs(keywords, city, types, page, settings.mapApiKey);
      } else {
        return await baiduSearchPOIs(keywords, city, types, page, settings.mapApiKey);
      }
    } catch (e) {
      console.warn('地图API搜索失败，降级到Overpass:', e.message);
    }
  }

  // 默认：使用 Overpass API（免费，无需Key）
  // 先通过Nominatim获取城市坐标，再周边搜索
  const cityCenter = await getCityCenter(city);
  if (cityCenter) {
    return await overpassSearchNearby(cityCenter.lat, cityCenter.lng, keywords, types, 8000);
  }
  return [];
}

// ============================================
// 周边搜索：在指定坐标附近搜索 POI
// ============================================
export async function searchNearby(lat, lng, keywords = '', types = [], radius = 5000) {
  const settings = getSettings();

  if (hasMapApiKey()) {
    try {
      if (settings.mapProvider === 'amap') {
        return await amapSearchNearby(lat, lng, keywords, types, radius, settings.mapApiKey);
      } else {
        return await baiduSearchNearby(lat, lng, keywords, types, radius, settings.mapApiKey);
      }
    } catch (e) {
      console.warn('地图API周边搜索失败，降级到Overpass:', e.message);
    }
  }

  // 默认：使用 Overpass API（免费，无需Key）
  return await overpassSearchNearby(lat, lng, keywords, types, radius);
}

// ============================================
// Nominatim 免费地理编码（无需Key）
// ============================================
async function nominatimGeocode(address, city) {
  const q = city ? `${address}, ${city}` : address;
  const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=zh-CN&countrycodes=cn`;

  // 8秒超时，避免长时间等待
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  if (!response.ok) throw new Error(`Nominatim请求失败: ${response.status}`);
  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`地址"${address}"未找到`);
  }

  const result = data[0];
  const addr = result.address || {};
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    formattedAddress: result.display_name || address,
    province: addr.state || addr.province || '',
    city: addr.city || addr.town || addr.county || addr.municipality || city || '',
    district: addr.suburb || addr.district || addr.city_district || addr.county || '',
    level: result.type || '',
    isRealData: true,
    source: 'OpenStreetMap'
  };
}

// ============================================
// Nominatim 免费逆地理编码（无需Key）
// ============================================
async function nominatimReverseGeocode(lat, lng) {
  const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) throw new Error(`Nominatim逆地理编码失败: ${response.status}`);
  const data = await response.json();

  const addr = data.address || {};
  return {
    formattedAddress: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    province: addr.state || '',
    city: addr.city || addr.town || addr.county || '',
    district: addr.suburb || addr.district || '',
    street: addr.road || '',
    streetNumber: addr.house_number || '',
    township: addr.town || '',
    adcode: '',
    citycode: '',
    pois: [],
    isRealData: true,
    source: 'OpenStreetMap'
  };
}

// ============================================
// Overpass API 免费 POI 搜索（无需Key）— 优化版
// 单次查询所有兴趣类型，带超时和重试
// ============================================
async function overpassSearchNearby(lat, lng, keywords, types, radius) {
  // 1. 收集所有 OSM 标签
  const tagSet = new Set();
  const interests = new Set();

  // 从 types 参数添加兴趣类型（app.js 传入的 interests 数组）
  if (types && types.length > 0) {
    for (const t of types) {
      if (OSM_INTEREST_TAG_MAP[t]) {
        interests.add(t);
      }
    }
  }

  // 从关键词推断兴趣类型
  if (keywords) {
    const kwStr = String(keywords);
    for (const [kw, interest] of Object.entries(KEYWORD_TO_INTEREST)) {
      if (kwStr.includes(kw)) {
        interests.add(interest);
      }
    }
  }

  // 从 interests 添加标签
  for (const interest of interests) {
    const tags = OSM_INTEREST_TAG_MAP[interest] || [];
    tags.forEach(tag => tagSet.add(tag));
  }

  // 不再强制注入餐饮标签
  // 用户如果需要餐饮，会在需求中提到，NLP会解析出 food 兴趣
  // 这样避免大量餐饮POI淹没用户真正想要的景点

  // 如果没有标签，使用默认（公园+景点+餐厅+咖啡厅）
  if (tagSet.size === 0) {
    ['leisure=park', 'tourism=museum', 'tourism=attraction', 'amenity=restaurant', 'amenity=cafe'].forEach(t => tagSet.add(t));
  }

  // 2. 构建 Overpass QL 查询（同时搜索 node 和 way，合并所有标签到单次查询）
  const tagFiltersNode = Array.from(tagSet).map(tag => {
    const [key, value] = tag.split('=');
    return `node["${key}"="${value}"](around:${radius},${lat},${lng});`;
  }).join('');

  const tagFiltersWay = Array.from(tagSet).map(tag => {
    const [key, value] = tag.split('=');
    return `way["${key}"="${value}"](around:${radius},${lat},${lng});`;
  }).join('');

  const query = `
    [out:json][timeout:25];
    (
      ${tagFiltersNode}
      ${tagFiltersWay}
    );
    out body qt 100;
    >;
    out skel qt;
  `;

  console.log(`[Overpass] 搜索 ${interests.size} 种兴趣类型，${tagSet.size} 个标签，半径 ${radius}m`);

  // 3. 带超时地轮询尝试多个端点
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒超时

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Overpass端点 ${endpoint} 返回 ${response.status}`);
        continue;
      }

      const data = await response.json();
      const results = parseOverpassResults(data, lat, lng, interests);
      console.log(`[Overpass] ${endpoint} 返回 ${results.length} 个结果`);
      if (results.length > 0) return results;
    } catch (e) {
      console.warn(`Overpass端点 ${endpoint} 失败:`, e.name === 'AbortError' ? '超时' : e.message);
      continue;
    }
  }

  console.warn('所有Overpass端点不可用或无结果');
  return [];
}

function parseOverpassResults(data, userLat, userLng, userInterests) {
  if (!data || !data.elements) return [];
  const interests = userInterests || new Set();

  // 垃圾名称过滤 — 排除非地点结果（歌曲、抽象概念等）
  const BAD_NAME_PATTERNS = [
    /校歌/, /纪念碑文/, /题词/, /碑文/, /铭文/, /口号/, /标语/,
    /雕塑$/, /雕像$/, /^塑像/, /浮雕$/,
  ];
  // 动物园笼舍名称过滤 — 排除单个动物展品（如"狐狸舍""豪猪"等）
  const ANIMAL_NAME_PATTERNS = [
    /猴$/, /鹿$/, /虎$/, /狮$/, /熊$/, /豹$/, /狼$/, /狐$/, /獭$/, /鼠$/, /猫$/, /狗$/, /兔$/,
    /马$/, /牛$/, /羊$/, /鸡$/, /鸭$/, /鹅$/, /鸟$/, /蛇$/, /龟$/, /鱼$/, /虫$/,
    /孔雀/, /企鹅/, /熊猫/, /考拉/, /袋鼠/, /长颈鹿/, /斑马/, /大象/, /河马/, /犀牛/,
    /豪猪/, /松鼠/, /水豚/, /羊驼/, /鸵鸟/, /鹦鹉/, /猩猩/, /猿/,
    /.+舍$/, // 以"舍"结尾的动物笼舍（如"狐狸舍""鼬舍"）
  ];
  // 需要过滤的 OSM 标签值（historic=monument 等小雕塑/路牌）
  const LOW_VALUE_TAGS = ['historic=monument', 'historic=memorial', 'tourism=artwork', 'historic=wayside_shrine'];

  // 构建 node 和 way 的索引
  const nodes = {};
  const ways = [];
  for (const el of data.elements) {
    if (el.type === 'node' && el.lat && el.lon) {
      nodes[el.id] = el;
    } else if (el.type === 'way') {
      ways.push(el);
    }
  }

  // 处理 node 类型的元素
  const nodeResults = Object.values(nodes)
    .filter(el => el.tags)
    .filter(el => {
      const tags = el.tags;
      const tagStr = Object.entries(tags).map(([k,v]) => `${k}=${v}`).join(',');
      for (const bad of LOW_VALUE_TAGS) {
        if (tagStr.includes(bad)) return false;
      }
      return true;
    })
    .map(el => {
      const tags = el.tags;
      const rawName = tags.name || tags['name:zh'] || tags.brand || '';
      const name = rawName || detectPOIName(tags);
      const distance = calcDistance(userLat, userLng, el.lat, el.lon);
      return {
        id: `osm-${el.id}`,
        name: name,
        type: detectPOIType(tags),
        typecode: '',
        address: formatOSMAddress(tags, el.lat, el.lon),
        pname: '',
        cityname: '',
        adname: tags['addr:suburb'] || tags['addr:district'] || '',
        lat: el.lat,
        lng: el.lon,
        distance: Math.round(distance),
        tel: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        openHours: tags.opening_hours || '',
        rating: '',
        cost: '',
        photos: generatePOIImage(null, tags) ? [generatePOIImage(null, tags)] : [],
        tag: tags.tourism || tags.leisure || tags.amenity || tags.historic || tags.natural || '',
        visualType: getPOIVisualType(tags),
        wikidata: tags.wikidata || '',
        wikipedia: tags.wikipedia || '',
        businessArea: '',
        isRealData: true,
        source: 'OpenStreetMap'
      };
    });

  // 处理 way 类型的元素（计算中心坐标）
  const wayResults = ways
    .filter(el => el.tags)
    .filter(el => {
      const tags = el.tags;
      const tagStr = Object.entries(tags).map(([k,v]) => `${k}=${v}`).join(',');
      for (const bad of LOW_VALUE_TAGS) {
        if (tagStr.includes(bad)) return false;
      }
      return true;
    })
    .map(el => {
      const tags = el.tags;
      const rawName = tags.name || tags['name:zh'] || tags.brand || '';
      const name = rawName || detectPOIName(tags);
      // 计算 way 的中心坐标
      const center = calcWayCenter(el, nodes);
      const distance = center ? calcDistance(userLat, userLng, center.lat, center.lng) : 999999;
      return {
        id: `osm-way-${el.id}`,
        name: name,
        type: detectPOIType(tags),
        typecode: '',
        address: center ? formatOSMAddress(tags, center.lat, center.lng) : '',
        pname: '',
        cityname: '',
        adname: tags['addr:suburb'] || tags['addr:district'] || '',
        lat: center ? center.lat : 0,
        lng: center ? center.lng : 0,
        distance: Math.round(distance),
        tel: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        openHours: tags.opening_hours || '',
        rating: '',
        cost: '',
        photos: generatePOIImage(null, tags) ? [generatePOIImage(null, tags)] : [],
        tag: tags.tourism || tags.leisure || tags.amenity || tags.historic || tags.natural || '',
        visualType: getPOIVisualType(tags),
        wikidata: tags.wikidata || '',
        wikipedia: tags.wikipedia || '',
        businessArea: '',
        isRealData: true,
        source: 'OpenStreetMap'
      };
    });

  // 合并 node 和 way 结果
  const allResults = [...nodeResults, ...wayResults];

  // 1. 基础过滤：垃圾名称、名称长度、泛化名称、去重
  const filtered = allResults
    .filter(p => {
      if (!p.name || p.name === '未命名') return false;
      for (const pattern of BAD_NAME_PATTERNS) {
        if (pattern.test(p.name)) return false;
      }
      for (const pattern of ANIMAL_NAME_PATTERNS) {
        if (pattern.test(p.name)) return false;
      }
      return true;
    })
    .filter(p => p.name.length >= 2)
    .filter(p => {
      const genericNames = ['景点', '观景点', '公园', '花园', '博物馆', '餐厅', '咖啡厅', '电影院', '商场', '地点'];
      if (genericNames.includes(p.name) && (!p.lat || !p.lng)) return false;
      return true;
    })
    .filter((p, idx, arr) => idx === arr.findIndex(q => q.name === p.name))
    .sort((a, b) => (a.distance || 999999) - (b.distance || 999999));

  // 2. 类别平衡：按 visualType 分组，根据用户兴趣动态调整比例
  // 将结果分为三大类：主要兴趣（公园/博物馆/景点等）、餐饮、娱乐购物
  const MAIN_TYPES = ['park', 'garden', 'museum', 'viewpoint', 'attraction', 'water', 'waterfall', 'castle', 'ruins', 'zoo', 'gallery', 'arts_centre', 'library', 'playground', 'nature', 'peak', 'wood', 'wetland', 'temple', 'tomb'];
  const FOOD_TYPES = ['restaurant', 'cafe', 'bar'];
  const ENTERTAIN_TYPES = ['cinema', 'theatre', 'shopping', 'nightclub', 'amusement', 'marketplace', 'sports'];

  const mainPois = filtered.filter(p => MAIN_TYPES.includes(p.visualType));
  const foodPois = filtered.filter(p => FOOD_TYPES.includes(p.visualType));
  const entertainPois = filtered.filter(p => ENTERTAIN_TYPES.includes(p.visualType));
  const otherPois = filtered.filter(p => ![...MAIN_TYPES, ...FOOD_TYPES, ...ENTERTAIN_TYPES].includes(p.visualType));

  console.log(`[类别平衡] 主要兴趣:${mainPois.length} 餐饮:${foodPois.length} 娱乐:${entertainPois.length} 其他:${otherPois.length}`);

  // 动态配额：根据用户兴趣类型调整比例
  // 如果用户明确要 food，餐饮占40%；否则餐饮占15%
  // 如果用户明确要 entertainment，娱乐占30%；否则娱乐占5%
  // 主要兴趣始终占主体
  const TARGET_TOTAL = 30;
  const userWantsFood = interests.has('food');
  const userWantsEntertainment = interests.has('entertainment') || interests.has('art');

  let mainRatio = 0.75, foodRatio = 0.15, entertainRatio = 0.05;
  if (userWantsFood) { foodRatio = 0.40; mainRatio = 0.50; }
  if (userWantsEntertainment) { entertainRatio = 0.25; mainRatio = userWantsFood ? 0.35 : 0.65; }

  const mainQuota = Math.min(mainPois.length, Math.ceil(TARGET_TOTAL * mainRatio));
  const foodQuota = Math.min(foodPois.length, Math.ceil(TARGET_TOTAL * foodRatio));
  const entertainQuota = Math.min(entertainPois.length, Math.ceil(TARGET_TOTAL * entertainRatio));
  const otherQuota = Math.min(otherPois.length, TARGET_TOTAL - mainQuota - foodQuota - entertainQuota);

  // 从每个类别中按距离取最近的
  const mainPick = mainPois.slice(0, mainQuota);
  const foodPick = foodPois.slice(0, foodQuota);
  const entertainPick = entertainPois.slice(0, entertainQuota);
  const otherPick = otherPois.slice(0, otherQuota);

  // 交错排列各类别，确保前10个结果有多样性
  // 动态模式：根据各类别数量调整交错频率
  const interleaved = [];
  const pools = [mainPick, foodPick, entertainPick, otherPick];
  const poolIdx = [0, 0, 0, 0];
  // 交错模式：主要兴趣优先，餐饮次之
  const pattern = [0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1];
  for (const p of pattern) {
    if (interleaved.length >= TARGET_TOTAL) break;
    if (poolIdx[p] < pools[p].length) {
      interleaved.push(pools[p][poolIdx[p]]);
      poolIdx[p]++;
    }
  }

  // 如果交错后不够，从剩余中补充
  const pickedIds = new Set(interleaved.map(p => p.id));
  const remaining = filtered.filter(p => !pickedIds.has(p.id));
  while (interleaved.length < TARGET_TOTAL && remaining.length > 0) {
    interleaved.push(remaining.shift());
  }

  const finalResults = interleaved.slice(0, TARGET_TOTAL);
  console.log(`[类别平衡] 最终结果: ${finalResults.length} 个 (主要兴趣:${mainPick.length} 餐饮:${foodPick.length} 娱乐:${entertainPick.length})`);
  return finalResults;
}

// 计算 way 元素的中心坐标
function calcWayCenter(way, nodes) {
  if (!way.nodes || way.nodes.length === 0) return null;
  let sumLat = 0, sumLng = 0, count = 0;
  for (const nodeId of way.nodes) {
    const node = nodes[nodeId];
    if (node && node.lat && node.lon) {
      sumLat += node.lat;
      sumLng += node.lon;
      count++;
    }
  }
  if (count === 0) return null;
  return { lat: sumLat / count, lng: sumLng / count };
}

// 当没有 name 标签时，根据其他标签生成一个描述性名称
function detectPOIName(tags) {
  if (tags.leisure === 'park') return '公园';
  if (tags.leisure === 'garden') return '花园';
  if (tags.tourism === 'museum') return '博物馆';
  if (tags.amenity === 'restaurant') return '餐厅';
  if (tags.amenity === 'cafe') return '咖啡厅';
  if (tags.amenity === 'bar') return '酒吧';
  if (tags.amenity === 'cinema') return '电影院';
  if (tags.amenity === 'library') return '图书馆';
  if (tags.tourism === 'attraction') return '景点';
  if (tags.tourism === 'viewpoint') return '观景点';
  if (tags.natural === 'peak') return '山峰';
  if (tags.waterway === 'waterfall') return '瀑布';
  if (tags.historic === 'castle') return '城堡';
  if (tags.historic === 'tomb') return '古迹';
  if (tags.shop === 'mall') return '商场';
  if (tags.leisure === 'sports_centre') return '运动中心';
  return '';
}

function detectPOIType(tags) {
  if (tags.leisure === 'park') return '公园';
  if (tags.leisure === 'garden') return '花园';
  if (tags.tourism === 'museum') return '博物馆';
  if (tags.amenity === 'restaurant') return '餐厅';
  if (tags.amenity === 'fast_food') return '快餐';
  if (tags.amenity === 'cafe') return '咖啡厅';
  if (tags.amenity === 'bar') return '酒吧';
  if (tags.amenity === 'pub') return '酒馆';
  if (tags.amenity === 'food_court') return '美食广场';
  if (tags.amenity === 'ice_cream') return '甜品店';
  if (tags.amenity === 'cinema') return '电影院';
  if (tags.amenity === 'theatre') return '剧院';
  if (tags.amenity === 'nightclub') return '夜店';
  if (tags.amenity === 'library') return '图书馆';
  if (tags.amenity === 'arts_centre') return '艺术中心';
  if (tags.leisure === 'escape_game') return '密室逃脱';
  if (tags.leisure === 'amusement_arcade') return '游乐场';
  if (tags.leisure === 'water_park') return '水上乐园';
  if (tags.leisure === 'sports_centre') return '运动中心';
  if (tags.leisure === 'fitness_centre') return '健身房';
  if (tags.leisure === 'swimming_pool') return '游泳馆';
  if (tags.leisure === 'golf_course') return '高尔夫';
  if (tags.tourism === 'attraction') return '景点';
  if (tags.tourism === 'viewpoint') return '观景台';
  if (tags.tourism === 'zoo') return '动物园';
  if (tags.tourism === 'theme_park') return '主题乐园';
  if (tags.tourism === 'gallery') return '画廊';
  if (tags.historic === 'castle') return '城堡';
  if (tags.historic === 'tomb') return '古迹';
  if (tags.historic === 'ruins') return '遗址';
  if (tags.natural === 'peak') return '山峰';
  if (tags.natural === 'water') return '湖泊';
  if (tags.waterway === 'waterfall') return '瀑布';
  if (tags.shop === 'mall') return '商场';
  if (tags.shop === 'department_store') return '百货商场';
  if (tags.shop === 'supermarket') return '超市';
  if (tags.shop === 'bakery') return '面包房';
  if (tags.shop === 'confectionery') return '糖果店';
  if (tags.amenity === 'marketplace') return '市场';
  if (tags.shop) return '购物';
  if (tags.historic) return '古迹';
  return '地点';
}

function formatOSMAddress(tags, lat, lon) {
  const parts = [];
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:suburb']) parts.push(tags['addr:suburb']);
  if (tags['addr:district']) parts.push(tags['addr:district']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber'] + '号');

  if (parts.length > 0) return parts.join('');

  // 有完整地址则返回
  if (tags['addr:full']) return tags['addr:full'];

  // 没有地址标签，用坐标生成可读地址
  if (lat && lon) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  return '';
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 城市中心坐标 — 使用统一数据源（50+城市）
async function getCityCenter(city) {
  if (!city) return null;
  // 先查本地坐标表（覆盖全国50+主要城市）
  if (cityCoordinates[city]) return cityCoordinates[city];
  // 尝试从行政区划数据中查找（覆盖全国所有地级市）
  try {
    const { adminDivisions } = await import('../data/adminDivisions.js');
    for (const provName of Object.keys(adminDivisions)) {
      const prov = adminDivisions[provName];
      for (const c of (prov.cities || [])) {
        const cityNameShort = c.name.replace(/市$/, '');
        if (c.name === city || cityNameShort === city || cityNameShort === city.replace(/市$/, '')) {
          return { lat: c.lat, lng: c.lng };
        }
      }
    }
  } catch (e) {
    console.warn('[地图] 行政区划数据加载失败:', e.message);
  }
  // 本地没有，通过 Nominatim 在线查询
  try {
    console.log(`[地图] 本地无${city}坐标，在线查询...`);
    return await nominatimGeocode(city, '');
  } catch {
    return null;
  }
}

// ============================================
// 高德地图 API 实现（配置Key后使用）
// ============================================
async function amapGeocode(address, city, apiKey) {
  let url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${apiKey}&output=JSON`;
  if (city) url += `&city=${encodeURIComponent(city)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`高德地理编码失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== '1' || !data.geocodes?.length) throw new Error(`地址解析失败: ${data.info}`);
  const geo = data.geocodes[0];
  const [lng, lat] = geo.location.split(',').map(Number);
  return { lat, lng, formattedAddress: geo.formatted_address || address, province: geo.province || '', city: geo.city || '', district: geo.district || '', level: geo.level || '', isRealData: true, source: '高德地图' };
}

async function amapReverseGeocode(lat, lng, apiKey) {
  const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${apiKey}&extensions=all&radius=1000&output=JSON`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`高德逆地理编码失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== '1') throw new Error(`逆地理编码失败: ${data.info}`);
  const rego = data.regeocode;
  const comp = rego.addressComponent;
  return {
    formattedAddress: rego.formatted_address || '', province: comp.province || '', city: comp.city || '',
    district: comp.district || '', street: comp.street || '', streetNumber: comp.streetNumber?.number || '',
    township: comp.township || '', adcode: comp.adcode || '', citycode: comp.citycode || '',
    pois: (rego.pois || []).slice(0, 5).map(p => ({ name: p.name, type: p.type, distance: p.distance, address: p.address, location: p.location })),
    isRealData: true, source: '高德地图'
  };
}

async function amapSearchPOIs(keywords, city, types, page, apiKey) {
  let url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keywords)}&key=${apiKey}&offset=20&page=${page}&extensions=all&output=JSON`;
  if (city) url += `&city=${encodeURIComponent(city)}&citylimit=true`;
  if (types?.length) {
    const codes = types.map(t => AMAP_TYPE_MAP[t] || t).filter(Boolean).join('|');
    if (codes) url += `&types=${codes}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`高德POI搜索失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== '1') throw new Error(`POI搜索失败: ${data.info}`);
  return (data.pois || []).map(parseAmapPOI);
}

async function amapSearchNearby(lat, lng, keywords, types, radius, apiKey) {
  let url = `https://restapi.amap.com/v3/place/around?location=${lng},${lat}&key=${apiKey}&radius=${radius}&sortrule=distance&offset=20&extensions=all&output=JSON`;
  if (keywords) url += `&keywords=${encodeURIComponent(keywords)}`;
  if (types?.length) {
    const codes = types.map(t => AMAP_TYPE_MAP[t] || t).filter(Boolean).join('|');
    if (codes) url += `&types=${codes}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`高德周边搜索失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== '1') throw new Error(`周边搜索失败: ${data.info}`);
  return (data.pois || []).map(parseAmapPOI);
}

function parseAmapPOI(poi) {
  const [lng, lat] = (poi.location || '0,0').split(',').map(Number);
  const address = poi.address || (lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '');
  return {
    id: poi.id || `amap-${Math.random()}`, name: poi.name || '未知', type: poi.type || '',
    typecode: poi.typecode || '', address,
    pname: poi.pname || '', cityname: poi.cityname || '', adname: poi.adname || '',
    lat, lng, distance: poi.distance ? parseInt(poi.distance) : null,
    tel: poi.tel || '', website: poi.website || '', openHours: poi.biz_ext?.open_hours || '',
    rating: poi.biz_ext?.rating || '', cost: poi.biz_ext?.cost || '',
    photos: (poi.photos || []).map(p => p.url).filter(Boolean), tag: poi.tag || '',
    businessArea: poi.businessarea || '', isRealData: true, source: '高德地图'
  };
}

// ============================================
// 百度地图 API 实现（配置Key后使用）
// ============================================
async function baiduGeocode(address, city, apiKey) {
  let url = `https://api.map.baidu.com/geocoding/v3/?address=${encodeURIComponent(address)}&ak=${apiKey}&output=json`;
  if (city) url += `&city=${encodeURIComponent(city)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`百度地理编码失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== 0) throw new Error(`地址解析失败: ${data.message}`);
  const r = data.result;
  return { lat: r.location.lat, lng: r.location.lng, formattedAddress: address, province: '', city: city || '', district: '', level: r.level || '', isRealData: true, source: '百度地图' };
}

async function baiduReverseGeocode(lat, lng, apiKey) {
  const url = `https://api.map.baidu.com/reverse_geocoding/v3/?location=${lat},${lng}&ak=${apiKey}&output=json&extensions_poi=1&radius=1000`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`百度逆地理编码失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== 0) throw new Error(`逆地理编码失败: ${data.message}`);
  const r = data.result;
  const comp = r.addressComponent;
  return {
    formattedAddress: r.formatted_address || '', province: comp.province || '', city: comp.city || '',
    district: comp.district || '', street: comp.street || '', streetNumber: comp.street_number || '',
    township: comp.town || '', adcode: comp.adcode || '', citycode: comp.city_code || '',
    pois: (r.pois || []).slice(0, 5).map(p => ({ name: p.name, type: p.tag, distance: p.distance, address: p.addr, location: `${p.point.x},${p.point.y}` })),
    isRealData: true, source: '百度地图'
  };
}

async function baiduSearchPOIs(keywords, city, types, page, apiKey) {
  let url = `https://api.map.baidu.com/place/v2/search?query=${encodeURIComponent(keywords)}&ak=${apiKey}&output=json&page_size=20&page_num=${page - 1}&scope=2`;
  if (city) url += `&region=${encodeURIComponent(city)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`百度POI搜索失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== 0) throw new Error(`POI搜索失败: ${data.message}`);
  return (data.results || []).map(parseBaiduPOI);
}

async function baiduSearchNearby(lat, lng, keywords, types, radius, apiKey) {
  let url = `https://api.map.baidu.com/place/v2/search?query=${encodeURIComponent(keywords || '景点')}&location=${lat},${lng}&radius=${radius}&ak=${apiKey}&output=json&page_size=20&scope=2&radius_limit=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`百度周边搜索失败: ${response.status}`);
  const data = await response.json();
  if (data.status !== 0) throw new Error(`周边搜索失败: ${data.message}`);
  return (data.results || []).map(parseBaiduPOI);
}

function parseBaiduPOI(poi) {
  const lat = poi.location?.lat || 0;
  const lng = poi.location?.lng || 0;
  const address = poi.address || (lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '');
  return {
    id: poi.uid || `baidu-${Math.random()}`, name: poi.name || '未知',
    type: poi.detail?.tag || poi.tag || '', typecode: '',
    address, pname: '', cityname: '', adname: '',
    lat: poi.location?.lat || 0, lng: poi.location?.lng || 0,
    distance: poi.detail?.distance ? parseInt(poi.detail.distance) : null,
    tel: poi.telephone || poi.detail?.telephone || '', website: poi.detail?.detail_url || '',
    openHours: poi.detail?.open_hours || '', rating: poi.detail?.overall_rating || '',
    cost: poi.detail?.price || '', photos: [], tag: poi.detail?.tag || '',
    businessArea: '', isRealData: true, source: '百度地图'
  };
}

/**
 * 格式化距离
 */
export function formatDistance(meters) {
  if (!meters && meters !== 0) return '';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 生成导航链接
 */
export function getNavigateUrl(lat, lng, name, provider = 'amap') {
  if (provider === 'amap') {
    return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&coordinate=wgs84&callnative=1`;
  } else {
    return `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodeURIComponent(name)}&content=导航前往&output=html&src=webapp.yihui`;
  }
}

// ============================================
// 真实图片获取 — 通过本地服务器代理（百度/必应图片搜索）
// ============================================

/**
 * 通过本地服务器API搜索地点真实照片
 * 服务器端调用百度/必应图片搜索，返回真实图片URL
 * @param {string} name - POI 名称
 * @param {number} lat - 纬度（预留）
 * @param {number} lng - 经度（预留）
 * @returns {Promise<string>} 图片URL（通过代理）或空字符串
 */
async function fetchImageFromSearch(name, lat, lng) {
  if (!name || name.length < 2) return '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const params = new URLSearchParams({ name, lat: lat || '', lng: lng || '' });
    const res = await fetch(`/api/place-image?${params}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return '';
    const data = await res.json();

    // 策略1：360图片CDN缩略图（高质量、无水印，分辨率可达800x1067+）
    // 通过代理加载，避免浏览器 ORB/CORS 跨域阻断
    if (data.source === '360' && data.thumb) {
      return `/api/proxy-image?url=${encodeURIComponent(data.thumb)}`;
    }

    // 策略2：必应高分辨率缩略图（800x600，Bing CDN直连）
    if (data.thumb) {
      return data.thumb;
    }

    // 策略3：通过代理访问原始图片URL（避免防盗链）
    if (data.url) {
      return `/api/proxy-image?url=${encodeURIComponent(data.url)}`;
    }
  } catch (e) {
    console.warn(`[图片搜索] 获取失败 ${name}:`, e.message);
  }
  return '';
}

/**
 * 从 Wikipedia/Wikivoyage 获取景点准确配图
 * 知名景点的百科图片准确率远高于通用图片搜索（避免米老鼠/动漫等错配）
 * 使用 generator=search + prop=pageimages 一步搜索+取图，CORS 友好（origin=*）
 * @param {string} name - 景点名
 * @returns {Promise<string>} 图片URL或空字符串
 */
async function fetchImageFromWiki(name) {
  if (!name || name.length < 2) return '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    // 先查 Wikivoyage（旅游条目配图最相关），再查 Wikipedia
    for (const wiki of ['zh.wikivoyage', 'zh.wikipedia']) {
      try {
        const url = `https://${wiki}.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=1&prop=pageimages&pithumbsize=600&piprop=thumbnail&redirects=1`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) continue;
        const data = await res.json();
        const pages = data?.query?.pages || {};
        const first = Object.values(pages)[0];
        if (first && first.thumbnail && first.thumbnail.source) {
          return first.thumbnail.source;
        }
      } catch {
        // 单个 wiki 失败继续尝试下一个
      }
    }
  } catch (e) {
    console.warn(`[Wiki图片] 获取失败 ${name}:`, e.message);
  } finally {
    clearTimeout(timeoutId);
  }
  return '';
}

/**
 * 生成地图瓦片预览图（用 POI 坐标计算瓦片编号，使用高德瓦片服务）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {string} 瓦片图片URL
 */
function generateStaticMapPreview(lat, lng) {
  if (!lat || !lng) return '';
  // 计算 zoom=16 时的瓦片编号
  const zoom = 16;
  const n = Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  const x = Math.floor((lng + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  // 使用高德地图瓦片服务（免费，无需key，中国大陆速度快）
  const server = (x + y) % 4 + 1;
  return `https://webrd0${server}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${x}&y=${y}&z=${zoom}`;
}

/**
 * 批量为 POI 列表获取真实图片
 * 优先级：本地图片搜索（百度/必应） > 地图瓦片预览
 * @param {Array} pois - POI 列表
 * @param {number} limit - 最多处理多少个（默认前15个，即展示的）
 */
export async function enrichPOIsWithImages(pois, limit = 15) {
  // 过滤需要获取图片的 POI：有名字、无现有图片即可（兼容 Agent 返回的推荐地点）
  const toFetch = pois.slice(0, limit).filter(p => p.name && (!p.photos || p.photos.length === 0) && (!p.imageUrl || p.imageUrl === ''));
  console.log(`[图片增强] 需要获取图片的POI: ${toFetch.length}/${Math.min(pois.length, limit)}`);

  // 并发获取，限制并发数为5
  const CONCURRENCY = 5;
  const results = [];
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const batch = toFetch.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(async (poi) => {
      // 优先从 Wikipedia/Wikivoyage 获取景点准确配图（避免通用图片搜索的错配）
      const wikiImg = await fetchImageFromWiki(poi.name);
      if (wikiImg) return { poi, img: wikiImg, isReal: true, source: 'wiki' };
      // wiki 无图则通过本地API搜索（360/必应图片，搜索词加入城市名提高准确性）
      const cityName = poi.adname || poi.cityname || '';
      const searchName = cityName ? `${cityName} ${poi.name}` : poi.name;
      const img = await fetchImageFromSearch(searchName, poi.lat, poi.lng);
      if (img) return { poi, img, isReal: true, source: 'search' };
      // 搜索失败时用地图瓦片作为后备
      const staticMap = generateStaticMapPreview(poi.lat, poi.lng);
      return { poi, img: staticMap, isReal: false, source: 'map' };
    }));
    results.push(...batchResults);
  }

  // 将获取到的图片写回 POI 对象
  let successCount = 0;
  let realPhotoCount = 0;
  for (const { poi, img, isReal } of results) {
    if (img) {
      poi.photos = [img];
      successCount++;
      if (isReal) realPhotoCount++;
    }
  }
  console.log(`[图片增强] 成功获取 ${successCount}/${toFetch.length} 张图片（真实照片:${realPhotoCount} 地图瓦片:${successCount - realPhotoCount}）`);
  return pois;
}
