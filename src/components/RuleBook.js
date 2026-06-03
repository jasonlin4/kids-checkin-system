import React from 'react';
import { Card, Accordion } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';

export default function RuleBook({ ruleData }) {
  return (
    <div className="text-center">
      <FontAwesomeIcon icon={faBookOpen} size="4x" className="text-primary mb-3" />
      <h2 className="fw-bold text-primary mb-4">打卡规则</h2>
      <Card className="text-start">
        <Card.Body>
          <Accordion defaultActiveKey="0">
            {ruleData.map((r, i) => (
              <Accordion.Item key={i} eventKey={i.toString()}>
                <Accordion.Header className="fw-bold">{r.title}</Accordion.Header>
                <Accordion.Body>
                  <ul>
                    {r.rules.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ul>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card.Body>
      </Card>
    </div>
  );
}