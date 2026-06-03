const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Shanghai';

const pad2 = (num) => String(num).padStart(2, '0');
const formatDateISO = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`;

const getDatePartsInZone = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
    second: Number(partMap.second)
  };
};

const nowLocalDateTime = () => {
  const part = getDatePartsInZone(new Date());
  return `${formatDateISO(part.year, part.month, part.day)} ${pad2(part.hour)}:${pad2(part.minute)}:${pad2(part.second)}`;
};

const todayLocalISO = () => nowLocalDateTime().slice(0, 10);

const shiftISODate = (iso, deltaDays) => {
  const [year, month, day] = iso.split('-').map((value) => Number(value));
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return formatDateISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
};

const getTomorrowLocalISO = () => shiftISODate(todayLocalISO(), 1);
const getYesterdayLocalISO = () => shiftISODate(todayLocalISO(), -1);

const getCurrentMonthRange = () => {
  const part = getDatePartsInZone(new Date());
  const monthStart = formatDateISO(part.year, part.month, 1);
  const nextMonthDate = new Date(Date.UTC(part.year, part.month - 1, 1));
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const nextMonthStart = formatDateISO(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1, 1);
  return { monthStart, nextMonthStart };
};

const getRecentDaysStartISO = (days) => shiftISODate(todayLocalISO(), -(days - 1));

const getRecentMonthsStartISO = (months) => {
  const part = getDatePartsInZone(new Date());
  const dt = new Date(Date.UTC(part.year, part.month - 1, 1));
  dt.setUTCMonth(dt.getUTCMonth() - (months - 1));
  return formatDateISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1);
};

module.exports = {
  APP_TIMEZONE,
  getDatePartsInZone,
  nowLocalDateTime,
  todayLocalISO,
  shiftISODate,
  getTomorrowLocalISO,
  getYesterdayLocalISO,
  getCurrentMonthRange,
  getRecentDaysStartISO,
  getRecentMonthsStartISO
};
