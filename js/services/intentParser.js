// ============================================
// 意图理解引擎 — 精准解析旅游需求
// 解决"我在深圳要去拉萨旅游"等跨城意图理解问题
// 一会去哪儿 · Intent Parser
// ============================================

// 中国主要城市/旅游目的地（用于匹配识别）
const KNOWN_DESTINATIONS = [
  '拉萨', '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '南京', '武汉',
  '重庆', '天津', '苏州', '长沙', '厦门', '青岛', '大连', '昆明', '大理', '丽江',
  '三亚', '海口', '桂林', '阳朔', '张家界', '黄山', '九寨沟', '西双版纳', '香格里拉',
  '敦煌', '青海湖', '兰州', '银川', '西宁', '乌鲁木齐', '吐鲁番', '喀什', '伊犁',
  '哈尔滨', '长春', '沈阳', '呼伦贝尔', '额济纳', '太原', '平遥', '五台山',
  '洛阳', '开封', '郑州', '少林寺', '泰山', '曲阜', '济南', '烟台', '威海',
  '无锡', '扬州', '绍兴', '宁波', '温州', '福州', '泉州', '武夷山', '景德镇',
  '婺源', '庐山', '南昌', '赣州', '长沙', '凤凰古城', '岳阳', '衡山', '韶山',
  '香港', '澳门', '台北', '高雄', '台中', '花莲', '台南', '垦丁',
  '拉萨', '日喀则', '林芝', '纳木错', '羊卓雍错', '珠峰大本营', '冈仁波齐',
  '峨眉山', '乐山大佛', '都江堰', '青城山', '稻城亚丁', '海螺沟', '四姑娘山',
  '张家界', '凤凰', '芙蓉镇', '武陵源', '天门山',
  '黄山', '宏村', '西递', '徽州古城', '九华山',
  '武当山', '神农架', '恩施', '宜昌', '三峡',
  '鼓浪屿', '武夷山', '太姥山', '湄洲岛',
  '千岛湖', '普陀山', '雁荡山', '乌镇', '西塘', '南浔', '周庄', '同里',
  '平遥古城', '云冈石窟', '五台山', '壶口瀑布', '恒山', '悬空寺',
  '承德避暑山庄', '坝上草原', '北戴河', '山海关',
  '雪乡', '漠河', '长白山', '雾凇岛', '亚布力',
  '黄果树瀑布', '荔波', '梵净山', '西江千户苗寨', '镇远古镇',
  '北海', '涠洲岛', '德天瀑布', '阳朔', '龙脊梯田',
  '喀纳斯', '禾木', '赛里木湖', '那拉提', '巴音布鲁克',
];

/**
 * 解析旅游意图 — 从用户输入中提取出发地、目的地、是否跨城
 * @param {string} text - 用户输入
 * @param {string} currentCity - 当前定位城市
 * @returns {Object} {origin, destination, isCrossCity, travelType, confidence, rawAnalysis}
 */
export function parseTravelIntent(text, currentCity = '') {
  if (!text || typeof text !== 'string') {
    return { origin: '', destination: '', isCrossCity: false, travelType: 'local', confidence: 0, rawAnalysis: '输入为空' };
  }

  const cleanedText = text.trim();
  const lowerText = cleanedText.toLowerCase();

  // 1. 识别已知目的地（优先级最高）
  let destination = '';
  let destinationSource = '';
  for (const dest of KNOWN_DESTINATIONS) {
    if (cleanedText.includes(dest)) {
      destination = dest;
      destinationSource = 'known_list';
      break;
    }
  }

  // 2. 如果没匹配到已知目的地，用正则提取
  if (!destination) {
    const patterns = [
      // "前往/计划前往/准备前往/打算前往XX旅游/玩"
      /(?:前往|计划前往|准备前往|打算前往)([\u4e00-\u9fa5]{2,8}?)(?:旅游|玩|出差|看看|逛逛|走走|玩玩|出行|旅行|打卡|游|度假)/,
      // "去XX玩/旅游" "到XX旅游"（排除"去附近"等）
      /[去到]([\u4e00-\u9fa5]{2,8}?)(?:玩|旅游|出差|看看|逛逛|走走|有什么|旅行|打卡|游|度假)/,
      // "XX有什么好玩的" "XX旅游攻略"
      /([\u4e00-\u9fa5]{2,8}?)(?:有什么好玩的|有什么景点|有什么好吃|有哪些景点|有哪些好玩的|旅游攻略|攻略)/,
      // "XX旅游" "XX旅行"（结尾）
      /([\u4e00-\u9fa5]{2,8}?)(?:旅游|旅行|度假)$/,
    ];
    // 活动词黑名单：这些词是活动/行为，不是地名
    const activityWords = [
      '拍照', '摄影', '录像', '直播',
      '吃饭', '就餐', '觅食', '美食', '吃饭', '喝酒', '小酌', '品茶', '喝茶', '咖啡',
      '购物', '逛街', '买东西', '买衣', '进货',
      '徒步', '爬山', '攀岩', '骑行', '骑车', '跑步', '散步', '溜达', '闲逛',
      '看电影', '观影', '看剧', '看展', '看戏',
      '健身', '游泳', '滑雪', '滑冰', '潜水', '冲浪', '打球', '瑜伽',
      '唱歌', '蹦迪', '跳舞', '蹦床',
      '烧烤', '露营', '漂流', '划船', '骑马', '射箭',
      '密室', '剧本杀', '桌游',
      '按摩', '泡汤', '温泉', 'spa',
      '遛娃', '带娃', '亲子', '约会', '聚会', '聚餐', '团建',
      '放松', '休息', '睡觉', '发呆',
      '打卡', '签到', '签到打卡',
      '玩', '转转',
    ];
    // 动词首字：候选词以这些字开头时，大概率是活动而非地名
    const verbPrefixes = '拍摄吃喝买逛走跑爬骑滑潜冲唱跳打看写画做玩漂划钓养种睡休聚约遛散考回办学读游唱听弹吹';
    for (const p of patterns) {
      const m = cleanedText.match(p);
      if (m && m[1] && m[1].length >= 2) {
        const candidate = m[1].replace(/(?:市|县|区|镇)$/, '');
        const blacklist = ['附近', '周边', '哪里', '什么地方', '这儿', '那儿', '这里', '那里', '我们', '大家', '今天', '明天', '周末', '下周'];
        // 排除：黑名单词 / 活动词 / 动词首字开头
        const isBlacklisted = blacklist.includes(candidate);
        const isActivity = activityWords.includes(candidate);
        const startsWithVerb = verbPrefixes.includes(candidate[0]);
        if (!isBlacklisted && !isActivity && !startsWithVerb && candidate.length >= 2) {
          destination = candidate;
          destinationSource = 'regex';
          break;
        }
      }
    }
  }

  // 3. 识别出发地（"从XX出发" "我在XX" "XX去YY"）
  let origin = currentCity || '';
  const originPatterns = [
    /从([\u4e00-\u9fa5]{2,8}?)(?:出发|去|到|前往|飞|坐|走)/,
    /我在([\u4e00-\u9fa5]{2,8}?)(?:要去|想去|准备去|打算去|出发|去|到|前往)/,
    /([\u4e00-\u9fa5]{2,6}?)[去到往]([\u4e00-\u9fa5]{2,8}?)(?:旅游|玩|出差|看看|逛逛)/,
  ];
  // 出发地候选排除：代词开头、助动词词组
  const originBlacklist = ['附近', '周边', '哪里', '这里', '那里', '我们', '大家',
    '我打算', '我准备', '我计划', '我想', '我要', '咱们', '咱打算', '我今',
    '打算', '准备', '计划'];
  // 代词首字（不含"大"，因为"大理""大同"是合法地名）
  const pronounStarts = '我你他她它咱这那';
  for (const p of originPatterns) {
    const m = cleanedText.match(p);
    if (m && m[1] && m[1].length >= 2) {
      const candidate = m[1].replace(/(?:市|县|区|镇)$/, '');
      const isBlacklisted = originBlacklist.includes(candidate);
      const startsWithPronoun = pronounStarts.includes(candidate[0]);
      if (!isBlacklisted && !startsWithPronoun) {
        origin = candidate;
        break;
      }
    }
  }

  // 特殊处理："从A到B" "从A去B" 的第二个捕获组是目的地
  const fromToMatch = cleanedText.match(/从([\u4e00-\u9fa5]{2,6}?)[去到往]([\u4e00-\u9fa5]{2,8}?)(?:旅游|玩|出差|看看|逛逛|走走|旅行|打卡|度假|出发)/);
  if (fromToMatch && fromToMatch[2]) {
    origin = fromToMatch[1].replace(/(?:市|县|区|镇)$/, '');
    destination = fromToMatch[2].replace(/(?:市|县|区|镇)$/, '');
  }

  // 4. 判断是否跨城旅游
  const normalize = (s) => (s || '').replace(/(?:市|省|自治区|特别行政区)$/, '').trim();
  const normalizedOrigin = normalize(origin);
  const normalizedDest = normalize(destination);
  const isCrossCity = destination && normalizedOrigin && normalizedOrigin !== normalizedDest;

  // 5. 判断旅游类型
  let travelType = 'local';
  if (isCrossCity) {
    travelType = 'cross-city';
  } else if (destination && !currentCity) {
    travelType = 'destination-only';
  }

  // 6. 识别是否多日
  const isMultiDay = /(\d+)\s*天|Day\s*\d|第一天|第二天|Day1|Day2|多日|两天|三天|四天|五天|一周|几天/.test(cleanedText);
  const dayMatch = cleanedText.match(/(\d+)\s*天/);
  const dayCount = dayMatch ? parseInt(dayMatch[1]) : (isMultiDay ? 2 : 1);

  // 7. 置信度
  let confidence = 0;
  if (destination) confidence += 50;
  if (destinationSource === 'known_list') confidence += 20;
  if (origin) confidence += 15;
  if (isCrossCity) confidence += 15;

  const rawAnalysis = `意图分析：出发地="${origin}"，目的地="${destination}"，跨城=${isCrossCity}，类型=${travelType}，多日=${isMultiDay}(${dayCount}天)，置信度=${confidence}%`;

  return {
    origin,
    destination,
    isCrossCity,
    travelType,
    isMultiDay,
    dayCount,
    confidence,
    rawAnalysis,
    searchCity: destination || currentCity, // 搜索 POI 用的城市
  };
}

/**
 * 构建注入到 LLM user message 的意图摘要
 * 让模型明确知道用户意图（即使 system prompt 被忽略，user message 也能传达）
 */
export function buildIntentSummary(intent, userInput, currentCity) {
  const { origin, destination, isCrossCity, travelType, isMultiDay, dayCount, searchCity } = intent;

  let summary = `[意图分析结果]\n`;
  summary += `用户输入：${userInput}\n`;
  summary += `当前定位城市：${currentCity || '未知'}\n`;
  summary += `识别出发地：${origin || '未知'}\n`;
  summary += `识别目的地：${destination || '无（本地探索）'}\n`;

  if (isCrossCity) {
    summary += `旅游类型：跨城旅游（${origin} → ${destination}）\n`;
    summary += `⚠️ 关键指令：用户要从「${origin}」前往「${destination}」旅游。\n`;
    summary += `搜索地点（search_places）时 city 参数必须填「${destination}」，绝对不能填「${origin}」。\n`;
    summary += `查天气（get_weather）时 city 参数填「${destination}」。\n`;
    summary += `需要调用 search_tickets 查询 ${origin}→${destination} 的车票/机票。\n`;
    if (isMultiDay) {
      summary += `需要调用 search_hotels 查询「${destination}」的酒店（${dayCount}天行程需要住宿）。\n`;
      summary += `规划 ${dayCount} 天的行程，按 Day1、Day2... 组织推荐地点。\n`;
    }
  } else if (destination) {
    summary += `旅游类型：本地探索（目的地：${destination}）\n`;
    summary += `搜索地点时 city 参数填「${searchCity}」。\n`;
  } else {
    summary += `旅游类型：本地探索（当前位置附近）\n`;
    summary += `搜索地点时用当前位置坐标周边搜索。\n`;
  }

  summary += `\n请根据以上意图分析，调用工具收集信息并生成旅游攻略。`;
  return summary;
}
