// ============================================
// M3 Expressive LoadingIndicator — 异形多边形 morphing 进度指示器
// 一会去哪儿 · M3 Loader
// 忠实移植自 Android material-components-android LoadingIndicator
// 7 种多边形形态 spring morphing：Soft Burst → Cookie 9 → Pentagon →
// Pill → Sunny → Cookie 4 → Oval
// 配色继承 Vercel（currentColor / --color-primary）
// ============================================

let m3Core = null;

/**
 * 懒加载 CDN 核心模块（仅在首次调用时加载）
 */
async function ensureCore() {
  if (m3Core) return m3Core;
  try {
    m3Core = await import(
      /* @vite-ignore */
      'https://cdn.jsdelivr.net/npm/@alerix/m3-loading-indicator@1.0.5/dist/core/index.js'
    );
    return m3Core;
  } catch (e) {
    console.warn('[M3Loader] CDN 加载失败，降级到 CSS spinner', e.message);
    return null;
  }
}

// 活跃的 loader 实例映射（canvas → { rafId, animator }）
const activeLoaders = new Map();

/**
 * 在指定 canvas 上挂载 M3 Expressive LoadingIndicator
 * @param {HTMLCanvasElement} canvas - 目标 canvas 元素
 * @param {Object} options - { size, color, contained, containerColor, speed }
 * @returns {Promise<void>}
 */
export async function mountM3Loader(canvas, options = {}) {
  if (!canvas) return;

  // 若已有活跃实例，先卸载
  if (activeLoaders.has(canvas)) {
    unmountM3Loader(canvas);
  }

  const core = await ensureCore();
  if (!core) return; // CDN 失败，降级由 CSS 处理

  const size = options.size || 48;
  const color = options.color || getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary').trim() || '#000000';

  try {
    const ctx = core.setupCanvas(canvas, size);
    const animator = new core.M3Animator();
    if (options.speed) animator.speed = options.speed;

    const render = (timestamp) => {
      animator.update(timestamp);
      const shape = core.getMorphedShape(animator.morph);
      core.drawIndicator(ctx, size, shape, animator.rotation, {
        color,
        sizeRatio: options.sizeRatio || 0.79,
        contained: options.contained || false,
        containerColor: options.containerColor || 'rgba(0,0,0,0.06)',
      });
      const rafId = requestAnimationFrame(render);
      const entry = activeLoaders.get(canvas);
      if (entry) entry.rafId = rafId;
    };

    const rafId = requestAnimationFrame(render);
    activeLoaders.set(canvas, { rafId, animator });
  } catch (e) {
    console.warn('[M3Loader] 挂载失败:', e.message);
  }
}

/**
 * 卸载指定 canvas 上的 M3 LoadingIndicator
 * @param {HTMLCanvasElement} canvas
 */
export function unmountM3Loader(canvas) {
  if (!canvas) return;
  const entry = activeLoaders.get(canvas);
  if (entry) {
    cancelAnimationFrame(entry.rafId);
    activeLoaders.delete(canvas);
  }
}

/**
 * 卸载所有活跃的 M3 LoadingIndicator（视图切换时调用）
 */
export function unmountAllM3Loaders() {
  for (const [canvas] of activeLoaders) {
    unmountM3Loader(canvas);
  }
}

/**
 * 生成 M3 LoadingIndicator 的 HTML 占位（canvas + 降级 fallback）
 * @param {number} size - 尺寸 px
 * @param {string} id - canvas 元素 id
 * @returns {string} HTML
 */
export function m3LoaderHTML(size = 48, id = 'm3Loader') {
  return `
    <div class="m3-loader" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center">
      <canvas id="${id}" width="${size}" height="${size}" aria-label="加载中" role="img"></canvas>
      <noscript>
        <span class="m3-loader__fallback" style="width:${Math.floor(size*0.6)}px;height:${Math.floor(size*0.6)}px;border:3px solid var(--color-primary-soft);border-top-color:var(--color-primary);border-radius:50%;animation:m3-circular-progress 0.9s var(--ease-standard) infinite"></span>
      </noscript>
    </div>
  `;
}
