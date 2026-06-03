export const getTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseISODate = (value) => {
  if (typeof value !== 'string') return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
};

export const isYesterday = (lastDateISO, todayISO) => {
  const lastDate = parseISODate(lastDateISO);
  const todayDate = parseISODate(todayISO);
  if (!lastDate || !todayDate) return false;
  const diffMs = todayDate - lastDate;
  return diffMs === 24 * 60 * 60 * 1000;
};

export const parseRecordDate = (rawDate) => {
  if (typeof rawDate !== 'string') return null;
  const value = rawDate.trim();
  if (!value) return null;
  const dateOnly = value.split(/[ T]/)[0];
  if (!dateOnly) return null;

  const separator = dateOnly.includes('-') ? '-' : (dateOnly.includes('/') ? '/' : null);
  if (!separator) return null;

  const rawParts = dateOnly.split(separator);
  const nums = rawParts.map(Number);
  if (nums.length !== 3 || nums.some(Number.isNaN)) return null;

  let year;
  let month;
  let day;

  if (rawParts[0].length === 4) {
    [year, month, day] = nums;
  } else if (rawParts[2].length === 4) {
    year = nums[2];
    if (nums[0] > 12 && nums[1] <= 12) {
      day = nums[0];
      month = nums[1];
    } else {
      month = nums[0];
      day = nums[1];
    }
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
};
