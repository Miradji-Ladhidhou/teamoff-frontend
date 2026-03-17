import React from 'react';
import { Alert } from 'react-bootstrap';
import { FaInfoCircle, FaLightbulb, FaCheckCircle } from 'react-icons/fa';

export const InfoCard = ({ variant = 'info', icon: Icon = FaInfoCircle, title, children }) => {
  return (
    <Alert variant={variant} className="mb-4 d-flex gap-3">
      <div className="flex-shrink-0 mt-1">
        <Icon size={24} />
      </div>
      <div className="flex-grow-1">
        {title && <h6 className="alert-heading">{title}</h6>}
        {children}
      </div>
    </Alert>
  );
};

export const TipCard = ({ title, children }) => (
  <InfoCard variant="warning" icon={FaLightbulb} title={title}>
    {children}
  </InfoCard>
);

export const SuccessCardInfo = ({ title, children }) => (
  <InfoCard variant="success" icon={FaCheckCircle} title={title}>
    {children}
  </InfoCard>
);

export const InfoCardInfo = ({ title, children }) => (
  <InfoCard variant="info" icon={FaInfoCircle} title={title}>
    {children}
  </InfoCard>
);
