import React, { useState } from 'react';
import { FaInfoCircle, FaLightbulb, FaCheckCircle } from 'react-icons/fa';
import './InfoCard.css';

export const InfoCard = ({ variant = 'info', icon: Icon = FaInfoCircle, title, children }) => {
  const [expanded, setExpanded] = useState(false);
  const hasContent = Boolean(children);

  return (
    <div className={`alert alert-${variant} mb-4 d-flex gap-3 info-card`} role="note">
      <div className="flex-shrink-0 mt-1">
        <Icon size={24} />
      </div>
      <div className="flex-grow-1">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
          {title && <h6 className="alert-heading mb-0">{title}</h6>}
          {hasContent && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
            >
              {expanded ? 'Masquer' : 'Détails'}
            </button>
          )}
        </div>
        <div className={`info-card-content ${expanded ? 'expanded' : 'compact'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const TipCard = ({ title, children }) => (
  <InfoCard variant="warning" icon={FaLightbulb} title={title}>
    {children}
  </InfoCard>
);

export const SuccessCard = ({ title, children }) => (
  <InfoCard variant="success" icon={FaCheckCircle} title={title}>
    {children}
  </InfoCard>
);

