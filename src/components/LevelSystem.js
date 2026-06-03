import React from 'react';
import { Card, Row, Col, ProgressBar, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAward } from '@fortawesome/free-solid-svg-icons';

export default function LevelSystem({ levelData, currentLevelInfo, levelProgress, userPoints }) {
  return (
    <div>
      <h2 className="fw-bold text-primary mb-4">等级成长</h2>
      <Card className="mb-4 border-primary">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <h4>当前：{currentLevelInfo.levelName}</h4>
            <Badge bg="primary">{currentLevelInfo.achievement}</Badge>
          </div>
          <ProgressBar now={levelProgress} className="h-3 my-3" />
        </Card.Body>
      </Card>

      <Row>
        {levelData.map((l, i) => (
          <Col md={4} key={i} className="mb-3">
            <Card className={`card-hover h-100 ${userPoints >= l.minPoints ? 'border-success' : 'border-muted'}`}>
              <Card.Body className="text-center">
                <FontAwesomeIcon icon={faAward} size="3x" className="text-primary mb-3" />
                <h5 className="fw-bold">{l.levelName}</h5>
                <p className="text-muted">{l.minPoints} ~ {l.maxPoints === 999999 ? '∞' : l.maxPoints} 分</p>
                <Badge bg="success">{l.achievement}</Badge>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}