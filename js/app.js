// ============================================
// 应用入口 — 零配置开箱即用 / 真实地图数据 / 可选AI增强
// 一会去哪儿 · App
// ============================================

import { appState } from './modules/state.js';
import {
  renderHeader, renderHero, renderPreferences, renderGenerating,
  renderResults, renderFooter, renderWeatherCard,
  renderNearbyResults, renderSettingsModal, renderAIProcessing, renderRealResults,
  renderInspirationPanel, renderAgentProcessing, renderAgentResults
} from './modules/renderer.js';
import {
  initCityPicker, updateWeatherTint, showToast,
  openDetail, closeDetail, ParticleCompass, animateGenSteps
} from './modules/interactions.js';
import { recommend } from './modules/recommender.js';
import { destinations } from './data/destinations.js';
import { userProfiles, smartLinkRules } from './data/userProfile.js';
import { fetchWeather, fetchWeatherByCoords } from './services/weatherService.js';
import { getCurrentPosition } from './services/geolocationService.js';
import { searchNearbyPOIs, reverseGeocode } from './services/poiService.js';
import { getSettings, saveSettings, checkConfigured, needsSetup, updateSettings, isEnhancedMode } from './modules/settings.js';
import { geocode, reverseGeocode as mapReverseGeocode, searchPOIs, searchNearby, getNavigateUrl, enrichPOIsWithImages } from './services/mapService.js';
import { parseNeeds, generateLocalRecommendations } from './services/localNlp.js';
import { parseUserNeeds, generateRecommendations, testLLMConnection, LLM_PRESETS, runAgent } from './services/llmService.js';
import { runLocalAgent } from './services/localAgent.js';
import { parseTravelIntent, buildIntentSummary } from './services/intentParser.js';
import { getIcon } from './modules/icons.js';

// ── 初始化应用 ──
function initApp() {
  // 初始化 AOS 滚动动画库
  if (window.AOS) {
    window.AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      delay: 0,
    });
  }

  const root = document.getElementById('app');

  // 渲染整体框架
  root.innerHTML = `
    ${renderHeader()}
    <main id="app-main"></main>
    <div id="detail-container"></div>
    <div id="settings-container"></div>
    ${renderFooter()}
  `;

  // 初始化天气色调（加载中状态）
  updateWeatherTint();

  // 渲染初始 Hero 视图
  renderHeroView();

  // 初始化城市选择器
  initCityPicker();

  // 绑定设置按钮
  bindSettingsButton();

  // 异步获取实时天气
  loadRealWeather(appState.state.city);

  // 零配置开箱即用：无需配置即可使用
  // 如已配置 API Key，则启用增强模式（更精准的地图数据 + AI智能推荐）
  if (isEnhancedMode()) {
    console.log('[增强模式] 已检测到 API Key 配置，将使用增强数据源');
  } else {
    console.log('[零配置模式] 使用免费 OpenStreetMap + 本地NLP引擎，开箱即用');
  }

  // 监听导航事件
  document.addEventListener('navigate', (e) => {
    const view = e.detail.view;
    handleNavigation(view);
  });
}

// ── 加载实时天气 ──
async function loadRealWeather(city) {
  try {
    const weatherData = await fetchWeather(city);
    appState.setWeather(weatherData);
    updateWeatherTint();

    const cardEl = document.getElementById('weatherCardContent');
    if (cardEl) {
      cardEl.innerHTML = renderWeatherCard();
    }

    // 同步刷新灵感面板
    refreshInspirationPanel();

    if (weatherData.isRealTime) {
      console.log(`[实时天气] ${city}: ${weatherData.weatherDesc} ${weatherData.temp}°C (来源: ${weatherData.source})`);
    }
  } catch (error) {
    console.error('天气初始化失败:', error);
  }
}

// ── 刷新灵感面板 ──
function refreshInspirationPanel() {
  const aside = document.getElementById('heroAside');
  if (aside) {
    aside.innerHTML = renderInspirationPanel();
  }
}

// ── 按具体地址加载精准天气 ──
async function loadWeatherByAddress(addressText) {
  const cardEl = document.getElementById('weatherCardContent');

  if (!addressText || !addressText.trim()) {
    // 清空了地址，回退到城市级天气
    await loadRealWeather(appState.state.city);
    return;
  }

  if (cardEl) {
    cardEl.innerHTML = renderWeatherCard(); // 显示加载状态
  }

  const city = appState.state.city;
  let weatherData = null;
  let addressData = null;

  try {
    // 1. 尝试地理编码获取坐标
    const geoResult = await geocode(addressText, city);
    const lat = geoResult.lat;
    const lng = geoResult.lng;

    // 2. 按坐标获取精准天气
    weatherData = await fetchWeatherByCoords(lat, lng);
    weatherData.city = city;

    addressData = {
      text: addressText,
      formattedAddress: geoResult.formattedAddress,
      lat, lng,
      province: geoResult.province,
      city: geoResult.city,
      district: geoResult.district,
      source: geoResult.source
    };

    console.log(`[精准天气·坐标] ${addressData.formattedAddress} (${lat},${lng}): ${weatherData.weatherDesc} ${weatherData.temp}°C`);
  } catch (geoError) {
    console.warn('地理编码失败，尝试直接用地址查询天气:', geoError.message);
    // 3. 回退：直接用地址文本查询 wttr.in
    try {
      weatherData = await fetchWeather(`${addressText} ${city}`);
      weatherData.city = city;
      addressData = {
        text: addressText,
        formattedAddress: `${city} · ${addressText}`,
        lat: null, lng: null,
        source: 'manual'
      };
      console.log(`[精准天气·地名] ${addressText}: ${weatherData.weatherDesc} ${weatherData.temp}°C`);
    } catch (nameError) {
      console.warn('地名查询也失败，回退到城市级天气:', nameError.message);
    }
  }

  // 4. 如果获取到了天气，更新UI
  if (weatherData) {
    appState.setWeather(weatherData);
    updateWeatherTint();
    if (cardEl) cardEl.innerHTML = renderWeatherCard();
    refreshInspirationPanel();
  } else {
    // 全部失败，回退到城市级天气
    await loadRealWeather(city);
    return;
  }

  // 5. 同步地址到地址输入框
  if (addressData) {
    appState.setUserAddress(addressData);
    const addressInput = document.getElementById('addressInput');
    if (addressInput) addressInput.value = addressData.formattedAddress;
    const addressHint = document.getElementById('addressHint');
    if (addressHint) addressHint.textContent = `✓ 已确认：${addressData.formattedAddress}`;
  }
}

// ── 渲染 Hero 视图 ──
function renderHeroView() {
  const main = document.getElementById('app-main');
  main.innerHTML = renderHero();
  bindHeroEvents();
}

// ── 导航处理 ──
function handleNavigation(view) {
  const main = document.getElementById('app-main');
  const currentView = main.querySelector('.view');
  if (currentView) {
    currentView.style.opacity = '0';
    currentView.style.transform = 'translateY(-12px)';
    currentView.style.transition = 'all var(--duration-normal) var(--ease-out)';
  }

  setTimeout(() => {
    switch (view) {
      case 'hero':
        renderHeroView();
        break;
      case 'preferences':
        renderPreferencesView();
        break;
      case 'generating':
        renderGeneratingView();
        break;
      case 'results':
        renderResultsViewDirect();
        break;
    }
    appState.setView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 200);
}

function renderPreferencesView() {
  const main = document.getElementById('app-main');
  main.innerHTML = renderPreferences();
  const view = main.querySelector('.view');
  if (view) view.classList.add('is-active');
  bindPreferencesEvents();
}

function renderGeneratingView() {
  const main = document.getElementById('app-main');
  main.innerHTML = renderGenerating();
  const view = main.querySelector('.view');
  if (view) view.classList.add('is-active');
  bindGeneratingEvents();
}

function renderResultsViewDirect() {
  const main = document.getElementById('app-main');
  const prefs = appState.getPreferencesForRecommend();
  const results = recommend(prefs, destinations);
  appState.setResults(results);
  main.innerHTML = renderResults();
  const view = main.querySelector('.view');
  if (view) view.classList.add('is-active');
  bindResultsEvents();
}

// ============================================
// Hero 视图事件绑定（新流程）
// ============================================
function bindHeroEvents() {
  // 生成方案按钮
  const genBtn = document.getElementById('generatePlan');
  if (genBtn) {
    genBtn.addEventListener('click', () => handleGeneratePlan());
  }

  // 定位按钮
  const locateBtn = document.getElementById('locateBtn');
  if (locateBtn) {
    locateBtn.addEventListener('click', () => handleLocate());
  }

  // 地址输入框 - 回车确认
  const addressInput = document.getElementById('addressInput');
  if (addressInput) {
    addressInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddressConfirm(addressInput.value);
      }
    });
    // 失焦时自动确认地址
    addressInput.addEventListener('blur', () => {
      if (addressInput.value.trim()) {
        handleAddressConfirm(addressInput.value);
      }
    });
  }

  // 需求输入框
  const needsInput = document.getElementById('needsInput');
  if (needsInput) {
    needsInput.addEventListener('input', (e) => {
      appState.setUserNeeds(e.target.value);
    });
  }

  // 示例标签
  document.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const example = chip.dataset.example;
      const needsInput = document.getElementById('needsInput');
      if (needsInput) {
        needsInput.value = example;
        appState.setUserNeeds(example);
        needsInput.focus();
      }
    });
  });

  // 灵感面板快速探索标签
  document.querySelectorAll('.inspiration-panel__explore-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const query = tag.dataset.quick;
      const needsInput = document.getElementById('needsInput');
      if (needsInput) {
        needsInput.value = query;
        appState.setUserNeeds(query);
        needsInput.focus();
        needsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // 快速体验画像（保留原有功能）
  document.querySelectorAll('.quick-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const profileId = btn.dataset.profile;
      const profile = userProfiles[profileId];
      if (profile) {
        appState.applyProfile(profile);
        // 填充默认需求和地址
        if (!appState.state.userNeeds) {
          const needsInput = document.getElementById('needsInput');
          if (needsInput) {
            needsInput.value = profile.description || profile.label;
            appState.setUserNeeds(needsInput.value);
          }
        }
        // 零配置开箱即用：直接走智能流程
        handleGeneratePlan();
      }
    });
  });
}

// ============================================
// 地址处理
// ============================================

// 定位按钮处理
async function handleLocate() {
  showToast('正在获取你的位置…');
  const locateBtn = document.getElementById('locateBtn');
  if (locateBtn) locateBtn.disabled = true;

  try {
    const position = await getCurrentPosition({ timeout: 8000 });
    const { lat, lng, accuracy } = position;
    appState.setUserLocation({ lat, lng, accuracy });
    console.log(`[定位成功] ${lat}, ${lng} (精度: ${Math.round(accuracy)}m)`);

    // 统一使用 mapService 逆地理编码（内部自动选择免费/增强方案）
    try {
      const addrInfo = await mapReverseGeocode(lat, lng);
      const addressData = {
        text: addrInfo.formattedAddress,
        formattedAddress: addrInfo.formattedAddress,
        lat, lng,
        province: addrInfo.province,
        city: addrInfo.city,
        district: addrInfo.district,
        source: addrInfo.source
      };
      appState.setUserAddress(addressData);
      updateAddressUI(addressData.formattedAddress);

      // 同步更新顶部 Bar 的城市显示，使定位结果反映在导航栏
      // 优先用城市名，没有则用省名，再没有则用 district
      const cityNameRaw = addrInfo.city || addrInfo.province || addrInfo.district || '';
      const cityNameShort = cityNameRaw.replace(/市$/, '').replace(/省$/, '').replace(/自治区$/, '');
      if (cityNameShort) {
        appState.setCity(cityNameShort);
        const cityEl = document.getElementById('currentCity');
        if (cityEl) cityEl.textContent = cityNameShort;
        // 重新加载该城市的天气，并同步刷新顶部天气卡片与底部灵感面板
        loadRealWeather(cityNameShort);
      }
      showToast(`已定位：${addrInfo.formattedAddress.slice(0, 40)}`);
    } catch (mapError) {
      console.warn('逆地理编码失败，使用坐标:', mapError.message);
      const addressData = {
        text: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        formattedAddress: `当前位置(${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat, lng,
        source: 'browser-geolocation'
      };
      appState.setUserAddress(addressData);
      updateAddressUI(addressData.formattedAddress);
      showToast('已定位，地址解析失败，已使用坐标');
    }
  } catch (error) {
    console.error('定位失败:', error);
    showToast(`定位失败：${error.message}`);
  } finally {
    if (locateBtn) locateBtn.disabled = false;
  }
}

// 地址确认（手动输入）
async function handleAddressConfirm(addressText) {
  if (!addressText || !addressText.trim()) {
    appState.setUserAddress(null);
    updateAddressUI('');
    return;
  }

  const hintEl = document.getElementById('addressHint');
  if (hintEl) hintEl.textContent = '正在解析地址…';

  // 统一使用 mapService 地理编码（内部自动选择免费 Nominatim / 增高高德百度）
  try {
    const geoResult = await geocode(addressText, appState.state.city);
    const addressData = {
      text: addressText,
      formattedAddress: geoResult.formattedAddress,
      lat: geoResult.lat,
      lng: geoResult.lng,
      province: geoResult.province,
      city: geoResult.city,
      district: geoResult.district,
      source: geoResult.source
    };
    appState.setUserAddress(addressData);
    updateAddressUI(addressData.formattedAddress, true);
    showToast(`地址已确认：${addressData.formattedAddress.slice(0, 40)}`);

    // 同步更新天气（基于具体地址获取精准天气）
    loadWeatherByAddress(addressData.formattedAddress);
  } catch (error) {
    console.error('地址解析失败:', error);
    // 解析失败也保存原始文本，不阻塞流程
    const addressData = {
      text: addressText,
      formattedAddress: addressText,
      lat: null, lng: null,
      source: 'manual'
    };
    appState.setUserAddress(addressData);
    updateAddressUI(addressText, true);
    showToast(`地址解析失败，已保存原始地址（仍可生成方案）`);
  }
}

function updateAddressUI(text, confirmed = false) {
  const hintEl = document.getElementById('addressHint');
  if (hintEl) {
    if (text) {
      hintEl.innerHTML = confirmed
        ? `<span style="color:var(--color-accent)">✓ 已确认：${text}</span>`
        : `✓ 已确认：${text}`;
    } else {
      hintEl.textContent = '点击右上角选择省/市/区，或手动输入详细地址';
    }
  }
  const inputEl = document.getElementById('addressInput');
  if (inputEl && text) inputEl.value = text;
}

// ============================================
// 生成方案主流程（零配置可用 / 有Key自动增强）
// ============================================
async function handleGeneratePlan() {
  // 防止重复点击
  if (appState.state.aiProcessing) {
    console.log('[handleGeneratePlan] 正在处理中，忽略重复点击');
    return;
  }
  // 1. 验证输入
  const needsInput = document.getElementById('needsInput');
  const needs = appState.state.userNeeds || needsInput?.value || '';
  const addressInput = document.getElementById('addressInput');
  const addressText = addressInput?.value?.trim() || '';
  let address = appState.state.userAddress;

  if (!needs.trim()) {
    showToast('请描述你的出游需求');
    needsInput?.focus();
    return;
  }

  // 如果state中没有地址但输入框有值，先保存
  if (!address && addressText) {
    address = {
      text: addressText,
      formattedAddress: addressText,
      lat: null, lng: null,
      source: 'manual'
    };
    appState.setUserAddress(address);
  }

  if (!address) {
    showToast('请输入或定位你的地址');
    addressInput?.focus();
    return;
  }

  // 2. 零配置开箱即用：无需检查 API Key
  // mapService 和 localNlp 内部会自动选择免费/增强方案

  // 3. 启动智能流程
  await runAIFlow(needs, address);
}

// 智能处理主流程（Agent ToolCall 循环 / LLM 或 本地降级）
async function runAIFlow(needs, address) {
  const main = document.getElementById('app-main');
  const configured = checkConfigured();
  const useLLM = configured.llm;

  // 意图理解：精准解析出发地/目的地/是否跨城
  const intent = parseTravelIntent(needs, appState.state.city);
  console.log('[意图分析]', intent.rawAnalysis);

  // Agent 上下文（综合意图分析结果）
  const settings = getSettings();
  const context = {
    currentLocation: address,
    userAddress: address,
    city: appState.state.city,
    weather: appState.state.weather,
    targetLocation: intent.destination,
    isCrossCity: intent.isCrossCity,
    searchCity: intent.searchCity,
    origin: intent.origin,
    travelType: intent.travelType,
    isMultiDay: intent.isMultiDay,
    dayCount: intent.dayCount,
    intent,
    // 规划模板与视觉理解配置
    planTemplate: settings.llm?.planTemplate || 'auto',
    visionSupported: settings.llm?.visionSupported === true,
    // 构建意图摘要注入 LLM
    intentSummary: buildIntentSummary(intent, needs, appState.state.city)
  };

  // Agent 步骤状态（实时更新）
  const agentSteps = [];
  let currentStatus = 'Agent 启动中…';

  const updateAgentView = () => {
    main.innerHTML = renderAgentProcessing(agentSteps, currentStatus);
    // 自动滚动到 Agent 轨迹底部，展示最新步骤
    const trace = document.getElementById('agentTrace');
    if (trace) {
      requestAnimationFrame(() => {
        trace.scrollTop = trace.scrollHeight;
      });
    }
  };

  // 流式渲染节流：rAF 合并多次 stream_update 为单次重绘，避免逐字重排卡顿
  let streamRenderQueued = false;
  const scheduleStreamRender = () => {
    if (streamRenderQueued) return;
    streamRenderQueued = true;
    requestAnimationFrame(() => {
      streamRenderQueued = false;
      updateAgentView();
    });
  };

  appState.setAIProcessing(true, 'agent');
  // 初始思考步骤：展示意图分析结果
  agentSteps.push({ type: 'thinking', content: intent.rawAnalysis });
  if (intent.isCrossCity) {
    agentSteps.push({ type: 'thinking', content: `跨城旅游：${intent.origin} → ${intent.destination}，将搜索目的地「${intent.destination}」的天气、景点、车票` });
  }
  updateAgentView();

  try {
    let result;
    const onStep = (step) => {
      if (step.type === 'stream_update') {
        // 流式增量：更新最后一个 stream 步骤的内容，节流重绘
        const last = agentSteps[agentSteps.length - 1];
        if (last && last.type === 'stream') {
          last.content = step.content;
        }
        scheduleStreamRender();
        return;
      }
      agentSteps.push(step);
      if (step.type === 'thinking') currentStatus = step.content;
      else if (step.type === 'tool_call') currentStatus = `调用工具：${step.toolName}`;
      else if (step.type === 'tool_result') currentStatus = step.content || '工具执行完成';
      else if (step.type === 'stream') currentStatus = '正在生成攻略…';
      else if (step.type === 'final') currentStatus = '生成完成';
      updateAgentView();
    };

    if (useLLM) {
      // LLM Agent 模式：完整 ToolCall 循环
      console.log('[Agent] LLM 模式启动');
      try {
        result = await runAgent(needs, context, onStep);
      } catch (e) {
        console.warn('[Agent] LLM 失败，降级到本地 Agent:', e.message);
        // 清空已有步骤重新开始
        agentSteps.length = 0;
        result = await runLocalAgent(needs, context, onStep);
      }
    } else {
      // 本地 Agent 模式：规则引擎模拟工具调用
      console.log('[Agent] 本地模式启动');
      result = await runLocalAgent(needs, context, onStep);
    }

    const { plan, toolCalls } = result;
    console.log('[Agent] 完成，工具调用数:', toolCalls.length, '推荐数:', plan.recommendations?.length || 0);

    // 视觉确认模式下图片已在 runAgent 内获取并经模型分析，无需重复获取
    const alreadyHasImages = plan.recommendations?.some(r => r.photos && r.photos.length > 0);
    if (!alreadyHasImages && plan.recommendations && plan.recommendations.length > 0) {
      // 为推荐地点补充图片（异步，不阻塞渲染，加载完成后更新 DOM）
      enrichPOIsWithImages(plan.recommendations, 12).then(() => {
        updateCardImages(plan.recommendations);
      }).catch(e => {
        console.warn('[图片增强] 失败:', e.message);
      });
    } else if (alreadyHasImages) {
      // 图片已就绪（视觉确认模式），渲染后直接更新 DOM
      requestAnimationFrame(() => updateCardImages(plan.recommendations));
    }

    // 渲染 Agent 结果
    appState.setResults(plan.recommendations || []);
    main.innerHTML = renderAgentResults(plan, toolCalls, address);
    const view = main.querySelector('.view');
    if (view) view.classList.add('is-active');

    bindRealResultsEvents();

    if (window.AOS) window.AOS.refreshHard();

    appState.setAIProcessing(false);
    const modeLabel = useLLM ? 'LLM Agent' : '本地 Agent';
    const recCount = plan.recommendations?.length || 0;
    const extraCount = (plan.tickets?.length || 0) + (plan.hotels?.length || 0) + (plan.searchLinks?.length || 0);
    showToast(`Agent 完成：${recCount} 个推荐 + ${extraCount} 个资源链接（${modeLabel}）`);

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {
    console.error('Agent 流程失败:', error);
    appState.setAIProcessing(false);

    main.innerHTML = `
      <section class="view is-active results" id="view-results" data-view="results">
        <div class="container">
          <div class="empty-state">
            <div class="empty-state__icon">${getIcon('compass', 64)}</div>
            <h2 class="empty-state__title">Agent 处理失败</h2>
            <p class="empty-state__text">${error.message}</p>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap">
              <button class="btn btn--ghost" onclick="location.reload()">重新开始</button>
              <button class="btn btn--primary" id="backToHomeFromError">返回重新输入</button>
            </div>
          </div>
        </div>
      </section>
    `;
    const backBtn = document.getElementById('backToHomeFromError');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'hero' } }));
      });
    }
    showToast(`Agent 失败：${error.message}`);
  }
}

/**
 * 更新已渲染卡片的背景图片
 */
function updateCardImages(recommendations) {
  const grid = document.getElementById('resultsGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.result-card');
  cards.forEach((card, i) => {
    const poi = recommendations[i];
    if (poi && poi.photos && poi.photos.length > 0) {
      const media = card.querySelector('.result-card__media');
      if (media) {
        media.style.backgroundImage = `url('${poi.photos[0]}')`;
        media.style.backgroundSize = 'cover';
        media.style.backgroundPosition = 'center';
        // 移除渐变占位的文字
        const placeholder = media.querySelector('div[style*="translate"]');
        if (placeholder) placeholder.remove();
      }
    }
  });
}

// ============================================
// 真实结果事件绑定
// ============================================
function bindRealResultsEvents() {
  // 返回按钮
  const backBtn = document.getElementById('backToHome');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'hero' } }));
    });
  }

  // 卡片点击
  document.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // 不拦截导航链接
      const index = parseInt(card.dataset.index);
      const result = appState.state.results[index];
      if (result) {
        // 对于真实POI，打开导航
        if (result.lat && result.lng) {
          const navUrl = getNavigateUrl(result.lat, result.lng, result.name, getSettings().mapProvider);
          window.open(navUrl, '_blank');
        }
      }
    });
  });
}

// ============================================
// 设置面板
// ============================================
function bindSettingsButton() {
  const btn = document.getElementById('settingsBtn');
  if (btn) {
    btn.addEventListener('click', () => openSettingsModal());
  }
}

async function openSettingsModal() {
  const container = document.getElementById('settings-container');
  if (!container) return;

  const modalHtml = await renderSettingsModal();
  container.innerHTML = modalHtml;

  // 绑定设置事件
  bindSettingsModalEvents();

  // 更新帮助链接
  updateHelpLinks();
}

function bindSettingsModalEvents() {
  const overlay = document.getElementById('settingsOverlay');
  const closeBtn = document.getElementById('settingsClose');
  const cancelBtn = document.getElementById('settingsCancel');
  const saveBtn = document.getElementById('settingsSave');
  const presetSelect = document.getElementById('llmPreset');
  const mapProviderSelect = document.getElementById('mapProvider');
  const weatherProviderSelect = document.getElementById('weatherProvider');
  const testBtn = document.getElementById('llmTestBtn');

  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettingsModal();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeSettingsModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSettingsModal);

  // 预设切换（仅 custom）
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const preset = LLM_PRESETS[e.target.value];
      if (preset) {
        if (preset.baseUrl) document.getElementById('llmBaseUrl').value = preset.baseUrl;
        if (preset.model) document.getElementById('llmModel').value = preset.model;
        updateHelpLinks(e.target.value);
      }
    });
  }

  // 地图服务商切换：显隐对应的 Key 申请引导
  if (mapProviderSelect) {
    mapProviderSelect.addEventListener('change', (e) => {
      const provider = e.target.value;
      const amapGuide = document.getElementById('amapKeyGuide');
      const baiduGuide = document.getElementById('baiduKeyGuide');
      if (amapGuide) amapGuide.style.display = provider === 'amap' ? '' : 'none';
      if (baiduGuide) baiduGuide.style.display = provider === 'baidu' ? '' : 'none';
      updateHelpLinks();
    });
  }

  // 天气服务商切换：wttr/高德无需单独 Key，其余显示 Key 输入框
  if (weatherProviderSelect) {
    weatherProviderSelect.addEventListener('change', (e) => {
      const provider = e.target.value;
      const keyField = document.getElementById('weatherKeyField');
      if (keyField) keyField.style.display = (provider === 'wttr' || provider === 'amap') ? 'none' : '';
    });
  }

  // 测试连接
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      // 先保存当前输入
      collectAndSaveSettings();
      const resultEl = document.getElementById('llmTestResult');
      if (resultEl) {
        resultEl.innerHTML = '<span style="color:var(--color-text-muted)">正在测试…</span>';
      }
      testBtn.disabled = true;

      const result = await testLLMConnection();
      if (resultEl) {
        if (result.success) {
          resultEl.innerHTML = `<span style="color:var(--color-accent)">✓ 连接成功：${result.message} (模型: ${result.model})</span>`;
        } else {
          resultEl.innerHTML = `<span style="color:var(--color-warn)">✗ 失败：${result.message}</span>`;
        }
      }
      testBtn.disabled = false;
    });
  }

  // 保存
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      collectAndSaveSettings();
      closeSettingsModal();
      showToast('配置已保存');
      // 如果刚配置完成，刷新Hero视图
      if (checkConfigured().all) {
        console.log('API配置完成');
      }
    });
  }
}

function collectAndSaveSettings() {
  const llmPreset = document.getElementById('llmPreset')?.value || 'custom';
  const llmBaseUrl = document.getElementById('llmBaseUrl')?.value || '';
  const llmApiKey = document.getElementById('llmApiKey')?.value || '';
  const llmModel = document.getElementById('llmModel')?.value || '';
  const llmVisionSupported = document.getElementById('llmVisionSupported')?.checked || false;
  const llmPlanTemplate = document.getElementById('llmPlanTemplate')?.value || 'auto';
  const mapProvider = document.getElementById('mapProvider')?.value || 'amap';
  const mapApiKey = document.getElementById('mapApiKey')?.value || '';
  const weatherProvider = document.getElementById('weatherProvider')?.value || 'wttr';
  const weatherApiKey = document.getElementById('weatherApiKey')?.value || '';

  updateSettings({
    llm: {
      provider: llmPreset,
      baseUrl: llmBaseUrl,
      apiKey: llmApiKey,
      model: llmModel,
      visionSupported: llmVisionSupported,
      planTemplate: llmPlanTemplate
    },
    mapProvider,
    mapApiKey,
    weatherProvider,
    weatherApiKey
  });
}

function closeSettingsModal() {
  const container = document.getElementById('settings-container');
  if (container) container.innerHTML = '';
}

function updateHelpLinks(presetKey) {
  const settings = getSettings();
  const key = presetKey || settings.llm?.provider || 'custom';
  const preset = LLM_PRESETS[key];

  const llmLink = document.getElementById('llmHelpLink');
  if (llmLink && preset?.docsUrl) {
    llmLink.href = preset.docsUrl;
  }

  const mapLink = document.getElementById('mapHelpLink');
  const mapProvider = document.getElementById('mapProvider')?.value || settings.mapProvider;
  if (mapLink) {
    mapLink.href = mapProvider === 'amap'
      ? 'https://lbs.amap.com/dev/key/app'
      : 'https://lbsyun.baidu.com/apiconsole/key';
  }
}

// ============================================
// 原有偏好视图（保留兼容）
// ============================================
function bindPreferencesEvents() {
  document.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.setGroupType(btn.dataset.group);
      const linked = smartLinkRules[btn.dataset.group] || [];
      linked.forEach(interest => {
        if (!appState.state.preferences.interests.includes(interest)) {
          appState.state.preferences.interests.push(interest);
        }
      });
      appState.notify();
      updatePreferencesUI();
    });
  });

  document.querySelectorAll('[data-interest]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.toggleInterest(btn.dataset.interest);
      updatePreferencesUI();
    });
  });

  const slider = document.getElementById('budgetSlider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      appState.setBudget(parseInt(e.target.value));
      updateBudgetDisplay();
    });
  }

  document.querySelectorAll('[data-transport]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.toggleTransport(btn.dataset.transport);
      updatePreferencesUI();
    });
  });

  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.setDuration(btn.dataset.duration);
      updatePreferencesUI();
    });
  });

  const genBtn = document.getElementById('generateBtn');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      if (!appState.isPreferencesValid()) {
        showToast('请至少选择人群类型、兴趣和交通方式');
        return;
      }
      document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'generating' } }));
    });
  }
}

function updatePreferencesUI() {
  const prefs = appState.state.preferences;
  document.querySelectorAll('[data-group]').forEach(btn => {
    const selected = btn.dataset.group === prefs.groupType;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-checked', selected);
  });
  document.querySelectorAll('[data-interest]').forEach(btn => {
    const selected = prefs.interests.includes(btn.dataset.interest);
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', selected);
  });
  document.querySelectorAll('[data-transport]').forEach(btn => {
    const selected = prefs.transport.includes(btn.dataset.transport);
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', selected);
  });
  document.querySelectorAll('[data-duration]').forEach(btn => {
    const selected = btn.dataset.duration === prefs.duration;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-checked', selected);
  });
}

function updateBudgetDisplay() {
  const prefs = appState.state.preferences;
  const display = document.querySelector('.budget-slider__display > div');
  if (display) {
    display.innerHTML = `
      <span class="budget-slider__range numeric">¥${prefs.budget.min}</span>
      <span class="budget-slider__range-separator">—</span>
      <span class="budget-slider__range numeric">¥${prefs.budget.max}</span>
      <span class="budget-slider__unit">/ 人</span>
    `;
  }
}

function bindGeneratingEvents() {
  const canvas = document.getElementById('particleCanvas');
  const fallback = document.getElementById('compassFallback');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    if (canvas) canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
    animateGenSteps(() => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'results' } }));
    });
  } else {
    if (canvas && fallback) {
      fallback.style.display = 'none';
      const particle = new ParticleCompass(canvas);
      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'results' } }));
      };
      particle.start(finish);
      animateGenSteps();
      setTimeout(finish, 3500);
    } else {
      animateGenSteps(() => {
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'results' } }));
      });
    }
  }
}

function bindResultsEvents() {
  document.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-fav]')) return;
      const index = parseInt(card.dataset.index);
      openDetail(index);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const index = parseInt(card.dataset.index);
        openDetail(index);
      }
    });
  });

  document.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const destId = btn.dataset.fav;
      const isAdded = appState.toggleFavorite(destId);
      btn.classList.toggle('is-favorited', isAdded);
      btn.setAttribute('aria-pressed', isAdded);
      showToast(isAdded ? '已收藏' : '已取消收藏');
    });
  });

  const regenBtn = document.getElementById('regenerateBtn');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      appState.state.results = [];
      document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'generating' } }));
    });
  }

  ['backToPrefs', 'backToPrefs2'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'preferences' } }));
      });
    }
  });
}

// ── 启动 ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
