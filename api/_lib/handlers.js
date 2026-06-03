const {
  TASK_MAP,
  VALID_TASK_ID_SQL,
  EGG_RULES,
  REWARD_BY_ID,
  REWARD_BY_NAME,
  PROTECT_CARD_COST
} = require('./constants');
const {
  asNonNegativeInteger,
  asPositiveInteger,
  asNonEmptyString,
  clamp,
  toNumber
} = require('./number');
const {
  getDatePartsInZone,
  nowLocalDateTime,
  todayLocalISO,
  getTomorrowLocalISO,
  getYesterdayLocalISO,
  getCurrentMonthRange,
  getRecentDaysStartISO,
  getRecentMonthsStartISO
} = require('./time');
const { computeTaskBasePoints, calculateLevelName, computeEggAwardPlan } = require('./scoring');
const { query, queryOne, withTransaction } = require('./db-helpers');
const { sendJson, sendDbError } = require('./http');
const { getBody } = require('./request');

const sendKnownOrDbError = (res, err) => {
  if (err?.httpStatus && err?.appCode) {
    return sendJson(res, err.httpStatus, { ok: false, error: err.appCode });
  }
  return sendDbError(res, err);
};

const createAppError = (httpStatus, appCode) => {
  const err = new Error(appCode);
  err.httpStatus = httpStatus;
  err.appCode = appCode;
  return err;
};

const normalizeTaskStateRow = (row) => ({
  itemId: Number(row.itemid),
  actualDuration: toNumber(row.actualduration),
  completedAt: row.completedat,
  repeatCount: toNumber(row.repeatcount),
  repeatable: toNumber(row.repeatable)
});

const resolveExchangeReward = ({ rewardId, rewardName }) => {
  if (rewardId) return REWARD_BY_ID.get(rewardId) || null;
  if (rewardName) return REWARD_BY_NAME.get(rewardName) || null;
  return null;
};

const handleLoad = async (req, res) => {
  try {
    const includeAll = req.query?.includeAll === '1';
    const checkinLimit = clamp(asPositiveInteger(req.query?.checkinLimit) || 200, 1, 2000);
    const exchangeLimit = clamp(asPositiveInteger(req.query?.exchangeLimit) || 200, 1, 2000);
    const { monthStart, nextMonthStart } = getCurrentMonthRange();
    const todayDateISO = todayLocalISO();
    const tomorrowDateISO = getTomorrowLocalISO();

    const recordsSql = includeAll
      ? 'SELECT * FROM records ORDER BY id DESC'
      : 'SELECT * FROM records ORDER BY id DESC LIMIT $1';
    const recordsRows = includeAll
      ? (await query(recordsSql)).rows
      : (await query(recordsSql, [checkinLimit])).rows;

    const exchangesSql = includeAll
      ? 'SELECT * FROM exchanges ORDER BY id DESC'
      : 'SELECT * FROM exchanges ORDER BY id DESC LIMIT $1';
    const exchangeRows = includeAll
      ? (await query(exchangesSql)).rows
      : (await query(exchangesSql, [exchangeLimit])).rows;

    const checkinCountRow = await queryOne('SELECT COUNT(*)::int AS count FROM records');
    const exchangeCountRow = await queryOne('SELECT COUNT(*)::int AS count FROM exchanges');
    const calendarRows = (await query(
      `SELECT DISTINCT substring(date from 1 for 10) AS day
       FROM records
       WHERE date >= $1 AND date < $2
       ORDER BY day DESC`,
      [monthStart, nextMonthStart]
    )).rows;
    const todayTaskStates = (await query(
      `SELECT itemId, actualDuration, completedAt, repeatCount, repeatable
       FROM dailyTaskState
       WHERE dateISO = $1
       ORDER BY itemId ASC`,
      [todayDateISO]
    )).rows;
    const todayEggRow = await queryOne(
      `SELECT points, date, sourceItemId
       FROM eggEventsLog
       WHERE dateISO = $1
       ORDER BY id DESC
       LIMIT 1`,
      [todayDateISO]
    );
    const todayEggAggRow = await queryOne(
      `SELECT COALESCE(SUM(points), 0)::int AS totalPoints, COUNT(*)::int AS totalCount
       FROM eggEventsLog
       WHERE dateISO = $1`,
      [todayDateISO]
    );
    const todayPointsRow = await queryOne(
      `SELECT COALESCE(SUM(points), 0)::int AS total
       FROM records
       WHERE date >= $1 AND date < $2`,
      [todayDateISO, tomorrowDateISO]
    );
    const medals = (await query('SELECT * FROM medals ORDER BY id ASC')).rows;
    const card = await queryOne('SELECT count FROM protectCards WHERE id = 1');
    const wish = await queryOne('SELECT rewardName, requiredPoints FROM wish WHERE id = 1');
    const state = await queryOne('SELECT totalPoints, levelPoints, level, continuousDays FROM userState WHERE id = 1');

    const checkInHistory = recordsRows.map((row) => ({
      id: Number(row.id),
      date: row.date,
      points: toNumber(row.points),
      totalPoints: toNumber(row.totalpoints),
      level: row.level,
      continuousDays: toNumber(row.continuousdays)
    }));

    const exchangeHistory = exchangeRows.map((row) => ({
      id: Number(row.id),
      date: row.date,
      rewardName: row.rewardname,
      points: toNumber(row.points)
    }));

    const normalizedTaskStates = todayTaskStates.map((row) => ({
      itemId: Number(row.itemid),
      actualDuration: toNumber(row.actualduration),
      completedAt: row.completedat,
      repeatCount: toNumber(row.repeatcount),
      repeatable: toNumber(row.repeatable)
    }));

    const normalizedMedals = medals.map((row) => ({
      id: Number(row.id),
      key: row.key,
      name: row.name,
      desc: row.desc
    }));

    return sendJson(res, 200, {
      totalPoints: toNumber(state?.totalpoints),
      levelPoints: toNumber(state?.levelpoints ?? state?.totalpoints),
      todayTotalPoints: toNumber(todayPointsRow?.total),
      level: state?.level || '青铜学员',
      continuousDays: toNumber(state?.continuousdays),
      checkInHistory,
      exchangeHistory,
      checkInCount: toNumber(checkinCountRow?.count),
      exchangeCount: toNumber(exchangeCountRow?.count),
      calendarDays: calendarRows.map((row) => row.day),
      todayTaskStates: normalizedTaskStates,
      todayEggTotalPoints: toNumber(todayEggAggRow?.totalpoints),
      todayEggCount: toNumber(todayEggAggRow?.totalcount),
      todayEgg: todayEggRow
        ? {
          points: toNumber(todayEggRow.points),
          date: todayEggRow.date,
          sourceItemId: todayEggRow.sourceitemid == null ? null : Number(todayEggRow.sourceitemid)
        }
        : null,
      medals: normalizedMedals,
      protectCount: toNumber(card?.count),
      wish: wish?.rewardname ? { rewardName: wish.rewardname, requiredPoints: toNumber(wish.requiredpoints) } : null
    });
  } catch (err) {
    return sendDbError(res, err);
  }
};

const handleStats = async (req, res) => {
  try {
    const days = clamp(asPositiveInteger(req.query?.days) || 30, 7, 180);
    const daysStartISO = getRecentDaysStartISO(days);
    const weeksStartISO = getRecentDaysStartISO(84);
    const monthsStartISO = getRecentMonthsStartISO(12);

    const itemRows = (await query(
      `SELECT itemId, SUM(repeatCount)::int AS count
       FROM dailyTaskState
       WHERE dateISO >= $1
       GROUP BY itemId
       ORDER BY count DESC, itemId ASC`,
      [daysStartISO]
    )).rows;
    const dailyRows = (await query(
      `SELECT dateISO AS date, SUM(repeatCount)::int AS count
       FROM dailyTaskState
       WHERE dateISO >= $1
       GROUP BY dateISO
       ORDER BY dateISO ASC`,
      [daysStartISO]
    )).rows;
    const weeklyRows = (await query(
      `SELECT to_char(to_date(dateISO, 'YYYY-MM-DD'), 'IYYY-"W"IW') AS week, SUM(repeatCount)::int AS count
       FROM dailyTaskState
       WHERE dateISO >= $1
       GROUP BY week
       ORDER BY week ASC`,
      [weeksStartISO]
    )).rows;
    const monthlyRows = (await query(
      `SELECT to_char(to_date(dateISO, 'YYYY-MM-DD'), 'YYYY-MM') AS month, SUM(repeatCount)::int AS count
       FROM dailyTaskState
       WHERE dateISO >= $1
       GROUP BY month
       ORDER BY month ASC`,
      [monthsStartISO]
    )).rows;
    const dailyPointsRows = (await query(
      `SELECT substring(date from 1 for 10) AS date, SUM(points)::int AS points
       FROM records
       WHERE date >= $1
       GROUP BY substring(date from 1 for 10)
       ORDER BY substring(date from 1 for 10) ASC`,
      [daysStartISO]
    )).rows;
    const weeklyPointsRows = (await query(
      `SELECT to_char(to_date(substring(date from 1 for 10), 'YYYY-MM-DD'), 'IYYY-"W"IW') AS week, SUM(points)::int AS points
       FROM records
       WHERE date >= $1
       GROUP BY week
       ORDER BY week ASC`,
      [weeksStartISO]
    )).rows;
    const monthlyPointsRows = (await query(
      `SELECT to_char(to_date(substring(date from 1 for 10), 'YYYY-MM-DD'), 'YYYY-MM') AS month, SUM(points)::int AS points
       FROM records
       WHERE date >= $1
       GROUP BY month
       ORDER BY month ASC`,
      [monthsStartISO]
    )).rows;
    const eggDailyRows = (await query(
      `SELECT dateISO AS date, SUM(points)::int AS points, COUNT(*)::int AS count
       FROM eggEventsLog
       WHERE dateISO >= $1
       GROUP BY dateISO
       ORDER BY dateISO ASC`,
      [daysStartISO]
    )).rows;
    const eggWeeklyRows = (await query(
      `SELECT to_char(to_date(dateISO, 'YYYY-MM-DD'), 'IYYY-"W"IW') AS week, SUM(points)::int AS points, COUNT(*)::int AS count
       FROM eggEventsLog
       WHERE dateISO >= $1
       GROUP BY week
       ORDER BY week ASC`,
      [weeksStartISO]
    )).rows;
    const eggMonthlyRows = (await query(
      `SELECT to_char(to_date(dateISO, 'YYYY-MM-DD'), 'YYYY-MM') AS month, SUM(points)::int AS points, COUNT(*)::int AS count
       FROM eggEventsLog
       WHERE dateISO >= $1
       GROUP BY month
       ORDER BY month ASC`,
      [monthsStartISO]
    )).rows;

    const dailyCounts = dailyRows.map((row) => ({ date: row.date, count: toNumber(row.count) }));
    const periodTotal = dailyCounts.reduce((sum, row) => sum + row.count, 0);
    const activeDays = dailyCounts.filter((row) => row.count > 0).length;
    const avgPerDay = days > 0 ? Number((periodTotal / days).toFixed(2)) : 0;

    const dailyPoints = dailyPointsRows.map((row) => ({ date: row.date, points: toNumber(row.points) }));
    const periodPoints = dailyPoints.reduce((sum, row) => sum + row.points, 0);
    const avgPointsPerDay = days > 0 ? Number((periodPoints / days).toFixed(2)) : 0;

    const eggDailyPoints = eggDailyRows.map((row) => ({
      date: row.date,
      points: toNumber(row.points),
      count: toNumber(row.count)
    }));
    const eggPeriodPoints = eggDailyPoints.reduce((sum, row) => sum + row.points, 0);
    const eggHitDays = eggDailyPoints.filter((row) => row.points > 0).length;
    const eggAvgPointsPerDay = days > 0 ? Number((eggPeriodPoints / days).toFixed(2)) : 0;

    return sendJson(res, 200, {
      days,
      fromDate: daysStartISO,
      itemCounts: itemRows.map((row) => ({ itemId: Number(row.itemid), count: toNumber(row.count) })),
      dailyCounts,
      dailyPoints,
      weeklyCounts: weeklyRows.map((row) => ({ week: row.week, count: toNumber(row.count) })),
      weeklyPoints: weeklyPointsRows.map((row) => ({ week: row.week, points: toNumber(row.points) })),
      monthlyCounts: monthlyRows.map((row) => ({ month: row.month, count: toNumber(row.count) })),
      monthlyPoints: monthlyPointsRows.map((row) => ({ month: row.month, points: toNumber(row.points) })),
      eggDailyPoints,
      eggWeeklyPoints: eggWeeklyRows.map((row) => ({ week: row.week, points: toNumber(row.points), count: toNumber(row.count) })),
      eggMonthlyPoints: eggMonthlyRows.map((row) => ({ month: row.month, points: toNumber(row.points), count: toNumber(row.count) })),
      totals: {
        periodTotal,
        activeDays,
        avgPerDay,
        periodPoints,
        avgPointsPerDay
      },
      eggTotals: {
        periodPoints: eggPeriodPoints,
        hitDays: eggHitDays,
        avgPointsPerDay: eggAvgPointsPerDay
      }
    });
  } catch (err) {
    return sendDbError(res, err);
  }
};

const handleSaveCheckin = async (req, res) => {
  const body = getBody(req);
  const itemId = body?.itemId == null ? null : asPositiveInteger(body?.itemId);
  const actualDuration = body?.actualDuration == null ? null : asPositiveInteger(body?.actualDuration);
  const completedAt = body?.completedAt == null ? null : asNonEmptyString(body?.completedAt);
  const repeatCount = body?.repeatCount == null ? null : asPositiveInteger(body?.repeatCount);
  const repeatable = body?.repeatable === true || body?.repeatable === 1 || body?.repeatable === '1';
  const submissionId = asNonEmptyString(body?.submissionId);

  const hasTaskStateFields = [itemId, actualDuration, completedAt, repeatCount].some((value) => value !== null);
  const hasAllTaskStateFields = [itemId, actualDuration, completedAt, repeatCount].every((value) => value !== null);
  if (!hasAllTaskStateFields || hasTaskStateFields !== hasAllTaskStateFields || !submissionId) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_TASK_STATE_PAYLOAD' });
  }

  const taskMeta = TASK_MAP.get(itemId);
  if (!taskMeta) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_ITEM_ID' });
  }
  if (Boolean(taskMeta.repeatable) !== repeatable) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_REPEATABLE_FLAG' });
  }
  if (!repeatable && repeatCount !== 1) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_REPEAT_COUNT' });
  }
  const serverDailyBasePoints = computeTaskBasePoints(taskMeta, actualDuration);

  const date = nowLocalDateTime();
  const dateISO = date.slice(0, 10);
  const tomorrowDateISO = getTomorrowLocalISO();
  const yesterdayDateISO = getYesterdayLocalISO();
  const currentHour = getDatePartsInZone(new Date()).hour;

  try {
    const result = await withTransaction(async (client) => {
      const persistCheckin = async (awardedPoints, eggAccepted, awardedEggCount, resolvedTaskState) => {
        const adjustedDailyPoints = serverDailyBasePoints + awardedPoints;
        const stateRow = (await client.query(
          `SELECT totalPoints, levelPoints, continuousDays
           FROM userState
           WHERE id = 1
           FOR UPDATE`
        )).rows[0];

        const currentTotalPoints = toNumber(stateRow?.totalpoints);
        const currentLevelPoints = toNumber(stateRow?.levelpoints);
        const currentContinuousDays = toNumber(stateRow?.continuousdays);
        const todayRecordRow = (await client.query(
          `SELECT COUNT(1)::int AS count
           FROM records
           WHERE date >= $1 AND date < $2`,
          [dateISO, tomorrowDateISO]
        )).rows[0];
        const todayRecordCount = toNumber(todayRecordRow?.count);
        const previousRecordDayRow = todayRecordCount > 0
          ? null
          : (await client.query(
            `SELECT substring(date from 1 for 10) AS day
             FROM records
             WHERE date < $1
             ORDER BY date DESC
             LIMIT 1`,
            [dateISO]
          )).rows[0];
        const adjustedContinuousDays = todayRecordCount > 0
          ? currentContinuousDays
          : (previousRecordDayRow?.day === yesterdayDateISO ? currentContinuousDays + 1 : 1);
        const streakAdvanced = todayRecordCount === 0;
        const adjustedTotalPoints = currentTotalPoints + adjustedDailyPoints;
        const adjustedLevelPoints = currentLevelPoints + adjustedDailyPoints;
        const adjustedLevel = calculateLevelName(adjustedLevelPoints);

        if (adjustedDailyPoints < 0 || adjustedTotalPoints < 0) {
          throw createAppError(400, 'INVALID_ADJUSTED_POINTS');
        }

        await client.query(
          `INSERT INTO records (date, points, totalPoints, level, continuousDays)
           VALUES ($1, $2, $3, $4, $5)`,
          [date, adjustedDailyPoints, adjustedTotalPoints, adjustedLevel, adjustedContinuousDays]
        );
        await client.query(
          `UPDATE userState
           SET totalPoints = $1, levelPoints = $2, level = $3, continuousDays = $4
           WHERE id = 1`,
          [adjustedTotalPoints, adjustedLevelPoints, adjustedLevel, adjustedContinuousDays]
        );
        return {
          eggAccepted,
          awardedPoints,
          awardedEggCount,
          totalPoints: adjustedTotalPoints,
          levelPoints: adjustedLevelPoints,
          level: adjustedLevel,
          continuousDays: adjustedContinuousDays,
          streakAdvanced,
          taskState: normalizeTaskStateRow(resolvedTaskState)
        };
      };

      let resolvedTaskStateRow;
      if (repeatable) {
        const existingTaskStateRow = (await client.query(
          `SELECT itemId, actualDuration, completedAt, repeatCount, repeatable, lastSubmissionId
           FROM dailyTaskState
           WHERE dateISO = $1 AND itemId = $2
           FOR UPDATE`,
          [dateISO, itemId]
        )).rows[0];

        if (!existingTaskStateRow) {
          resolvedTaskStateRow = (await client.query(
            `INSERT INTO dailyTaskState
              (dateISO, itemId, actualDuration, completedAt, repeatCount, repeatable, updatedAt, lastSubmissionId)
             VALUES ($1, $2, $3, $4, 1, 1, $5, $6)
             RETURNING itemId, actualDuration, completedAt, repeatCount, repeatable`,
            [dateISO, itemId, actualDuration, completedAt, date, submissionId]
          )).rows[0];
        } else {
          const isDuplicateRepeatSubmission = existingTaskStateRow.lastsubmissionid === submissionId
            || completedAt <= (existingTaskStateRow.completedat || '');
          if (isDuplicateRepeatSubmission) {
            return { duplicate: true, eggAccepted: false, awardedPoints: 0, awardedEggCount: 0 };
          }
          resolvedTaskStateRow = (await client.query(
            `UPDATE dailyTaskState
             SET actualDuration = $3,
                 completedAt = $4,
                 repeatCount = repeatCount + 1,
                 repeatable = 1,
                 updatedAt = $5,
                 lastSubmissionId = $6
             WHERE dateISO = $1 AND itemId = $2
             RETURNING itemId, actualDuration, completedAt, repeatCount, repeatable`,
            [dateISO, itemId, actualDuration, completedAt, date, submissionId]
          )).rows[0];
        }
      } else {
        const taskStateResult = await client.query(
          `INSERT INTO dailyTaskState
            (dateISO, itemId, actualDuration, completedAt, repeatCount, repeatable, updatedAt, lastSubmissionId)
           VALUES ($1, $2, $3, $4, 1, 0, $5, $6)
           ON CONFLICT (dateISO, itemId) DO NOTHING
           RETURNING itemId, actualDuration, completedAt, repeatCount, repeatable`,
          [dateISO, itemId, actualDuration, completedAt, date, submissionId]
        );

        if (taskStateResult.rowCount === 0) {
          return { duplicate: true, eggAccepted: false, awardedPoints: 0, awardedEggCount: 0 };
        }
        resolvedTaskStateRow = taskStateResult.rows[0];
      }

      const completionRow = (await client.query(
        `SELECT
           COUNT(*)::int AS uniqueCompleted,
           COALESCE(SUM(
             CASE
               WHEN repeatable = 1 AND repeatCount > 1 THEN repeatCount - 1
               ELSE 0
             END
           ), 0)::int AS repeatExtraUnits
         FROM dailyTaskState
         WHERE dateISO = $1
           AND itemId IN (${VALID_TASK_ID_SQL})`,
        [dateISO]
      )).rows[0];

      const uniqueCompleted = toNumber(completionRow?.uniquecompleted);
      const repeatExtraUnits = toNumber(completionRow?.repeatextraunits);
      const boundedRepeatExtra = Math.min(repeatExtraUnits, EGG_RULES.maxRepeatBonusUnits);
      const completedUnits = uniqueCompleted + boundedRepeatExtra;
      const completionScore = EGG_RULES.totalTaskCount > 0
        ? clamp(completedUnits / EGG_RULES.totalTaskCount, 0, 1)
        : 0;

      const eggTodayRow = (await client.query(
        `SELECT
           COUNT(*)::int AS eventCount,
           COALESCE(SUM(points), 0)::int AS pointTotal,
           COALESCE(SUM(CASE WHEN eventType = 'bonus' THEN 1 ELSE 0 END), 0)::int AS bonusCount
         FROM eggEventsLog
         WHERE dateISO = $1`,
        [dateISO]
      )).rows[0];

      const eggPlan = computeEggAwardPlan({
        completionScore,
        hour: currentHour,
        todayEventCount: toNumber(eggTodayRow?.eventcount),
        todayPoints: toNumber(eggTodayRow?.pointtotal),
        todayBonusCount: toNumber(eggTodayRow?.bonuscount)
      });

      if (eggPlan.points <= 0 || eggPlan.count <= 0) {
        return persistCheckin(0, false, 0, resolvedTaskStateRow);
      }

      for (const eggEvent of eggPlan.events) {
        await client.query(
          `INSERT INTO eggEventsLog (date, dateISO, points, sourceItemId, eventType, createdAt)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [date, dateISO, eggEvent.points, itemId, eggEvent.eventType, date]
        );
      }

      return persistCheckin(eggPlan.points, true, eggPlan.count, resolvedTaskStateRow);
    });

    if (result.duplicate) {
      return sendJson(res, 200, { ok: true, duplicate: true, eggAccepted: false, awardedPoints: 0, awardedEggCount: 0 });
    }

    return sendJson(res, 200, {
      ok: true,
      eggAccepted: Boolean(result.eggAccepted),
      awardedPoints: toNumber(result.awardedPoints),
      awardedEggCount: toNumber(result.awardedEggCount),
      totalPoints: toNumber(result.totalPoints),
      levelPoints: toNumber(result.levelPoints),
      level: result.level,
      continuousDays: toNumber(result.continuousDays),
      streakAdvanced: Boolean(result.streakAdvanced),
      taskState: result.taskState
    });
  } catch (err) {
    return sendKnownOrDbError(res, err);
  }
};

const handleSaveExchange = async (req, res) => {
  const body = getBody(req);
  const rewardId = asNonEmptyString(body?.rewardId);
  const rewardName = asNonEmptyString(body?.rewardName);
  const reward = resolveExchangeReward({ rewardId, rewardName });
  if (!reward) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_REWARD' });
  }
  const date = nowLocalDateTime();

  try {
    const result = await withTransaction(async (client) => {
      const stateRow = (await client.query(
        `SELECT totalPoints
         FROM userState
         WHERE id = 1
         FOR UPDATE`
      )).rows[0];
      const currentTotalPoints = toNumber(stateRow?.totalpoints);
      if (currentTotalPoints < reward.requiredPoints) {
        throw createAppError(400, 'INSUFFICIENT_POINTS');
      }

      const nextTotalPoints = currentTotalPoints - reward.requiredPoints;
      await client.query(
        `INSERT INTO exchanges (date, rewardName, points) VALUES ($1, $2, $3)`,
        [date, reward.rewardName, reward.requiredPoints]
      );
      await client.query(
        `UPDATE userState
         SET totalPoints = $1
         WHERE id = 1`,
        [nextTotalPoints]
      );
      return { totalPoints: nextTotalPoints };
    });

    return sendJson(res, 200, { ok: true, totalPoints: result.totalPoints });
  } catch (err) {
    return sendKnownOrDbError(res, err);
  }
};

const handleUnlockMedal = async (req, res) => {
  const body = getBody(req);
  const key = asNonEmptyString(body?.key);
  const name = asNonEmptyString(body?.name);
  const desc = asNonEmptyString(body?.desc);
  if (!key || !name || !desc) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_PAYLOAD' });
  }

  try {
    await query(
      `INSERT INTO medals (key, name, desc) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [key, name, desc]
    );
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendDbError(res, err);
  }
};

const handleBuyCard = async (req, res) => {
  const date = nowLocalDateTime();
  try {
    const result = await withTransaction(async (client) => {
      const stateRow = (await client.query(
        `SELECT totalPoints
         FROM userState
         WHERE id = 1
         FOR UPDATE`
      )).rows[0];
      const currentTotalPoints = toNumber(stateRow?.totalpoints);
      if (currentTotalPoints < PROTECT_CARD_COST) {
        throw createAppError(400, 'INSUFFICIENT_POINTS');
      }

      const cardUpdate = await client.query('UPDATE protectCards SET count = count + 1 WHERE id = 1');
      if (cardUpdate.rowCount === 0) {
        throw createAppError(500, 'CARD_ROW_MISSING');
      }

      const nextTotalPoints = currentTotalPoints - PROTECT_CARD_COST;
      await client.query('INSERT INTO cardPurchases (date, cost) VALUES ($1, $2)', [date, PROTECT_CARD_COST]);
      await client.query('UPDATE userState SET totalPoints = $1 WHERE id = 1', [nextTotalPoints]);
      return { totalPoints: nextTotalPoints };
    });

    return sendJson(res, 200, { ok: true, totalPoints: result.totalPoints });
  } catch (err) {
    return sendKnownOrDbError(res, err);
  }
};

const handleUseCard = async (_req, res) => {
  try {
    const result = await query(
      `UPDATE protectCards
       SET count = count - 1
       WHERE id = 1 AND count > 0`
    );
    if (result.rowCount === 0) {
      return sendJson(res, 400, { ok: false, error: 'NO_CARD_AVAILABLE' });
    }
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendDbError(res, err);
  }
};

const handleSetWish = async (req, res) => {
  const body = getBody(req);
  const rewardName = asNonEmptyString(body?.rewardName);
  const requiredPoints = asPositiveInteger(body?.requiredPoints);
  if (!rewardName || requiredPoints === null) {
    return sendJson(res, 400, { ok: false, error: 'INVALID_PAYLOAD' });
  }

  try {
    await query(
      `UPDATE wish
       SET rewardName = $1, requiredPoints = $2
       WHERE id = 1`,
      [rewardName, requiredPoints]
    );
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return sendDbError(res, err);
  }
};

module.exports = {
  handleLoad,
  handleStats,
  handleSaveCheckin,
  handleSaveExchange,
  handleUnlockMedal,
  handleBuyCard,
  handleUseCard,
  handleSetWish
};
