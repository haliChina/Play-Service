// ============================================
// 实时 POI 搜索服务 — Overpass API (OpenStreetMap)
// 真实地理数据，无需 API Key
// 一会去哪儿 · POI Service
// ============================================

import { cityCoordinates } from '../data/userProfile.js';

// Overpass API 端点（多个镜像，轮询使用）
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// 兴趣类型到 OSM 标签的映射
const interestTagMap = {
  nature: ['leisure=park', 'leisure=garden', 'natural=peak', 'natural=wood', 'leisure=nature_reserve'],
  culture: ['historic=monument', 'historic=castle', 'historic=tomb', 'tourism=museum', 'tourism=artwork', 'amenity=theatre'],
  food: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar', 'amenity=pub'],
  photo: ['tourism=viewpoint', 'tourism=attraction', 'historic=monument', 'tourism=artwork'],
  indoor: ['tourism=museum', 'amenity=library', 'leisure=sports_centre', 'amenity=cinema', 'shop=mall'],
  sports: ['leisure=pitch', 'leisure=sports_centre', 'leisure=swimming_pool', 'leisure=fitness_centre'],
  kids: ['tourism=museum', 'leisure=park', 'amenity=library', 'tourism=zoo', 'leisure=playground'],
  relax: ['leisure=park', 'leisure=garden', 'tourism=spa_resort', 'leisure=beach_resort']
};

// 城市中心坐标 — 使用统一数据源（50+城市）
const cityCenters = cityCoordinates;

/**
 * 搜索附近的真实 POI
 * @param {Object} options - 搜索选项
 * @param {number} options.lat - 纬度
 * @param {number} options.lng - 经度
 * @param {string[]} options.interests - 兴趣类型
 * @param {number} options.radius - 搜索半径（米），默认 5000
 * @param {number} options.limit - 返回数量上限，默认 20
 * @returns {Promise<Array>} POI 列表
 */
export async function searchNearbyPOIs({ lat, lng, interests = [], radius = 5000, limit = 20 }) {
  // 构建 OSM 标签查询
  const tags = new Set();
  interests.forEach(interest => {
    const tagList = interestTagMap[interest] || [];
    tagList.forEach(t => tags.add(t));
  });

  // 如果没有指定兴趣，使用默认标签
  if (tags.size === 0) {
    ['leisure=park', 'tourism=museum', 'amenity=restaurant', 'tourism=attraction'].forEach(t => tags.add(t));
  }

  // 构建 Overpass QL 查询
  const tagFilters = Array.from(tags).map(tag => {
    const [key, value] = tag.split('=');
    return `node["${key}"="${value}"](around:${radius},${lat},${lng});`;
  }).join('');

  const query = `
    [out:json][timeout:15];
    (
      ${tagFilters}
    );
    out body 20;
    >;
    out skel qt;
  `;

  // 轮询尝试多个端点
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });

      if (!response.ok) {
        console.warn(`Overpass 端点 ${endpoint} 返回 ${response.status}`);
        continue;
      }

      const data = await response.json();
      return parsePOIResults(data, lat, lng, limit);
    } catch (error) {
      console.warn(`Overpass 端点 ${endpoint} 请求失败:`, error.message);
      continue;
    }
  }

  console.warn('所有 Overpass 端点均不可用');
  return [];
}

/**
 * 解析 Overpass API 返回的 POI 数据
 */
function parsePOIResults(data, userLat, userLng, limit) {
  if (!data || !data.elements) return [];

  const pois = data.elements
    .filter(el => el.type === 'node' && el.tags)
    .map(el => {
      const tags = el.tags;
      const name = tags.name || tags['name:zh'] || '未命名地点';
      const category = detectCategory(tags);
      const distance = calculateDistance(userLat, userLng, el.lat, el.lon);

      return {
        id: `osm-${el.id}`,
        name,
        type: category,
        typeLabel: getCategoryLabel(category),
        lat: el.lat,
        lng: el.lon,
        distance: Math.round(distance),
        address: formatAddress(tags),
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || tags.url || '',
        openHours: tags.opening_hours || '',
        description: tags.description || tags['note:zh'] || '',
        isRealData: true,
        source: 'OpenStreetMap'
      };
    })
    .filter(poi => poi.name !== '未命名地点')
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return pois;
}

/**
 * 检测 POI 类别
 */
function detectCategory(tags) {
  if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.natural) return 'park';
  if (tags.tourism === 'museum' || tags.amenity === 'theatre') return 'museum';
  if (tags.historic) return 'hutong';
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'bar') return 'shopping';
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return 'suburb';
  if (tags.leisure === 'sports_centre' || tags.leisure === 'pitch') return 'indoor';
  if (tags.shop) return 'market';
  return 'park';
}

/**
 * 获取类别标签
 */
function getCategoryLabel(category) {
  const labels = {
    park: '亲近自然',
    museum: '文艺看展',
    hutong: '人文古迹',
    shopping: '美食探店',
    suburb: '运动户外',
    indoor: '室内休闲',
    market: '市集特色'
  };
  return labels[category] || '探索发现';
}

/**
 * 格式化地址
 */
function formatAddress(tags) {
  const parts = [];
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber'] + '号');
  if (tags['addr:district']) parts.push(tags['addr:district']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  return parts.length > 0 ? parts.join('') : (tags['addr:full'] || '地址详情请查看地图');
}

/**
 * 计算两点间距离（Haversine 公式）
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 根据城市名搜索 POI（无定位时使用城市中心）
 * @param {string} city - 城市名
 * @param {string[]} interests - 兴趣类型
 * @param {number} radius - 搜索半径
 */
export async function searchPOIsByCity(city, interests = [], radius = 8000) {
  const center = cityCenters[city];
  if (!center) {
    console.warn(`未找到城市 ${city} 的中心坐标`);
    return [];
  }
  return searchNearbyPOIs({
    lat: center.lat,
    lng: center.lng,
    interests,
    radius,
    limit: 20
  });
}

/**
 * Nominatim 反向地理编码（坐标转地址）
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object>} 地址信息
 */
export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=zh-CN`;
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`反向地理编码返回 ${response.status}`);
    const data = await response.json();
    return {
      displayName: data.display_name || '',
      city: data.address?.city || data.address?.town || data.address?.county || '',
      district: data.address?.suburb || data.address?.district || '',
      street: data.address?.road || '',
      houseNumber: data.address?.house_number || '',
      isRealData: true,
      source: 'OpenStreetMap Nominatim'
    };
  } catch (error) {
    console.warn('反向地理编码失败:', error.message);
    return {
      displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: '',
      district: '',
      street: '',
      houseNumber: '',
      isRealData: false,
      source: 'fallback'
    };
  }
}

export { cityCenters, interestTagMap };
