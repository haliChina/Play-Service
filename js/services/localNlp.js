// ============================================
// 本地 NLP 规则引擎 — 无需大模型 API
// 解析用户自然语言需求 → 结构化偏好 + 搜索关键词
// 一会去哪儿 · Local NLP Engine
// ============================================

// 兴趣关键词映射
const INTEREST_PATTERNS = {
  nature: {
    keywords: ['公园', '自然', '户外', '散步', '湖', '山', '风景', '绿地', '森林', '花草', '植物园', '湿地', '草原', '海边', '河', '氧吧', '田园', '农场', '采摘'],
    label: '亲近自然'
  },
  culture: {
    keywords: ['古迹', '历史', '胡同', '寺庙', '故宫', '长城', '遗址', '文物', '古建', '老街', '古镇', '四合院', '牌坊', '陵墓', '纪念碑'],
    label: '人文古迹'
  },
  food: {
    keywords: ['美食', '吃', '餐厅', '小吃', '火锅', '烧烤', '咖啡', '下午茶', '甜品', '奶茶', '酒吧', '夜市', '美食街', '探店', '觅食', '早茶', '宵夜', ' brunch'],
    label: '美食探店'
  },
  photo: {
    keywords: ['拍照', '打卡', '出片', '网红', 'ins风', '文艺', '拍照圣地', '风景照', '写真', '街拍', '日落', '日出', '夜景'],
    label: '拍照打卡'
  },
  kids: {
    keywords: ['带娃', '亲子', '孩子', '儿童', '小朋友', '小孩', '宝宝', '家庭', '寓教于乐', '动物园', '海洋馆', '游乐场', '科技馆'],
    label: '亲子互动'
  },
  indoor: {
    keywords: ['室内', '商场', '购物中心', '博物馆', '展览', '看书', '书店', '图书馆', '电影', '密室', '剧本杀', '室内活动'],
    label: '室内休闲'
  },
  sports: {
    keywords: ['运动', '跑步', '骑行', '爬山', '健身', '游泳', '打球', '羽毛球', '篮球', '足球', '网球', '瑜伽', '徒步', '露营', '攀岩'],
    label: '运动户外'
  },
  art: {
    keywords: ['展览', '美术馆', '艺术', '画展', '博物馆', '演出', '话剧', '音乐会', '戏剧', '798', '创意园', '艺术区', '雕塑', '设计'],
    label: '文艺看展'
  }
};

// 人群类型映射
const GROUP_PATTERNS = {
  solo: { keywords: ['一个人', '独自', '自己', '单身', '独处'], label: '独自出发' },
  couple: { keywords: ['女朋友', '男朋友', '情侣', '约会', '两人', '另一半', '对象', '老婆', '老公', '媳妇'], label: '两人世界' },
  family: { keywords: ['带娃', '亲子', '孩子', '家庭', '小朋友', '小孩', '宝宝', '全家', '一家人', '老人', '父母', '爸妈'], label: '带娃家庭' },
  friends: { keywords: ['朋友', '闺蜜', '哥们', '同学', '同事', '一群人', '组团', '大家'], label: '朋友结伴' }
};

// 交通方式映射
const TRANSPORT_PATTERNS = {
  walk: { keywords: ['步行', '走路', '散步去', '溜达'], label: '步行' },
  metro: { keywords: ['地铁', '公交', '公共交通', '地铁直达', '地铁方便'], label: '地铁/公交' },
  car: { keywords: ['自驾', '开车', '停车', '车主'], label: '自驾' },
  taxi: { keywords: ['打车', '出租', '网约车', '滴滴'], label: '打车' },
  bike: { keywords: ['骑行', '骑车', '自行车', '单车'], label: '骑行' }
};

// 时长映射
const DURATION_PATTERNS = {
  'half-day': { keywords: ['半天', '下午', '上午', '两三个小时', '几个小时', '午后'], label: '半日' },
  'one-day': { keywords: ['一天', '全天', '一整天', '白天'], label: '一日' },
  'two-day': { keywords: ['两天', '周末', '过夜', '两天一夜', '两天两夜'], label: '两日' }
};

// POI 搜索关键词模板（根据兴趣生成，使用具体地点类型）
const POI_KEYWORD_TEMPLATES = {
  nature: ['公园', '植物园', '湿地公园', '风景区', '湖泊', '森林', '花园'],
  culture: ['博物馆', '古建筑', '寺庙', '历史街区', '剧院'],
  food: ['餐厅', '咖啡馆', '小吃街', '美食广场', '酒吧', '甜品店', '面包房'],
  photo: ['公园', '观景台', '博物馆', '艺术区', '创意园', '植物园', '古建筑', '湖泊'],
  kids: ['动物园', '游乐场', '科技馆', '公园', '海洋馆', '儿童乐园'],
  indoor: ['商场', '博物馆', '书店', '电影院', '密室逃脱'],
  sports: ['体育场', '游泳馆', '公园', '骑行道', '登山步道', '体育公园'],
  art: ['美术馆', '艺术区', '展览馆', '创意园', '画廊'],
  entertainment: ['电影院', 'KTV', '密室逃脱', '酒吧', '游乐场', '商场', '剧院', '夜店'],
  shopping: ['商场', '步行街', '购物中心', '市场', '商业街']
};

/**
 * 本地解析用户自然语言需求
 * @param {string} userInput - 用户自然语言输入
 * @param {string} location - 用户位置信息
 * @returns {Object} {keywords, interests, groupType, budget, duration, transport, reasoning}
 */
export function parseNeeds(userInput, location = '') {
  const text = userInput.toLowerCase();

  // 1. 检测兴趣类型
  const interests = [];
  const interestScores = {};
  for (const [type, pattern] of Object.entries(INTEREST_PATTERNS)) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > 0) {
      interestScores[type] = score;
      interests.push(type);
    }
  }
  // 按匹配度排序
  interests.sort((a, b) => (interestScores[b] || 0) - (interestScores[a] || 0));

  // 如果没有检测到兴趣，根据其他线索推断
  if (interests.length === 0) {
    interests.push('nature', 'photo');
  }

  // 2. 检测人群类型
  let groupType = 'friends'; // 默认
  let groupDetected = false;
  for (const [type, pattern] of Object.entries(GROUP_PATTERNS)) {
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) {
        groupType = type;
        groupDetected = true;
        break;
      }
    }
    if (groupDetected) break;
  }

  // 3. 检测预算
  let budgetMax = 250; // 默认
  const budgetMatch = text.match(/预算\s*(\d+)|(\d+)\s*元|(\d+)\s*块|花\s*(\d+)/);
  if (budgetMatch) {
    const val = parseInt(budgetMatch[1] || budgetMatch[2] || budgetMatch[3] || budgetMatch[4]);
    if (val > 0) budgetMax = val;
  }
  // 额外检测"以内""不超过"
  const limitMatch = text.match(/(\d+)\s*以内|不超过\s*(\d+)/);
  if (limitMatch) {
    const val = parseInt(limitMatch[1] || limitMatch[2]);
    if (val > 0) budgetMax = val;
  }

  // 4. 检测时长
  let duration = 'half-day'; // 默认
  for (const [type, pattern] of Object.entries(DURATION_PATTERNS)) {
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) {
        duration = type;
        break;
      }
    }
  }

  // 5. 检测交通方式
  const transport = [];
  for (const [type, pattern] of Object.entries(TRANSPORT_PATTERNS)) {
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) {
        if (!transport.includes(type)) transport.push(type);
        break;
      }
    }
  }
  if (transport.length === 0) {
    transport.push('metro'); // 默认地铁
  }

  // 6. 生成搜索关键词（交错排列不同兴趣的关键词，确保多样性）
  const keywordByInterest = interests.slice(0, 3).map(i => POI_KEYWORD_TEMPLATES[i] || []);
  const keywords = new Set();
  // 交错取关键词：interest1[0], interest2[0], interest1[1], interest2[1], ...
  const maxLen = Math.max(...keywordByInterest.map(arr => arr.length), 0);
  for (let j = 0; j < maxLen; j++) {
    for (const arr of keywordByInterest) {
      if (arr[j]) keywords.add(arr[j]);
    }
  }

  // 从用户输入中提取可能的地点名
  const placePatterns = [
    /去([\u4e00-\u9fa5]{2,6})(?:玩|看看|逛逛|走走)/g,
    /找(?:个|一些)?([\u4e00-\u9fa5]{2,6})(?:的地方|的场所)/g,
  ];
  for (const pattern of placePatterns) {
    let match;
    while ((match = pattern.exec(userInput)) !== null) {
      if (match[1] && match[1].length >= 2) {
        keywords.add(match[1]);
      }
    }
  }

  // 7. 生成解析说明
  const interestLabels = interests.slice(0, 3).map(i => INTEREST_PATTERNS[i]?.label).filter(Boolean);
  const groupLabel = GROUP_PATTERNS[groupType]?.label || '朋友结伴';
  const reasoning = `识别到${groupLabel}场景，偏好${interestLabels.join('、')}，预算${budgetMax}元/人，${DURATION_PATTERNS[duration]?.label || '半日'}行程`;

  return {
    keywords: Array.from(keywords).slice(0, 8),
    interests,
    groupType,
    budget: { min: 0, max: budgetMax, perPerson: true },
    duration,
    transport,
    reasoning,
    source: 'local-nlp'
  };
}

/**
 * 为搜索结果生成本地推荐理由和匹配度评分
 * @param {Object} preferences - 解析后的偏好
 * @param {Array} pois - POI列表
 * @returns {Array} 带推荐理由的POI列表
 */
export function generateLocalRecommendations(preferences, pois) {
  if (!pois || pois.length === 0) return [];

  const { interests = [], budget = { max: 250 }, groupType = 'friends', transport = ['metro'], weatherCondition = 'cloudy' } = preferences;

  // 室内类型（阴雨天加分）
  const INDOOR_TYPES = ['museum', 'gallery', 'library', 'arts_centre', 'cinema', 'theatre', 'shopping', 'restaurant', 'cafe', 'bar', 'nightclub'];
  // 户外类型（晴天加分，阴雨天减分）
  const OUTDOOR_TYPES = ['park', 'garden', 'viewpoint', 'attraction', 'water', 'waterfall', 'peak', 'wood', 'wetland', 'nature', 'playground', 'zoo', 'castle', 'ruins', 'temple', 'tomb'];

  return pois.map((poi, index) => {
    let matchScore = 50; // 降低基础分，加大区分度
    const reasons = [];
    const highlights = [];

    const poiType = (poi.type || '').toLowerCase();
    const poiName = (poi.name || '').toLowerCase();
    const visualType = poi.visualType || '';
    const isIndoor = INDOOR_TYPES.includes(visualType);
    const isOutdoor = OUTDOOR_TYPES.includes(visualType);

    // === 距离评分（权重最大，越近越好） ===
    if (poi.distance != null) {
      if (poi.distance < 1000) {
        matchScore += 20;
        highlights.push('步行可达');
        reasons.push('步行即可到达，非常方便');
      } else if (poi.distance < 3000) {
        matchScore += 14;
        highlights.push('近距离');
        reasons.push(`距离仅${(poi.distance / 1000).toFixed(1)}km，交通便利`);
      } else if (poi.distance < 5000) {
        matchScore += 8;
      } else if (poi.distance < 8000) {
        matchScore += 3;
      } else {
        matchScore -= 5; // 远距离减分
      }
    }

    // === 兴趣匹配评分（核心维度） ===
    let interestMatches = 0;
    for (const interest of interests.slice(0, 4)) {
      const pattern = INTEREST_PATTERNS[interest];
      if (pattern) {
        for (const kw of pattern.keywords) {
          if (poiType.includes(kw) || poiName.includes(kw)) {
            interestMatches++;
            matchScore += 10;
            highlights.push(pattern.label);
            reasons.push(`符合你${pattern.label}的偏好`);
            break;
          }
        }
      }
    }
    // 无兴趣匹配的 POI 轻微减分
    if (interestMatches === 0 && interests.length > 0) {
      matchScore -= 8;
    }

    // === 天气适配评分 ===
    const badWeather = ['rainy', 'overcast', 'snowy'].includes(weatherCondition);
    const goodWeather = ['sunny', 'cloudy-to-sunny'].includes(weatherCondition);
    if (badWeather && isIndoor) {
      matchScore += 8;
      highlights.push('雨天适宜');
      reasons.push(`${weatherCondition === 'snowy' ? '雪天' : '雨天'}适合室内活动`);
    } else if (badWeather && isOutdoor) {
      matchScore -= 6;
    } else if (goodWeather && isOutdoor) {
      matchScore += 6;
      highlights.push('晴天适宜');
      reasons.push('好天气适合户外活动');
    }

    // === 评分加分 ===
    if (poi.rating) {
      const rating = parseFloat(poi.rating);
      if (rating >= 4.5) {
        matchScore += 8;
        highlights.push(`高评分${rating}`);
        reasons.push('用户评价高，口碑出色');
      } else if (rating >= 4.0) {
        matchScore += 4;
      }
    }

    // === 预算匹配 ===
    if (poi.cost) {
      const cost = parseFloat(poi.cost);
      if (cost <= budget.max) {
        matchScore += 6;
        reasons.push(`人均¥${cost}在预算内`);
      } else if (cost <= budget.max * 1.3) {
        matchScore += 2;
      } else {
        matchScore -= 5;
      }
    }

    // === 人群匹配 ===
    if (groupType === 'couple' && /公园|景观|咖啡|餐厅|艺术|博物馆|湖|花园/.test(poiName + poiType)) {
      matchScore += 6;
      highlights.push('适合约会');
      reasons.push('氛围适合情侣约会');
    }
    if (groupType === 'family' && /动物园|科技馆|海洋馆|公园|游乐|儿童|亲子/.test(poiName + poiType)) {
      matchScore += 6;
      highlights.push('适合亲子');
      reasons.push('适合家庭亲子出行');
    }
    if (groupType === 'solo' && /咖啡|书店|图书馆|公园|博物馆|展览/.test(poiName + poiType)) {
      matchScore += 5;
      highlights.push('适合独处');
      reasons.push('适合一个人安静享受');
    }
    if (groupType === 'friends' && /餐厅|火锅|烧烤|酒吧|商场|KTV|密室|公园/.test(poiName + poiType)) {
      matchScore += 4;
      highlights.push('适合聚会');
    }

    // === 交通匹配 ===
    if (transport && transport.includes('walking') && poi.distance != null && poi.distance < 2000) {
      matchScore += 4;
    }
    if (transport && transport.includes('metro') && poi.distance != null && poi.distance < 5000) {
      matchScore += 2;
    }

    // 限制分数范围 [35, 98]
    matchScore = Math.max(35, Math.min(matchScore, 98));

    // 生成多维推荐理由（取前2-3个理由拼接）
    let reason = '';
    if (reasons.length > 0) {
      reason = reasons.slice(0, 2).join('，');
    } else {
      // 兜底理由
      if (poi.distance != null && poi.distance < 2000) {
        reason = `距离仅${poi.distance < 1000 ? poi.distance + 'm' : (poi.distance / 1000).toFixed(1) + 'km'}，非常方便`;
      } else if (poi.rating && parseFloat(poi.rating) >= 4.5) {
        reason = '高评分地点，口碑出色';
      } else {
        reason = `${poi.name}，${poi.type || '附近热门地点'}`;
      }
    }

    // 生成实用贴士
    const tips = [];
    if (poi.distance != null && poi.distance > 3000) {
      tips.push('建议提前规划交通路线');
    }
    if (badWeather && isOutdoor) {
      tips.push('当前天气不佳，建议携带雨具或改期');
    }
    if (poi.openHours) {
      tips.push(`营业时间：${poi.openHours}`);
    }
    if (poi.tel) {
      tips.push('建议提前电话确认营业状态');
    }
    if (tips.length === 0) {
      tips.push('出行前建议查看最新信息');
    }

    return {
      ...poi,
      matchScore: Math.round(matchScore),
      reason,
      highlights: highlights.length > 0 ? highlights.slice(0, 4) : ['推荐地点'],
      tips: tips.slice(0, 3),
      isAIRecommended: false,
      aiSource: 'local-rule-engine'
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
