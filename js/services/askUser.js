// ============================================
// 用户交互工具 — Agent 向用户提问
// 支持单选/多选/文字回答，超时自动取消
// 一会去哪儿 · Ask User Tool
// ============================================

/**
 * 向用户提问（阻塞式，返回 Promise）
 * @param {Object} params - 提问参数
 * @param {string} params.question - 问题
 * @param {string} params.mode - 'single'|'multi'|'text'
 * @param {Array} params.options - 选项列表（single/multi 模式）
 * @param {string} params.placeholder - 文字输入占位符（text 模式）
 * @param {number} params.timeout - 超时毫秒（默认 60000）
 * @returns {Promise<Object>} {answered, answer, cancelled, timedOut}
 */
export function askUser(params = {}) {
  const {
    question = '请回答以下问题',
    mode = 'text',
    options = [],
    placeholder = '请输入…',
    timeout = 60000
  } = params;

  return new Promise((resolve) => {
    // 创建覆盖层
    const overlay = document.createElement('div');
    overlay.className = 'ask-user-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', question);

    let timeoutId = null;
    let settled = false;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.body.removeChild(overlay);
      resolve(result);
    };

    // 超时自动取消
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        settle({ answered: false, answer: null, cancelled: false, timedOut: true });
      }, timeout);
    }

    // 构建内容
    const modeLabel = mode === 'single' ? '请选择一项' : mode === 'multi' ? '可多选' : '请回答';
    overlay.innerHTML = `
      <div class="ask-user-card">
        <div class="ask-user__header">
          <span class="ask-user__icon">${getAskIcon('question')}</span>
          <div class="ask-user__header-text">
            <h3 class="ask-user__question"></h3>
            <span class="ask-user__mode-hint">${modeLabel}</span>
          </div>
          <button class="ask-user__close" aria-label="取消提问">×</button>
        </div>
        <div class="ask-user__body"></div>
        <div class="ask-user__footer">
          <span class="ask-user__timeout-hint" id="askUserTimeout"></span>
          <div class="ask-user__actions">
            <button class="btn btn--ghost ask-user__cancel">取消</button>
            ${mode !== 'text' ? '<button class="btn btn--primary ask-user__confirm" disabled>确认</button>' : ''}
          </div>
        </div>
      </div>
    `;

    // 安全设置问题文本（防 XSS）
    overlay.querySelector('.ask-user__question').textContent = question;

    const body = overlay.querySelector('.ask-user__body');
    const confirmBtn = overlay.querySelector('.ask-user__confirm');
    const cancelBtn = overlay.querySelector('.ask-user__cancel');
    const closeBtn = overlay.querySelector('.ask-user__close');
    const timeoutHint = overlay.querySelector('#askUserTimeout');

    // 倒计时显示
    let remaining = Math.floor(timeout / 1000);
    const updateCountdown = () => {
      if (remaining > 0) {
        timeoutHint.textContent = `${remaining}s 后自动取消`;
        remaining--;
      }
    };
    updateCountdown();
    const countdownInterval = setInterval(() => {
      updateCountdown();
      if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);

    // 点击背景取消
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        clearInterval(countdownInterval);
        settle({ answered: false, answer: null, cancelled: true, timedOut: false });
      }
    });

    // 取消按钮
    const handleCancel = () => {
      clearInterval(countdownInterval);
      settle({ answered: false, answer: null, cancelled: true, timedOut: false });
    };
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);

    // 按模式渲染
    if (mode === 'single') {
      // 单选
      const selectedValue = { value: null };
      options.forEach((opt, i) => {
        const label = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
        const value = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
        const desc = typeof opt === 'object' ? (opt.description || '') : '';
        const item = document.createElement('div');
        item.className = 'ask-user__option';
        item.setAttribute('role', 'radio');
        item.setAttribute('tabindex', '0');
        item.innerHTML = `
          <span class="ask-user__option-radio"></span>
          <div class="ask-user__option-content">
            <span class="ask-user__option-label"></span>
            ${desc ? '<span class="ask-user__option-desc"></span>' : ''}
          </div>
        `;
        item.querySelector('.ask-user__option-label').textContent = label;
        if (desc) item.querySelector('.ask-user__option-desc').textContent = desc;

        const select = () => {
          body.querySelectorAll('.ask-user__option').forEach(o => o.classList.remove('is-selected'));
          item.classList.add('is-selected');
          selectedValue.value = value;
          if (confirmBtn) confirmBtn.disabled = false;
        };
        item.addEventListener('click', select);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
        });
        body.appendChild(item);
      });

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          clearInterval(countdownInterval);
          settle({ answered: true, answer: selectedValue.value, cancelled: false, timedOut: false });
        });
      }

    } else if (mode === 'multi') {
      // 多选
      const selectedValues = new Set();
      options.forEach((opt, i) => {
        const label = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
        const value = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
        const desc = typeof opt === 'object' ? (opt.description || '') : '';
        const item = document.createElement('div');
        item.className = 'ask-user__option ask-user__option--checkbox';
        item.setAttribute('role', 'checkbox');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-checked', 'false');
        item.innerHTML = `
          <span class="ask-user__option-checkbox"></span>
          <div class="ask-user__option-content">
            <span class="ask-user__option-label"></span>
            ${desc ? '<span class="ask-user__option-desc"></span>' : ''}
          </div>
        `;
        item.querySelector('.ask-user__option-label').textContent = label;
        if (desc) item.querySelector('.ask-user__option-desc').textContent = desc;

        const toggle = () => {
          if (selectedValues.has(value)) {
            selectedValues.delete(value);
            item.classList.remove('is-selected');
            item.setAttribute('aria-checked', 'false');
          } else {
            selectedValues.add(value);
            item.classList.add('is-selected');
            item.setAttribute('aria-checked', 'true');
          }
          if (confirmBtn) confirmBtn.disabled = selectedValues.size === 0;
        };
        item.addEventListener('click', toggle);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
        body.appendChild(item);
      });

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          clearInterval(countdownInterval);
          settle({ answered: true, answer: Array.from(selectedValues), cancelled: false, timedOut: false });
        });
      }

    } else {
      // 文字输入
      const input = document.createElement('textarea');
      input.className = 'ask-user__input';
      input.setAttribute('placeholder', placeholder);
      input.setAttribute('rows', '3');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'true');
      body.appendChild(input);

      // 自动聚焦
      setTimeout(() => input.focus(), 100);

      const submitText = () => {
        const value = input.value.trim();
        if (value) {
          clearInterval(countdownInterval);
          settle({ answered: true, answer: value, cancelled: false, timedOut: false });
        }
      };

      // Enter 提交（Shift+Enter 换行）
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitText();
        }
      });

      // 添加提交按钮
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn--primary ask-user__submit';
      submitBtn.textContent = '提交';
      submitBtn.addEventListener('click', submitText);
      overlay.querySelector('.ask-user__actions').appendChild(submitBtn);
    }

    document.body.appendChild(overlay);

    // ESC 取消
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEsc);
        clearInterval(countdownInterval);
        settle({ answered: false, answer: null, cancelled: true, timedOut: false });
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

function getAskIcon(name) {
  const icons = {
    question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  return icons[name] || icons.question;
}
