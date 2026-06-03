const { LEVEL_DEFINITIONS, EGG_RULES } = require('./constants');
const { clamp } = require('./number');

const computeTaskBasePoints = (task, actualDuration) => {
  const actual = Number(actualDuration);
  const efficiencyBonus = actual > 0 && actual <= task.duration * 0.8 ? 1 : 0;
  return task.basePoints + efficiencyBonus;
};

const calculateLevelName = (points) => {
  const matched = LEVEL_DEFINITIONS.find((level) => points >= level.minPoints && points <= level.maxPoints);
  return matched ? matched.levelName : LEVEL_DEFINITIONS[LEVEL_DEFINITIONS.length - 1].levelName;
};

const getEggTimeBoost = (hour) => {
  if (hour < 9) return 0.24;
  if (hour < 12) return 0.18;
  if (hour < 15) return 0.12;
  if (hour < 18) return 0.08;
  if (hour < 21) return 0.05;
  return 0.02;
};

const computeEggAwardPlan = ({ completionScore, hour, todayEventCount, todayPoints, todayBonusCount }) => {
  if (todayEventCount >= EGG_RULES.maxEventsPerDay || todayPoints >= EGG_RULES.maxPointsPerDay) {
    return { events: [], points: 0, count: 0 };
  }

  const timeBoost = getEggTimeBoost(hour);
  const progressBoost = Math.min(completionScore * 0.22, 0.22);
  let hitChance = 0.03 + timeBoost + progressBoost;
  if (completionScore >= 0.75) {
    hitChance = Math.max(hitChance, 0.72);
  }
  hitChance = clamp(hitChance, 0.03, 0.85);

  if (Math.random() >= hitChance) {
    return { events: [], points: 0, count: 0 };
  }

  const events = [];
  const remainingEventSlots = EGG_RULES.maxEventsPerDay - todayEventCount;
  const remainingPointBudget = EGG_RULES.maxPointsPerDay - todayPoints;
  if (remainingEventSlots <= 0 || remainingPointBudget <= 0) {
    return { events: [], points: 0, count: 0 };
  }

  let normalPoints = Math.random() < 0.65 ? 1 : 2;
  if (normalPoints > remainingPointBudget) {
    normalPoints = remainingPointBudget >= 1 ? 1 : 0;
  }
  if (normalPoints <= 0) {
    return { events: [], points: 0, count: 0 };
  }
  events.push({ points: normalPoints, eventType: 'normal' });

  const budgetAfterNormal = remainingPointBudget - normalPoints;
  const slotsAfterNormal = remainingEventSlots - 1;
  const canAwardBonus = completionScore >= 0.75
    && todayBonusCount < EGG_RULES.maxBonusEventsPerDay
    && slotsAfterNormal > 0
    && budgetAfterNormal >= 2;

  if (canAwardBonus && Math.random() < 0.55) {
    events.push({ points: 2, eventType: 'bonus' });
  }

  const points = events.reduce((sum, item) => sum + item.points, 0);
  return { events, points, count: events.length };
};

module.exports = {
  computeTaskBasePoints,
  calculateLevelName,
  computeEggAwardPlan
};
