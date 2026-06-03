const asInteger = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
};

const asNonNegativeInteger = (value) => {
  const num = asInteger(value);
  return num !== null && num >= 0 ? num : null;
};

const asPositiveInteger = (value) => {
  const num = asInteger(value);
  return num !== null && num > 0 ? num : null;
};

const asNonEmptyString = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toNumber = (value) => Number(value) || 0;

module.exports = {
  asInteger,
  asNonNegativeInteger,
  asPositiveInteger,
  asNonEmptyString,
  clamp,
  toNumber
};
