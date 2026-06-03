const resolveApiBase = () => {
  const envBase = process.env.REACT_APP_API_BASE?.trim();
  if (envBase) {
    const normalized = envBase.replace(/\/$/, '');
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }

  if (typeof window !== 'undefined') {
    return '/api';
  }

  return '/api';
};

const API_BASE = resolveApiBase();

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return null;
}

// 加载初始数据（默认返回限额历史 + 汇总）
export async function loadData(options = {}) {
  const checkinLimit = Number.isInteger(options.checkinLimit) ? options.checkinLimit : 200;
  const exchangeLimit = Number.isInteger(options.exchangeLimit) ? options.exchangeLimit : 200;
  const params = new URLSearchParams({
    checkinLimit: String(checkinLimit),
    exchangeLimit: String(exchangeLimit)
  });
  return request(`/load?${params.toString()}`);
}

export async function loadStats(options = {}) {
  const days = Number.isInteger(options.days) ? options.days : 30;
  const params = new URLSearchParams({ days: String(days) });
  return request(`/stats?${params.toString()}`);
}

export async function saveCheckin(data) {
  return request('/save-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function saveExchange(data) {
  return request('/save-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function unlockMedal(data) {
  return request('/unlock-medal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function buyProtectCard(data) {
  const payload = data == null ? undefined : JSON.stringify(data);
  return request('/buy-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });
}

export async function useProtectCard() {
  return request('/use-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function setWish(data) {
  return request('/set-wish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
