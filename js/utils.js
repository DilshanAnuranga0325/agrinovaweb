/**
 * AgriNova Utility Functions
 */

export const formatters = {
  date: (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleString();
  },
  number: (val) => val === null || val === undefined ? '--' : val,
  percent: (val) => val === null || val === undefined ? '--' : `${val}%`,
  temp: (val) => val === null || val === undefined ? '--' : `${val}°C`,
};

export const uiSelectors = {
  getBadgeClass: (status) => {
    if (!status) return 'badge-gray';
    const s = status.toUpperCase();
    if (['OK', 'CONNECTED', 'HEALTHY', 'NORMAL', 'PLANT_NORMAL', 'NO_RAIN', 'OPTIMAL', 'COMPLETED', 'GEMINI_COMPLETED'].includes(s)) return 'badge-green';
    if (['WARNING', 'MEDIUM', 'SENSOR ISSUE', 'DRY', 'STRESSED'].includes(s)) return 'badge-orange';
    if (['CRITICAL', 'ABNORMAL', 'OFFLINE', 'ERROR', 'UNHEALTHY'].includes(s)) return 'badge-red';
    return 'badge-gray';
  },
  
  getSoilMoistureStatus: (val) => {
    if (val <= 20) return { label: 'Critical Dry', color: 'badge-red' };
    if (val <= 40) return { label: 'Warning', color: 'badge-orange' };
    return { label: 'Normal', color: 'badge-green' };
  }
};

export const mockStream = (callback, interval = 3000) => {
  return setInterval(() => {
    callback();
  }, interval);
};

export const animateCounter = (id, target, suffix = '') => {
  const el = document.getElementById(id);
  if (!el) return;
  
  let current = 0;
  const duration = 1000;
  const start = performance.now();
  
  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    current = Math.floor(progress * target);
    el.innerText = `${current}${suffix}`;
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  
  requestAnimationFrame(step);
};
