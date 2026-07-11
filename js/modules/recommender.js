// ============================================
// Mock AI 推荐引擎 — 评分/过滤/排序/多样性
// 一会去哪儿 · Recommender
// ============================================

import { getWeatherFitLevel } from '../data/weather.js';

// 权重配置
const WEIGHTS = {
  weather: 0.25,
  interest: 0.30,
  budget: 0.20,
  transport: 0.10,
  group: 0.15
};

/**
 * 计算兴趣契合度
 */
function calcInterestOverlap(destInterests, userInterests) {
  if (userInterests.length === 0) return 50;
  const matches = destInterests.filter(i => userInterests.includes(i));
  return Math.round((matches.length / userInterests.length) * 100);
}

/**
 * 计算预算匹配度
 */
function calcBudgetFit(destBudget, userBudget) {
  const destMax = destBudget.max;
  const userMax = userBudget.max;
  const userMin = userBudget.min;

  // 完全在预算内
  if (destMax <= userMax && destBudget.min >= userMin) return 100;
  // 最高花费在预算内
  if (destMax <= userMax) return 95;
  // 最低花费在预算内，最高略超
  if (destBudget.min <= userMax && destMax <= userMax * 1.3) return 75;
  // 严重超支
  if (destBudget.min > userMax) return 30;
  // 介于之间
  return 60;
}

/**
 * 计算交通便利度
 */
function calcTransportEase(destTransport, userTransport, destLocation) {
  // 交通方式匹配
  const hasMatch = destTransport.some(t => userTransport.includes(t));
  if (!hasMatch) return 40;

  // 步行可达加分
  if (userTransport.includes('walking') && destTransport.includes('walking')) {
    return 100;
  }
  // 地铁可达加分
  if (userTransport.includes('metro') && destTransport.includes('metro')) {
    return 95;
  }
  // 多种方式可达
  const overlapCount = destTransport.filter(t => userTransport.includes(t)).length;
  return Math.min(100, 70 + overlapCount * 10);
}

/**
 * 计算时长匹配度
 */
function calcDurationFit(destDuration, userDuration) {
  if (destDuration === userDuration) return 100;
  // 半日与一日可兼容
  if ((destDuration === 'half-day' && userDuration === 'full-day') ||
      (destDuration === 'full-day' && userDuration === 'half-day')) {
    return 80;
  }
  return 60;
}

/**
 * 多样性保证：同一类型最多取 N 个
 */
function ensureDiversity(scored, maxPerType = 2) {
  const typeCount = {};
  const result = [];
  const overflow = [];

  for (const item of scored) {
    if ((typeCount[item.type] || 0) < maxPerType) {
      result.push(item);
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;
    } else {
      overflow.push(item);
    }
  }

  // 如果多样性筛选后不足，从溢出池补充
  return { result, overflow };
}

/**
 * 根据偏好决定返回数量
 */
function pickCount(prefs) {
  if (prefs.duration === 'two-day') return 5;
  if (prefs.duration === 'full-day') return 4;
  return 4;
}

/**
 * 主推荐函数
 */
export function recommend(prefs, pool) {
  // 1. 过滤：交通方式不匹配、预算严重超支的剔除
  const feasible = pool.filter(d => {
    const transportOk = d.transport.some(t => prefs.transport.includes(t));
    const budgetOk = d.budget.min <= prefs.budget.max * 1.5; // 允许略超
    return transportOk && budgetOk;
  });

  // 兜底：如果过滤后太少，放宽交通限制
  const candidatePool = feasible.length >= 3 ? feasible : pool.filter(d =>
    d.budget.min <= prefs.budget.max * 2
  );

  // 2. 评分：多维度加权
  const scored = candidatePool.map(d => {
    const weatherScore = Math.round((d.weatherFit[prefs.weather.condition] || 0.5) * 100);
    const interestScore = calcInterestOverlap(d.interests, prefs.interests);
    const budgetScore = calcBudgetFit(d.budget, prefs.budget);
    const transportScore = calcTransportEase(d.transport, prefs.transport, d.location);
    const groupScore = Math.round((d.groupFit[prefs.groupType] || 0.7) * 100);
    const durationScore = calcDurationFit(d.duration, prefs.duration);

    // 综合匹配度（时长作为微调因子）
    const baseScore =
      weatherScore * WEIGHTS.weather +
      interestScore * WEIGHTS.interest +
      budgetScore * WEIGHTS.budget +
      transportScore * WEIGHTS.transport +
      groupScore * WEIGHTS.group;

    const matchScore = Math.round(baseScore * (durationScore / 100) * 0.9 + baseScore * 0.1);

    // 天气适宜度等级
    const weatherFitValue = d.weatherFit[prefs.weather.condition] || 0.5;
    const weatherFit = getWeatherFitLevel(weatherFitValue);

    return {
      ...d,
      matchScore: Math.min(99, Math.max(60, matchScore)),
      matchBreakdown: {
        weather: weatherScore,
        interest: interestScore,
        budget: budgetScore,
        transport: transportScore,
        group: groupScore
      },
      weatherFit
    };
  });

  // 3. 排序
  const sorted = scored.sort((a, b) => b.matchScore - a.matchScore);

  // 4. 多样性保证
  const targetCount = pickCount(prefs);
  const { result, overflow } = ensureDiversity(sorted, 2);

  // 合并，确保达到目标数量
  const finalResults = [...result, ...overflow].slice(0, targetCount);

  // 5. 如果仍不足，从已排序池补充
  if (finalResults.length < 3) {
    const existing = new Set(finalResults.map(r => r.id));
    for (const item of sorted) {
      if (!existing.has(item.id)) {
        finalResults.push(item);
        if (finalResults.length >= 3) break;
      }
    }
  }

  return finalResults;
}

/**
 * 生成推荐理由文案
 */
export function generateReason(dest, prefs) {
  const reasons = [];

  // 天气理由
  const weatherFit = dest.weatherFit[prefs.weather.condition] || 0.5;
  if (weatherFit >= 0.9) {
    reasons.push(`今日${prefs.weather.condition === 'sunny' ? '阳光正好' : '天气适宜'}，特别适合${dest.typeLabel}`);
  } else if (weatherFit >= 0.7) {
    reasons.push(`当前天气下${dest.name}体验良好`);
  } else if (weatherFit < 0.5 && dest.type === 'indoor') {
    reasons.push(`天气一般，${dest.name}全程室内不受影响`);
  }

  // 兴趣理由
  const matchedInterests = dest.interests.filter(i => prefs.interests.includes(i));
  if (matchedInterests.length > 0) {
    const interestLabels = {
      nature: '亲近自然', culture: '人文探索', food: '美食探店',
      photo: '拍照打卡', kids: '亲子互动', indoor: '室内休闲',
      sports: '运动户外', relax: '放松身心'
    };
    const labels = matchedInterests.map(i => interestLabels[i]).slice(0, 2).join('、');
    reasons.push(`满足你${labels}的偏好`);
  }

  // 预算理由
  if (dest.budget.max <= prefs.budget.max) {
    reasons.push(`人均¥${dest.budget.max}在预算内`);
  }

  // 人群理由
  const groupFit = dest.groupFit[prefs.groupType] || 0.7;
  if (groupFit >= 0.95) {
    const groupLabels = {
      solo: '独自出行', couple: '情侣约会', family: '带娃家庭', friends: '朋友聚会'
    };
    reasons.push(`特别适合${groupLabels[prefs.groupType]}`);
  }

  // 交通理由
  if (dest.transport.includes('metro') && prefs.transport.includes('metro')) {
    reasons.push('地铁直达交通便利');
  }

  return reasons.join('，') + '。';
}
