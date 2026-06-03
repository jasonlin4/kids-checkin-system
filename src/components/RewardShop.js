import React from 'react';
import { Card, Row, Col, Button, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGift, faShoppingCart } from '@fortawesome/free-solid-svg-icons';

export default function RewardShop({ rewardData, userPoints, onExchange, exchangeHistory }) {
  return (
    <div>
      <div className="d-flex justify-content-between mb-4">
        <h2 className="fw-bold text-primary">兑换商店</h2>
        <Badge bg="primary" className="p-2 fs-5">可用积分：{userPoints}</Badge>
      </div>

      <Row>
        {rewardData.map(r => (
          <Col md={6} lg={4} key={r.id} className="mb-3">
            <Card className="card-hover h-100">
              <Card.Body className="text-center d-flex flex-column">
                <FontAwesomeIcon icon={faGift} size="3x" className="mb-3 text-success" />
                <h5 className="fw-bold">{r.rewardName}</h5>
                <Badge bg="primary" className="my-2 fs-5">{r.requiredPoints} 积分</Badge>
                <Button
                  variant={userPoints >= r.requiredPoints ? 'success' : 'secondary'}
                  className="mt-auto"
                  onClick={() => onExchange(r)}
                  disabled={userPoints < r.requiredPoints}
                >
                  <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
                  {userPoints >= r.requiredPoints ? '立即兑换' : '积分不足'}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="mt-4">
        <Card.Header><h5>兑换记录</h5></Card.Header>
        <Card.Body>
          <Table hover>
            <tbody>
              {exchangeHistory.slice().reverse().map((e, i) => (
                <tr key={i}>
                  <td>{e.date}</td>
                  <td>{e.rewardName}</td>
                  <td className="text-danger">-{e.points} 分</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}