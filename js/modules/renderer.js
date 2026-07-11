// ============================================
// 视图渲染 — 偏好面板/结果卡片/详情
// 一会去哪儿 · Renderer
// ============================================

import { getIcon } from './icons.js';
import { appState } from './state.js';
import {
  groupTypes, interestOptions, transportOptions,
  durationOptions, cityOptions, userProfiles, smartLinkRules
} from '../data/userProfile.js';
import {
  weatherConditions, weatherAdvisories, getWeatherNarrative
} from '../data/weather.js';
import { destinations } from '../data/destinations.js';
import { generateReason } from './recommender.js';

// ── 渲染顶部导航 ──
export function renderHeader() {
  const city = appState.state.city;
  return `
    <header class="site-header">
      <div class="container site-header__inner">
        <a href="#" class="site-header__logo" aria-label="一会去哪儿首页">
          <span class="site-header__logo-mark">${getIcon('compass', 28)}</span>
          <span>一会<em>去哪儿</em></span>
        </a>
        <div class="site-header__actions">
          <button class="city-picker" id="cityPicker" aria-label="选择城市">
            <span class="city-picker__icon">${getIcon('map-pin', 16)}</span>
            <span id="currentCity">${city}</span>
            <span class="city-picker__chevron">${getIcon('chevron', 12)}</span>
          </button>
          <button class="settings-btn" id="settingsBtn" aria-label="API设置">
            ${getIcon('settings', 20)}
          </button>
        </div>
      </div>
    </header>
  `;
}

// ── 渲染城市下拉 ──
export function renderCityDropdown() {
  const current = appState.state.city;
  return `
    <div class="city-dropdown" id="cityDropdown" role="listbox" aria-label="城市选择">
      ${cityOptions.map(c => `
        <button class="city-dropdown__item ${c === current ? 'is-active' : ''}"
                data-city="${c}" role="option" aria-selected="${c === current}">
          ${getIcon('map-pin', 16)}
          <span>${c}</span>
          ${c === current ? getIcon('check', 16) : ''}
        </button>
      `).join('')}
    </div>
  `;
}

// ── 渲染天气卡片 ──
export function renderWeatherCard() {
  const w = appState.state.weather;
  const isLoading = w.isLoading || w.temp === '--';

  // 加载中状态
  if (isLoading) {
    return `
      <div class="weather-card weather-card--loading" style="--weather-tint: #8B9DAF">
        <div class="weather-card__glow"></div>
        <div class="weather-card__content">
          <div class="weather-card__icon weather-card__icon--loading">
            ${getIcon('cloud', 56)}
          </div>
          <div class="weather-card__info">
            <div class="weather-card__condition">
              <span class="weather-card__temp numeric">--</span>
              <span class="weather-card__temp-unit">°C</span>
            </div>
            <div class="weather-card__desc">
              <span>正在获取实时天气…</span>
            </div>
            <span class="weather-card__advisory weather-card__advisory--info">
              ${getIcon('cloud', 14)}
              连接 wttr.in 实时天气服务
            </span>
          </div>
        </div>
      </div>
    `;
  }

  const cond = weatherConditions[w.condition] || weatherConditions.cloudy;
  const advisory = weatherAdvisories[w.condition] || weatherAdvisories.cloudy;
  const narrative = getWeatherNarrative(w.condition, w.temp);

  // 数据来源标识
  const sourceLabel = w.isRealTime
    ? `<span class="weather-card__source weather-card__source--live">● 实时 · ${w.source}</span>`
    : `<span class="weather-card__source weather-card__source--fallback">○ 离线降级</span>`;

  // 逐时预报（取未来4小时）
  const hourlyHtml = (w.hourly && w.hourly.length > 0)
    ? w.hourly.slice(0, 5).map(h => `
        <div class="weather-card__hourly-item">
          <span class="weather-card__hourly-time">${h.time}</span>
          <span class="weather-card__hourly-icon">${getIcon((weatherConditions[h.condition] || weatherConditions.cloudy).icon, 18)}</span>
          <span class="weather-card__hourly-temp numeric">${h.temp}°</span>
        </div>
      `).join('')
    : '';

  return `
    <div class="weather-card" style="--weather-tint: ${cond.tint}">
      <div class="weather-card__glow"></div>
      <div class="weather-card__content">
        <div class="weather-card__icon">${getIcon(cond.icon, 56)}</div>
        <div class="weather-card__info">
          <div class="weather-card__condition">
            <span class="weather-card__temp numeric">${w.temp}</span>
            <span class="weather-card__temp-unit">°C</span>
            <span style="font-size:var(--text-small);color:var(--color-text-muted);margin-left:auto">${cond.label}</span>
          </div>
          <div class="weather-card__desc">
            <span>${narrative}</span>
            <span class="pip"></span>
            <span>体感 ${w.feelsLike}°</span>
            <span class="pip"></span>
            <span>日落 ${w.sunset}</span>
            <span class="pip"></span>
            <span>风力 ${w.windLevel}级</span>
            <span class="pip"></span>
            <span>湿度 ${w.humidity}%</span>
          </div>
          <span class="weather-card__advisory weather-card__advisory--${advisory.level}">
            ${getIcon(cond.icon, 14)}
            ${advisory.text}
          </span>
          ${sourceLabel}
        </div>
      </div>
      ${hourlyHtml ? `<div class="weather-card__hourly">${hourlyHtml}</div>` : ''}
    </div>
  `;
}

// ── 渲染右侧灵感面板 ──
export function renderInspirationPanel() {
  const w = appState.state.weather;
  const city = appState.state.city;
  const userAddress = appState.state.userAddress;
  const locationLabel = userAddress ? userAddress.formattedAddress || userAddress.text : city;

  // 天气氛围数据
  const cond = weatherConditions[w.condition] || weatherConditions.cloudy;
  const advisory = weatherAdvisories[w.condition] || weatherAdvisories.cloudy;
  const isLoading = w.isLoading || w.temp === '--';

  // 天气情绪词
  const moodMap = {
    sunny: { word: '阳光正好', sub: '适合出门撒欢' },
    'cloudy-to-sunny': { word: '云开见日', sub: '不冷不热正合适' },
    cloudy: { word: '云淡风轻', sub: '体感舒适宜出行' },
    overcast: { word: '天色沉静', sub: '适合室内慢时光' },
    rainy: { word: '雨声淅沥', sub: '别有一番韵味' },
    snowy: { word: '银装素裹', sub: '冬日限定浪漫' }
  };
  const mood = moodMap[w.condition] || moodMap.cloudy;

  // 根据天气推荐活动
  const activityMap = {
    sunny: [
      { icon: 'camera', label: '户外拍照', desc: '光线充足，出片率极高' },
      { icon: 'leaf', label: '公园漫步', desc: '阳光正好，适合亲近自然' },
      { icon: 'utensils', label: '露天用餐', desc: '找个有露台的餐厅' },
      { icon: 'sun', label: '湖边发呆', desc: '带本书，享受午后' }
    ],
    'cloudy-to-sunny': [
      { icon: 'camera', label: '城市探索', desc: '光线柔和，适合街拍' },
      { icon: 'leaf', label: '户外活动', desc: '不晒不热，体感舒适' },
      { icon: 'utensils', label: '美食探店', desc: '走走停停，发现惊喜' },
      { icon: 'landmark', label: '人文景点', desc: '温度宜人，慢慢逛' }
    ],
    cloudy: [
      { icon: 'leaf', label: '户外散步', desc: '多云不晒，刚好出行' },
      { icon: 'camera', label: '建筑摄影', desc: '漫射光，质感出众' },
      { icon: 'landmark', label: '城市公园', desc: '人少清净，体验好' },
      { icon: 'utensils', label: '咖啡馆', desc: '找个窗边位，看云卷云舒' }
    ],
    overcast: [
      { icon: 'landmark', label: '博物馆', desc: '室内观展，不受天气影响' },
      { icon: 'home', label: '书店阅读', desc: '阴天配好书，刚刚好' },
      { icon: 'utensils', label: '火锅暖食', desc: '阴天吃火锅，暖胃暖心' },
      { icon: 'film', label: '看电影', desc: '选一部期待已久的片' }
    ],
    rainy: [
      { icon: 'landmark', label: '博物馆', desc: '雨天首选，寓教于乐' },
      { icon: 'home', label: '独立书店', desc: '听雨翻书，别有韵味' },
      { icon: 'utensils', label: '室内美食', desc: '找个温暖的馆子' },
      { icon: 'film', label: '影院观影', desc: '雨天看场电影，很搭' }
    ],
    snowy: [
      { icon: 'camera', label: '雪景拍摄', desc: '银装素裹，出大片' },
      { icon: 'home', label: '温泉泡汤', desc: '冰天雪地里的温暖' },
      { icon: 'utensils', label: '热汤暖食', desc: '一碗热汤面，赛过一切' },
      { icon: 'landmark', label: '室内展览', desc: '赏雪之余，看个好展' }
    ]
  };

  const activities = activityMap[w.condition] || activityMap.cloudy;

  // 精选目的地（仅显示与当前城市匹配的真实数据，未匹配则不展示该板块，
  // 避免切换城市后仍显示北京的推荐）
  const destList = Array.isArray(destinations) ? destinations : Object.values(destinations).flat();
  const cityKey = city.replace(/市$/, '').split(/[ ·]/)[0].trim();
  const cityDestinations = destList.filter(d => {
    const dCity = d.city || (d.address ? d.address.match(/^(.+?市)/)?.[1] : '') || '';
    return dCity === city + '市' || dCity === city || dCity === cityKey + '市' || dCity === cityKey;
  });
  const featured = cityDestinations.slice(0, 3);
  const hasCityFeatured = featured.length > 0;

  // 今日日期
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 周${weekdays[now.getDay()]}`;

  return `
    <div class="inspiration-panel" id="inspirationPanel">

      <!-- 编辑式头部：日期 + 天气情绪 -->
      <div class="inspiration-panel__header">
        <div class="inspiration-panel__header-date">${dateStr}</div>
        <div class="inspiration-panel__header-mood" style="--weather-tint: ${cond.tint}">
          <span class="inspiration-panel__header-mood-icon">${getIcon(cond.icon, 20)}</span>
          <div class="inspiration-panel__header-mood-text">
            <span class="inspiration-panel__header-mood-word">${isLoading ? '获取中' : mood.word}</span>
            <span class="inspiration-panel__header-mood-sub">${mood.sub}</span>
          </div>
          ${!isLoading ? `<span class="inspiration-panel__header-temp numeric">${w.temp}°</span>` : ''}
        </div>
        <div class="inspiration-panel__header-location">${getIcon('map-pin', 12)} ${locationLabel}</div>
      </div>

      <!-- 今日适宜活动 -->
      <div class="inspiration-panel__section">
        <div class="inspiration-panel__section-header">
          <h3 class="inspiration-panel__section-title">今日适宜</h3>
          <span class="inspiration-panel__section-meta">${!isLoading ? advisory.text : '天气加载中'}</span>
        </div>
        <div class="inspiration-panel__activities">
          ${activities.map((a, i) => `
            <div class="inspiration-panel__activity" style="--delay:${i * 60}ms">
              <div class="inspiration-panel__activity-icon">${getIcon(a.icon, 18)}</div>
              <div class="inspiration-panel__activity-text">
                <div class="inspiration-panel__activity-label">${a.label}</div>
                <div class="inspiration-panel__activity-desc">${a.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 城市精选 -->
      ${hasCityFeatured ? `
      <div class="inspiration-panel__section">
        <div class="inspiration-panel__section-header">
          <h3 class="inspiration-panel__section-title">${city}精选</h3>
          <span class="inspiration-panel__section-meta">值得一去</span>
        </div>
        <div class="inspiration-panel__destinations">
          ${featured.map((d, i) => `
            <div class="inspiration-panel__destination" style="--delay:${i * 60}ms">
              <div class="inspiration-panel__destination-image" style="background:${d.gradient || 'linear-gradient(135deg, #6e8af5, #4a6cd4)'}">
                <span class="inspiration-panel__destination-type">${d.type || '景点'}</span>
              </div>
              <div class="inspiration-panel__destination-info">
                <div class="inspiration-panel__destination-name">${d.name}</div>
                <div class="inspiration-panel__destination-desc">${d.description || d.subtitle || ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : `
      <div class="inspiration-panel__section">
        <div class="inspiration-panel__section-header">
          <h3 class="inspiration-panel__section-title">探索${city}</h3>
          <span class="inspiration-panel__section-meta">值得一去</span>
        </div>
        <div class="inspiration-panel__destinations inspiration-panel__destinations--hint">
          <div class="inspiration-panel__destination inspiration-panel__destination--hint" style="--delay:0ms">
            <div class="inspiration-panel__destination-image" style="background:linear-gradient(135deg, var(--color-primary-soft), var(--color-accent-soft))">
              <span class="inspiration-panel__destination-type">${getIcon('sparkles', 20)}</span>
            </div>
            <div class="inspiration-panel__destination-info">
              <div class="inspiration-panel__destination-name">${city}探索</div>
              <div class="inspiration-panel__destination-desc">在上方输入你的需求，AI将基于${city}的真实地图数据为你推荐去处</div>
            </div>
          </div>
        </div>
      </div>
      `}

      <!-- 快速探索 -->
      <div class="inspiration-panel__explore">
        <div class="inspiration-panel__explore-label">快速探索</div>
        <div class="inspiration-panel__explore-tags">
          <button class="inspiration-panel__explore-tag" data-quick="附近有什么好玩的">附近好玩</button>
          <button class="inspiration-panel__explore-tag" data-quick="推荐几个适合拍照的地方">拍照圣地</button>
          <button class="inspiration-panel__explore-tag" data-quick="有什么免费景点">免费景点</button>
          <button class="inspiration-panel__explore-tag" data-quick="适合带小孩去的地方">亲子出行</button>
        </div>
      </div>

    </div>
  `;
}

// ── 渲染 Hero 视图（含地址输入 + 自然语言需求 + 灵感面板） ──
export function renderHero() {
  const profiles = Object.values(userProfiles);
  const userAddress = appState.state.userAddress;
  const addressText = userAddress ? userAddress.formattedAddress || userAddress.text : '';

  return `
    <section class="view is-active hero" id="view-hero" data-view="hero">
      <div class="container">
        <div class="hero__main">
          <div class="hero__weather" id="heroWeather">
            <div id="weatherCardContent">
              ${renderWeatherCard()}
            </div>
          </div>
          <div class="hero__content">
            <span class="hero__eyebrow">生活娱乐 · AI个性化推荐 · 零配置开箱即用</span>
            <h1 class="hero__title">一会，<em>去哪儿</em>？</h1>
            <p class="hero__subtitle">说出你的需求，确认你的位置，结合实时天气与真实地图数据，为你生成专属出游方案。无需注册任何 API，打开即用。</p>

            <!-- 地址输入区 -->
            <div class="address-input-section">
              <label class="address-input-section__label">
                ${getIcon('map-pin', 16)}
                <span>你的精确位置</span>
              </label>
              <div class="address-input-row">
                <input type="text" class="address-input" id="addressInput"
                       placeholder="点击右上角选择省/市/区，或输入详细地址"
                       value="${addressText}"
                       aria-label="输入你的精确地址" />
                <button class="btn btn--ghost btn--sm" id="locateBtn" aria-label="使用当前位置">
                  ${getIcon('compass', 18)}
                  <span>定位</span>
                </button>
              </div>
              <div class="address-input-section__hint" id="addressHint">
                ${addressText ? `✓ 已确认：${addressText}` : '点击右上角选择省/市/区，或手动输入详细地址'}
              </div>
            </div>

            <!-- 自然语言需求输入 -->
            <div class="needs-input-section">
              <label class="needs-input-section__label">
                ${getIcon('sparkles', 16)}
                <span>说出你的需求</span>
              </label>
              <textarea class="needs-input" id="needsInput"
                        placeholder="例如：想带女朋友去个安静的地方散步，预算200以内，最好是户外有自然风光的，下午出发"
                        rows="3" aria-label="描述你的出游需求"></textarea>
              <div class="needs-input-section__examples">
                <button class="example-chip" data-example="想带娃去个有教育意义的地方，预算300，室内室外都行，地铁方便">带娃出行</button>
                <button class="example-chip" data-example="和朋友去拍照打卡，预算100，喜欢文艺风格的地方">拍照打卡</button>
                <button class="example-chip" data-example="一个人想找个安静的地方看书喝咖啡，预算50">独自放空</button>
                <button class="example-chip" data-example="情侣约会，预算500，想吃饭加逛逛，环境要好">情侣约会</button>
              </div>
            </div>

            <div class="hero__cta-row">
              <button class="btn btn--primary btn--lg" id="generatePlan" aria-label="生成出游方案">
                <span>AI 生成出游方案</span>
                <span class="btn__arrow">${getIcon('arrow-right', 20)}</span>
              </button>
            </div>

            <div class="quick-profiles">
              <span style="font-size:var(--text-tiny);color:var(--color-text-faint);width:100%;text-align:center;margin-bottom:var(--space-xs)">或快速体验预设场景：</span>
              ${profiles.map(p => `
                <button class="quick-profile" data-profile="${p.id}" aria-label="体验${p.label}场景">
                  <span class="quick-profile__icon">${getIcon(p.icon, 14)}</span>
                  <span>${p.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <aside class="hero__aside" id="heroAside">
          ${renderInspirationPanel()}
        </aside>
      </div>
    </section>
  `;
}

// ── 渲染偏好定制面板 ──
export function renderPreferences() {
  const prefs = appState.state.preferences;
  return `
    <section class="view preferences" id="view-preferences" data-view="preferences">
      <div class="container preferences__inner">
        <div class="preferences__header">
          <h2 class="preferences__title">定制你的<em style="font-style:italic;color:var(--color-primary)">出游</em></h2>
          <p class="preferences__subtitle">几个简单问题，让推荐更懂你</p>
        </div>

        <!-- 步骤1：人群 -->
        <div class="preference-step">
          <div class="preference-step__label">
            <span class="preference-step__number">01</span>
            <span class="preference-step__title">你和谁一起？</span>
          </div>
          <div class="option-grid option-grid--4" role="radiogroup" aria-label="出行人群">
            ${groupTypes.map(g => `
              <button class="option-btn ${prefs.groupType === g.id ? 'is-selected' : ''}"
                      data-group="${g.id}" role="radio" aria-checked="${prefs.groupType === g.id}"
                      aria-label="${g.label}">
                <span class="option-btn__icon">${getIcon(g.icon, 28)}</span>
                <span class="option-btn__label">${g.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 步骤2：兴趣 -->
        <div class="preference-step">
          <div class="preference-step__label">
            <span class="preference-step__number">02</span>
            <span class="preference-step__title">想要什么感觉？</span>
            <span class="preference-step__hint">可多选</span>
          </div>
          <div class="tag-cloud" role="group" aria-label="兴趣偏好">
            ${interestOptions.map(i => `
              <button class="tag-chip ${prefs.interests.includes(i.id) ? 'is-selected' : ''}"
                      data-interest="${i.id}" aria-pressed="${prefs.interests.includes(i.id)}">
                <span class="tag-chip__icon">${getIcon(i.icon, 16)}</span>
                <span>${i.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 步骤3：预算 -->
        <div class="preference-step">
          <div class="preference-step__label">
            <span class="preference-step__number">03</span>
            <span class="preference-step__title">预算范围</span>
            <span class="preference-step__hint">人均</span>
          </div>
          <div class="budget-slider">
            <div class="budget-slider__display">
              <div>
                <span class="budget-slider__range numeric">¥${prefs.budget.min}</span>
                <span class="budget-slider__range-separator">—</span>
                <span class="budget-slider__range numeric">¥${prefs.budget.max}</span>
                <span class="budget-slider__unit">/ 人</span>
              </div>
            </div>
            <input type="range" class="budget-slider__input" id="budgetSlider"
                   min="0" max="500" step="10" value="${prefs.budget.max}"
                   aria-label="预算上限" aria-valuemin="0" aria-valuemax="500" aria-valuenow="${prefs.budget.max}">
            <div class="budget-slider__ticks">
              <span>¥0</span>
              <span>¥250</span>
              <span>¥500</span>
            </div>
          </div>
        </div>

        <!-- 步骤4：交通 -->
        <div class="preference-step">
          <div class="preference-step__label">
            <span class="preference-step__number">04</span>
            <span class="preference-step__title">怎么去？</span>
            <span class="preference-step__hint">可多选</span>
          </div>
          <div class="option-grid option-grid--5" role="group" aria-label="交通方式">
            ${transportOptions.map(t => `
              <button class="option-btn ${prefs.transport.includes(t.id) ? 'is-selected' : ''}"
                      data-transport="${t.id}" aria-pressed="${prefs.transport.includes(t.id)}"
                      aria-label="${t.label}">
                <span class="option-btn__icon">${getIcon(t.icon, 28)}</span>
                <span class="option-btn__label">${t.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 步骤5：时长 -->
        <div class="preference-step">
          <div class="preference-step__label">
            <span class="preference-step__number">05</span>
            <span class="preference-step__title">多长时间？</span>
          </div>
          <div class="option-grid option-grid--3" role="radiogroup" aria-label="出行时长">
            ${durationOptions.map(d => `
              <button class="option-btn ${prefs.duration === d.id ? 'is-selected' : ''}"
                      data-duration="${d.id}" role="radio" aria-checked="${prefs.duration === d.id}"
                      aria-label="${d.label}">
                <span class="option-btn__label" style="font-size:var(--text-body);font-weight:var(--weight-semibold)">${d.label}</span>
                <span class="option-btn__label" style="font-size:var(--text-tiny);color:var(--color-text-faint)">${d.hint}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="preferences__submit">
          <button class="btn btn--primary btn--lg" id="generateBtn" aria-label="生成出游方案">
            <span>${getIcon('sparkles', 20)}</span>
            <span>为我生成方案</span>
            <span class="btn__arrow">${getIcon('arrow-right', 20)}</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

// ── 渲染 AI 生成中视图 ──
export function renderGenerating() {
  const steps = [
    '分析当前天气适宜度',
    '匹配你的兴趣偏好',
    '筛选预算内目的地',
    '规划交通路线'
  ];
  return `
    <section class="view generating" id="view-generating" data-view="generating">
      <div class="container">
        <div class="generating__canvas-wrap">
          <canvas id="particleCanvas" width="200" height="200"></canvas>
          <div class="generating__fallback compass-spin" id="compassFallback">
            ${getIcon('compass', 120)}
          </div>
        </div>
        <h2 class="generating__title">正在为你寻找去处</h2>
        <p class="generating__subtitle">结合天气、兴趣与预算，生成个性化方案…</p>
        <div class="generating__steps" id="genSteps">
          ${steps.map((s, i) => `
            <div class="gen-step" data-step="${i}">
              <div class="gen-step__check">
                <span class="gen-step__check-icon">${getIcon('check', 14)}</span>
              </div>
              <span class="gen-step__text">${s}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ── 渲染匹配度环 SVG ──
function renderMatchRing(score, size = 64) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return `
    <div class="result-card__match" style="width:${size}px;height:${size}px">
      <svg class="result-card__match-ring" viewBox="0 0 ${size} ${size}">
        <circle class="result-card__match-bg" cx="${size/2}" cy="${size/2}" r="${radius}"/>
        <circle class="result-card__match-fill" cx="${size/2}" cy="${size/2}" r="${radius}"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
      </svg>
      <div class="result-card__match-text">
        <span class="result-card__match-num numeric">${score}</span>
        <span class="result-card__match-label">匹配</span>
      </div>
    </div>
  `;
}

// ── 渲染单张结果卡片 ──
export function renderResultCard(dest, index) {
  const isFav = appState.isFavorited(dest.id);
  const weatherTagClass = dest.weatherFit.class;
  const durationLabel = { 'half-day': '半日', 'full-day': '一日', 'two-day': '两日' }[dest.duration];
  const transportLabel = dest.transport.map(t => {
    const opt = transportOptions.find(o => o.id === t);
    return opt ? opt.label : t;
  }).slice(0, 2).join(' / ');

  return `
    <article class="result-card stagger" style="--i:${index}" data-index="${index}" tabindex="0"
             role="button" aria-label="${dest.name}，匹配度${dest.matchScore}%">
      <div class="result-card__media">
        <img src="${dest.image}" alt="${dest.name}" loading="lazy"
             onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,var(--color-primary-soft),var(--color-accent-soft))'">
        ${renderMatchRing(dest.matchScore)}
        <span class="result-card__weather-tag result-card__weather-tag--${weatherTagClass}">
          ${getIcon('sun', 14)}
          ${dest.weatherFit.text}
        </span>
      </div>
      <div class="result-card__body">
        <span class="result-card__type">${dest.typeLabel}</span>
        <h3 class="result-card__title">${dest.name}</h3>
        <p class="result-card__subtitle">${dest.subtitle}</p>
        <div class="result-card__meta">
          <span class="result-card__meta-item">
            ${getIcon('clock', 16)}
            <span>${durationLabel}</span>
          </span>
          <span class="result-card__meta-item">
            ${getIcon('wallet', 16)}
            <span class="numeric">¥${dest.budget.min}-${dest.budget.max}</span>
            <span>/人</span>
          </span>
          <span class="result-card__meta-item">
            ${getIcon('metro', 16)}
            <span>${transportLabel}</span>
          </span>
        </div>
        <div class="result-card__highlights">
          ${dest.highlights.slice(0, 3).map(h => `<span class="result-card__highlight">${h}</span>`).join('')}
        </div>
        <div class="result-card__footer">
          <span class="result-card__cta">
            查看详情
            ${getIcon('arrow-right', 16)}
          </span>
          <button class="result-card__fav ${isFav ? 'is-favorited' : ''}" data-fav="${dest.id}"
                  aria-label="${isFav ? '取消收藏' : '收藏'}${dest.name}" aria-pressed="${isFav}">
            ${getIcon('heart', 20)}
          </button>
        </div>
      </div>
    </article>
  `;
}

// ── 渲染结果视图 ──
export function renderResults() {
  const results = appState.state.results;
  const weather = appState.state.weather;
  const cond = weatherConditions[weather.condition];

  if (!results || results.length === 0) {
    return `
      <section class="view is-active results" id="view-results" data-view="results">
        <div class="container">
          <div class="empty-state">
            <div class="empty-state__icon">${getIcon('compass', 64)}</div>
            <h2 class="empty-state__title">暂无匹配方案</h2>
            <p class="empty-state__text">试试调整偏好设置，或许有惊喜发现</p>
            <button class="btn btn--ghost" id="backToPrefs">返回调整偏好</button>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="view is-active results" id="view-results" data-view="results">
      <div class="container">
        <div class="results__header">
          <div>
            <h2 class="results__title">为你找到 <em class="numeric">${results.length}</em> 个去处</h2>
            <div class="results__meta">
              <span>按匹配度排序</span>
              <span class="divider"></span>
              <span>当前天气：${cond.label} ${weather.temp}°</span>
            </div>
          </div>
          <button class="btn btn--ghost" id="regenerateBtn" aria-label="重新生成方案">
            ${getIcon('refresh', 18)}
            <span>重新生成</span>
          </button>
        </div>
        <div class="results__grid" id="resultsGrid">
          ${results.map((dest, i) => renderResultCard(dest, i)).join('')}
        </div>
        <div style="text-align:center;margin-top:var(--space-3xl)">
          <button class="btn btn--ghost" id="backToPrefs2">
            ${getIcon('arrow-left', 18)}
            <span>调整偏好再来一次</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

// ── 渲染详情抽屉 ──
export function renderDetailDrawer() {
  const dest = appState.getSelectedResult();
  if (!dest) return '';

  const prefs = appState.getPreferencesForRecommend();
  const reason = generateReason(dest, prefs);
  const isFav = appState.isFavorited(dest.id);
  const durationLabel = { 'half-day': '半日', 'full-day': '一日', 'two-day': '两日' }[dest.duration];
  const totalCost = dest.budget.ticket + dest.budget.food + dest.budget.transport;
  const maxCost = Math.max(dest.budget.ticket, dest.budget.food, dest.budget.transport, 1);

  return `
    <div class="detail-overlay" id="detailOverlay"></div>
    <aside class="detail-drawer" id="detailDrawer" role="dialog" aria-modal="true" aria-label="${dest.name}详情">
      <div class="detail-drawer__handle"></div>
      <button class="detail-back" id="detailBack" aria-label="返回结果列表">
        ${getIcon('arrow-left', 18)}
        <span>返回方案列表</span>
      </button>
      <div class="detail-content">
        <div class="detail-banner">
          <img src="${dest.image}" alt="${dest.name}" loading="lazy"
               onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,var(--color-primary-soft),var(--color-accent-soft))'">
          <div class="detail-banner__match">${renderMatchRing(dest.matchScore, 72)}</div>
        </div>
        <div class="detail-body">
          <div class="detail-header">
            <span class="detail-header__type">${dest.typeLabel}</span>
            <h2 class="detail-header__title">${dest.name}</h2>
            <div class="detail-header__meta">
              <span>${dest.subtitle}</span>
              <span class="divider"></span>
              <span>${durationLabel}</span>
              <span class="divider"></span>
              <span class="numeric">¥${totalCost}</span>
              <span>/人</span>
            </div>
          </div>

          <div class="detail-info-bar">
            <div class="detail-info-bar__item">
              <span class="detail-info-bar__icon">${getIcon('map-pin', 18)}</span>
              <div class="detail-info-bar__content">
                <span class="detail-info-bar__label">精准地址</span>
                <span class="detail-info-bar__value">${dest.address}</span>
              </div>
            </div>
            <div class="detail-info-bar__item">
              <span class="detail-info-bar__icon">${getIcon('metro', 18)}</span>
              <div class="detail-info-bar__content">
                <span class="detail-info-bar__label">交通方式</span>
                <span class="detail-info-bar__value">${dest.transportDetail}</span>
              </div>
            </div>
            <div class="detail-info-bar__item">
              <span class="detail-info-bar__icon">${getIcon('wallet', 18)}</span>
              <div class="detail-info-bar__content">
                <span class="detail-info-bar__label">门票价格</span>
                <span class="detail-info-bar__value">${dest.ticketPrice}</span>
              </div>
            </div>
            <div class="detail-info-bar__item">
              <span class="detail-info-bar__icon">${getIcon('clock', 18)}</span>
              <div class="detail-info-bar__content">
                <span class="detail-info-bar__label">开放时间</span>
                <span class="detail-info-bar__value">${dest.openHours}</span>
              </div>
            </div>
          </div>

          <div class="detail-reason">
            <div class="detail-reason__label">为什么推荐</div>
            <p class="detail-reason__text">${reason}</p>
          </div>

          <div class="detail-section">
            <h3 class="detail-section__title">行程时间轴</h3>
            <div class="timeline">
              ${dest.itinerary.map(item => `
                <div class="timeline__item timeline__item--${item.type}">
                  <div class="timeline__dot"></div>
                  <div class="timeline__time">${item.time}</div>
                  <div class="timeline__title">${item.title}</div>
                  <div class="timeline__desc">${item.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="detail-section">
            <h3 class="detail-section__title">花费明细</h3>
            <div class="cost-breakdown">
              <div class="cost-breakdown__items">
                <div class="cost-item">
                  <span class="cost-item__label">门票</span>
                  <div class="cost-item__bar">
                    <div class="cost-item__bar-fill cost-item__bar-fill--ticket"
                         style="width:${(dest.budget.ticket/maxCost)*100}%"></div>
                  </div>
                  <span class="cost-item__amount numeric">¥${dest.budget.ticket}</span>
                </div>
                <div class="cost-item">
                  <span class="cost-item__label">餐饮</span>
                  <div class="cost-item__bar">
                    <div class="cost-item__bar-fill cost-item__bar-fill--food"
                         style="width:${(dest.budget.food/maxCost)*100}%"></div>
                  </div>
                  <span class="cost-item__amount numeric">¥${dest.budget.food}</span>
                </div>
                <div class="cost-item">
                  <span class="cost-item__label">交通</span>
                  <div class="cost-item__bar">
                    <div class="cost-item__bar-fill cost-item__bar-fill--transport"
                         style="width:${(dest.budget.transport/maxCost)*100}%"></div>
                  </div>
                  <span class="cost-item__amount numeric">¥${dest.budget.transport}</span>
                </div>
              </div>
              <div class="cost-breakdown__total">
                <span class="cost-breakdown__total-label">合计 / 人</span>
                <span class="cost-breakdown__total-amount numeric">¥${totalCost}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3 class="detail-section__title">实用贴士</h3>
            <ul class="tips-list">
              ${dest.tips.map(t => `<li class="tips-list__item">${t}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn--ghost detail-actions__fav ${isFav ? 'is-favorited' : ''}" id="detailFav"
                  aria-label="${isFav ? '取消收藏' : '收藏'}" aria-pressed="${isFav}">
            ${getIcon('heart', 22)}
          </button>
          <button class="btn btn--primary" id="detailNext">
            <span>换一个方案</span>
            ${getIcon('arrow-right', 20)}
          </button>
          <a class="btn btn--ghost" id="detailNavigate" href="https://uri.amap.com/marker?position=${dest.location.lng},${dest.location.lat}&name=${encodeURIComponent(dest.name)}&coordinate=wgs84&callnative=1" target="_blank" rel="noopener" aria-label="导航前往${dest.name}">
            ${getIcon('map-pin', 20)}
            <span>导航前往</span>
          </a>
        </div>
      </div>
    </aside>
  `;
}

// ── 渲染附近 POI 结果视图（OpenStreetMap 真实数据） ──
export function renderNearbyResults(pois, locationInfo) {
  if (!pois || pois.length === 0) {
    return `
      <section class="view is-active results" id="view-results" data-view="results">
        <div class="container">
          <div class="empty-state">
            <div class="empty-state__icon">${getIcon('compass', 64)}</div>
            <h2 class="empty-state__title">附近暂无发现</h2>
            <p class="empty-state__text">OpenStreetMap 数据覆盖有限，试试选择城市后使用推荐功能</p>
            <button class="btn btn--ghost" id="backToHome">返回首页</button>
          </div>
        </div>
      </section>
    `;
  }

  const locText = locationInfo
    ? `${locationInfo.displayName || locationInfo.city || '当前位置'}`
    : '当前位置';

  return `
    <section class="view is-active results" id="view-results" data-view="results">
      <div class="container">
        <div class="results__header">
          <div>
            <h2 class="results__title">附近发现 <em class="numeric">${pois.length}</em> 个真实地点</h2>
            <div class="results__meta">
              <span>${getIcon('map-pin', 14)} ${locText}</span>
              <span class="divider"></span>
              <span>数据来源：OpenStreetMap</span>
              <span class="divider"></span>
              <span>按距离排序</span>
            </div>
          </div>
          <button class="btn btn--ghost" id="backToHome" aria-label="返回首页">
            ${getIcon('arrow-left', 18)}
            <span>返回首页</span>
          </button>
        </div>
        <div class="results__grid" id="resultsGrid">
          ${pois.map((poi, i) => renderPOICard(poi, i)).join('')}
        </div>
      </div>
    </section>
  `;
}

// ── 渲染 POI 卡片（OpenStreetMap 数据） ──
function renderPOICard(poi, index) {
  const distText = poi.distance < 1000
    ? `${poi.distance}m`
    : `${(poi.distance / 1000).toFixed(1)}km`;

  return `
    <article class="result-card stagger" style="--i:${index}" data-index="${index}" tabindex="0"
             role="button" aria-label="${poi.name}，距离${distText}">
      <div class="result-card__media" style="background:linear-gradient(135deg,var(--color-primary-soft),var(--color-accent-soft))">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--color-primary);opacity:0.3">
          ${getIcon('map-pin', 64)}
        </div>
        <span class="result-card__weather-tag result-card__weather-tag--good">
          ${getIcon('map-pin', 14)}
          ${distText}
        </span>
      </div>
      <div class="result-card__body">
        <span class="result-card__type">${poi.typeLabel}</span>
        <h3 class="result-card__title">${poi.name}</h3>
        <p class="result-card__subtitle">${poi.address || (poi.lat ? `${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}` : '点击导航查看位置')}</p>
        <div class="result-card__meta">
          ${poi.phone ? `
          <span class="result-card__meta-item">
            ${getIcon('phone', 16)}
            <span>${poi.phone}</span>
          </span>
          ` : ''}
          ${poi.openHours ? `
          <span class="result-card__meta-item">
            ${getIcon('clock', 16)}
            <span>${poi.openHours}</span>
          </span>
          ` : ''}
        </div>
        <div class="result-card__highlights">
          <span class="result-card__highlight">OpenStreetMap</span>
          ${poi.website ? `<span class="result-card__highlight">有官网</span>` : ''}
        </div>
        <div class="result-card__footer">
          <a class="result-card__cta" href="https://uri.amap.com/marker?position=${poi.lng},${poi.lat}&name=${encodeURIComponent(poi.name)}&coordinate=wgs84&callnative=1" target="_blank" rel="noopener" style="text-decoration:none;color:var(--color-primary)">
            导航前往
            ${getIcon('arrow-right', 16)}
          </a>
        </div>
      </div>
    </article>
  `;
}

// ── 渲染页脚 ──
export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        <p>一会去哪儿 · AI个性化出游推荐 · 真实地图数据</p>
      </div>
    </footer>
  `;
}

// ── 渲染设置弹窗 ──
export function renderSettingsModal() {
  // 动态导入避免循环依赖
  return import('../modules/settings.js').then(({ getSettings, checkConfigured }) => {
    const settings = getSettings();
    const llm = settings.llm || {};
    const configured = checkConfigured();

    return `
      <div class="settings-overlay" id="settingsOverlay">
        <div class="settings-modal" id="settingsModal" role="dialog" aria-labelledby="settingsTitle">
          <div class="settings-modal__header">
            <h2 id="settingsTitle">设置 · 可选增强</h2>
            <button class="settings-modal__close" id="settingsClose" aria-label="关闭">
              ${getIcon('close', 20)}
            </button>
          </div>
          <div class="settings-modal__body">

            <!-- PigCode 低价 GPT-5.5 决策说明 -->
            <div class="settings-section settings-section--info settings-section--highlight">
              <div class="settings-section__title">
                ${getIcon('sparkles', 18)}
                <span>PigCode 低价 GPT-5.5 决策 · 可选配置</span>
              </div>
              <p class="settings-section__desc">
                <strong>使用 PigCode 低价 GPT-5.5 决策模型，配置自定义 API 后即可启用 AI 智能推荐。</strong><br>
                默认使用 OpenStreetMap 免费地图 + 本地规则引擎 + wttr.in 实时天气，全部免费开箱即用。<br>
                下方可配置自定义 API（遵循 OpenAI 协议）启用更强模型，或配置地图/天气 Key 获得更精准数据。
              </p>
              <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:var(--color-accent-soft);color:var(--color-accent);font-size:var(--text-tiny)">
                  ${getIcon('check', 12)} AI智能解析
                </span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:var(--color-accent-soft);color:var(--color-accent);font-size:var(--text-tiny)">
                  ${getIcon('check', 12)} 地图POI搜索
                </span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:var(--color-accent-soft);color:var(--color-accent);font-size:var(--text-tiny)">
                  ${getIcon('check', 12)} 个性化推荐
                </span>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:var(--color-accent-soft);color:var(--color-accent);font-size:var(--text-tiny)">
                  ${getIcon('check', 12)} 实时天气
                </span>
              </div>
              <div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:linear-gradient(135deg,#fff7ed,#fef3c7);border:1px solid #fde68a;font-size:var(--text-small)">
                <strong style="color:#b45309">PigCode · 低价 GPT-5.5 决策</strong><br>
                <span style="color:#92400e">PigCode 官方站点</span><br>
                <a href="https://cdn.pigcode.org" target="_blank" rel="noopener"
                   style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:6px 14px;border-radius:8px;background:#C65D3A;color:#fff;text-decoration:none;font-weight:600;font-size:var(--text-small)">
                  ${getIcon('external', 14)}
                  <span>访问 PigCode</span>
                </a>
              </div>
            </div>

            <!-- 大模型配置（自定义 OpenAI 协议） -->
            <div class="settings-section">
              <div class="settings-section__title">
                ${getIcon('sparkles', 18)}
                <span>大模型 API（自定义）</span>
              </div>
              <p class="settings-section__desc">
                使用 PigCode 低价 GPT-5.5 决策等任意兼容 OpenAI 协议的模型，配置 API Key 后启用 AI 智能推荐。<br>
                <strong>留空则使用本地规则引擎</strong>，仍可正常生成方案。
              </p>

              <div class="settings-field">
                <label>服务商预设</label>
                <select id="llmPreset" class="settings-select">
                  <option value="custom" selected>自定义（OpenAI 协议）</option>
                </select>
                <div style="margin-top:6px;font-size:var(--text-tiny);color:var(--color-text-faint);line-height:1.5">
                  仅支持自定义。需是兼容 OpenAI 协议的 API，<strong style="color:var(--color-primary)">Base URL 必须保留 /v1 前缀</strong>（如 https://api.example.com/v1）。
                </div>
              </div>

              <div class="settings-field">
                <label>API Base URL <span style="color:var(--color-primary);font-weight:600">（需保留 /v1 前缀）</span></label>
                <input type="text" id="llmBaseUrl" class="settings-input"
                       value="${llm.baseUrl || ''}"
                       placeholder="https://api.example.com/v1" />
                <div style="margin-top:6px;font-size:var(--text-tiny);color:var(--color-text-faint);line-height:1.5">
                  示例：https://api.openai.com/v1 · https://api.deepseek.com/v1 · https://dashscope.aliyuncs.com/compatible-mode/v1<br>
                  请确保 URL 以 <code style="background:var(--color-bg-warm);padding:1px 4px;border-radius:3px;color:var(--color-primary)">/v1</code> 结尾。
                </div>
              </div>

              <div class="settings-field">
                <label>API Key <span style="color:var(--color-text-faint);font-weight:normal">（留空=使用本地规则引擎）</span></label>
                <input type="password" id="llmApiKey" class="settings-input"
                       value="${llm.apiKey || ''}"
                       placeholder="填入 API Key 启用 AI 推荐" />
              </div>

              <div class="settings-field">
                <label>模型名称</label>
                <input type="text" id="llmModel" class="settings-input"
                       value="${llm.model || ''}"
                       placeholder="gpt-3.5-turbo / deepseek-chat / qwen-turbo 等" />
                <div style="margin-top:6px;font-size:var(--text-tiny);color:var(--color-text-faint)">
                  填写服务商支持的模型名（如 gpt-5.5、deepseek-chat、qwen-turbo、glm-4-flash 等）
                </div>
              </div>

              <div class="settings-field">
                <label>视觉理解 <span style="color:var(--color-text-faint);font-weight:normal">（开启后把搜到的图片传给模型分析后再决定推荐）</span></label>
                <label class="settings-checkbox">
                  <input type="checkbox" id="llmVisionSupported" ${llm.visionSupported ? 'checked' : ''} />
                  <span>支持视觉理解（Vision）</span>
                </label>
                <div style="margin-top:6px;font-size:var(--text-tiny);color:var(--color-text-faint);line-height:1.5">
                  勾选后，Agent 搜索 POI 时会获取景点图片，以 <code style="background:var(--color-bg-warm);padding:1px 4px;border-radius:3px;color:var(--color-primary)">image_url</code> 形式传给模型，让模型"看图"分析后再决定推荐。<br>
                  仅适用于支持 Vision 的模型（如 gpt-4o、gpt-4-vision、qwen-vl-plus 等）。
                </div>
              </div>

              <div class="settings-field">
                <label>规划模板 <span style="color:var(--color-text-faint);font-weight:normal">（控制推荐结果展示方式）</span></label>
                <select id="llmPlanTemplate" class="settings-select">
                  <option value="auto" ${(!llm.planTemplate || llm.planTemplate === 'auto') ? 'selected' : ''}>自动（按需求智能选择）</option>
                  <option value="flat" ${llm.planTemplate === 'flat' ? 'selected' : ''}>平铺排列（单日多地点平铺）</option>
                  <option value="timeline" ${llm.planTemplate === 'timeline' ? 'selected' : ''}>时间线排列（按上午/下午/晚上）</option>
                  <option value="multi-day" ${llm.planTemplate === 'multi-day' ? 'selected' : ''}>多日规划（Day1 Day2 Day3…）</option>
                </select>
                <div style="margin-top:6px;font-size:var(--text-tiny);color:var(--color-text-faint);line-height:1.5">
                  <strong>平铺</strong>：所有推荐地点平铺展示，适合半日/一日游。<br>
                  <strong>时间线</strong>：按上午/下午/晚上时间槽组织，节奏清晰。<br>
                  <strong>多日</strong>：Day1/Day2/Day3 分天规划，适合跨城或多日旅游。
                </div>
              </div>

              <div class="settings-field__actions">
                <button class="btn btn--ghost btn--sm" id="llmTestBtn">测试连接</button>
                <a class="settings-help-link" id="llmHelpLink" href="https://cdn.pigcode.org" target="_blank" rel="noopener">
                  ${getIcon('external', 14)}
                  <span>访问 PigCode 获取 Key</span>
                </a>
              </div>
              <div class="settings-test-result" id="llmTestResult"></div>
            </div>

            <!-- 地图配置（含详细申请引导） -->
            <div class="settings-section">
              <div class="settings-section__title">
                ${getIcon('map-pin', 18)}
                <span>地图 API（可选增强）</span>
              </div>
              <p class="settings-section__desc">配置后可使用高德/百度的精准地图数据。不配置则使用 OpenStreetMap 免费数据（覆盖全国，精度略低）。</p>

              <div class="settings-field">
                <label>地图服务商</label>
                <select id="mapProvider" class="settings-select">
                  <option value="amap" ${settings.mapProvider === 'amap' ? 'selected' : ''}>高德地图</option>
                  <option value="baidu" ${settings.mapProvider === 'baidu' ? 'selected' : ''}>百度地图</option>
                </select>
              </div>

              <div class="settings-field">
                <label>地图 API Key <span style="color:var(--color-text-faint);font-weight:normal">（留空=使用OSM免费数据）</span></label>
                <input type="text" id="mapApiKey" class="settings-input"
                       value="${settings.mapApiKey || ''}"
                       placeholder="留空则使用 OpenStreetMap 免费数据" />
              </div>

              <!-- 高德地图 Key 申请详细步骤 -->
              <div id="amapKeyGuide" class="settings-key-guide" style="${settings.mapProvider === 'amap' ? '' : 'display:none'}">
                <div class="settings-key-guide__title">${getIcon('map-pin', 16)} 高德地图 Key 申请步骤</div>
                <ol class="settings-key-guide__steps">
                  <li>电脑端点击右侧 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener" class="settings-key-guide__link">高德开放平台配置链接</a>，登录高德地图账号。</li>
                  <li>首次进入选择<strong>个人开发使用</strong>，按要求<strong>验证支付宝账号</strong>。</li>
                  <li>验证邮箱后登录进入<strong>控制台</strong>。</li>
                  <li>在左侧菜单选择<strong>应用管理 → 我的应用</strong>，点击<strong>创建新应用</strong>。</li>
                  <li>输入应用名称（如"一会去哪儿"），应用类型可选"其他"，点击<strong>确认</strong>。</li>
                  <li>在刚创建的应用下点击<strong>添加 Key</strong>，服务平台选择 <strong>Web服务</strong>（重要：不是 Web端 JS）。</li>
                  <li>输入 Key 名称，点击<strong>确认</strong>后<strong>复制 Key</strong>，粘贴到上方输入框。</li>
                </ol>
                <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener"
                   class="settings-key-guide__btn">
                  ${getIcon('external', 14)}
                  <span>前往高德开放平台控制台</span>
                </a>
              </div>

              <!-- 百度地图 Key 申请详细步骤 -->
              <div id="baiduKeyGuide" class="settings-key-guide" style="${settings.mapProvider === 'baidu' ? '' : 'display:none'}">
                <div class="settings-key-guide__title">${getIcon('map-pin', 16)} 百度地图 Key 申请步骤</div>
                <ol class="settings-key-guide__steps">
                  <li>电脑端点击 <a href="https://lbsyun.baidu.com/apiconsole/key" target="_blank" rel="noopener" class="settings-key-guide__link">百度地图开放平台控制台</a>，登录百度账号。</li>
                  <li>完成实名认证（个人开发者需验证手机号与身份证）。</li>
                  <li>在<strong>应用管理 → 我的应用</strong>中点击<strong>创建应用</strong>。</li>
                  <li>应用类型选择 <strong>服务端</strong>（重要），填写应用名称。</li>
                  <li>提交后<strong>复制 AK</strong>，粘贴到上方输入框。</li>
                </ol>
                <a href="https://lbsyun.baidu.com/apiconsole/key" target="_blank" rel="noopener"
                   class="settings-key-guide__btn">
                  ${getIcon('external', 14)}
                  <span>前往百度地图开放平台</span>
                </a>
              </div>

              <div class="settings-field__actions">
                <a class="settings-help-link" id="mapHelpLink" href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener">
                  ${getIcon('external', 14)}
                  <span>如何申请地图Key？</span>
                </a>
              </div>
            </div>

            <!-- 天气配置（可选，支持开放API） -->
            <div class="settings-section">
              <div class="settings-section__title">
                ${getIcon('sun', 18)}
                <span>天气 API（可选配置）</span>
              </div>
              <p class="settings-section__desc">
                默认使用 wttr.in 免费天气服务（无需 Key）。可配置高德天气 / 和风天气 / OpenWeatherMap 获得更精准数据。
              </p>

              <div class="settings-field">
                <label>天气服务商</label>
                <select id="weatherProvider" class="settings-select">
                  <option value="wttr" ${settings.weatherProvider === 'wttr' ? 'selected' : ''}>wttr.in（免费无需Key）</option>
                  <option value="amap" ${settings.weatherProvider === 'amap' ? 'selected' : ''}>高德天气（复用地图Key）</option>
                  <option value="qweather" ${settings.weatherProvider === 'qweather' ? 'selected' : ''}>和风天气（免费1000次/天）</option>
                  <option value="openweather" ${settings.weatherProvider === 'openweather' ? 'selected' : ''}>OpenWeatherMap（免费1000次/月）</option>
                </select>
              </div>

              <div class="settings-field" id="weatherKeyField" style="${settings.weatherProvider === 'wttr' || settings.weatherProvider === 'amap' ? 'display:none' : ''}">
                <label>天气 API Key <span style="color:var(--color-text-faint);font-weight:normal">（wttr/高德无需单独填写）</span></label>
                <input type="text" id="weatherApiKey" class="settings-input"
                       value="${settings.weatherApiKey || ''}"
                       placeholder="填入天气服务的 API Key" />
              </div>

              <div class="settings-field__actions">
                <a class="settings-help-link" id="weatherHelpLink" href="https://dev.qweather.com/" target="_blank" rel="noopener">
                  ${getIcon('external', 14)}
                  <span>和风天气开发者平台</span>
                </a>
              </div>
            </div>

          </div>
          <div class="settings-modal__footer">
            <button class="btn btn--ghost" id="settingsCancel">取消</button>
            <button class="btn btn--primary" id="settingsSave">保存配置</button>
          </div>
        </div>
      </div>
    `;
  });
}

// ── 渲染 AI 处理中视图 ──
export function renderAIProcessing(step = '') {
  const steps = [
    { id: 'parse', label: 'AI 解析你的需求', icon: 'sparkles' },
    { id: 'search', label: '搜索真实地图数据', icon: 'map-pin' },
    { id: 'recommend', label: '生成个性化推荐', icon: 'compass' }
  ];

  const currentStep = step || 'parse';
  const stepIndex = steps.findIndex(s => s.id === currentStep);

  return `
    <section class="view is-active generating" id="view-generating" data-view="generating">
      <div class="container">
        <div class="generating__canvas-wrap">
          ${renderM3ProgressLogo(96)}
        </div>
        <h2 class="generating__title">AI 正在为你规划</h2>
        <p class="generating__subtitle">${step || '正在处理…'}</p>
        <div class="m3-linear-progress m3-linear-progress--indeterminate" aria-hidden="true"><div class="m3-linear-progress__indicator"></div></div>
        <div class="ai-steps">
          ${steps.map((s, i) => `
            <div class="ai-step ${i < stepIndex ? 'is-done' : ''} ${i === stepIndex ? 'is-active' : ''}">
              <span class="ai-step__icon">
                ${i < stepIndex ? getIcon('check', 18) : getIcon(s.icon, 18)}
              </span>
              <span class="ai-step__label">${s.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ── 渲染真实 POI 结果视图（地图API返回的真实数据） ──
export function renderRealResults(pois, locationInfo, parsedPrefs) {
  if (!pois || pois.length === 0) {
    return `
      <section class="view is-active results" id="view-results" data-view="results">
        <div class="container">
          <div class="empty-state">
            <div class="empty-state__icon">${getIcon('compass', 64)}</div>
            <h2 class="empty-state__title">未找到匹配地点</h2>
            <p class="empty-state__text">试试换个描述或扩大搜索范围</p>
            <button class="btn btn--ghost" id="backToHome">返回重新输入</button>
          </div>
        </div>
      </section>
    `;
  }

  const locText = locationInfo ? locationInfo.formattedAddress || locationInfo.text || '当前位置' : '当前位置';
  const sourceLabel = pois[0]?.source || '地图API';

  return `
    <section class="view is-active results" id="view-results" data-view="results">
      <div class="container">
        <div class="results__header" data-aos="fade-down">
          <div>
            <h2 class="results__title">为你找到 <em class="numeric">${pois.length}</em> 个真实地点</h2>
            <div class="results__meta">
              <span>${getIcon('map-pin', 14)} ${locText}</span>
              <span class="divider"></span>
              <span>数据来源：${sourceLabel}</span>
              ${parsedPrefs?.reasoning ? `<span class="divider"></span><span>AI解析：${parsedPrefs.reasoning}</span>` : ''}
            </div>
          </div>
          <button class="btn btn--ghost" id="backToHome" aria-label="返回重新输入">
            ${getIcon('arrow-left', 18)}
            <span>重新输入</span>
          </button>
        </div>
        <div class="results__grid" id="resultsGrid">
          ${pois.map((poi, i) => renderRealPOICard(poi, i)).join('')}
        </div>
      </div>
    </section>
  `;
}

// ── 渲染真实 POI 卡片 ──
function renderRealPOICard(poi, index) {
  const matchScore = poi.matchScore != null ? poi.matchScore : 65;
  const distText = poi.distance != null ? formatDistText(poi.distance) : '';
  const navUrl = getNavUrl(poi);
  const photoUrl = poi.photos && poi.photos.length > 0 ? poi.photos[0] : '';

  // 类型视觉映射（无图片时用纯渐变色替代，不使用emoji）
  const TYPE_VISUAL = {
    park:        { gradient: 'linear-gradient(135deg, #43c463, #2a9d4f)' },
    garden:      { gradient: 'linear-gradient(135deg, #7bc67b, #4ba84b)' },
    museum:      { gradient: 'linear-gradient(135deg, #9b6dd4, #7b4fb0)' },
    gallery:     { gradient: 'linear-gradient(135deg, #b07dd4, #904fb0)' },
    restaurant:  { gradient: 'linear-gradient(135deg, #ff8a5b, #e8673a)' },
    cafe:        { gradient: 'linear-gradient(135deg, #c9a063, #a67c42)' },
    bar:         { gradient: 'linear-gradient(135deg, #e85a8a, #c43d6e)' },
    cinema:      { gradient: 'linear-gradient(135deg, #5b6ee8, #3d50c4)' },
    theatre:     { gradient: 'linear-gradient(135deg, #e85a5a, #c43d3d)' },
    library:     { gradient: 'linear-gradient(135deg, #5b9be8, #3d7bc4)' },
    arts_centre: { gradient: 'linear-gradient(135deg, #d46db0, #b04f90)' },
    attraction:  { gradient: 'linear-gradient(135deg, #f5a623, #d4860a)' },
    viewpoint:   { gradient: 'linear-gradient(135deg, #5bc8e8, #3da8c4)' },
    peak:        { gradient: 'linear-gradient(135deg, #8ab85b, #6a983b)' },
    waterfall:   { gradient: 'linear-gradient(135deg, #5bc8e8, #3da8c4)' },
    castle:      { gradient: 'linear-gradient(135deg, #a06b5b, #804b3b)' },
    tomb:        { gradient: 'linear-gradient(135deg, #8a8a8a, #6a6a6a)' },
    ruins:       { gradient: 'linear-gradient(135deg, #b0a090, #8a7a6a)' },
    shopping:    { gradient: 'linear-gradient(135deg, #e85ab8, #c43d96)' },
    marketplace: { gradient: 'linear-gradient(135deg, #e8a05b, #c4803d)' },
    sports:      { gradient: 'linear-gradient(135deg, #5be8a8, #3dc486)' },
    zoo:         { gradient: 'linear-gradient(135deg, #e8b85b, #c4963d)' },
    water:       { gradient: 'linear-gradient(135deg, #5bc8e8, #3da8c4)' },
    wood:        { gradient: 'linear-gradient(135deg, #6ba84b, #4b883b)' },
    wetland:     { gradient: 'linear-gradient(135deg, #5bc8a8, #3da884)' },
    nature:      { gradient: 'linear-gradient(135deg, #5bc463, #3ba44f)' },
    playground:  { gradient: 'linear-gradient(135deg, #f5d623, #d4b60a)' },
    temple:      { gradient: 'linear-gradient(135deg, #d4a65b, #b4863d)' },
    nightclub:   { gradient: 'linear-gradient(135deg, #8a5ae8, #6a3dc4)' },
    amusement:   { gradient: 'linear-gradient(135deg, #e85ad8, #c43db4)' },
    default:     { gradient: 'linear-gradient(135deg, #6e8af5, #4a6cd4)' },
  };
  const visual = TYPE_VISUAL[poi.visualType] || TYPE_VISUAL.default;
  const gradientBg = visual.gradient;

  // 匹配度颜色：高分绿色、中分橙色、低分灰色
  const scoreColor = matchScore >= 80 ? '#43c463' : matchScore >= 60 ? '#f5a623' : '#8a8a8a';

  return `
    <article class="result-card stagger" style="--i:${index}" data-index="${index}" tabindex="0"
             role="button" aria-label="${poi.name}，匹配度${matchScore}%"
             data-aos="fade-up" data-aos-delay="${index * 80}">
      <div class="result-card__media" ${photoUrl ? `style="background-image:url('${photoUrl}');background-size:cover;background-position:center"` : `style="background:${gradientBg}"`}
           onerror="this.style.background='${gradientBg}';this.style.backgroundSize='cover'">
        ${!photoUrl ? `
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22px;font-weight:700;color:rgba(255,255,255,0.95);text-shadow:0 2px 12px rgba(0,0,0,0.3);letter-spacing:2px;max-width:80%;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${poi.name}</div>
        ` : ''}
        <div class="result-card__match-ring" style="--match:${matchScore}">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" stroke-width="3" fill="none" stroke="rgba(255,255,255,0.2)"/>
            <circle cx="24" cy="24" r="20" stroke-width="3" fill="none" stroke="${scoreColor}"
                    stroke-dasharray="${(matchScore / 100) * 125.6} 125.6"
                    transform="rotate(-90 24 24)" stroke-linecap="round"/>
          </svg>
          <span class="result-card__match-num numeric">${matchScore}</span>
        </div>
        ${distText ? `
        <span class="result-card__weather-tag result-card__weather-tag--good">
          ${getIcon('map-pin', 14)}
          ${distText}
        </span>
        ` : ''}
      </div>
      <div class="result-card__body">
        <span class="result-card__type">${poi.type || poi.source || '推荐地点'}</span>
        <h3 class="result-card__title">${poi.name}</h3>
        <p class="result-card__subtitle">${poi.address || (poi.lat ? `${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}` : '点击导航查看位置')}</p>
        ${poi.reason ? `<p class="result-card__reason">${getIcon('sparkles', 14)} ${poi.reason}</p>` : ''}
        <div class="result-card__meta">
          ${poi.tel ? `<span class="result-card__meta-item">${getIcon('phone', 16)}<span>${poi.tel}</span></span>` : ''}
          ${poi.rating ? `<span class="result-card__meta-item">${getIcon('star', 16)}<span>评分 ${poi.rating}</span></span>` : ''}
          ${poi.cost ? `<span class="result-card__meta-item">${getIcon('wallet', 16)}<span>人均¥${poi.cost}</span></span>` : ''}
          ${poi.openHours ? `<span class="result-card__meta-item">${getIcon('clock', 16)}<span>${poi.openHours}</span></span>` : ''}
        </div>
        ${poi.highlights && poi.highlights.length > 0 ? `
        <div class="result-card__highlights">
          ${poi.highlights.map(h => `<span class="result-card__highlight">${h}</span>`).join('')}
        </div>
        ` : ''}
        ${poi.tips && poi.tips.length > 0 ? `
        <div class="result-card__tips">
          ${poi.tips.map(t => `<div class="result-card__tip">${getIcon('info', 12)} ${t}</div>`).join('')}
        </div>
        ` : ''}
        <div class="result-card__footer">
          <a class="result-card__cta" href="${escapeHtml((navUrl && /^https?:\/\//i.test(navUrl)) ? navUrl : '#')}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--color-primary)">
            导航前往
            ${getIcon('arrow-right', 16)}
          </a>
          ${poi.website ? `<a class="result-card__cta" href="${poi.website}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--color-text-muted);font-size:var(--text-tiny)">${getIcon('external', 14)} 官网</a>` : ''}
        </div>
      </div>
    </article>
  `;
}

function formatDistText(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function getNavUrl(poi) {
  if (!poi.lat || !poi.lng) return '#';
  // OSM 数据使用 WGS84 坐标系，高德/百度数据使用 GCJ02
  const coordSystem = poi.source === 'OpenStreetMap' ? 'wgs84' : 'gcj02';
  return `https://uri.amap.com/marker?position=${poi.lng},${poi.lat}&name=${encodeURIComponent(poi.name)}&coordinate=${coordSystem}&callnative=1`;
}

// ============================================
// Agent 思考过程渲染
// ============================================

const TOOL_ICON_MAP = {
  get_weather: 'sun',
  search_places: 'map-pin',
  search_tickets: 'ticket',
  search_hotels: 'bed',
  get_navigation: 'navigation',
  web_search: 'search',
  geocode: 'map-pin',
  reverse_geocode: 'location'
};

const TOOL_LABEL_MAP = {
  get_weather: '查询天气',
  search_places: '搜索地点',
  search_tickets: '查询车票',
  search_hotels: '查询酒店',
  get_navigation: '生成导航',
  web_search: '网页搜索',
  geocode: '地址定位',
  reverse_geocode: '位置解析'
};

/**
 * 判断是否使用 OpenAI 风格 logo（模型名含 gpt 或 baseUrl 含 openai）
 */
function shouldUseOpenAILogo() {
  try {
    const settings = JSON.parse(localStorage.getItem('yihui-settings') || '{}');
    const llm = settings.llm || {};
    const model = (llm.model || '').toLowerCase();
    const baseUrl = (llm.baseUrl || '').toLowerCase();
    return model.includes('gpt') || baseUrl.includes('openai.com');
  } catch { return false; }
}

/**
 * OpenAI 官方 logo SVG（六瓣花朵，来源：github.com/openai/openai-website）
 */
function getOpenAILogoSVG(size = 64) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.079.079 0 0 1-.038-.0517V6.0656a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.451a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
</svg>`;
}

/**
 * M3 Circular Progress + Logo 组件
 * M3 风格圆形进度环（圆头 stroke + 缺口 indeterminate 旋转）环绕 Logo，
 * Logo 本身同步旋转。OpenAI 模型使用 OpenAI 六瓣花 logo，否则用 compass 图标。
 * 纯 SVG/CSS 实现，无 CDN 依赖，高对比度。
 */
function renderM3ProgressLogo(size = 80) {
  const useOpenAI = shouldUseOpenAILogo();
  const logoSvg = useOpenAI
    ? getOpenAILogoSVG(40)
    : getIcon('compass', 40);
  const logoClass = useOpenAI ? 'm3-progress-logo__icon m3-progress-logo__icon--openai' : 'm3-progress-logo__icon';
  // M3 Circular Progress：圆周 C=2πr，留 25% 缺口
  const r = 34;
  const C = 2 * Math.PI * r;
  const dash = C * 0.75; // 75% 弧 + 25% 缺口
  return `
    <div class="m3-progress-logo" style="--m3-size:${size}px" role="img" aria-label="AI 正在思考">
      <svg class="m3-progress-logo__ring" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="${r}" stroke="var(--color-surface-container-high)" stroke-width="4" />
        <circle cx="40" cy="40" r="${r}" stroke="var(--color-primary)" stroke-width="4"
                stroke-linecap="round" stroke-dasharray="${dash} ${C}"
                transform="rotate(-90 40 40)" />
      </svg>
      <div class="${logoClass}">${logoSvg}</div>
    </div>
  `;
}

/**
 * 渲染 Thinking 头部（M3 Circular Progress 环绕 Logo，Logo 同步旋转）
 */
function renderThinkingHeader(currentStatus) {
  return `
    ${renderM3ProgressLogo(80)}
    <h2 class="generating__title">Agent 正在为你规划</h2>
    <p class="generating__subtitle shimmer-text" aria-live="polite">${currentStatus}</p>
  `;
}

/**
 * 渲染 Agent 处理过程（实时更新）
 * @param {Array} steps - Agent 步骤列表
 * @param {string} currentStatus - 当前状态文字
 */
export function renderAgentProcessing(steps = [], currentStatus = 'Agent 启动中…') {
  return `
    <section class="view is-active generating" id="view-generating" data-view="generating">
      <div class="container">
        ${renderThinkingHeader(currentStatus)}
        <div class="agent-trace" id="agentTrace" aria-live="polite" aria-atomic="false">
          ${steps.map(s => renderAgentStep(s)).join('')}
        </div>
      </div>
    </section>
  `;
}

/**
 * 渲染单个 Agent 步骤（M3Design 风格，带语义化图标）
 */
function renderAgentStep(step) {
  if (step.type === 'thinking') {
    return `
      <div class="agent-step agent-step--thinking" role="status">
        <span class="agent-step__icon agent-step__icon--thinking" aria-hidden="true">
          ${getIcon('sparkles', 16)}
        </span>
        <span class="agent-step__label">${escapeHtml(step.content)}</span>
      </div>
    `;
  }

  if (step.type === 'tool_call') {
    const icon = TOOL_ICON_MAP[step.toolName] || 'tool';
    const label = TOOL_LABEL_MAP[step.toolName] || step.toolName;
    const argsText = formatToolArgs(step.toolName, step.toolArgs);
    return `
      <div class="agent-step agent-step--tool-call" role="status" aria-label="调用工具 ${label}">
        <span class="agent-step__icon agent-step__icon--tool" aria-hidden="true">
          ${getIcon(icon, 16)}
        </span>
        <div class="agent-step__content">
          <span class="agent-step__label">调用工具：${label}</span>
          ${argsText ? `<span class="agent-step__args">${escapeHtml(argsText)}</span>` : ''}
        </div>
        <span class="agent-step__spinner" aria-hidden="true"></span>
      </div>
    `;
  }

  if (step.type === 'tool_result') {
    const isError = !!step.error;
    const resultText = isError ? step.content : (step.content || step.result?.summary || '完成');
    const placeCount = step.result?.count;
    return `
      <div class="agent-step agent-step--tool-result ${isError ? 'is-error' : ''}" role="status">
        <span class="agent-step__icon ${isError ? 'agent-step__icon--error' : 'agent-step__icon--done'}" aria-hidden="true">
          ${isError ? getIcon('x', 16) : getIcon('check', 16)}
        </span>
        <div class="agent-step__content">
          <span class="agent-step__label">${escapeHtml(resultText)}</span>
          ${placeCount != null && placeCount > 0 ? `<span class="agent-step__args">找到 ${placeCount} 个结果</span>` : ''}
        </div>
      </div>
    `;
  }

  if (step.type === 'final') {
    return `
      <div class="agent-step agent-step--final" role="status">
        <span class="agent-step__icon agent-step__icon--final" aria-hidden="true">
          ${getIcon('check-circle', 16)}
        </span>
        <span class="agent-step__label">${escapeHtml(step.content)}</span>
      </div>
    `;
  }

  if (step.type === 'stream') {
    // 流式输出：展示模型实时生成的文本（截断过长内容，monospace 风格）
    const raw = step.content || '';
    const preview = raw.length > 600 ? raw.slice(0, 600) + ' …' : raw;
    return `
      <div class="agent-step agent-step--stream" role="status" aria-live="polite">
        <span class="agent-step__icon agent-step__icon--thinking" aria-hidden="true">
          <span class="agent-step__spinner" aria-hidden="true"></span>
        </span>
        <div class="agent-step__content">
          <span class="agent-step__label">正在生成攻略…</span>
          <pre class="agent-step__stream">${escapeHtml(preview)}</pre>
        </div>
      </div>
    `;
  }

  return '';
}

function formatToolArgs(toolName, args) {
  if (!args || Object.keys(args).length === 0) return '';
  const a = args;
  switch (toolName) {
    case 'get_weather':
      return a.city ? `城市：${a.city}` : (a.lat != null ? `坐标：${a.lat.toFixed(3)}, ${a.lng.toFixed(3)}` : '');
    case 'search_places':
      return `关键词：${a.keywords || ''}${a.city ? `｜城市：${a.city}` : ''}`;
    case 'search_tickets':
      return `${a.from_city || ''} → ${a.to_city || ''}${a.date ? `｜${a.date}` : ''}`;
    case 'search_hotels':
      return `城市：${a.city || ''}${a.keyword ? `｜${a.keyword}` : ''}`;
    case 'web_search':
      return `查询：${a.query || ''}`;
    case 'get_navigation':
      return `目的地：${a.name || ''}`;
    case 'geocode':
      return `地址：${a.address || ''}`;
    case 'reverse_geocode':
      return `坐标：${a.lat?.toFixed(3)}, ${a.lng?.toFixed(3)}`;
    default:
      return JSON.stringify(args).slice(0, 80);
  }
}

/**
 * 渲染 Agent 最终攻略结果
 * @param {Object} plan - 攻略对象
 * @param {Array} toolCalls - 工具调用列表（用于展示调用摘要）
 * @param {Object} locationInfo - 位置信息
 */
export function renderAgentResults(plan, toolCalls = [], locationInfo = null) {
  const recommendations = plan.recommendations || [];
  const tickets = plan.tickets || [];
  const hotels = plan.hotels || [];
  const searchLinks = plan.searchLinks || [];

  if (recommendations.length === 0 && tickets.length === 0 && hotels.length === 0) {
    return `
      <section class="view is-active results" id="view-results" data-view="results">
        <div class="container">
          <div class="empty-state">
            <div class="empty-state__icon">${getIcon('compass', 64)}</div>
            <h2 class="empty-state__title">未找到匹配地点</h2>
            <p class="empty-state__text">试试换个描述或扩大搜索范围</p>
            <button class="btn btn--ghost" id="backToHome">返回重新输入</button>
          </div>
        </div>
      </section>
    `;
  }

  const locText = locationInfo ? (locationInfo.formattedAddress || locationInfo.text || '当前位置') : '当前位置';
  const isLocal = plan.isLocalAgent;
  const sourceLabel = isLocal ? '本地 Agent' : 'LLM Agent';

  return `
    <section class="view is-active results" id="view-results" data-view="results">
      <div class="container">
        <div class="results__header" data-aos="fade-down">
          <div>
            <h2 class="results__title">${plan.title ? escapeHtml(plan.title) : 'Agent 攻略'} ${recommendations.length > 0 ? `<em class="numeric">${recommendations.length}</em> 个推荐` : ''}</h2>
            ${plan.summary ? `<p style="color:var(--color-text-muted);font-size:var(--text-small);margin-top:4px">${escapeHtml(plan.summary)}</p>` : ''}
            <div class="results__meta">
              <span>${getIcon('map-pin', 14)} ${escapeHtml(locText)}</span>
              <span class="divider"></span>
              <span>${getIcon('sparkles', 14)} ${sourceLabel} · 调用 ${toolCalls.length} 个工具</span>
              ${plan.weatherAdvisory ? `<span class="divider"></span><span>${getIcon('sun', 14)} ${escapeHtml(plan.weatherAdvisory.slice(0, 40))}…</span>` : ''}
            </div>
          </div>
          <button class="btn btn--ghost" id="backToHome" aria-label="返回重新输入">
            ${getIcon('arrow-left', 18)}
            <span>重新输入</span>
          </button>
        </div>

        ${plan.reasoning ? `
        <div class="agent-plan__reasoning" data-aos="fade-up">
          ${getIcon('sparkles', 18)}
          <div>
            <strong>Agent 思考过程</strong>
            <p>${escapeHtml(plan.reasoning)}</p>
          </div>
        </div>
        ` : ''}

        ${recommendations.length > 0 ? renderRecommendationsSection(plan, recommendations) : ''}

        ${(tickets.length > 0 || hotels.length > 0 || searchLinks.length > 0) ? `
        <div class="agent-resources" data-aos="fade-up">
          ${tickets.length > 0 ? renderResourceSection('ticket', '车票/机票查询', tickets) : ''}
          ${hotels.length > 0 ? renderResourceSection('bed', '酒店住宿', hotels) : ''}
          ${searchLinks.length > 0 ? renderResourceSection('search', '相关攻略搜索', searchLinks) : ''}
        </div>
        ` : ''}

        ${(plan.overallTips && plan.overallTips.length > 0) ? `
        <div class="agent-tips" data-aos="fade-up">
          <h3>${getIcon('info', 18)} 总体建议</h3>
          <ul>
            ${plan.overallTips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
    </section>
  `;
}

/**
 * 渲染推荐区段（根据 planMode 自动选择平铺或时间线）
 */
function renderRecommendationsSection(plan, recommendations) {
  const planMode = plan.planMode || 'flat';
  const hasItinerary = plan.itinerary && plan.itinerary.length > 0;
  const hasDayField = recommendations.some(r => r.day != null);

  // 多日行程且有 day 字段 → 时间线模式
  if (planMode === 'timeline' || hasItinerary || hasDayField) {
    return renderTimelineView(plan, recommendations);
  }

  // 默认：平铺模式
  return `
    <div class="results__grid" id="resultsGrid">
      ${recommendations.map((poi, i) => renderAgentPOICard(poi, i)).join('')}
    </div>
  `;
}

/**
 * 渲染时间线视图（Day1/Day2 多日行程）
 */
function renderTimelineView(plan, recommendations) {
  const itinerary = plan.itinerary || [];
  const dayCount = Math.max(
    itinerary.length,
    ...recommendations.map(r => r.day || 1)
  );

  // 按天分组推荐
  const byDay = {};
  for (let d = 1; d <= dayCount; d++) {
    byDay[d] = recommendations.filter(r => (r.day || 1) === d);
  }

  // 如果有 itinerary 结构，优先用它渲染时间线
  if (itinerary.length > 0) {
    return `
      <div class="timeline-view" id="resultsGrid">
        ${itinerary.map((day, i) => renderTimelineDay(day, byDay[day.day] || [], i)).join('')}
      </div>
    `;
  }

  // 否则按 day 字段分组渲染
  let html = '<div class="timeline-view" id="resultsGrid">';
  for (let d = 1; d <= dayCount; d++) {
    const dayPois = byDay[d] || [];
    html += `
      <div class="timeline-day" data-aos="fade-up">
        <div class="timeline-day__header">
          <span class="timeline-day__badge">Day ${d}</span>
          <span class="timeline-day__line"></span>
        </div>
        <div class="timeline-day__content">
          ${dayPois.length > 0
            ? `<div class="timeline-day__grid">${dayPois.map((poi, i) => renderAgentPOICard(poi, i)).join('')}</div>`
            : '<p class="timeline-day__empty">当天暂无推荐</p>'
          }
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

/**
 * 渲染单天时间线（含早中晚）
 */
function renderTimelineDay(day, dayPois, index) {
  const slots = [
    { key: 'morning', label: '上午', icon: 'sun' },
    { key: 'afternoon', label: '下午', icon: 'cloud' },
    { key: 'evening', label: '晚上', icon: 'moon' }
  ];

  return `
    <div class="timeline-day" data-aos="fade-up" data-aos-delay="${index * 100}">
      <div class="timeline-day__header">
        <span class="timeline-day__badge">Day ${day.day}</span>
        ${day.date ? `<span class="timeline-day__date">${escapeHtml(day.date)}</span>` : ''}
        <span class="timeline-day__line"></span>
      </div>
      <div class="timeline-day__content">
        ${slots.map(slot => {
          const item = day[slot.key];
          if (!item) return '';
          return `
            <div class="timeline-slot">
              <div class="timeline-slot__time">
                ${getIcon(slot.icon, 16)}
                <span>${slot.label}</span>
              </div>
              <div class="timeline-slot__card">
                <strong class="timeline-slot__name">${escapeHtml(item.name || '')}</strong>
                ${item.reason ? `<p class="timeline-slot__reason">${escapeHtml(item.reason)}</p>` : ''}
              </div>
            </div>
          `;
        }).join('')}
        ${dayPois.length > 0 ? `
          <div class="timeline-day__pois">
            <p class="timeline-day__pois-label">当日推荐地点</p>
            <div class="timeline-day__grid">
              ${dayPois.map((poi, i) => renderAgentPOICard(poi, i)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 渲染 Agent 推荐地点卡片（基于 renderRealPOICard，增加 navUrl 字段支持）
 */
function renderAgentPOICard(poi, index) {
  const matchScore = poi.matchScore != null ? poi.matchScore : 65;
  const distText = poi.distance != null ? formatDistText(poi.distance) : '';
  const navUrl = poi.navUrl || getNavUrl(poi);
  // 安全：navUrl 仅允许 http/https 协议
  const safeNavUrl = (navUrl && /^https?:\/\//i.test(navUrl)) ? navUrl : '#';

  const TYPE_VISUAL = {
    park: { gradient: 'linear-gradient(135deg, #43c463, #2a9d4f)' },
    museum: { gradient: 'linear-gradient(135deg, #9b6dd4, #7b4fb0)' },
    restaurant: { gradient: 'linear-gradient(135deg, #ff8a5b, #e8673a)' },
    cafe: { gradient: 'linear-gradient(135deg, #c9a063, #a67c42)' },
    attraction: { gradient: 'linear-gradient(135deg, #f5a623, #d4860a)' },
    default: { gradient: 'linear-gradient(135deg, #6e8af5, #4a6cd4)' },
  };
  const visual = TYPE_VISUAL[poi.type] || TYPE_VISUAL.default;
  const gradientBg = visual.gradient;
  const scoreColor = matchScore >= 80 ? '#43c463' : matchScore >= 60 ? '#f5a623' : '#8a8a8a';

  // 安全：图片 URL 仅允许 http/https 协议，防止 CSS 注入
  const safePhotoUrl = (poi.photos && poi.photos.length > 0 && /^https?:\/\//i.test(poi.photos[0]))
    ? poi.photos[0] : '';

  return `
    <article class="result-card stagger" style="--i:${index}" data-index="${index}" tabindex="0"
             role="button" aria-label="${escapeHtml(poi.name)}，匹配度${matchScore}%"
             data-aos="fade-up" data-aos-delay="${index * 80}">
      <div class="result-card__media" ${safePhotoUrl ? `style="background-image:url('${escapeHtml(safePhotoUrl)}');background-size:cover;background-position:center"` : `style="background:${gradientBg};background-size:cover"`}>
        ${!(poi.photos && poi.photos.length > 0) ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22px;font-weight:700;color:rgba(255,255,255,0.95);text-shadow:0 2px 12px rgba(0,0,0,0.3);letter-spacing:2px;max-width:80%;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(poi.name)}</div>` : ''}
        <div class="result-card__match-ring" style="--match:${matchScore}">
          <svg viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" stroke-width="3" fill="none" stroke="rgba(255,255,255,0.2)"/>
            <circle cx="24" cy="24" r="20" stroke-width="3" fill="none" stroke="${scoreColor}"
                    stroke-dasharray="${(matchScore / 100) * 125.6} 125.6"
                    transform="rotate(-90 24 24)" stroke-linecap="round"/>
          </svg>
          <span class="result-card__match-num numeric">${matchScore}</span>
        </div>
        ${distText ? `
        <span class="result-card__weather-tag result-card__weather-tag--good">
          ${getIcon('map-pin', 14)}
          ${distText}
        </span>
        ` : ''}
      </div>
      <div class="result-card__body">
        <span class="result-card__type">${escapeHtml(poi.type || '推荐地点')}</span>
        <h3 class="result-card__title">${escapeHtml(poi.name)}</h3>
        <p class="result-card__subtitle">${escapeHtml(poi.address || (poi.lat ? `${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}` : '点击导航查看位置'))}</p>
        ${poi.reason ? `<p class="result-card__reason">${getIcon('sparkles', 14)} ${escapeHtml(poi.reason)}</p>` : ''}
        <div class="result-card__meta">
          ${poi.rating ? `<span class="result-card__meta-item">${getIcon('star', 16)}<span>评分 ${poi.rating}</span></span>` : ''}
          ${poi.cost ? `<span class="result-card__meta-item">${getIcon('wallet', 16)}<span>人均¥${poi.cost}</span></span>` : ''}
        </div>
        ${poi.highlights && poi.highlights.length > 0 ? `
        <div class="result-card__highlights">
          ${poi.highlights.map(h => `<span class="result-card__highlight">${escapeHtml(h)}</span>`).join('')}
        </div>
        ` : ''}
        ${poi.tips && poi.tips.length > 0 ? `
        <div class="result-card__tips">
          ${poi.tips.map(t => `<div class="result-card__tip">${getIcon('info', 12)} ${escapeHtml(t)}</div>`).join('')}
        </div>
        ` : ''}
        <div class="result-card__footer">
          <a class="result-card__cta" href="${escapeHtml((navUrl && /^https?:\/\//i.test(navUrl)) ? navUrl : '#')}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--color-primary)">
            导航前往
            ${getIcon('arrow-right', 16)}
          </a>
        </div>
      </div>
    </article>
  `;
}

/**
 * 渲染资源链接区（车票/酒店/搜索）
 */
function renderResourceSection(icon, title, items) {
  return `
    <div class="agent-resource-section">
      <h3 class="agent-resource-section__title">${getIcon(icon, 18)} ${escapeHtml(title)}</h3>
      <div class="agent-resource-section__list">
        ${items.map(item => {
          // 安全：仅允许 http/https 协议，防止 javascript: 等 XSS 注入
          const safeUrl = (item.url && /^https?:\/\//i.test(item.url)) ? item.url : '#';
          return `
          <a class="agent-resource-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">
            <div class="agent-resource-link__main">
              <span class="agent-resource-link__label">${escapeHtml(item.label)}</span>
              ${item.note ? `<span class="agent-resource-link__note">${escapeHtml(item.note)}</span>` : ''}
            </div>
            <span class="agent-resource-link__provider">${escapeHtml(item.provider || '')}</span>
            ${getIcon('external', 14)}
          </a>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
