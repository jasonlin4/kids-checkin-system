import React from 'react';
import { Navbar, Container, Badge, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faTrophy, faCalendarDays } from '@fortawesome/free-solid-svg-icons';

export default function Header({ userData, currentLevelInfo, levelProgress }) {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="py-3">
      <Container>
        <Navbar.Brand className="fw-bold fs-3 d-flex gap-2">
          <FontAwesomeIcon icon={faStar} className="text-warning" />
          成长打卡系统
        </Navbar.Brand>
        <div className="d-flex gap-3">
          <Badge bg="warning" text="dark" className="p-2 fs-5">
            <FontAwesomeIcon icon={faTrophy} className="me-1" />
            可用积分 {userData.totalPoints}
          </Badge>
          <Badge bg="light" text="dark" className="p-2 fs-5">
            成长积分 {userData.levelPoints ?? userData.totalPoints}
          </Badge>
          <Badge bg="success" className="p-2 fs-5">
            {userData.currentLevel}
          </Badge>
          <Badge bg="info" className="p-2 fs-5">
            <FontAwesomeIcon icon={faCalendarDays} className="me-1" />
            连续 {userData.continuousDays} 天
          </Badge>
        </div>
      </Container>
      <div className="w-100 mt-2 px-3 text-white">
        <div className="d-flex justify-content-between mb-1">
          <span>{currentLevelInfo.levelName}</span>
          <span>{Math.round(levelProgress)}%</span>
        </div>
        <ProgressBar now={levelProgress} variant="warning" className="h-2" />
      </div>
    </Navbar>
  );
}
