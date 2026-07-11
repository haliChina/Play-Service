// ============================================
// 天气数据映射规则 — 适配 wttr.in 实时数据
// 一会去哪儿 · Weather
// ============================================

// 天气条件枚举（与 weatherService.js 的 weatherCodeMap 对应）
export const weatherConditions = {
  sunny: { label: '晴', icon: 'sun', tint: '#F4B860' },
  'cloudy-to-sunny': { label: '多云转晴', icon: 'cloud-sun', tint: '#D4A24C' },
  cloudy: { label: '多云', icon: 'cloud', tint: '#8B9DAF' },
  overcast: { label: '阴', icon: 'cloud-gray', tint: '#9AA5AE' },
  rainy: { label: '有雨', icon: 'rain', tint: '#6B8CAE' },
  snowy: { label: '有雪', icon: 'snow', tint: '#C4D4E0' }
};

// 天气适宜度提示规则
export const weatherAdvisories = {
  sunny: { text: '注意防晒', level: 'warn', icon: 'sun' },
  'cloudy-to-sunny': { text: '适宜出行', level: 'good', icon: 'cloud-sun' },
  cloudy: { text: '适宜出行', level: 'good', icon: 'cloud' },
  overcast: { text: '建议室内活动', level: 'info', icon: 'cloud-gray' },
  rainy: { text: '建议带伞·优选室内', level: 'info', icon: 'rain' },
  snowy: { text: '注意保暖·路面湿滑', level: 'warn', icon: 'snow' }
};

// 获取天气文案
export function getWeatherNarrative(condition, temp) {
  const narratives = {
    sunny: `阳光正好，${temp}°的午后适合户外漫步`,
    'cloudy-to-sunny': `多云转晴，${temp}°体感舒适，适合出行`,
    cloudy: `多云${temp}°，不晒不热，户外刚刚好`,
    overcast: `阴天${temp}°，光线柔和，适合室内或人文景点`,
    rainy: `有雨${temp}°，建议优选室内目的地`,
    snowy: `有雪${temp}°，注意保暖，赏雪景别有韵味`
  };
  return narratives[condition] || narratives.cloudy;
}

// 获取天气适宜度等级（用于卡片标签）
export function getWeatherFitLevel(weatherFitScore) {
  if (weatherFitScore >= 0.85) return { level: 'good', text: '适宜', class: 'good' };
  if (weatherFitScore >= 0.6) return { level: 'warn', text: '尚可', class: 'warn' };
  return { level: 'info', text: '注意', class: 'info' };
}
