// ============================================
// 用户画像预设 — 四类目标用户
// 一会去哪儿 · User Profiles
// ============================================

export const userProfiles = {
  // 城市年轻上班族
  worker: {
    id: 'worker',
    label: '上班族周末',
    icon: 'briefcase',
    description: '工作日太累，周末想放松',
    preferences: {
      groupType: 'couple',
      interests: ['food', 'photo', 'relax'],
      budget: { min: 100, max: 300, perPerson: true },
      transport: ['metro', 'taxi'],
      duration: 'half-day'
    }
  },
  // 带娃家庭
  family: {
    id: 'family',
    label: '带娃家庭',
    icon: 'users',
    description: '兼顾大人和孩子的兴趣',
    preferences: {
      groupType: 'family',
      interests: ['kids', 'nature', 'indoor'],
      budget: { min: 50, max: 250, perPerson: true },
      transport: ['metro', 'driving'],
      duration: 'half-day'
    }
  },
  // 大学生
  student: {
    id: 'student',
    label: '大学生探索',
    icon: 'backpack',
    description: '预算有限，想探索新鲜',
    preferences: {
      groupType: 'friends',
      interests: ['culture', 'photo', 'food'],
      budget: { min: 0, max: 120, perPerson: true },
      transport: ['metro', 'bus', 'cycling'],
      duration: 'half-day'
    }
  },
  // 游客
  tourist: {
    id: 'tourist',
    label: '外地游客',
    icon: 'map',
    description: '来陌生城市，想看经典',
    preferences: {
      groupType: 'couple',
      interests: ['culture', 'photo', 'food'],
      budget: { min: 50, max: 350, perPerson: true },
      transport: ['metro', 'taxi', 'walking'],
      duration: 'full-day'
    }
  }
};

// 人群类型选项
export const groupTypes = [
  { id: 'solo', label: '独自出发', icon: 'user' },
  { id: 'couple', label: '两人世界', icon: 'heart' },
  { id: 'family', label: '带娃家庭', icon: 'users' },
  { id: 'friends', label: '朋友结伴', icon: 'smile' }
];

// 兴趣标签选项
export const interestOptions = [
  { id: 'nature', label: '亲近自然', icon: 'leaf' },
  { id: 'culture', label: '人文古迹', icon: 'landmark' },
  { id: 'food', label: '美食探店', icon: 'utensils' },
  { id: 'photo', label: '拍照打卡', icon: 'camera' },
  { id: 'kids', label: '亲子互动', icon: 'baby' },
  { id: 'indoor', label: '室内休闲', icon: 'home' },
  { id: 'sports', label: '运动户外', icon: 'activity' },
  { id: 'relax', label: '文艺看展', icon: 'book' }
];

// 交通方式选项
export const transportOptions = [
  { id: 'walking', label: '步行', icon: 'walk' },
  { id: 'metro', label: '地铁/公交', icon: 'metro' },
  { id: 'driving', label: '自驾', icon: 'car' },
  { id: 'taxi', label: '打车', icon: 'taxi' },
  { id: 'cycling', label: '骑行', icon: 'bike' }
];

// 时长选项
export const durationOptions = [
  { id: 'half-day', label: '半日', hint: '3-4小时' },
  { id: 'full-day', label: '一日', hint: '6-8小时' },
  { id: 'two-day', label: '两日', hint: '过夜行程' }
];

// 城市数据（按区域分组，含坐标）— 统一数据源
export const cityData = {
  '直辖市': [
    { name: '北京', lat: 39.9042, lng: 116.4074 },
    { name: '上海', lat: 31.2304, lng: 121.4737 },
    { name: '天津', lat: 39.0842, lng: 117.2009 },
    { name: '重庆', lat: 29.5630, lng: 106.5516 },
  ],
  '华北': [
    { name: '石家庄', lat: 38.0428, lng: 114.5149 },
    { name: '太原', lat: 37.8706, lng: 112.5489 },
    { name: '呼和浩特', lat: 40.8426, lng: 111.7491 },
  ],
  '东北': [
    { name: '沈阳', lat: 41.8057, lng: 123.4315 },
    { name: '大连', lat: 38.9140, lng: 121.6147 },
    { name: '长春', lat: 43.8171, lng: 125.3235 },
    { name: '哈尔滨', lat: 45.8038, lng: 126.5350 },
  ],
  '华东': [
    { name: '南京', lat: 32.0603, lng: 118.7969 },
    { name: '苏州', lat: 31.2989, lng: 120.5853 },
    { name: '无锡', lat: 31.4912, lng: 120.3119 },
    { name: '杭州', lat: 30.2741, lng: 120.1551 },
    { name: '宁波', lat: 29.8683, lng: 121.5440 },
    { name: '温州', lat: 27.9938, lng: 120.6993 },
    { name: '合肥', lat: 31.8206, lng: 117.2272 },
    { name: '福州', lat: 26.0745, lng: 119.2965 },
    { name: '厦门', lat: 24.4798, lng: 118.0894 },
    { name: '南昌', lat: 28.6820, lng: 115.8579 },
    { name: '济南', lat: 36.6512, lng: 117.1201 },
    { name: '青岛', lat: 36.0671, lng: 120.3826 },
  ],
  '华中': [
    { name: '郑州', lat: 34.7466, lng: 113.6253 },
    { name: '武汉', lat: 30.5928, lng: 114.3055 },
    { name: '长沙', lat: 28.2282, lng: 112.9388 },
    { name: '洛阳', lat: 34.6197, lng: 112.4540 },
  ],
  '华南': [
    { name: '广州', lat: 23.1291, lng: 113.2644 },
    { name: '深圳', lat: 22.5431, lng: 114.0579 },
    { name: '珠海', lat: 22.2710, lng: 113.5767 },
    { name: '佛山', lat: 23.0218, lng: 113.1219 },
    { name: '东莞', lat: 23.0207, lng: 113.7518 },
    { name: '南宁', lat: 22.8170, lng: 108.3669 },
    { name: '海口', lat: 20.0444, lng: 110.1989 },
    { name: '三亚', lat: 18.2528, lng: 109.5119 },
  ],
  '西南': [
    { name: '成都', lat: 30.5728, lng: 104.0668 },
    { name: '贵阳', lat: 26.6470, lng: 106.6302 },
    { name: '昆明', lat: 24.8801, lng: 102.8329 },
    { name: '拉萨', lat: 29.6500, lng: 91.1409 },
    { name: '丽江', lat: 26.8721, lng: 100.2272 },
  ],
  '西北': [
    { name: '西安', lat: 34.3416, lng: 108.9398 },
    { name: '兰州', lat: 36.0611, lng: 103.8343 },
    { name: '西宁', lat: 36.6171, lng: 101.7782 },
    { name: '银川', lat: 38.4872, lng: 106.2309 },
    { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168 },
  ],
  '热门旅游': [
    { name: '桂林', lat: 25.2734, lng: 110.2907 },
    { name: '张家界', lat: 29.1170, lng: 110.4793 },
    { name: '秦皇岛', lat: 39.9354, lng: 119.6005 },
    { name: '威海', lat: 37.5128, lng: 122.1202 },
    { name: '烟台', lat: 37.4638, lng: 121.4478 },
    { name: '敦煌', lat: 40.1421, lng: 94.6619 },
  ],
  '港澳': [
    { name: '香港', lat: 22.3193, lng: 114.1694 },
    { name: '澳门', lat: 22.1987, lng: 113.5439 },
  ],
  '台湾': [
    { name: '台北', lat: 25.0330, lng: 121.5654 },
    { name: '高雄', lat: 22.6273, lng: 120.3014 },
    { name: '台中', lat: 24.1477, lng: 120.6736 },
    { name: '台南', lat: 22.9908, lng: 120.2133 },
    { name: '花莲', lat: 23.9871, lng: 121.6016 },
  ],
};

// 扁平化城市名列表（兼容旧代码）
export const cityOptions = Object.values(cityData).flat().map(c => c.name);

// 城市坐标查找表（供地图服务使用）
export const cityCoordinates = {};
Object.values(cityData).flat().forEach(c => {
  cityCoordinates[c.name] = { lat: c.lat, lng: c.lng };
});

// 智能联动规则：选"带娃家庭"自动勾选"亲子互动"
export const smartLinkRules = {
  family: ['kids'],
  couple: [],
  friends: [],
  solo: []
};
