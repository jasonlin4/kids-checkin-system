import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Button, Modal, Form, Spinner } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock, faStar, faTasks } from '@fortawesome/free-solid-svg-icons';
import { getTodayISO } from '../dateUtils';

export default function DailyCheckIn({ checkInData, onSingleItemComplete, onDailyStatusChange, initialTaskStates = [], forceServerSyncToken = 0 }) {
  const totalItems = checkInData.length;
  const todayISO = getTodayISO();
  const CUSTOM_DURATION_VALUE = '__custom_duration__';
  const selectMenuPortalTarget = typeof document !== 'undefined' ? document.body : null;
  const getDurationBounds = (standardDuration) => {
    const center = Math.max(Number(standardDuration) || 1, 1);
    const minDuration = Math.max(center - 5, 1);
    const maxDuration = Math.max(center + 5, minDuration);
    return { minDuration, maxDuration };
  };
  const createEmptyItems = () => checkInData.map(i => ({
    ...i,
    repeatable: Boolean(i.repeatable),
    isCompleted: false,
    repeatCount: 0,
    actualDuration: String(i.duration),
    completedAt: ''
  }));
  const normalizeItems = (parsedItems) => checkInData.map(template => {
    const savedItem = parsedItems.find(item => item.id === template.id) || {};
    const savedDuration = savedItem.actualDuration;
    const repeatCount = Math.max(0, Number(savedItem.repeatCount) || 0);
    return {
      ...template,
      repeatable: Boolean(template.repeatable),
      isCompleted: Boolean(savedItem.isCompleted) || repeatCount > 0,
      repeatCount,
      actualDuration: savedDuration === '' || savedDuration == null ? String(template.duration) : String(savedDuration),
      completedAt: savedItem.completedAt || ''
    };
  });
  const mergeWithTaskStates = (baseItems, taskStates) => {
    if (!Array.isArray(taskStates) || taskStates.length === 0) return baseItems;
    return baseItems.map(item => {
      const remote = taskStates.find(state => Number(state.itemId) === Number(item.id));
      if (!remote) return item;

      const localRepeat = Math.max(0, Number(item.repeatCount) || 0);
      const remoteRepeat = Math.max(0, Number(remote.repeatCount) || 0);
      const mergedRepeat = item.repeatable ? Math.max(localRepeat, remoteRepeat) : (localRepeat > 0 || remoteRepeat > 0 ? 1 : 0);
      const remoteDuration = Number(remote.actualDuration);
      const mergedDuration = Number.isInteger(remoteDuration) && remoteDuration > 0
        ? String(remoteDuration)
        : item.actualDuration;
      const localCompletedAt = item.completedAt || '';
      const remoteCompletedAt = typeof remote.completedAt === 'string' ? remote.completedAt : '';
      const mergedCompletedAt = remoteCompletedAt > localCompletedAt ? remoteCompletedAt : localCompletedAt;

      return {
        ...item,
        isCompleted: item.repeatable ? mergedRepeat > 0 : (item.isCompleted || mergedRepeat > 0),
        repeatCount: mergedRepeat,
        actualDuration: mergedDuration,
        completedAt: mergedCompletedAt
      };
    });
  };

  // 跨日自动重置
  const [items, setItems] = useState(() => {
    const savedDate = localStorage.getItem('lastCheckinPageDateISO');
    const saved = localStorage.getItem('todayCheckinItems');

    if (savedDate !== todayISO) {
      localStorage.setItem('lastCheckinPageDateISO', todayISO);
      localStorage.removeItem('todayCheckinItems');
      return createEmptyItems();
    }

    if (!saved) return createEmptyItems();

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? mergeWithTaskStates(normalizeItems(parsed), initialTaskStates) : createEmptyItems();
    } catch (err) {
      console.warn('todayCheckinItems 格式异常，已重置', err);
      return createEmptyItems();
    }
  });
  const [customDurationDialog, setCustomDurationDialog] = useState({
    show: false,
    itemId: null,
    value: '',
    error: ''
  });
  const [pendingItemIds, setPendingItemIds] = useState({});
  const hasCheckedIn = (item) => item.repeatable ? (item.repeatCount || 0) > 0 : Boolean(item.isCompleted);
  const isSubmitting = (itemId) => Boolean(pendingItemIds[itemId]);

  const buildDailyStatus = useCallback((list) => {
    const completedItems = list.filter(i => i.repeatable ? (i.repeatCount || 0) > 0 : i.isCompleted);
    const completedCount = completedItems.length;
    const efficientCount = completedItems.filter(i => {
      const actual = Number(i.actualDuration);
      return actual > 0 && actual <= i.duration * 0.8;
    }).length;

    const deepLearningItems = list.filter(i => i.type === '深度学习');
    const deepLearningCompleted = deepLearningItems.length > 0
      && deepLearningItems.every(i => i.repeatable ? (i.repeatCount || 0) > 0 : i.isCompleted);
    const allCompleted = completedCount === totalItems;
    const noLateCompleted = allCompleted && completedItems.every(i => Number(i.actualDuration) > 0 && Number(i.actualDuration) <= i.duration);

    return {
      completedCount,
      efficientCount,
      deepLearningCompleted,
      allCompleted,
      noLateCompleted
    };
  }, [totalItems]);

  useEffect(() => {
    localStorage.setItem('todayCheckinItems', JSON.stringify(items));
    if (onDailyStatusChange) {
      onDailyStatusChange(buildDailyStatus(items));
    }
  }, [items, onDailyStatusChange, buildDailyStatus]);

  useEffect(() => {
    if (!Array.isArray(initialTaskStates) || initialTaskStates.length === 0) return;
    setItems(prevItems => mergeWithTaskStates(prevItems, initialTaskStates));
  }, [initialTaskStates]);

  useEffect(() => {
    if (!forceServerSyncToken) return;
    setItems(mergeWithTaskStates(createEmptyItems(), initialTaskStates));
  }, [forceServerSyncToken, initialTaskStates]);

  const completedCount = items.filter(hasCheckedIn).length;
  const progress = (completedCount / totalItems) * 100;

  const calcItemPoints = (item) => {
    let points = item.basePoints;
    const actual = Number(item.actualDuration);
    const standard = item.duration;
    if (actual > 0 && actual <= standard * 0.8) points += 1;
    return points;
  };

  // 校验用时是否有效
  const isValidDuration = (value) => {
    const num = parseInt(value);
    return !isNaN(num) && num > 0;
  };

  // 获取精确打卡时间
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    const millisecond = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
  };
  const createSubmissionId = (itemId) => `checkin-${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // 切换完成状态
  const toggleComplete = async (itemId) => {
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem) return;
    if (isSubmitting(itemId)) return;
    if (!currentItem.repeatable && currentItem.isCompleted) return;
    if (!isValidDuration(currentItem.actualDuration)) return;

    const points = calcItemPoints(currentItem);
    const completedAt = getCurrentDateTime();
    const nextRepeatCount = (currentItem.repeatCount || 0) + 1;
    const payload = {
      itemId: currentItem.id,
      points,
      repeatable: Boolean(currentItem.repeatable),
      actualDuration: Number(currentItem.actualDuration),
      completedAt,
      repeatCount: nextRepeatCount,
      submissionId: createSubmissionId(currentItem.id)
    };

    setPendingItemIds(prev => ({ ...prev, [itemId]: true }));
    setItems(prevItems => prevItems.map(i => (
      i.id === itemId
        ? {
          ...i,
          isCompleted: true,
          repeatCount: nextRepeatCount,
          completedAt
        }
        : i
    )));

    const startedAt = Date.now();
    try {
      if (typeof onSingleItemComplete === 'function') {
        await Promise.resolve(onSingleItemComplete(payload));
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed < 350) {
        await new Promise(resolve => setTimeout(resolve, 350 - elapsed));
      }
    } finally {
      setPendingItemIds(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    }
  };

  // 更新用时
  const updateDuration = (itemId, value) => {
    setItems(prevItems => prevItems.map(i =>
      i.id === itemId ? { ...i, actualDuration: value } : i
    ));
  };

  const getDurationOptions = (standardDuration) => {
    const { minDuration, maxDuration } = getDurationBounds(standardDuration);
    return Array.from({ length: maxDuration - minDuration + 1 }, (_, index) => minDuration + index);
  };
  const parseDuration = (value) => {
    const num = Number(String(value).trim());
    return Number.isInteger(num) && num > 0 ? String(num) : '';
  };

  const getDurationValueOption = (item) => {
    const normalized = parseDuration(item.actualDuration);
    if (!normalized) return null;
    const durationValue = Number(normalized);
    const { minDuration, maxDuration } = getDurationBounds(item.duration);
    const inPresetRange = durationValue >= minDuration && durationValue <= maxDuration;
    return { value: normalized, label: inPresetRange ? `${normalized} 分钟` : `${normalized} 分钟（自定义）` };
  };

  const openCustomDurationDialog = (item) => {
    setCustomDurationDialog({
      show: true,
      itemId: item.id,
      value: parseDuration(item.actualDuration) || String(item.duration),
      error: ''
    });
  };

  const closeCustomDurationDialog = () => {
    setCustomDurationDialog({
      show: false,
      itemId: null,
      value: '',
      error: ''
    });
  };

  const updateCustomDurationValue = (value) => {
    setCustomDurationDialog(prev => ({
      ...prev,
      value: value.replace(/[^\d]/g, ''),
      error: ''
    }));
  };

  const confirmCustomDuration = () => {
    const normalized = parseDuration(customDurationDialog.value);
    if (!normalized || customDurationDialog.itemId == null) {
      setCustomDurationDialog(prev => ({ ...prev, error: '请输入正整数分钟数' }));
      return;
    }
    updateDuration(customDurationDialog.itemId, normalized);
    closeCustomDurationDialog();
  };

  const handleDurationSelectChange = (item, option) => {
    if (!option) return;
    if (option.value === CUSTOM_DURATION_VALUE) {
      openCustomDurationDialog(item);
      return;
    }
    updateDuration(item.id, option.value);
  };

  return (
    <div>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="fw-bold text-primary d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faTasks} /> 今日打卡任务
          </h4>
          <h5 className="text-success fw-bold mb-0">
            已完成 {completedCount}/{totalItems} 项
          </h5>
        </div>
        <ProgressBar now={progress} variant="success" className="h-2 rounded-pill" label={`${Math.round(progress)}%`} />
      </div>

      <Row>
        {items.map(item => (
          <Col xs={12} sm={6} lg={4} key={item.id} className="mb-3">
            <Card className={`h-100 shadow-sm border-2 position-relative ${hasCheckedIn(item) ? 'border-success bg-light' : 'border-light'}`}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className={`fw-bold mb-0 ${(item.isCompleted && !item.repeatable) ? 'text-decoration-line-through text-muted' : ''}`}>
                    {item.name}
                  </h5>
                  <Badge bg={hasCheckedIn(item) ? "success" : "primary"} className="fs-6 px-2 py-1">
                    <FontAwesomeIcon icon={faStar} className="me-1" />
                    {calcItemPoints(item)}分
                  </Badge>
                </div>

                <div className="d-flex gap-2 text-muted small mb-3">
                  <FontAwesomeIcon icon={faClock} /> 规定 {item.duration}分钟
                  {item.repeatable && <span>· 可重复打卡</span>}
                </div>

                {hasCheckedIn(item) && item.completedAt && (
                  <div className="small text-success mb-3">
                    {(() => {
                      const displayCompletedAt = String(item.completedAt).replace(/\.\d{3}$/, '');
                      return item.repeatable
                        ? `🕒 最近打卡：${displayCompletedAt}（今日 ${item.repeatCount || 0} 次）`
                        : `🕒 打卡时间：${displayCompletedAt}`;
                    })()}
                  </div>
                )}

                <div className="d-flex gap-2 align-items-center">
                  <div style={{ width: '180px' }}>
                    <Select
                      isDisabled={(item.isCompleted && !item.repeatable) || isSubmitting(item.id)}
                      value={getDurationValueOption(item)}
                      onChange={(option) => handleDurationSelectChange(item, option)}
                      menuPortalTarget={selectMenuPortalTarget}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 3000 }),
                        menu: (base) => ({ ...base, zIndex: 3000 })
                      }}
                      options={[
                        ...getDurationOptions(item.duration).map(minutes => ({
                          value: String(minutes),
                          label: `${minutes} 分钟`
                        })),
                        { value: CUSTOM_DURATION_VALUE, label: '自定义分钟…' }
                      ]}
                      placeholder="选择分钟"
                      isSearchable={false}
                      isClearable={false}
                    />
                  </div>
                  <Button
                    variant={hasCheckedIn(item) ? "success" : "outline-primary"}
                    className="flex-grow-1 py-2"
                    onClick={() => toggleComplete(item.id)}
                    disabled={(!item.repeatable && item.isCompleted) || !isValidDuration(item.actualDuration) || isSubmitting(item.id)}
                  >
                    {isSubmitting(item.id) ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                        {item.repeatable ? (hasCheckedIn(item) ? '再打卡' : '打卡') : (item.isCompleted ? '已完成' : '完成')}
                      </>
                    )}
                  </Button>
                </div>
              </Card.Body>
              {isSubmitting(item.id) && (
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white bg-opacity-75"
                  style={{ zIndex: 2 }}
                >
                  <Spinner animation="border" variant="primary" />
                  <div className="small text-primary fw-semibold mt-2">提交中...</div>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {completedCount === totalItems && (
        <div className="mt-4 p-3 bg-success bg-opacity-10 rounded text-center">
          <h3 className="text-success fw-bold">🎉 今日全部完成！</h3>
        </div>
      )}

      <Modal show={customDurationDialog.show} onHide={closeCustomDurationDialog} centered>
        <Modal.Header closeButton>
          <Modal.Title>自定义分钟</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>请输入分钟数（正整数）</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={customDurationDialog.value}
              onChange={(e) => updateCustomDurationValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmCustomDuration();
                }
              }}
            />
            {customDurationDialog.error && (
              <div className="text-danger small mt-2">{customDurationDialog.error}</div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCustomDurationDialog}>取消</Button>
          <Button variant="primary" onClick={confirmCustomDuration}>确定</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
