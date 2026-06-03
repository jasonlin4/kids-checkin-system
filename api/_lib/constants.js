const TASK_DEFINITIONS = [
  { id: 1, duration: 20, basePoints: 2, repeatable: false },
  { id: 2, duration: 15, basePoints: 2, repeatable: false },
  { id: 3, duration: 15, basePoints: 2, repeatable: false },
  { id: 4, duration: 5, basePoints: 1, repeatable: false },
  { id: 5, duration: 30, basePoints: 3, repeatable: false },
  { id: 6, duration: 25, basePoints: 2, repeatable: false },
  { id: 7, duration: 20, basePoints: 2, repeatable: false },
  { id: 8, duration: 30, basePoints: 3, repeatable: false },
  { id: 9, duration: 30, basePoints: 2, repeatable: false },
  { id: 11, duration: 30, basePoints: 3, repeatable: false },
  { id: 12, duration: 15, basePoints: 1, repeatable: true },
  { id: 13, duration: 30, basePoints: 2, repeatable: true },
  { id: 14, duration: 15, basePoints: 1, repeatable: true },
  { id: 15, duration: 15, basePoints: 1, repeatable: true }
];

const TASK_MAP = new Map(TASK_DEFINITIONS.map((task) => [task.id, task]));
const VALID_TASK_ID_SQL = TASK_DEFINITIONS.map((task) => task.id).join(',');

const LEVEL_DEFINITIONS = [
  { levelName: '青铜学员', minPoints: 0, maxPoints: 150 },
  { levelName: '白银学员', minPoints: 151, maxPoints: 400 },
  { levelName: '黄金学员', minPoints: 401, maxPoints: 800 },
  { levelName: '铂金学员', minPoints: 801, maxPoints: 1500 },
  { levelName: '钻石学员', minPoints: 1501, maxPoints: 3000 },
  { levelName: '王者学员', minPoints: 3001, maxPoints: 999999 }
];

const EGG_RULES = {
  totalTaskCount: TASK_DEFINITIONS.length,
  maxRepeatBonusUnits: 5,
  maxEventsPerDay: 2,
  maxPointsPerDay: 6,
  maxBonusEventsPerDay: 1
};

const REWARD_DEFINITIONS = [
  { id: 'S001', rewardName: '10分钟动画片/游戏时间', requiredPoints: 30 },
  { id: 'S003', rewardName: '周末公园游玩1次', requiredPoints: 300 },
  { id: 'S004', rewardName: '1次家庭电影之夜', requiredPoints: 100 },
  { id: 'S006', rewardName: '小玩具', requiredPoints: 300 },
  { id: 'S007', rewardName: '周末短途旅行1次', requiredPoints: 600 },
  { id: 'S008', rewardName: '节日专属大礼物', requiredPoints: 800 }
];

const REWARD_BY_ID = new Map(REWARD_DEFINITIONS.map((reward) => [reward.id, reward]));
const REWARD_BY_NAME = new Map(REWARD_DEFINITIONS.map((reward) => [reward.rewardName, reward]));
const PROTECT_CARD_COST = 50;

module.exports = {
  TASK_DEFINITIONS,
  TASK_MAP,
  VALID_TASK_ID_SQL,
  LEVEL_DEFINITIONS,
  EGG_RULES,
  REWARD_DEFINITIONS,
  REWARD_BY_ID,
  REWARD_BY_NAME,
  PROTECT_CARD_COST
};
