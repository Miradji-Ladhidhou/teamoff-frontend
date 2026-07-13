import React from 'react';
import ConfirmationModal from './ConfirmationModal';
import ApiToastContainer from './ApiToastContainer';

const GlobalModalProvider = () => {
  return (
    <>
      <ApiToastContainer />
      <ConfirmationModal />
    </>
  );
};

export default GlobalModalProvider;
