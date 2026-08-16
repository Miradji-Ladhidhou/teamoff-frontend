import './help.css';
import React from 'react';

const HelpPage = () => (
  <div className="guide-iframe-wrap">
    <iframe
      src="/guide-prise-en-main.html?embed=1"
      title="Guide de prise en main TeamOff"
      className="guide-iframe"
    />
  </div>
);

export default HelpPage;
