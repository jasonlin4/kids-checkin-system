import React, { useMemo } from 'react';
import { Card, Row, Col, Table, Button } from 'react-bootstrap';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCalendarWeek, faCalendar, faFire } from '@fortawesome/free-solid-svg-icons';

const PERIOD_OPTIONS = [7, 30, 90];

const formatISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMMDD = (isoDate) => {
  if (typeof isoDate !== 'string') return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[1]}-${parts[2]}`;
};

const buildDailySeries = (days, rawDailyCounts = [], rawDailyPoints = [], rawEggDailyPoints = []) => {
  const countMap = new Map(rawDailyCounts.map(item => [item.date, Number(item.count) || 0]));
  const pointsMap = new Map(rawDailyPoints.map(item => [item.date, Number(item.points) || 0]));
  const eggPointsMap = new Map(rawEggDailyPoints.map(item => [item.date, Number(item.points) || 0]));
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const offset = days - 1 - index;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const iso = formatISODate(date);
    return {
      label: formatMMDD(iso),
      count: countMap.get(iso) || 0,
      points: pointsMap.get(iso) || 0,
      eggPoints: eggPointsMap.get(iso) || 0
    };
  });
};
const buildPeriodSeries = (rawCounts = [], rawPoints = []) => {
  const countMap = new Map(rawCounts.map(item => [item.label, Number(item.count) || 0]));
  const pointsMap = new Map(rawPoints.map(item => [item.label, Number(item.points) || 0]));
  const labels = Array.from(new Set([...countMap.keys(), ...pointsMap.keys()])).sort();
  return labels.map(label => ({
    label,
    count: countMap.get(label) || 0,
    points: pointsMap.get(label) || 0
  }));
};

export default function Stats({ userData, checkInData, statsData, statsDays, onChangeStatsDays }) {
  const checkInCount = userData.checkInCount ?? userData.checkInHistory.length;
  const exchangeCount = userData.exchangeCount ?? userData.exchangeHistory.length;

  const taskMetaMap = useMemo(() => {
    const map = new Map();
    (checkInData || []).forEach(task => map.set(Number(task.id), {
      name: task.name,
      points: Number(task.basePoints ?? task.points) || 0
    }));
    return map;
  }, [checkInData]);

  const itemChartData = useMemo(() => {
    const rows = (statsData?.itemCounts || []).map(item => {
      const taskMeta = taskMetaMap.get(Number(item.itemId));
      const count = Number(item.count) || 0;
      return {
        name: taskMeta?.name || `任务${item.itemId}`,
        count,
        points: count * (taskMeta?.points || 0)
      };
    });
    return rows.sort((a, b) => b.count - a.count).slice(0, 12);
  }, [statsData?.itemCounts, taskMetaMap]);

  const dailySeries = useMemo(
    () => buildDailySeries(
      statsDays,
      statsData?.dailyCounts || [],
      statsData?.dailyPoints || [],
      statsData?.eggDailyPoints || []
    ),
    [statsData?.dailyCounts, statsData?.dailyPoints, statsData?.eggDailyPoints, statsDays]
  );

  const weeklyCountSeries = useMemo(
    () => (statsData?.weeklyCounts || []).map(item => ({
      label: item.week,
      count: Number(item.count) || 0
    })),
    [statsData?.weeklyCounts]
  );
  const weeklyPointsSeries = useMemo(
    () => (statsData?.weeklyPoints || []).map(item => ({
      label: item.week,
      points: Number(item.points) || 0
    })),
    [statsData?.weeklyPoints]
  );
  const weeklySeries = useMemo(
    () => buildPeriodSeries(weeklyCountSeries, weeklyPointsSeries),
    [weeklyCountSeries, weeklyPointsSeries]
  );

  const monthlyCountSeries = useMemo(
    () => (statsData?.monthlyCounts || []).map(item => ({
      label: item.month,
      count: Number(item.count) || 0
    })),
    [statsData?.monthlyCounts]
  );
  const monthlyPointsSeries = useMemo(
    () => (statsData?.monthlyPoints || []).map(item => ({
      label: item.month,
      points: Number(item.points) || 0
    })),
    [statsData?.monthlyPoints]
  );
  const monthlySeries = useMemo(
    () => buildPeriodSeries(monthlyCountSeries, monthlyPointsSeries),
    [monthlyCountSeries, monthlyPointsSeries]
  );
  const weeklyEggSeries = useMemo(
    () => (statsData?.eggWeeklyPoints || []).map(item => ({
      label: item.week,
      points: Number(item.points) || 0
    })),
    [statsData?.eggWeeklyPoints]
  );
  const monthlyEggSeries = useMemo(
    () => (statsData?.eggMonthlyPoints || []).map(item => ({
      label: item.month,
      points: Number(item.points) || 0
    })),
    [statsData?.eggMonthlyPoints]
  );

  const periodTotal = statsData?.totals?.periodTotal || 0;
  const activeDays = statsData?.totals?.activeDays || 0;
  const avgPerDay = statsData?.totals?.avgPerDay || 0;
  const periodPoints = statsData?.totals?.periodPoints || 0;
  const avgPointsPerDay = statsData?.totals?.avgPointsPerDay || 0;
  const eggPeriodPoints = statsData?.eggTotals?.periodPoints || 0;
  const eggHitDays = statsData?.eggTotals?.hitDays || 0;
  const eggAvgPointsPerDay = statsData?.eggTotals?.avgPointsPerDay || 0;

  return (
    <div>
      <h2 className="fw-bold text-primary mb-4">积分统计</h2>
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="card-hover h-100">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faTrophy} size="3x" className="text-primary mb-2" />
              <h5>可用积分</h5>
              <h3>{userData.totalPoints}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="card-hover h-100">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faCalendarWeek} size="3x" className="text-success mb-2" />
              <h5>连续天数</h5>
              <h3>{userData.continuousDays}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="card-hover h-100">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faCalendar} size="3x" className="text-warning mb-2" />
              <h5>打卡次数</h5>
              <h3>{checkInCount}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card className="card-hover h-100">
            <Card.Body className="text-center">
              <FontAwesomeIcon icon={faFire} size="3x" className="text-danger mb-2" />
              <h5>兑换次数</h5>
              <h3>{exchangeCount}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0">打卡表现图表</h5>
            <div className="d-flex gap-2">
              {PERIOD_OPTIONS.map(days => (
                <Button
                  key={days}
                  size="sm"
                  variant={statsDays === days ? 'primary' : 'outline-primary'}
                  onClick={() => onChangeStatsDays(days)}
                >
                  最近{days}天
                </Button>
              ))}
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={4}>
              <div className="text-center">
                <div className="text-muted small">区间总打卡次数</div>
                <div className="fs-4 fw-bold text-primary">{periodTotal}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center">
                <div className="text-muted small">活跃天数</div>
                <div className="fs-4 fw-bold text-success">{activeDays}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center">
                <div className="text-muted small">日均打卡次数</div>
                <div className="fs-4 fw-bold text-warning">{avgPerDay}</div>
              </div>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md={6}>
              <div className="text-center">
                <div className="text-muted small">区间总积分</div>
                <div className="fs-4 fw-bold text-primary">{periodPoints}</div>
              </div>
            </Col>
            <Col md={6}>
              <div className="text-center">
                <div className="text-muted small">日均积分</div>
                <div className="fs-4 fw-bold text-success">{avgPointsPerDay}</div>
              </div>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md={4}>
              <div className="text-center">
                <div className="text-muted small">彩蛋总积分</div>
                <div className="fs-4 fw-bold text-danger">{eggPeriodPoints}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center">
                <div className="text-muted small">彩蛋触发天数</div>
                <div className="fs-4 fw-bold text-info">{eggHitDays}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-center">
                <div className="text-muted small">彩蛋日均积分</div>
                <div className="fs-4 fw-bold text-secondary">{eggAvgPointsPerDay}</div>
              </div>
            </Col>
          </Row>

          <h6 className="fw-bold mb-3">各任务打卡次数/积分（最近{statsDays}天，积分为估算不含彩蛋）</h6>
          <div style={{ width: '100%', height: 280 }} className="mb-4">
            <ResponsiveContainer>
              <BarChart data={itemChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="打卡次数" fill="#198754" />
                <Bar dataKey="points" name="积分" fill="#0d6efd" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h6 className="fw-bold mb-3">每日打卡/积分趋势（最近{statsDays}天）</h6>
          <div style={{ width: '100%', height: 280 }} className="mb-4">
            <ResponsiveContainer>
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="每日打卡次数" stroke="#198754" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="points" name="每日积分" stroke="#0d6efd" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <h6 className="fw-bold mb-3">每日彩蛋积分趋势（最近{statsDays}天）</h6>
          <div style={{ width: '100%', height: 240 }} className="mb-4">
            <ResponsiveContainer>
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="eggPoints" stroke="#dc3545" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h6 className="fw-bold mb-3">每周打卡/积分趋势（最近12周）</h6>
          <div style={{ width: '100%', height: 260 }} className="mb-4">
            <ResponsiveContainer>
              <LineChart data={weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="每周打卡次数" stroke="#198754" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="points" name="每周积分" stroke="#0d6efd" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <h6 className="fw-bold mb-3">每周彩蛋积分趋势（最近12周）</h6>
          <div style={{ width: '100%', height: 220 }} className="mb-4">
            <ResponsiveContainer>
              <LineChart data={weeklyEggSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="points" stroke="#0dcaf0" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h6 className="fw-bold mb-3">每月打卡/积分趋势（最近12个月）</h6>
          <div style={{ width: '100%', height: 260 }} className="mb-4">
            <ResponsiveContainer>
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="每月打卡次数" stroke="#198754" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="points" name="每月积分" stroke="#0d6efd" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <h6 className="fw-bold mb-3">每月彩蛋积分趋势（最近12个月）</h6>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={monthlyEggSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="points" stroke="#6610f2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header><h5>最近打卡记录</h5></Card.Header>
        <Card.Body>
          <Table hover>
            <tbody>
              {userData.checkInHistory.slice().reverse().map((d, i) => (
                <tr key={i}>
                  <td>{d.date}</td>
                  <td className="text-success fw-bold">+{d.points} 分</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
