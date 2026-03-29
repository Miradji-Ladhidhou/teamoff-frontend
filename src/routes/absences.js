// Routeur principal pour la page Absences (React Router)
import React from 'react';
import { Route } from 'react-router-dom';
import AbsencesPage from '../pages/Absences';

const AbsencesRoutes = () => (
  <Route path="/absences" element={<AbsencesPage />} />
);

export default AbsencesRoutes;
