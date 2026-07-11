// ============================================
// 实时天气服务 — 多数据源适配
// 默认 wttr.in（免费无需Key），可选高德天气/和风天气/OpenWeatherMap
// 一会去哪儿 · Weather Service
// ============================================

import { getWeatherConfig } from '../modules/settings.js';

// 城市到 wttr.in 查询名的映射（英文名更稳定）
const cityQueryMap = {
  '北京': 'Beijing',
  '上海': 'Shanghai',
  '广州': 'Guangzhou',
  '成都': 'Chengdu',
  '杭州': 'Hangzhou',
  '深圳': 'Shenzhen',
  '西安': "Xi'an",
  '南京': 'Nanjing',
  '武汉': 'Wuhan',
  '重庆': 'Chongqing',
  '天津': 'Tianjin',
  '香港': 'Hong Kong',
  '澳门': 'Macau',
  '台北': 'Taipei',
  '高雄': 'Kaohsiung',
  '台中': 'Taichung',
  '台南': 'Tainan',
  '花莲': 'Hualien',
};

// wttr.in weatherCode 到内部天气条件的映射
// 参考: https://openweathermap.org/weather-conditions
const weatherCodeMap = {
  113: 'sunny',           // Clear
  116: 'cloudy-to-sunny', // Partly cloudy
  119: 'cloudy',          // Cloudy
  122: 'overcast',        // Overcast
  143: 'overcast',        // Mist
  146: 'rainy',           // Patchy light drizzle
  149: 'overcast',        // Patchy rain nearby (Smoky haze)
  176: 'rainy',           // Patchy light rain
  179: 'snowy',           // Patchy light snow
  182: 'rainy',           // Patchy moderate snow
  185: 'snowy',           // Patchy heavy snow
  200: 'rainy',           // Thundery outbreaks
  227: 'snowy',           // Blowing snow
  230: 'snowy',           // Blizzard
  248: 'overcast',        // Fog
  260: 'overcast',        // Freezing fog
  263: 'rainy',           // Patchy light drizzle
  266: 'rainy',           // Light drizzle
  281: 'rainy',           // Freezing drizzle
  284: 'rainy',           // Heavy freezing drizzle
  293: 'rainy',           // Patchy light rain
  296: 'rainy',           // Light rain
  299: 'rainy',           // Moderate rain at times
  302: 'rainy',           // Moderate rain
  305: 'rainy',           // Heavy rain at times
  308: 'rainy',           // Heavy rain
  311: 'rainy',           // Light freezing rain
  314: 'rainy',           // Moderate freezing rain
  317: 'rainy',           // Light sleet
  320: 'rainy',           // Moderate sleet
  323: 'snowy',           // Patchy light snow
  326: 'snowy',           // Light snow
  329: 'snowy',           // Patchy moderate snow
  332: 'snowy',           // Moderate snow
  335: 'snowy',           // Patchy heavy snow
  338: 'snowy',           // Heavy snow
  350: 'rainy',           // Light rain shower
  353: 'rainy',           // Light rain shower
  356: 'rainy',           // Moderate rain shower
  359: 'rainy',           // Torrential rain shower
  362: 'rainy',           // Light sleet shower
  365: 'rainy',           // Moderate sleet shower
  368: 'snowy',           // Light snow shower
  371: 'snowy',           // Moderate snow shower
  374: 'rainy',           // Light sleet shower
  377: 'rainy',           // Moderate sleet shower
  386: 'rainy',           // Patchy light rain with thunder
  389: 'rainy',           // Light rain with thunderstorm
  392: 'snowy',           // Patchy light snow with thunder
  395: 'snowy'            // Moderate snow with thunder
};

/**
 * 获取实时天气数据（根据设置的分发到对应服务商）
 * @param {string} city - 城市名（中文）
 * @returns {Promise<Object>} 标准化天气对象
 */
export async function fetchWeather(city) {
  const { provider, apiKey } = getWeatherConfig();
  try {
    if (provider === 'amap' && apiKey) {
      return await fetchWeatherByAmap(city, apiKey);
    }
    if (provider === 'qweather' && apiKey) {
      return await fetchWeatherByQWeather(city, apiKey);
    }
    if (provider === 'openweather' && apiKey) {
      return await fetchWeatherByOpenWeather(city, apiKey);
    }
    // 默认 wttr.in（免费无需Key）
    return await fetchWeatherByWttr(city);
  } catch (error) {
    console.warn(`[${provider}] 天气获取失败，回退到 wttr.in:`, error.message);
    try {
      return await fetchWeatherByWttr(city);
    } catch (e) {
      return getFallbackWeather(city);
    }
  }
}

/**
 * wttr.in 天气查询（免费无需Key）
 */
async function fetchWeatherByWttr(city) {
  const query = cityQueryMap[city] || city;
  const url = `https://wttr.in/${encodeURIComponent(query)}?format=j1`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`wttr.in 返回 ${response.status}`);
  }
  const data = await response.json();
  return parseWeatherData(data, city);
}

/**
 * 解析 wttr.in 返回的数据为内部标准格式
 */
function parseWeatherData(data, city) {
  const current = data.current_condition[0];
  const today = data.weather[0];
  const astronomy = today.astronomy[0];

  const weatherCode = parseInt(current.weatherCode);
  const condition = weatherCodeMap[weatherCode] || 'cloudy';

  // 解析逐时预报
  const hourly = today.hourly.map(h => ({
    time: formatHour(parseInt(h.time)),
    temp: parseInt(h.tempC),
    condition: weatherCodeMap[parseInt(h.weatherCode)] || 'cloudy',
    desc: h.weatherDesc[0].value.trim(),
    chanceofrain: parseInt(h.chanceofrain)
  }));

  return {
    city,
    condition,
    temp: parseInt(current.temp_C),
    feelsLike: parseInt(current.FeelsLikeC),
    windLevel: Math.round(parseInt(current.windspeedKmph) / 3.6), // km/h 转 m/s 近似蒲福风级
    windSpeed: parseInt(current.windspeedKmph),
    windDir: current.winddir16Point,
    uvIndex: parseInt(current.uvIndex),
    humidity: parseInt(current.humidity),
    visibility: parseInt(current.visibility),
    pressure: parseInt(current.pressure),
    precip: parseFloat(current.precipMM),
    sunset: formatTime(astronomy.sunset),
    sunrise: formatTime(astronomy.sunrise),
    weatherDesc: current.weatherDesc[0].value.trim(),
    weatherCode,
    hourly,
    maxTemp: parseInt(today.maxtempC),
    minTemp: parseInt(today.mintempC),
    isRealTime: true,
    source: 'wttr.in',
    observedAt: current.observation_time
  };
}

/**
 * 格式化时间 "07:46 PM" -> "19:46"
 */
function formatTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return timeStr;
  let h = parseInt(match[1]);
  const m = match[2];
  const ap = match[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * 格式化小时 "900" -> "09:00"
 */
function formatHour(timeNum) {
  const h = Math.floor(timeNum / 100);
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * 降级天气数据（网络失败时使用，明确标注非实时）
 */
function getFallbackWeather(city) {
  return {
    city,
    condition: 'cloudy',
    temp: 22,
    feelsLike: 21,
    windLevel: 2,
    windSpeed: 7,
    windDir: 'NE',
    uvIndex: 3,
    humidity: 50,
    visibility: 10,
    pressure: 1013,
    precip: 0,
    sunset: '18:30',
    sunrise: '05:00',
    weatherDesc: '多云（离线降级）',
    weatherCode: 119,
    hourly: [],
    maxTemp: 25,
    minTemp: 18,
    isRealTime: false,
    source: 'fallback',
    observedAt: '离线'
  };
}

/**
 * 根据经纬度获取实时天气（根据设置分发到对应服务商）
 * @param {number} lat
 * @param {number} lng
 */
export async function fetchWeatherByCoords(lat, lng) {
  const { provider, apiKey } = getWeatherConfig();
  try {
    if (provider === 'amap' && apiKey) {
      return await fetchWeatherByAmapCoords(lat, lng, apiKey);
    }
    if (provider === 'qweather' && apiKey) {
      return await fetchWeatherByQWeatherCoords(lat, lng, apiKey);
    }
    if (provider === 'openweather' && apiKey) {
      return await fetchWeatherByOpenWeatherCoords(lat, lng, apiKey);
    }
    return await fetchWeatherByCoordsWttr(lat, lng);
  } catch (error) {
    console.warn(`[${provider}] 按坐标获取天气失败，回退到 wttr.in:`, error.message);
    try {
      return await fetchWeatherByCoordsWttr(lat, lng);
    } catch (e) {
      return getFallbackWeather('当前位置');
    }
  }
}

/**
 * wttr.in 按坐标查询
 */
async function fetchWeatherByCoordsWttr(lat, lng) {
  const url = `https://wttr.in/${lat},${lng}?format=j1`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) throw new Error(`wttr.in 返回 ${response.status}`);
  const data = await response.json();

  // 尝试从 nearest_area 获取城市名
  let cityName = '当前位置';
  if (data.nearest_area && data.nearest_area[0]) {
    const area = data.nearest_area[0];
    const areaName = area.areaName[0].value;
    cityName = cityQueryMap[areaName] ? areaName : (area.areaName[0].value);
  }
  return parseWeatherData(data, cityName);
}

// ── 高德天气 API ──
// 文档：https://lbs.amap.com/api/webservice/guide/api/weatherinfo
// 注意：高德天气按城市 adcode 查询，先用地理编码接口把城市名转 adcode
async function fetchWeatherByAmap(city, apiKey) {
  // 1. 城市名 → adcode
  const geoUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(city)}&key=${apiKey}`;
  const geoResp = await fetch(geoUrl);
  if (!geoResp.ok) throw new Error(`高德地理编码返回 ${geoResp.status}`);
  const geoData = await geoResp.json();
  if (geoData.status !== '1' || !geoData.geocodes || geoData.geocodes.length === 0) {
    throw new Error('高德地理编码无结果');
  }
  const adcode = geoData.geocodes[0].adcode;

  // 2. 查询天气（extensions=base 实况）
  const weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${apiKey}&extensions=base&output=JSON`;
  const resp = await fetch(weatherUrl);
  if (!resp.ok) throw new Error(`高德天气返回 ${resp.status}`);
  const data = await resp.json();
  if (data.status !== '1' || !data.lives || data.lives.length === 0) {
    throw new Error('高德天气无数据');
  }
  const live = data.lives[0];
  return normalizeAmapWeather(live, city);
}

async function fetchWeatherByAmapCoords(lat, lng, apiKey) {
  // 高德天气只能按 adcode 查询，先用逆地理编码拿 adcode
  const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${apiKey}&extensions=base`;
  const resp = await fetch(regeoUrl);
  if (!resp.ok) throw new Error(`高德逆地理返回 ${resp.status}`);
  const data = await resp.json();
  if (data.status !== '1' || !data.regeocode) {
    throw new Error('高德逆地理无结果');
  }
  const adcode = data.regeocode.addressComponent.adcode;
  const city = data.regeocode.addressComponent.city || data.regeocode.addressComponent.province || '当前位置';
  // 拿到 adcode 后再查天气
  const weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${apiKey}&extensions=base`;
  const wResp = await fetch(weatherUrl);
  if (!wResp.ok) throw new Error(`高德天气返回 ${wResp.status}`);
  const wData = await wResp.json();
  if (wData.status !== '1' || !wData.lives || wData.lives.length === 0) {
    throw new Error('高德天气无数据');
  }
  return normalizeAmapWeather(wData.lives[0], Array.isArray(city) ? '当前位置' : city);
}

function normalizeAmapWeather(live, city) {
  // 高德 weather 字段如 "晴"、"多云"、"阴"、"小雨" 等
  const condition = mapAmapCondition(live.weather);
  return {
    city,
    condition,
    temp: parseInt(live.temperature) || 0,
    feelsLike: parseInt(live.temperature) || 0,
    windLevel: parseAmapWindLevel(live.windpower),
    windSpeed: 0,
    windDir: live.winddirection || '',
    uvIndex: 0,
    humidity: parseInt(live.humidity) || 0,
    visibility: 0,
    pressure: 0,
    precip: 0,
    sunset: '18:30',
    sunrise: '06:00',
    weatherDesc: live.weather || '',
    weatherCode: 0,
    hourly: [],
    maxTemp: parseInt(live.temperature) || 0,
    minTemp: parseInt(live.temperature) || 0,
    isRealTime: true,
    source: '高德天气',
    observedAt: live.reporttime || ''
  };
}

function mapAmapCondition(weather) {
  if (!weather) return 'cloudy';
  const w = weather.toLowerCase();
  if (w.includes('晴')) return 'sunny';
  if (w.includes('多云')) return 'cloudy-to-sunny';
  if (w.includes('阴')) return 'overcast';
  if (w.includes('雨')) return 'rainy';
  if (w.includes('雪')) return 'snowy';
  if (w.includes('雾') || w.includes('霾')) return 'overcast';
  return 'cloudy';
}

function parseAmapWindLevel(windpower) {
  // 高德风力如 "≤3" 或 "3"
  const m = (windpower || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

// ── 和风天气 API ──
// 文档：https://dev.qweather.com/docs/api/weather/weather-now/
// 使用 Dev API 域名 devapi.qweather.com（免费订阅）
async function fetchWeatherByQWeather(city, apiKey) {
  // 1. 城市 → locationId（Geo API）
  const geoUrl = `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(city)}&key=${apiKey}`;
  const geoResp = await fetch(geoUrl);
  if (!geoResp.ok) throw new Error(`和风Geo返回 ${geoResp.status}`);
  const geoData = await geoResp.json();
  if (geoData.code !== '200' || !geoData.location || geoData.location.length === 0) {
    throw new Error('和风Geo无结果');
  }
  const locationId = geoData.location[0].id;
  const cityName = geoData.location[0].name;

  // 2. 实况天气
  const url = `https://devapi.qweather.com/v7/weather/now?location=${locationId}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`和风天气返回 ${resp.status}`);
  const data = await resp.json();
  if (data.code !== '200' || !data.now) {
    throw new Error('和风天气无数据');
  }
  return normalizeQWeather(data.now, cityName);
}

async function fetchWeatherByQWeatherCoords(lat, lng, apiKey) {
  const url = `https://devapi.qweather.com/v7/weather/now?location=${lng},${lat}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`和风天气返回 ${resp.status}`);
  const data = await resp.json();
  if (data.code !== '200' || !data.now) {
    throw new Error('和风天气无数据');
  }
  return normalizeQWeather(data.now, '当前位置');
}

function normalizeQWeather(now, city) {
  return {
    city,
    condition: mapQWeatherIcon(now.icon),
    temp: parseInt(now.temp) || 0,
    feelsLike: parseInt(now.feelsLike) || 0,
    windLevel: parseInt(now.windScale) || 0,
    windSpeed: parseInt(now.windSpeed) || 0,
    windDir: now.windDir || '',
    uvIndex: 0,
    humidity: parseInt(now.humidity) || 0,
    visibility: 0,
    pressure: 0,
    precip: parseFloat(now.precip) || 0,
    sunset: '18:30',
    sunrise: '06:00',
    weatherDesc: now.text || '',
    weatherCode: 0,
    hourly: [],
    maxTemp: parseInt(now.temp) || 0,
    minTemp: parseInt(now.temp) || 0,
    isRealTime: true,
    source: '和风天气',
    observedAt: now.obsTime || ''
  };
}

function mapQWeatherIcon(icon) {
  // 和风 icon 代码参考 https://dev.qweather.com/docs/resource/icons/
  const code = parseInt(icon);
  if (code >= 100 && code <= 103) return 'sunny';
  if (code >= 104 && code <= 153) return 'cloudy-to-sunny';
  if (code >= 154 && code <= 166) return 'overcast';
  if (code >= 300 && code <= 399) return 'rainy';
  if (code >= 400 && code <= 499) return 'snowy';
  if (code >= 500 && code <= 599) return 'overcast'; // 雾霾
  return 'cloudy';
}

// ── OpenWeatherMap API ──
// 文档：https://openweathermap.org/current
async function fetchWeatherByOpenWeather(city, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=zh_cn`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OpenWeatherMap 返回 ${resp.status}`);
  const data = await resp.json();
  if (data.cod !== 200) throw new Error(data.message || 'OpenWeatherMap 无数据');
  return normalizeOpenWeather(data, city);
}

async function fetchWeatherByOpenWeatherCoords(lat, lng, apiKey) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`OpenWeatherMap 返回 ${resp.status}`);
  const data = await resp.json();
  if (data.cod !== 200) throw new Error(data.message || 'OpenWeatherMap 无数据');
  return normalizeOpenWeather(data, data.name || '当前位置');
}

function normalizeOpenWeather(data, city) {
  const w = data.weather && data.weather[0];
  const main = data.main || {};
  return {
    city,
    condition: mapOpenWeatherIcon(w && w.id),
    temp: Math.round(main.temp || 0),
    feelsLike: Math.round(main.feels_like || main.temp || 0),
    windLevel: Math.round(((data.wind && data.wind.speed) || 0) / 1.5),
    windSpeed: Math.round(((data.wind && data.wind.speed) || 0)),
    windDir: '',
    uvIndex: 0,
    humidity: main.humidity || 0,
    visibility: (data.visibility || 0) / 1000,
    pressure: main.pressure || 0,
    precip: (data.rain && data.rain['1h']) || 0,
    sunset: formatUnix(data.sys && data.sys.sunset),
    sunrise: formatUnix(data.sys && data.sys.sunrise),
    weatherDesc: (w && w.description) || '',
    weatherCode: (w && w.id) || 0,
    hourly: [],
    maxTemp: Math.round(main.temp_max || main.temp || 0),
    minTemp: Math.round(main.temp_min || main.temp || 0),
    isRealTime: true,
    source: 'OpenWeatherMap',
    observedAt: new Date((data.dt || 0) * 1000).toISOString()
  };
}

function mapOpenWeatherIcon(id) {
  if (id == null) return 'cloudy';
  if (id >= 200 && id < 300) return 'rainy'; // 雷暴
  if (id >= 300 && id < 600) return 'rainy'; // 毛毛雨/雨
  if (id >= 600 && id < 700) return 'snowy'; // 雪
  if (id >= 700 && id < 800) return 'overcast'; // 雾霾
  if (id === 800) return 'sunny';
  if (id === 801 || id === 802) return 'cloudy-to-sunny';
  return 'cloudy';
}

function formatUnix(ts) {
  if (!ts) return '--';
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export { cityQueryMap };
