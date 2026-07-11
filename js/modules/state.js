// ============================================
// 轻量状态管理 — 当前视图/偏好/结果/选中/收藏
// 一会去哪儿 · State
// ============================================

const STORAGE_KEY = 'yihui-favorites';
const CITY_STORAGE_KEY = 'yihui-city';
const ADDRESS_STORAGE_KEY = 'yihui-address';

// 初始占位天气（加载中状态，等待实时数据）
const loadingWeather = {
  city: '北京',
  condition: 'cloudy',
  temp: '--',
  feelsLike: '--',
  windLevel: 0,
  uvIndex: 0,
  humidity: 0,
  sunset: '--',
  sunrise: '--',
  weatherDesc: '正在获取实时天气…',
  hourly: [],
  isRealTime: false,
  source: 'loading',
  isLoading: true
};

class AppState {
  constructor() {
    // 从 localStorage 恢复持久化的城市和地址
    const savedCity = this.loadCity();
    const savedAddress = this.loadAddress();
    this.state = {
      currentView: 'hero',
      city: savedCity || '北京',
      weather: { ...loadingWeather, city: savedCity || '北京' },
      weatherLoading: true,
      userLocation: null, // {lat, lng, accuracy} 浏览器定位
      // 用户精确地址（手动填写或定位确认）
      userAddress: savedAddress, // {text, lat, lng, formattedAddress, source}
      // 用户自然语言需求
      userNeeds: '', // 用户输入的自然语言描述
      // AI解析后的结构化偏好
      parsedPreferences: null, // {keywords, interests, groupType, budget, duration, transport, reasoning}
      preferences: {
        groupType: null,
        interests: [],
        budget: { min: 0, max: 250, perPerson: true },
        transport: [],
        duration: 'half-day'
      },
      results: [],
      selectedIndex: -1,
      favorites: this.loadFavorites(),
      // 设置面板状态
      settingsOpen: false,
      // AI处理状态
      aiProcessing: false,
      aiStep: '' // 当前处理步骤描述
    };
    this.listeners = [];
  }

  // ── 城市持久化 ──
  loadCity() {
    try {
      return localStorage.getItem(CITY_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  saveCity(city) {
    try {
      localStorage.setItem(CITY_STORAGE_KEY, city);
    } catch {
      // 忽略存储错误
    }
  }

  // ── 地址持久化 ──
  loadAddress() {
    try {
      const stored = localStorage.getItem(ADDRESS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  saveAddress(address) {
    try {
      if (address) {
        localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
      } else {
        localStorage.removeItem(ADDRESS_STORAGE_KEY);
      }
    } catch {
      // 忽略存储错误
    }
  }

  // ── 订阅状态变化 ──
  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  // ── 视图切换 ──
  setView(view) {
    this.state.currentView = view;
    this.notify();
  }

  // ── 城市切换（同步设置城市名，天气由 app.js 异步获取后调用 setWeather） ──
  setCity(city) {
    this.state.city = city;
    // 标记天气为加载中
    this.state.weather = { ...loadingWeather, city };
    this.state.weatherLoading = true;
    // 持久化城市选择，刷新后保留
    this.saveCity(city);
    this.notify();
  }

  // ── 设置实时天气数据（由 weatherService 获取后调用） ──
  setWeather(weatherData) {
    this.state.weather = weatherData;
    this.state.weatherLoading = false;
    this.notify();
  }

  // ── 设置用户定位 ──
  setUserLocation(location) {
    this.state.userLocation = location;
    this.notify();
  }

  // ── 设置用户精确地址 ──
  setUserAddress(address) {
    this.state.userAddress = address;
    // 持久化地址，刷新后保留
    this.saveAddress(address);
    this.notify();
  }

  // ── 设置用户自然语言需求 ──
  setUserNeeds(needs) {
    this.state.userNeeds = needs;
    this.notify();
  }

  // ── 设置AI解析后的偏好 ──
  setParsedPreferences(prefs) {
    this.state.parsedPreferences = prefs;
    this.notify();
  }

  // ── 设置AI处理状态 ──
  setAIProcessing(processing, step = '') {
    this.state.aiProcessing = processing;
    this.state.aiStep = step;
    this.notify();
  }

  // ── 设置面板开关 ──
  setSettingsOpen(open) {
    this.state.settingsOpen = open;
    this.notify();
  }

  // ── 偏好更新 ──
  updatePreferences(partial) {
    this.state.preferences = { ...this.state.preferences, ...partial };
    this.notify();
  }

  setGroupType(groupType) {
    this.state.preferences.groupType = groupType;
    this.notify();
  }

  toggleInterest(interest) {
    const interests = this.state.preferences.interests;
    const idx = interests.indexOf(interest);
    if (idx > -1) {
      interests.splice(idx, 1);
    } else {
      interests.push(interest);
    }
    this.notify();
  }

  setBudget(max) {
    this.state.preferences.budget.max = max;
    this.state.preferences.budget.min = Math.max(0, Math.floor(max * 0.25));
    this.notify();
  }

  toggleTransport(transport) {
    const transports = this.state.preferences.transport;
    const idx = transports.indexOf(transport);
    if (idx > -1) {
      transports.splice(idx, 1);
    } else {
      transports.push(transport);
    }
    this.notify();
  }

  setDuration(duration) {
    this.state.preferences.duration = duration;
    this.notify();
  }

  // ── 应用预设画像 ──
  applyProfile(profile) {
    this.state.preferences = {
      ...this.state.preferences,
      ...profile.preferences
    };
    this.notify();
  }

  // ── 结果管理 ──
  setResults(results) {
    this.state.results = results;
    this.notify();
  }

  selectResult(index) {
    this.state.selectedIndex = index;
    this.notify();
  }

  getSelectedResult() {
    if (this.state.selectedIndex < 0) return null;
    return this.state.results[this.state.selectedIndex];
  }

  // ── 收藏管理（localStorage 持久化） ──
  loadFavorites() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.favorites));
    } catch {
      // 忽略存储错误
    }
  }

  toggleFavorite(destId) {
    const idx = this.state.favorites.indexOf(destId);
    if (idx > -1) {
      this.state.favorites.splice(idx, 1);
    } else {
      this.state.favorites.push(destId);
    }
    this.saveFavorites();
    this.notify();
    return idx === -1; // 返回是否新增收藏
  }

  isFavorited(destId) {
    return this.state.favorites.includes(destId);
  }

  // ── 获取当前偏好（含天气，供推荐引擎使用） ──
  getPreferencesForRecommend() {
    return {
      ...this.state.preferences,
      weather: this.state.weather,
      location: { city: this.state.city, ...this.state.userLocation }
    };
  }

  // ── 验证偏好是否完整 ──
  isPreferencesValid() {
    const p = this.state.preferences;
    return p.groupType !== null &&
           p.interests.length > 0 &&
           p.transport.length > 0;
  }
}

// 单例导出
export const appState = new AppState();
