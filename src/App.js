import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Nav, Tab, Button, Badge, Modal, ProgressBar, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faChartLine, faAward, faStore, faBook, faMedal, faCalendar, faShieldAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import Confetti from 'react-confetti';
import Header from './components/Header';
import DailyCheckIn from './components/DailyCheckIn';
import Stats from './components/Stats';
import LevelSystem from './components/LevelSystem';
import RewardShop from './components/RewardShop';
import RuleBook from './components/RuleBook';
import { checkInData, levelData, rewardData, ruleData, medalList, protectCardCost } from './mockData';
import { loadData, loadStats, saveCheckin, saveExchange, unlockMedal, buyProtectCard, useProtectCard, setWish } from './api';
import { getTodayISO, isYesterday, parseRecordDate } from './dateUtils';

export default function App() {
  const todayDisplay = new Date().toLocaleDateString();
  const todayISO = getTodayISO();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [userData, setUserData] = useState({
    totalPoints: 0,
    levelPoints: 0,
    currentLevel: '青铜学员',
    continuousDays: 0,
    checkInHistory: [],
    exchangeHistory: [],
    checkInCount: 0,
    exchangeCount: 0,
    calendarDays: [],
    medals: [],
    protectCount: 0,
    wish: null
  });
  const [todayTaskStates, setTodayTaskStates] = useState([]);
  const [statsDays, setStatsDays] = useState(30);
  const [statsData, setStatsData] = useState({
    days: 30,
    fromDate: '',
    itemCounts: [],
    dailyCounts: [],
    dailyPoints: [],
    weeklyCounts: [],
    weeklyPoints: [],
    monthlyCounts: [],
    monthlyPoints: [],
    eggDailyPoints: [],
    eggWeeklyPoints: [],
    eggMonthlyPoints: [],
    totals: { periodTotal: 0, activeDays: 0, avgPerDay: 0, periodPoints: 0, avgPointsPerDay: 0 },
    eggTotals: { periodPoints: 0, hitDays: 0, avgPointsPerDay: 0 }
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [key, setKey] = useState('check-in');
  const [todayEgg, setTodayEgg] = useState(0);
  const [modal, setModal] = useState({ show: false, title: '', msg: '' });
  const [taskStateSyncToken, setTaskStateSyncToken] = useState(0);

  const [todayTotalPoints, setTodayTotalPoints] = useState(() => {
    const savedDate = localStorage.getItem('lastPointsDateISO');
    if (savedDate !== todayISO) {
      localStorage.setItem('lastPointsDateISO', todayISO);
      localStorage.setItem('todayTotalPoints', 0);
      return 0;
    }
    return Number(localStorage.getItem('todayTotalPoints')) || 0;
  });

  const userDataRef = useRef(userData);
  const unlockedMedalKeysRef = useRef(new Set());

  const openModal = useCallback((title, msg) => {
    setModal({ show: true, title, msg });
  }, []);
  const applyLoadedData = useCallback((data) => {
    const medals = data.medals || [];
    unlockedMedalKeysRef.current = new Set(medals.map(m => m.key));
    setUserData({
      totalPoints: data.totalPoints,
      levelPoints: data.levelPoints ?? data.totalPoints ?? 0,
      currentLevel: data.level,
      continuousDays: data.continuousDays || 0,
      checkInHistory: data.checkInHistory || [],
      exchangeHistory: data.exchangeHistory || [],
      checkInCount: data.checkInCount ?? data.checkInHistory?.length ?? 0,
      exchangeCount: data.exchangeCount ?? data.exchangeHistory?.length ?? 0,
      calendarDays: data.calendarDays || [],
      medals,
      protectCount: data.protectCount || 0,
      wish: data.wish
    });
    setTodayTotalPoints(Math.max(Number(data.todayTotalPoints) || 0, 0));
    localStorage.setItem('lastPointsDateISO', todayISO);
    setTodayTaskStates(data.todayTaskStates || []);
    setTodayEgg(Number(data.todayEggTotalPoints) || Number(data.todayEgg?.points) || 0);
    setTaskStateSyncToken(prev => prev + 1);
  }, [todayISO]);
  const syncFromServer = useCallback(() => {
    return loadData().then((data) => {
      applyLoadedData(data);
      return data;
    });
  }, [applyLoadedData]);

  useEffect(() => {
    localStorage.setItem('todayTotalPoints', todayTotalPoints);
  }, [todayTotalPoints]);

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  useEffect(() => {
    let mounted = true;
    loadData()
      .then(data => {
        if (!mounted) return;
        applyLoadedData(data);
      })
      .catch(() => {
        openModal('⚠️ 数据加载失败', '请确认后端服务已启动');
      });

    return () => {
      mounted = false;
    };
  }, [applyLoadedData, openModal]);

  useEffect(() => {
    let mounted = true;
    loadStats({ days: statsDays })
      .then(data => {
        if (!mounted) return;
        setStatsData(data);
      })
      .catch((err) => {
        console.warn('加载统计数据失败', err);
      });
    return () => {
      mounted = false;
    };
  }, [statsDays, userData.checkInCount, userData.exchangeCount]);

  const calculateLevel = (points) => {
    return levelData.find(x => points >= x.minPoints && points <= x.maxPoints) || levelData.at(-1);
  };
  const getLocalDateTime = () => {
    const nowDate = new Date();
    const year = nowDate.getFullYear();
    const month = String(nowDate.getMonth() + 1).padStart(2, '0');
    const day = String(nowDate.getDate()).padStart(2, '0');
    const hour = String(nowDate.getHours()).padStart(2, '0');
    const minute = String(nowDate.getMinutes()).padStart(2, '0');
    const second = String(nowDate.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  const checkMedal = useCallback((medalKey) => {
    if (unlockedMedalKeysRef.current.has(medalKey)) return;
    const medal = medalList.find(x => x.key === medalKey);
    if (!medal) return;

    unlockedMedalKeysRef.current.add(medalKey);
    unlockMedal(medal).catch(() => {
      openModal('⚠️ 勋章保存失败', '勋章已在本地显示，稍后请重试同步');
    });
    setUserData(prev => ({ ...prev, medals: [...prev.medals, medal] }));
    openModal('🏅 勋章解锁', `恭喜获得：${medal.name}`);
  }, [openModal]);

  const mergeTaskState = useCallback((states, payload) => {
    const current = Array.isArray(states) ? states : [];
    const nextState = {
      itemId: payload.itemId,
      actualDuration: Number(payload.actualDuration),
      completedAt: payload.completedAt,
      repeatCount: Math.max(Number(payload.repeatCount) || 1, 1),
      repeatable: payload.repeatable ? 1 : 0
    };
    const index = current.findIndex(state => Number(state.itemId) === Number(payload.itemId));
    if (index === -1) return [...current, nextState];

    const oldState = current[index];
    const merged = {
      ...oldState,
      ...nextState,
      repeatCount: payload.repeatable
        ? Math.max(Number(oldState.repeatCount) || 0, Number(nextState.repeatCount) || 0)
        : 1,
      completedAt: (nextState.completedAt || '') > (oldState.completedAt || '')
        ? nextState.completedAt
        : oldState.completedAt
    };
    return current.map((state, i) => (i === index ? merged : state));
  }, []);

  const handleDailyStatusChange = useCallback((status) => {
    if (status.efficientCount >= 5) checkMedal('effi_5');
    if (status.deepLearningCompleted) checkMedal('study_master');
    if (status.allCompleted && status.noLateCompleted) checkMedal('no_late');
  }, [checkMedal]);

  const handleSingleItemComplete = (payload) => {
    const {
      itemId,
      points,
      repeatable = false,
      actualDuration,
      completedAt,
      repeatCount,
      submissionId
    } = payload;
    const currentUserData = userDataRef.current;
    if (!repeatable) {
      const awardDate = localStorage.getItem('awardedItemDate');
      if (awardDate !== todayISO) {
        localStorage.setItem('awardedItemDate', todayISO);
        localStorage.setItem('awardedItemIds', '');
      }

      const awardedIds = (localStorage.getItem('awardedItemIds') || '').split(',').filter(Boolean);
      const idToken = String(itemId);
      if (awardedIds.includes(idToken)) return Promise.resolve({ duplicate: true, duplicateLocal: true });

      awardedIds.push(idToken);
      localStorage.setItem('awardedItemIds', awardedIds.join(','));
    }

    setTodayTaskStates(prevStates => mergeTaskState(prevStates, {
      itemId,
      actualDuration,
      completedAt,
      repeatCount,
      repeatable
    }));

    const finalPoints = points;
    setTodayTotalPoints(prev => prev + finalPoints);

    const lastCheckinISO = localStorage.getItem('lastCheckinISO');
    const checkedToday = lastCheckinISO === todayISO || localStorage.getItem('lastCheckinDate') === todayDisplay;
    let newDays = currentUserData.continuousDays;
    if (!checkedToday) {
      if (lastCheckinISO && isYesterday(lastCheckinISO, todayISO)) {
        newDays += 1;
      } else {
        newDays = 1;
      }
    }

    const recordDateTime = getLocalDateTime();
    const localCheckinKey = `local-${Date.now()}-${itemId}-${Math.random().toString(36).slice(2, 8)}`;
    setUserData(prev => ({
      ...prev,
      totalPoints: prev.totalPoints + finalPoints,
      levelPoints: (prev.levelPoints || 0) + finalPoints,
      currentLevel: calculateLevel((prev.levelPoints || 0) + finalPoints).levelName,
      continuousDays: checkedToday
        ? prev.continuousDays
        : ((lastCheckinISO && isYesterday(lastCheckinISO, todayISO)) ? prev.continuousDays + 1 : 1),
      checkInCount: (prev.checkInCount || 0) + 1,
      checkInHistory: [
        { date: recordDateTime, points: finalPoints, localCheckinKey },
        ...prev.checkInHistory
      ],
      calendarDays: prev.calendarDays.includes(todayISO)
        ? prev.calendarDays
        : [todayISO, ...prev.calendarDays]
    }));
    const savePromise = saveCheckin({
      itemId,
      repeatable,
      actualDuration,
      completedAt,
      repeatCount,
      submissionId
    }).then((saveResult) => {
      if (saveResult?.duplicate) {
        syncFromServer()
          .catch(() => {
            openModal('⚠️ 同步失败', '检测到重复打卡，但刷新数据失败，请手动刷新页面');
          });
        openModal('⚠️ 重复打卡', '该任务今天已记录，已自动同步最新数据');
        return;
      }
      const resolvedTaskState = saveResult?.taskState;
      if (resolvedTaskState) {
        setTodayTaskStates(prevStates => mergeTaskState(prevStates, {
          itemId: resolvedTaskState.itemId,
          actualDuration: resolvedTaskState.actualDuration,
          completedAt: resolvedTaskState.completedAt,
          repeatCount: resolvedTaskState.repeatCount,
          repeatable: Number(resolvedTaskState.repeatable) === 1
        }));
      }

      const awardedPoints = Math.max(Number(saveResult.awardedPoints) || 0, 0);
      const awardedEggCount = Math.max(Number(saveResult.awardedEggCount) || 0, 0);
      const authoritativeTotalPoints = Number(saveResult.totalPoints);
      const authoritativeLevelPoints = Number(saveResult.levelPoints);
      const authoritativeContinuousDays = Number(saveResult.continuousDays);
      const authoritativeLevel = saveResult.level;

      if (saveResult?.streakAdvanced) {
        localStorage.setItem('lastCheckinISO', todayISO);
        localStorage.setItem('lastCheckinDate', todayDisplay);
        checkMedal('first_day');
        if (authoritativeContinuousDays >= 7) checkMedal('full_7');
        if (authoritativeContinuousDays >= 30) checkMedal('continuous_30');
      }

      if (awardedPoints > 0) {
        setTodayEgg(prev => prev + awardedPoints);
        openModal(
          '🎉 幸运彩蛋',
          awardedEggCount > 1
            ? `彩蛋命中 +${awardedPoints} 分（本次获得 ${awardedEggCount} 个彩蛋）`
            : `彩蛋命中 +${awardedPoints} 分！`
        );
        setTodayTotalPoints(prev => Math.max(prev + awardedPoints, 0));
      }

      setUserData(prev => {
        const nextTotalPoints = Math.max(prev.totalPoints + awardedPoints, 0);
        const nextLevelPoints = Math.max((prev.levelPoints || 0) + awardedPoints, 0);
        const nextHistory = [...prev.checkInHistory];
        const historyIndex = nextHistory.findIndex(entry => entry.localCheckinKey === localCheckinKey);
        if (historyIndex >= 0) {
          const target = nextHistory[historyIndex];
          nextHistory[historyIndex] = {
            ...target,
            points: Math.max((Number(target.points) || 0) + awardedPoints, 0)
          };
        }
        return {
          ...prev,
          totalPoints: Number.isFinite(authoritativeTotalPoints) ? authoritativeTotalPoints : nextTotalPoints,
          levelPoints: Number.isFinite(authoritativeLevelPoints) ? authoritativeLevelPoints : nextLevelPoints,
          currentLevel: authoritativeLevel || calculateLevel(nextLevelPoints).levelName,
          continuousDays: Number.isFinite(authoritativeContinuousDays) ? authoritativeContinuousDays : prev.continuousDays,
          checkInHistory: nextHistory
        };
      });
    }).catch(() => {
      if (!repeatable) {
        const awardedIds = (localStorage.getItem('awardedItemIds') || '').split(',').filter(Boolean);
        const idToken = String(itemId);
        const nextAwardedIds = awardedIds.filter(token => token !== idToken);
        localStorage.setItem('awardedItemIds', nextAwardedIds.join(','));
      }
      syncFromServer()
        .then(() => {
          openModal('⚠️ 保存失败', '已自动恢复到服务器数据，请重试打卡');
        })
        .catch(() => {
          openModal('⚠️ 保存失败', '保存和同步都失败，请刷新页面后重试');
        });
    });

    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
    return savePromise;
  };

  const handleExchange = (reward) => {
    const currentUserData = userDataRef.current;
    if (currentUserData.totalPoints < reward.requiredPoints) {
      openModal('❌ 积分不足', '继续努力打卡吧！');
      return;
    }

    const exchangeEntry = {
      date: getLocalDateTime(),
      rewardName: reward.rewardName,
      points: reward.requiredPoints
    };

    setUserData(prev => ({
      ...prev,
      totalPoints: Math.max(prev.totalPoints - reward.requiredPoints, 0),
      exchangeHistory: [exchangeEntry, ...prev.exchangeHistory],
      exchangeCount: (prev.exchangeCount || 0) + 1
    }));

    saveExchange({
      rewardId: reward.id,
      rewardName: exchangeEntry.rewardName
    }).catch(() => {
      syncFromServer()
        .then(() => {
          openModal('⚠️ 兑换同步失败', '兑换未成功，已恢复为服务器数据');
        })
        .catch(() => {
          openModal('⚠️ 兑换同步失败', '兑换失败且同步失败，请刷新页面');
        });
    });

    openModal('🎁 兑换成功', `已兑换：${reward.rewardName}`);
  };

  const buyCard = () => {
    const currentUserData = userDataRef.current;
    const cost = protectCardCost;
    if (currentUserData.totalPoints < cost) {
      openModal('❌ 积分不足', `需要${cost}积分`);
      return;
    }

    setUserData(prev => ({
      ...prev,
      totalPoints: Math.max(prev.totalPoints - cost, 0),
      protectCount: prev.protectCount + 1
    }));

    buyProtectCard().catch(() => {
      syncFromServer()
        .then(() => {
          openModal('⚠️ 购买同步失败', '购买未成功，已恢复为服务器数据');
        })
        .catch(() => {
          openModal('⚠️ 购买同步失败', '购买失败且同步失败，请刷新页面');
        });
    });

    openModal('✅ 购买成功', '断签保护卡 +1');
  };

  const useCard = () => {
    const currentUserData = userDataRef.current;
    if (currentUserData.protectCount <= 0) {
      openModal('❌ 无可用保护卡', '请先购买保护卡');
      return;
    }

    setUserData({
      ...currentUserData,
      protectCount: currentUserData.protectCount - 1
    });

    useProtectCard().then(() => {
      openModal('🛡️ 使用成功', '已使用1张断签保护卡');
    }).catch((err) => {
      setUserData(prev => ({ ...prev, protectCount: prev.protectCount + 1 }));
      if (String(err.message).includes('NO_CARD_AVAILABLE')) {
        openModal('❌ 使用失败', '当前没有可用保护卡');
        return;
      }
      openModal('⚠️ 使用同步失败', '已回滚本地扣减，请稍后重试');
    });
  };

  const makeWish = (item) => {
    const currentUserData = userDataRef.current;
    setUserData({ ...currentUserData, wish: item });
    setWish(item).catch(() => {
      openModal('⚠️ 许愿同步失败', '许愿已在本地生效，稍后请重试同步');
    });
    openModal('✨ 许愿成功', `目标：${item.rewardName}`);
  };

  const currentLevelInfo = calculateLevel(userData.levelPoints || 0);
  const levelRange = currentLevelInfo.maxPoints - currentLevelInfo.minPoints;
  const levelProgress = levelRange === 0
    ? 100
    : (((userData.levelPoints || 0) - currentLevelInfo.minPoints) / levelRange) * 100;

  const checkedInDays = useMemo(() => {
    const days = new Set();
    if (Array.isArray(userData.calendarDays) && userData.calendarDays.length > 0) {
      userData.calendarDays.forEach(dayString => {
        const parsed = parseRecordDate(dayString);
        if (parsed && parsed.year === currentYear && parsed.month === currentMonth) {
          days.add(parsed.day);
        }
      });
      return days;
    }

    userData.checkInHistory.forEach(entry => {
      const parsed = parseRecordDate(entry.date);
      if (parsed && parsed.year === currentYear && parsed.month === currentMonth) {
        days.add(parsed.day);
      }
    });
    return days;
  }, [currentMonth, currentYear, userData.calendarDays, userData.checkInHistory]);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  return (
    <div className="App">
      {showConfetti && <Confetti recycle={false} numberOfPieces={400} gravity={0.2} />}
      <Header userData={userData} currentLevelInfo={currentLevelInfo} levelProgress={levelProgress} />

      <Container className="my-4">
        <div className="d-flex gap-2 flex-wrap mb-3 justify-content-center">
          <Badge bg="primary" className="p-2">🏅 勋章：{userData.medals.length}</Badge>
          <Badge bg="warning" className="p-2">🛡️ 保护卡：{userData.protectCount}</Badge>
          <Badge bg="success" className="p-2">⭐ 今日积分：{todayTotalPoints}</Badge>
          <Button size="sm" variant="outline-danger" onClick={buyCard}>{protectCardCost}分购保护卡</Button>
          <Button size="sm" variant="outline-success" onClick={useCard}>
            <FontAwesomeIcon icon={faShieldAlt} className="me-1" />
            使用保护卡
          </Button>
        </div>

        {userData.wish && (
          <Card className="mb-3 border-success">
            <Card.Body className="text-center">
              <h5>✨ 我的许愿</h5>
              <h6>{userData.wish.rewardName}</h6>
              <ProgressBar
                now={(userData.totalPoints / userData.wish.requiredPoints) * 100}
                label={`${userData.totalPoints}/${userData.wish.requiredPoints}`}
              />
            </Card.Body>
          </Card>
        )}

        <Tab.Container activeKey={key} onSelect={setKey}>
          <Nav variant="pills" className="flex-column flex-md-row mb-4 justify-content-center gap-2">
            <Nav.Item><Nav.Link eventKey="check-in"><FontAwesomeIcon icon={faCalendarCheck} />每日打卡</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="stats"><FontAwesomeIcon icon={faChartLine} />统计</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="medal"><FontAwesomeIcon icon={faMedal} />勋章</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="calendar"><FontAwesomeIcon icon={faCalendar} />日历</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="level"><FontAwesomeIcon icon={faAward} />等级</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="shop"><FontAwesomeIcon icon={faStore} />商店</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="rules"><FontAwesomeIcon icon={faBook} />规则</Nav.Link></Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="check-in">
              <DailyCheckIn
                checkInData={checkInData}
                onSingleItemComplete={handleSingleItemComplete}
                onDailyStatusChange={handleDailyStatusChange}
                initialTaskStates={todayTaskStates}
                forceServerSyncToken={taskStateSyncToken}
              />
            </Tab.Pane>

            <Tab.Pane eventKey="stats">
              <Stats
                userData={userData}
                checkInData={checkInData}
                statsData={statsData}
                statsDays={statsDays}
                onChangeStatsDays={setStatsDays}
              />
            </Tab.Pane>
            <Tab.Pane eventKey="medal">
              <h3>🏅 我的勋章</h3>
              <Row className="mt-3">{medalList.map(m => (
                <Col md={4} key={m.key} className="mb-3">
                  <Card bg={userData.medals.some(x => x.key === m.key) ? 'success' : 'light'}>
                    <Card.Body className="text-center">
                      <FontAwesomeIcon icon={faMedal} size="2x" />
                      <h5>{m.name}</h5>
                      <p className="small">{m.desc}</p>
                    </Card.Body>
                  </Card>
                </Col>
              ))}</Row>
            </Tab.Pane>
            <Tab.Pane eventKey="calendar">
              <h3>📅 打卡热力日历</h3>
              <div className="mt-3 p-3 border rounded bg-light">
                {new Array(daysInMonth).fill(0).map((_, i) => {
                  const day = i + 1;
                  const hasCheckin = checkedInDays.has(day);
                  return (
                    <div
                      key={day}
                      className={`d-inline-block m-1 p-2 rounded ${hasCheckin ? 'bg-success text-white' : 'bg-secondary'}`}
                      style={{ width: '40px', height: '40px' }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </Tab.Pane>
            <Tab.Pane eventKey="level">
              <LevelSystem
                levelData={levelData}
                currentLevelInfo={currentLevelInfo}
                levelProgress={levelProgress}
                userPoints={userData.levelPoints || 0}
              />
            </Tab.Pane>
            <Tab.Pane eventKey="shop">
              <RewardShop
                rewardData={rewardData}
                userPoints={userData.totalPoints}
                onExchange={handleExchange}
                exchangeHistory={userData.exchangeHistory}
              />
              <div className="mt-3">
                <h5>✨ 设置许愿目标</h5>
                <div className="d-flex gap-2 flex-wrap mt-2">
                  {rewardData.map(item => (
                    <Button key={item.id} size="sm" variant="outline-primary" onClick={() => makeWish(item)}>
                      <FontAwesomeIcon icon={faStar} /> {item.rewardName}
                    </Button>
                  ))}
                </div>
              </div>
            </Tab.Pane>
            <Tab.Pane eventKey="rules"><RuleBook ruleData={ruleData} /></Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>

      <Modal show={modal.show} onHide={() => setModal({ ...modal, show: false })} centered>
        <Modal.Header closeButton><Modal.Title>{modal.title}</Modal.Title></Modal.Header>
        <Modal.Body><h5 className="text-center">{modal.msg}</h5></Modal.Body>
      </Modal>
    </div>
  );
}
