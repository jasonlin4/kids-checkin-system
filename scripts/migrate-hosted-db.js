const { pool } = require('../api/_lib/db');

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS records (
        id BIGSERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        points INTEGER NOT NULL,
        totalPoints INTEGER NOT NULL CHECK(totalPoints >= 0),
        level TEXT NOT NULL,
        continuousDays INTEGER NOT NULL CHECK(continuousDays >= 0)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exchanges (
        id BIGSERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        rewardName TEXT NOT NULL,
        points INTEGER NOT NULL CHECK(points > 0)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cardPurchases (
        id BIGSERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        cost INTEGER NOT NULL CHECK(cost > 0)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS medals (
        id BIGSERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        desc TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS protectCards (
        id INTEGER PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0 CHECK(count >= 0)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS wish (
        id INTEGER PRIMARY KEY,
        rewardName TEXT,
        requiredPoints INTEGER CHECK(requiredPoints IS NULL OR requiredPoints > 0)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS userState (
        id INTEGER PRIMARY KEY,
        totalPoints INTEGER NOT NULL DEFAULT 0 CHECK(totalPoints >= 0),
        levelPoints INTEGER NOT NULL DEFAULT 0 CHECK(levelPoints >= 0),
        level TEXT NOT NULL DEFAULT '青铜学员',
        continuousDays INTEGER NOT NULL DEFAULT 0 CHECK(continuousDays >= 0)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dailyTaskState (
        id BIGSERIAL PRIMARY KEY,
        dateISO TEXT NOT NULL,
        itemId INTEGER NOT NULL,
        actualDuration INTEGER NOT NULL CHECK(actualDuration > 0),
        completedAt TEXT NOT NULL,
        repeatCount INTEGER NOT NULL CHECK(repeatCount > 0),
        repeatable INTEGER NOT NULL CHECK(repeatable IN (0, 1)),
        lastSubmissionId TEXT,
        updatedAt TEXT NOT NULL,
        UNIQUE(dateISO, itemId)
      )
    `);
    await client.query(`
      ALTER TABLE dailyTaskState
      ADD COLUMN IF NOT EXISTS lastSubmissionId TEXT
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS eggEvents (
        id BIGSERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        dateISO TEXT NOT NULL UNIQUE,
        points INTEGER NOT NULL CHECK(points > 0),
        sourceItemId INTEGER
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS eggEventsLog (
        id BIGSERIAL PRIMARY KEY,
        legacyEventId BIGINT UNIQUE,
        date TEXT NOT NULL,
        dateISO TEXT NOT NULL,
        points INTEGER NOT NULL CHECK(points > 0),
        sourceItemId INTEGER,
        eventType TEXT NOT NULL DEFAULT 'normal',
        createdAt TEXT NOT NULL
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_records_date ON records(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exchanges_date ON exchanges(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cardPurchases_date ON cardPurchases(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dailyTaskState_dateISO ON dailyTaskState(dateISO)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_eggEventsLog_dateISO ON eggEventsLog(dateISO)`);

    await client.query(`
      INSERT INTO eggEventsLog (legacyEventId, date, dateISO, points, sourceItemId, eventType, createdAt)
      SELECT id, date, dateISO, points, sourceItemId, 'legacy', date
      FROM eggEvents
      ON CONFLICT (legacyEventId) DO NOTHING
    `);

    await client.query(`INSERT INTO protectCards (id, count) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO wish (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
    await client.query(`
      INSERT INTO userState (id, totalPoints, levelPoints, level, continuousDays)
      SELECT
        1,
        GREATEST(
          COALESCE((SELECT SUM(points) FROM records), 0)
          - COALESCE((SELECT SUM(points) FROM exchanges), 0)
          - COALESCE((SELECT SUM(cost) FROM cardPurchases), 0),
          0
        ),
        COALESCE((SELECT SUM(points) FROM records), 0),
        COALESCE((SELECT level FROM records ORDER BY id DESC LIMIT 1), '青铜学员'),
        COALESCE((SELECT continuousDays FROM records ORDER BY id DESC LIMIT 1), 0)
      WHERE NOT EXISTS (SELECT 1 FROM userState WHERE id = 1)
    `);
    await client.query(`DELETE FROM protectCards WHERE id <> 1`);
    await client.query(`DELETE FROM wish WHERE id <> 1`);
    await client.query(`DELETE FROM userState WHERE id <> 1`);
    await client.query(`
      UPDATE protectCards
      SET count = 0
      WHERE count IS NULL OR count < 0
    `);
    await client.query(`
      UPDATE userState
      SET totalPoints = CASE WHEN totalPoints IS NULL OR totalPoints < 0 THEN 0 ELSE totalPoints END,
          levelPoints = CASE WHEN levelPoints IS NULL OR levelPoints < 0 THEN 0 ELSE levelPoints END,
          level = CASE WHEN level IS NULL OR BTRIM(level) = '' THEN '青铜学员' ELSE level END,
          continuousDays = CASE WHEN continuousDays IS NULL OR continuousDays < 0 THEN 0 ELSE continuousDays END
      WHERE id = 1
    `);
    await client.query(`
      UPDATE userState
      SET levelPoints = COALESCE((SELECT SUM(points) FROM records), 0)
      WHERE id = 1 AND (levelPoints IS NULL OR levelPoints = 0)
    `);
    await client.query(`
      UPDATE userState
      SET level = CASE
        WHEN levelPoints >= 3001 THEN '王者学员'
        WHEN levelPoints >= 1501 THEN '钻石学员'
        WHEN levelPoints >= 801 THEN '铂金学员'
        WHEN levelPoints >= 401 THEN '黄金学员'
        WHEN levelPoints >= 151 THEN '白银学员'
        ELSE '青铜学员'
      END
      WHERE id = 1
    `);

    await client.query('COMMIT');
    console.log('✅ Hosted DB migration completed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Hosted DB migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
