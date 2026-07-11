// ============================================
// 交互逻辑 — 筛选/对比/展开/收藏/粒子动画
// 一会去哪儿 · Interactions
// ============================================

import { appState } from './state.js';
import { recommend } from './recommender.js';
import { destinations } from '../data/destinations.js';
import { userProfiles, smartLinkRules, cityData } from '../data/userProfile.js';
import { adminDivisions, getProvinces, getCities, getDistricts, findLocation } from '../data/adminDivisions.js';
import { weatherConditions } from '../data/weather.js';
import { renderResults, renderDetailDrawer } from './renderer.js';

// ── 粒子聚合动画 ──
export class ParticleCompass {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.startTime = 0;
    this.duration = 2500;
    this.init();
  }

  init() {
    const count = 60;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const targetR = 60 + Math.random() * 20;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 200,
        y: cy + (Math.random() - 0.5) * 200,
        tx: cx + Math.cos(angle) * targetR,
        ty: cy + Math.sin(angle) * targetR,
        sx: cx + Math.cos(angle) * (80 + Math.random() * 60),
        sy: cy + Math.sin(angle) * (80 + Math.random() * 60),
        size: 2 + Math.random() * 3,
        alpha: 0.6 + Math.random() * 0.4
      });
    }
  }

  start(onComplete) {
    this.startTime = performance.now();
    this.onComplete = onComplete;
    this.animate();
  }

  animate() {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 阶段：0-0.4 聚合到圆环，0.4-0.7 旋转，0.7-1.0 散开
    let phase, phaseProgress;
    if (progress < 0.4) {
      phase = 'gather';
      phaseProgress = progress / 0.4;
    } else if (progress < 0.7) {
      phase = 'rotate';
      phaseProgress = (progress - 0.4) / 0.3;
    } else {
      phase = 'scatter';
      phaseProgress = (progress - 0.7) / 0.3;
    }

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeIn = t => t * t;

    this.particles.forEach((p, i) => {
      let x, y, alpha = p.alpha, size = p.size;

      if (phase === 'gather') {
        const t = easeOut(phaseProgress);
        x = p.x + (p.sx - p.x) * t;
        y = p.y + (p.sy - p.y) * t;
      } else if (phase === 'rotate') {
        const angle = (i / this.particles.length) * Math.PI * 2 + phaseProgress * Math.PI;
        const r = 70;
        x = cx + Math.cos(angle) * r;
        y = cy + Math.sin(angle) * r;
        alpha = p.alpha * (0.8 + 0.2 * Math.sin(phaseProgress * Math.PI));
      } else {
        const t = easeIn(phaseProgress);
        const scatterR = 120 + t * 80;
        const angle = (i / this.particles.length) * Math.PI * 2;
        x = cx + Math.cos(angle) * scatterR;
        y = cy + Math.sin(angle) * scatterR;
        alpha = p.alpha * (1 - t);
        size = p.size * (1 + t * 0.5);
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(198, 93, 58, ${alpha})`;
      ctx.fill();

      // 光晕
      if (phase === 'rotate') {
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 162, 76, ${alpha * 0.3})`;
        ctx.fill();
      }
    });

    // 中心罗盘指针
    if (phase === 'rotate' || phase === 'gather') {
      const needleAlpha = phase === 'rotate' ? 1 : phaseProgress;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(phaseProgress * Math.PI * 2);
      ctx.strokeStyle = `rgba(198, 93, 58, ${needleAlpha})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(0, 40);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(198, 93, 58, ${needleAlpha})`;
      ctx.fill();
      ctx.restore();
    }

    if (progress < 1) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      if (this.onComplete) this.onComplete();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// ── 生成步骤动画 ──
export function animateGenSteps(onComplete) {
  const steps = document.querySelectorAll('.gen-step');
  let current = 0;

  function activateStep(i) {
    if (i >= steps.length) {
      if (onComplete) setTimeout(onComplete, 300);
      return;
    }
    // 上一步完成
    if (i > 0) {
      steps[i - 1].classList.remove('is-active');
      steps[i - 1].classList.add('is-done');
    }
    // 当前步激活
    steps[i].classList.add('is-active');
    setTimeout(() => activateStep(i + 1), 550);
  }

  activateStep(0);
}

// ── 执行推荐并切换到结果视图 ──
export function runRecommendation() {
  const prefs = appState.getPreferencesForRecommend();
  const results = recommend(prefs, destinations);
  appState.setResults(results);
  appState.setView('results');
  renderView('results');

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── 视图渲染调度 ──
export function renderView(viewName) {
  const main = document.getElementById('app-main');
  const views = main.querySelectorAll('.view');
  views.forEach(v => v.classList.remove('is-active'));

  let targetView = document.getElementById(`view-${viewName}`);
  if (!targetView) {
    // 需要重新渲染该视图
    if (viewName === 'results') {
      main.insertAdjacentHTML('beforeend', renderResults());
      targetView = document.getElementById('view-results');
    }
  }

  if (targetView) {
    targetView.classList.add('is-active');
    bindViewEvents(viewName);
  }
}

// ── 切换视图（带内容渲染） ──
export function switchView(viewName) {
  const main = document.getElementById('app-main');

  // 移除旧视图
  const oldViews = main.querySelectorAll('.view');
  oldViews.forEach(v => v.remove());

  // 根据视图名渲染新内容
  let html = '';
  switch (viewName) {
    case 'hero':
      html = renderHeroView();
      break;
    case 'preferences':
      html = renderPreferencesView();
      break;
    case 'generating':
      html = renderGeneratingView();
      break;
    case 'results':
      html = renderResultsView();
      break;
  }

  if (html) {
    main.innerHTML = html;
    const newView = main.querySelector('.view');
    if (newView) newView.classList.add('is-active');
    bindViewEvents(viewName);
  }

  appState.setView(viewName);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 视图渲染函数（延迟导入避免循环依赖）
function renderHeroView() {
  return null; // Hero 由 app.js 初始渲染
}

function renderPreferencesView() {
  return null;
}

function renderGeneratingView() {
  return null;
}

function renderResultsView() {
  return renderResults();
}

// ── 绑定视图事件 ──
function bindViewEvents(viewName) {
  switch (viewName) {
    case 'hero':
      bindHeroEvents();
      break;
    case 'preferences':
      bindPreferencesEvents();
      break;
    case 'generating':
      bindGeneratingEvents();
      break;
    case 'results':
      bindResultsEvents();
      break;
  }
}

// ── Hero 视图事件 ──
function bindHeroEvents() {
  const startBtn = document.getElementById('startCustomize');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      appState.setView('preferences');
      document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'preferences' } }));
    });
  }

  // 快速体验画像
  document.querySelectorAll('.quick-profile').forEach(btn => {
    btn.addEventListener('click', () => {
      const profileId = btn.dataset.profile;
      const profile = userProfiles[profileId];
      if (profile) {
        appState.applyProfile(profile);
        // 直接进入生成流程
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'generating' } }));
      }
    });
  });
}

// ── 偏好定制视图事件 ──
function bindPreferencesEvents() {
  // 人群选择
  document.querySelectorAll('[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      appState.setGroupType(group);
      // 智能联动
      const linked = smartLinkRules[group] || [];
      linked.forEach(interest => {
        if (!appState.state.preferences.interests.includes(interest)) {
          appState.state.preferences.interests.push(interest);
        }
      });
      appState.notify();
      updatePreferencesUI();
    });
  });

  // 兴趣标签
  document.querySelectorAll('[data-interest]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.toggleInterest(btn.dataset.interest);
      updatePreferencesUI();
    });
  });

  // 预算滑块
  const slider = document.getElementById('budgetSlider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      appState.setBudget(parseInt(e.target.value));
      updateBudgetDisplay();
    });
  }

  // 交通方式
  document.querySelectorAll('[data-transport]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.toggleTransport(btn.dataset.transport);
      updatePreferencesUI();
    });
  });

  // 时长
  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.setDuration(btn.dataset.duration);
      updatePreferencesUI();
    });
  });

  // 生成按钮
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

// ── 更新偏好 UI（不重新渲染整个视图） ──
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

// ── 生成中视图事件 ──
function bindGeneratingEvents() {
  const canvas = document.getElementById('particleCanvas');
  const fallback = document.getElementById('compassFallback');

  // 检查 reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    // 降级：只显示旋转罗盘
    if (canvas) canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
    animateGenSteps(() => {
      runRecommendation();
    });
  } else {
    if (canvas && fallback) {
      fallback.style.display = 'none';
      const particle = new ParticleCompass(canvas);
      particle.start(() => {
        runRecommendation();
      });
      animateGenSteps();
    } else {
      animateGenSteps(() => runRecommendation());
    }
  }
}

// ── 结果视图事件 ──
function bindResultsEvents() {
  // 卡片点击打开详情
  document.querySelectorAll('.result-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 排除收藏按钮点击
      if (e.target.closest('[data-fav]')) return;
      const index = parseInt(card.dataset.index);
      openDetail(index);
    });

    // 键盘支持
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const index = parseInt(card.dataset.index);
        openDetail(index);
      }
    });
  });

  // 收藏按钮
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

  // 重新生成
  const regenBtn = document.getElementById('regenerateBtn');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'generating' } }));
    });
  }

  // 返回调整偏好
  const backBtn1 = document.getElementById('backToPrefs');
  const backBtn2 = document.getElementById('backToPrefs2');
  [backBtn1, backBtn2].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'preferences' } }));
      });
    }
  });
}

// ── 打开详情抽屉 ──
export function openDetail(index) {
  appState.selectResult(index);
  const drawerContainer = document.getElementById('detail-container');
  drawerContainer.innerHTML = renderDetailDrawer();

  const overlay = document.getElementById('detailOverlay');
  const drawer = document.getElementById('detailDrawer');

  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });

  bindDetailEvents();
}

// ── 关闭详情抽屉 ──
export function closeDetail() {
  const overlay = document.getElementById('detailOverlay');
  const drawer = document.getElementById('detailDrawer');

  if (overlay) overlay.classList.remove('is-open');
  if (drawer) drawer.classList.remove('is-open');
  document.body.style.overflow = '';

  setTimeout(() => {
    const container = document.getElementById('detail-container');
    if (container) container.innerHTML = '';
    appState.selectResult(-1);
  }, 600);
}

// ── 详情抽屉事件 ──
function bindDetailEvents() {
  const overlay = document.getElementById('detailOverlay');
  const backBtn = document.getElementById('detailBack');
  const favBtn = document.getElementById('detailFav');
  const nextBtn = document.getElementById('detailNext');

  if (overlay) overlay.addEventListener('click', closeDetail);
  if (backBtn) backBtn.addEventListener('click', closeDetail);

  if (favBtn) {
    favBtn.addEventListener('click', () => {
      const dest = appState.getSelectedResult();
      if (!dest) return;
      const isAdded = appState.toggleFavorite(dest.id);
      favBtn.classList.toggle('is-favorited', isAdded);
      favBtn.setAttribute('aria-pressed', isAdded);
      showToast(isAdded ? '已收藏' : '已取消收藏');
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const currentIndex = appState.state.selectedIndex;
      const nextIndex = (currentIndex + 1) % appState.state.results.length;
      // 先关闭再打开
      const drawer = document.getElementById('detailDrawer');
      const overlay = document.getElementById('detailOverlay');
      if (drawer) drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');

      setTimeout(() => {
        openDetail(nextIndex);
      }, 300);
    });
  }

  // ESC 关闭
  document.addEventListener('keydown', handleDetailEsc);
}

function handleDetailEsc(e) {
  if (e.key === 'Escape') {
    closeDetail();
    document.removeEventListener('keydown', handleDetailEsc);
  }
}

// ── Toast 提示 ──
let toastTimer = null;
export function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--color-text);
      color: var(--color-text-inverse);
      padding: 12px 24px;
      border-radius: var(--radius-pill);
      font-size: var(--text-small);
      font-weight: var(--weight-medium);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-toast);
      opacity: 0;
      transition: all var(--duration-normal) var(--ease-out);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2000);
}

// ── 城市选择器交互（省→市→区/县 三级联动）──
export function initCityPicker() {
  const picker = document.getElementById('cityPicker');
  if (!picker) return;

  let dropdownOpen = false;

  function closeCityDropdown() {
    dropdownOpen = false;
    const d = document.getElementById('cityDropdown');
    if (d) {
      d.style.animation = 'overlayIn 0.15s var(--ease-smooth) reverse both';
      setTimeout(() => d.remove(), 140);
    }
    document.removeEventListener('click', handleOutsideClick);
  }

  function handleOutsideClick(e) {
    const d = document.getElementById('cityDropdown');
    if (d && !d.contains(e.target) && !picker.contains(e.target)) {
      closeCityDropdown();
    }
  }

  picker.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdownOpen) {
      closeCityDropdown();
    } else {
      openCityDropdown();
    }
  });

  function openCityDropdown() {
    dropdownOpen = true;
    const current = appState.state.city;

    const dropdown = document.createElement('div');
    dropdown.id = 'cityDropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: calc(var(--header-height) - 8px);
      right: var(--container-padding);
      background: var(--color-surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: var(--space-xs);
      z-index: var(--z-dropdown);
      width: 380px;
      max-height: 520px;
      display: flex;
      flex-direction: column;
      animation: scaleIn var(--duration-fast) var(--ease-spring) both;
      transform-origin: top right;
      overflow: hidden;
    `;

    dropdown.innerHTML = `
      <div style="padding:0 4px 8px;border-bottom:1px solid var(--color-border-light,rgba(42,37,32,0.08))">
        <input type="text" id="citySearchInput" placeholder="搜索省/市/区…"
               style="width:100%;padding:8px 12px;border:1px solid var(--color-border-light,rgba(42,37,32,0.12));
                      border-radius:8px;font-size:14px;background:var(--color-bg-warm);color:var(--color-text);
                      outline:none;font-family:inherit;"
               aria-label="搜索地区" />
      </div>
      <div id="cityCascade" style="display:flex;gap:2px;padding:4px 0;border-bottom:1px solid var(--color-border-light,rgba(42,37,32,0.06))">
        <select id="provinceSelect" style="flex:1;padding:6px 8px;border:1px solid var(--color-border-light,rgba(42,37,32,0.12));border-radius:6px;font-size:13px;background:var(--color-surface);color:var(--color-text);outline:none;font-family:inherit;cursor:pointer;">
          <option value="">选择省份</option>
        </select>
        <select id="citySelect" style="flex:1;padding:6px 8px;border:1px solid var(--color-border-light,rgba(42,37,32,0.12));border-radius:6px;font-size:13px;background:var(--color-surface);color:var(--color-text);outline:none;font-family:inherit;cursor:pointer;" disabled>
          <option value="">选择城市</option>
        </select>
        <select id="districtSelect" style="flex:1;padding:6px 8px;border:1px solid var(--color-border-light,rgba(42,37,32,0.12));border-radius:6px;font-size:13px;background:var(--color-surface);color:var(--color-text);outline:none;font-family:inherit;cursor:pointer;" disabled>
          <option value="">选择区/县</option>
        </select>
      </div>
      <div id="cityListContainer" style="overflow-y:auto;flex:1;padding:4px;min-height:120px">
      </div>
      <div id="cityNoResult" style="display:none;padding:20px;text-align:center;color:var(--color-text-faint);font-size:13px">
        未找到匹配的地区
      </div>
    `;

    document.body.appendChild(dropdown);

    // 填充省份下拉
    const provinceSelect = document.getElementById('provinceSelect');
    const citySelect = document.getElementById('citySelect');
    const districtSelect = document.getElementById('districtSelect');
    const listContainer = document.getElementById('cityListContainer');
    const noResult = document.getElementById('cityNoResult');
    const searchInput = document.getElementById('citySearchInput');

    const provinces = getProvinces();
    provinces.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      provinceSelect.appendChild(opt);
    });

    // 搜索功能
    let searchQuery = '';
    if (searchInput) {
      searchInput.focus();
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderSearchResults();
      });
    }

    // 搜索结果渲染（全局搜索省/市/区）
    function renderSearchResults() {
      if (!searchQuery) {
        listContainer.innerHTML = '<div style="padding:12px;color:var(--color-text-faint);font-size:13px;text-align:center">请选择省份或在上方搜索</div>';
        noResult.style.display = 'none';
        return;
      }

      const results = [];
      for (const provName of provinces) {
        const prov = adminDivisions[provName];
        // 省份匹配
        if (provName.toLowerCase().includes(searchQuery)) {
          results.push({ type: 'province', province: provName, city: '', district: '', label: provName, sub: prov.type });
        }
        for (const city of (prov.cities || [])) {
          const cityNameShort = city.name.replace(/市$/, '');
          // 城市匹配
          if (cityNameShort.toLowerCase().includes(searchQuery) || city.name.toLowerCase().includes(searchQuery)) {
            results.push({ type: 'city', province: provName, city: city.name, district: '', label: `${provName} · ${city.name}`, sub: '城市' });
          }
          // 区/县匹配
          for (const dist of (city.districts || [])) {
            if (dist.name.toLowerCase().includes(searchQuery)) {
              results.push({ type: 'district', province: provName, city: city.name, district: dist.name, label: `${provName} · ${city.name} · ${dist.name}`, sub: '区/县' });
            }
          }
        }
      }

      if (results.length === 0) {
        listContainer.innerHTML = '';
        noResult.style.display = 'block';
        return;
      }

      noResult.style.display = 'none';
      listContainer.innerHTML = results.slice(0, 50).map(r => `
        <button class="city-dropdown__item" data-province="${r.province}" data-city="${r.city}" data-district="${r.district}"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
                       border-radius:8px;font-size:13px;font-weight:500;color:var(--color-text);
                       background:transparent;transition:background 0.15s;border:none;cursor:pointer;text-align:left;font-family:inherit;">
          <span style="color:var(--color-primary);font-size:11px;width:32px;flex-shrink:0">${r.sub}</span>
          <span>${r.label}</span>
        </button>
      `).join('');

      // 绑定点击
      listContainer.querySelectorAll('[data-province]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectLocation(btn.dataset.province, btn.dataset.city, btn.dataset.district);
        });
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--color-bg-warm)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
      });
    }

    // 省份选择 → 填充城市
    provinceSelect.addEventListener('change', () => {
      const provName = provinceSelect.value;
      citySelect.innerHTML = '<option value="">选择城市</option>';
      districtSelect.innerHTML = '<option value="">选择区/县</option>';
      districtSelect.disabled = true;

      if (!provName) {
        citySelect.disabled = true;
        listContainer.innerHTML = '';
        return;
      }

      citySelect.disabled = false;
      const cities = getCities(provName);
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        citySelect.appendChild(opt);
      });

      // 在列表中展示城市
      listContainer.innerHTML = cities.map(c => {
        const hasDistricts = c.districts && c.districts.length > 0;
        return `
          <button class="city-dropdown__item" data-province="${provName}" data-city="${c.name}" data-district=""
                  style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
                         border-radius:8px;font-size:13px;font-weight:500;color:var(--color-text);
                         background:transparent;transition:background 0.15s;border:none;cursor:pointer;text-align:left;font-family:inherit;">
            <span style="color:var(--color-primary);font-size:12px">${c.name === current ? '✓' : '○'}</span>
            <span>${c.name}</span>
            ${hasDistricts ? `<span style="margin-left:auto;font-size:11px;color:var(--color-text-faint)">${c.districts.length}个区/县</span>` : ''}
          </button>
        `;
      }).join('');

      bindListItems();
    });

    // 城市选择 → 填充区/县
    citySelect.addEventListener('change', () => {
      const provName = provinceSelect.value;
      const cityName = citySelect.value;
      districtSelect.innerHTML = '<option value="">选择区/县</option>';

      if (!cityName) {
        districtSelect.disabled = true;
        return;
      }

      const districts = getDistricts(provName, cityName);
      if (districts.length === 0) {
        districtSelect.disabled = true;
        // 没有区/县数据，直接选城市
        selectLocation(provName, cityName, '');
        return;
      }

      districtSelect.disabled = false;
      districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name;
        opt.textContent = d.name;
        districtSelect.appendChild(opt);
      });

      // 在列表中展示区/县
      listContainer.innerHTML = districts.map(d => `
        <button class="city-dropdown__item" data-province="${provName}" data-city="${cityName}" data-district="${d.name}"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px 7px 24px;
                       border-radius:8px;font-size:13px;color:var(--color-text);
                       background:transparent;transition:background 0.15s;border:none;cursor:pointer;text-align:left;font-family:inherit;">
          <span style="color:var(--color-primary);font-size:10px">▪</span>
          <span>${d.name}</span>
        </button>
      `).join('');

      bindListItems();
    });

    // 区/县选择 → 确认位置
    districtSelect.addEventListener('change', () => {
      const provName = provinceSelect.value;
      const cityName = citySelect.value;
      const districtName = districtSelect.value;
      if (districtName) {
        selectLocation(provName, cityName, districtName);
      }
    });

    // 列表项点击绑定
    function bindListItems() {
      listContainer.querySelectorAll('[data-province]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.province;
          const c = btn.dataset.city;
          const d = btn.dataset.district;
          if (d) {
            selectLocation(p, c, d);
          } else if (c) {
            // 点击城市名，展开区/县
            provinceSelect.value = p;
            provinceSelect.dispatchEvent(new Event('change'));
            citySelect.value = c;
            citySelect.dispatchEvent(new Event('change'));
          }
        });
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--color-bg-warm)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
      });
    }

    // 选择位置（省/市/区）
    async function selectLocation(provinceName, cityName, districtName) {
      const loc = findLocation(provinceName, cityName, districtName);
      if (!loc) {
        showToast('未找到该位置的坐标信息');
        return;
      }

      closeCityDropdown();

      // 构建显示名
      const displayCity = districtName
        ? `${cityName.replace(/市$/, '')} · ${districtName}`
        : cityName.replace(/市$/, '');

      // 更新状态
      appState.setCity(displayCity);
      document.getElementById('currentCity').textContent = displayCity;

      // 保存完整地址信息到 appState
      appState.setUserAddress({
        text: loc.fullAddress,
        formattedAddress: loc.fullAddress,
        lat: loc.lat,
        lng: loc.lng,
        province: provinceName,
        city: cityName,
        district: districtName || '',
        source: 'admin-divisions'
      });

      // 更新地址输入框
      const addressInput = document.getElementById('addressInput');
      if (addressInput) addressInput.value = loc.fullAddress;
      const addressHint = document.getElementById('addressHint');
      if (addressHint) addressHint.innerHTML = `<span style="color:var(--color-accent)">✓ 已确认：${loc.fullAddress}</span>`;

      // 更新天气卡片（显示加载中状态）
      const cardEl = document.getElementById('weatherCardContent');
      const asideEl = document.getElementById('heroAside');
      const renderer = await import('./renderer.js');
      if (cardEl) {
        cardEl.innerHTML = renderer.renderWeatherCard();
      }
      // 同步刷新灵感面板（也显示加载中状态，避免底部一直停在获取中）
      if (asideEl) {
        asideEl.innerHTML = renderer.renderInspirationPanel();
      }

      showToast(`已选择：${loc.fullAddress}`);

      // 异步获取实时天气
      try {
        const { fetchWeather } = await import('../services/weatherService.js');
        const weatherData = await fetchWeather(districtName || cityName.replace(/市$/, ''));
        appState.setWeather(weatherData);
        updateWeatherTint();
        // 天气数据到达后，同步刷新顶部天气卡片和底部灵感面板，确保二者数据源一致
        if (cardEl) {
          cardEl.innerHTML = renderer.renderWeatherCard();
        }
        if (asideEl) {
          asideEl.innerHTML = renderer.renderInspirationPanel();
        }
        if (weatherData.isRealTime) {
          showToast(`${loc.fullAddress} · ${weatherData.weatherDesc} ${weatherData.temp}°C`);
        }
      } catch (error) {
        console.error('天气获取异常:', error);
        // 即使失败也刷新一次，让底部不再停在"获取中"
        if (asideEl) {
          asideEl.innerHTML = renderer.renderInspirationPanel();
        }
      }
    }

    // 初始状态
    renderSearchResults();

    // 点击外部关闭
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);

    picker._closeDropdown = closeCityDropdown;
  }
}

// ── 更新天气色调 ──
export function updateWeatherTint() {
  const weather = appState.state.weather;
  if (!weather || weather.isLoading || weather.temp === '--') {
    document.documentElement.style.setProperty('--weather-tint', '#8B9DAF');
    document.documentElement.style.setProperty('--weather-tint-soft', '#8B9DAF20');
    return;
  }
  const cond = weatherConditions[weather.condition] || weatherConditions.cloudy;
  document.documentElement.style.setProperty('--weather-tint', cond.tint);
  document.documentElement.style.setProperty('--weather-tint-soft', cond.tint + '20');
}
