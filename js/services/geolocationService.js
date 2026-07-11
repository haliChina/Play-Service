// ============================================
// 浏览器定位服务 — Geolocation API
// 获取用户真实地理位置
// 一会去哪儿 · Geolocation Service
// ============================================

/**
 * 获取用户当前位置
 * @param {Object} options - 定位选项
 * @param {number} options.timeout - 超时时间（毫秒），默认 10000
 * @param {boolean} options.enableHighAccuracy - 高精度定位，默认 true
 * @param {number} options.maximumAge - 缓存时间（毫秒），默认 0
 * @returns {Promise<Object>} 位置信息 {lat, lng, accuracy, timestamp}
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位功能'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
          isRealData: true,
          source: 'browser-geolocation'
        });
      },
      (error) => {
        let message = '定位失败';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '用户拒绝了定位请求，请在浏览器设置中允许定位';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '位置信息不可用，请检查网络或GPS';
            break;
          case error.TIMEOUT:
            message = '定位超时，请重试';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
}

/**
 * 持续监听位置变化
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调
 * @param {Object} options - 定位选项
 * @returns {number} 监听ID（用于停止监听）
 */
export function watchPosition(onSuccess, onError, options = {}) {
  if (!navigator.geolocation) {
    if (onError) onError(new Error('浏览器不支持定位功能'));
    return -1;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 5000,
    ...options
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        isRealData: true,
        source: 'browser-geolocation'
      });
    },
    (error) => {
      if (onError) onError(error);
    },
    defaultOptions
  );
}

/**
 * 停止监听位置
 * @param {number} watchId - 监听ID
 */
export function clearWatch(watchId) {
  if (navigator.geolocation && watchId >= 0) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * 检查定位权限状态
 * @returns {Promise<string>} 'granted' | 'denied' | 'prompt'
 */
export async function checkPermissionStatus() {
  try {
    if (!navigator.permissions) return 'prompt';
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'denied', 'prompt'
  } catch {
    return 'prompt';
  }
}

/**
 * 格式化距离显示
 * @param {number} meters - 距离（米）
 * @returns {string} 格式化后的距离
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
