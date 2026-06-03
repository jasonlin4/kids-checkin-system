// 趣味功能完整版规则配置
export const checkInData = [
  { id:1, name:'早读', duration:20, basePoints:2, type:'基础学习', repeatable: false },
  { id:2, name:'计算', duration:15, basePoints:2, type:'基础学习', repeatable: false },
  { id:3, name:'数独', duration:15, basePoints:2, type:'深度学习', repeatable: false },
  { id:4, name:'跳绳', duration:5, basePoints:1, type:'运动习惯', repeatable: false },
  { id:5, name:'练琴', duration:30, basePoints:3, type:'特长练习', repeatable: false },
  { id:6, name:'天天练', duration:25, basePoints:2, type:'基础学习', repeatable: false },
  { id:7, name:'洋葱数学', duration:20, basePoints:2, type:'深度学习', repeatable: false },
  { id:8, name:'数学思维', duration:30, basePoints:3, type:'深度学习', repeatable: false },
  { id:9, name:'课外阅读', duration:30, basePoints:2, type:'深度学习', repeatable: false },
  //{ id:10, name:'2000词', duration:45, basePoints:3, type:'深度学习', repeatable: false },
  { id:11, name:'伴鱼绘本', duration:30, basePoints:3, type:'深度学习', repeatable: false },
  { id:12, name:'万词王', duration:15, basePoints:1, type:'基础学习', repeatable: true },
  { id:13, name:'英语熏听', duration:30, basePoints:2, type:'基础学习', repeatable: true },
  { id:14, name:'1000词', duration:15, basePoints:1, type:'基础学习', repeatable: true },
  { id:15, name:'背单词', duration:15, basePoints:1, type:'基础学习', repeatable: true },
];

// 等级体系
export const levelData = [
  { levelName:'青铜学员', minPoints:0, maxPoints:150, rewardPoints:0, achievement:'成长起步' },
  { levelName:'白银学员', minPoints:151, maxPoints:400, rewardPoints:15, achievement:'坚持小能手' },
  { levelName:'黄金学员', minPoints:401, maxPoints:800, rewardPoints:40, achievement:'自律小达人' },
  { levelName:'铂金学员', minPoints:801, maxPoints:1500, rewardPoints:80, achievement:'学习小标兵' },
  { levelName:'钻石学员', minPoints:1501, maxPoints:3000, rewardPoints:150, achievement:'习惯小冠军' },
  { levelName:'王者学员', minPoints:3001, maxPoints:999999, rewardPoints:300, achievement:'终极小学霸' },
];

// 兑换商店
export const rewardData = [
  { id:'S001', rewardName:'10分钟动画片/游戏时间', requiredPoints:30 },
  { id:'S003', rewardName:'周末公园游玩1次', requiredPoints:300 },
  { id:'S004', rewardName:'1次家庭电影之夜', requiredPoints:100 },
  { id:'S006', rewardName:'小玩具', requiredPoints:300 },
  { id:'S007', rewardName:'周末短途旅行1次', requiredPoints:600 },
  { id:'S008', rewardName:'节日专属大礼物', requiredPoints:800 },
];

export const protectCardCost = 50;

// 勋章成就（自动解锁）
export const medalList = [
  { key:'first_day', name:'初次打卡', desc:'完成第一次打卡' },
  { key:'full_7', name:'全勤达人', desc:'连续7天全部完成' },
  { key:'effi_5', name:'效率之王', desc:'单日5项效率达标' },
  { key:'study_master', name:'学习学霸', desc:'完成所有深度学习任务' },
  { key:'continuous_30', name:'坚持王者', desc:'连续打卡30天' },
  { key:'no_late', name:'自律新星', desc:'单日无超时完成' }
];

// 规则说明
export const ruleData = [
  { title:'一、积分获取', rules:['基础分：运动1分｜学习2分｜深度学习3分','效率达标(≤80%时长)+1分｜全勤+8分'] },
  { title:'二、连续打卡', rules:['7天+10｜30天+80｜100天+300分'] },
  { title:'三、趣味功能', rules:['勋章解锁｜热力日历｜每日彩蛋｜许愿墙｜断签保护卡'] },
  { title:'四、约束规则', rules:['0打卡-5分｜虚假时长取消效率分｜积分稀缺更珍贵'] }
];