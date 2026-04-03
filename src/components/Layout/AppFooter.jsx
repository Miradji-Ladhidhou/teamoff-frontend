import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import FooterAccordion from './FooterAccordion';
import { FaLinkedin, FaFacebook, FaInstagram, FaXTwitter, FaArrowRight } from 'react-icons/fa6';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationForRole } from '../../utils/navigation';

const AppFooter = ({ isSuperAdmin = false, publicMode = false }) => {
  const { user } = useAuth();
  const role = publicMode ? null : (isSuperAdmin ? 'super_admin' : user?.role);
  const routePrefix = isSuperAdmin ? '/superadmin' : '';

  const legalLinks = publicMode
    ? [
        { label: 'Mentions légales', to: '/legal' },
        { label: 'Confidentialité', to: '/privacy' },
        { label: 'Contact', to: '/contact' },
        { label: 'Centre d\'aide', to: '/help' },
      ]
    : [
        { label: 'Mentions légales', to: `${routePrefix}/legal` },
        { label: 'Confidentialité', to: `${routePrefix}/privacy` },
        { label: 'Contact', to: `${routePrefix}/contact` },
        { label: 'Centre d\'aide', to: `${routePrefix}/help` },
      ];

  const popularPages = useMemo(() => {
    if (publicMode) {
      return [
        { label: 'Connexion', to: '/' },
        { label: 'Créer un compte', to: '/register' },
        { label: 'Contact', to: '/contact' },
        { label: 'Centre d\'aide', to: '/help' },
      ];
    }

    const items = getNavigationForRole(role || 'employe');
    return items.slice(0, 4).map((item) => ({ label: item.label, to: item.path }));
  }, [publicMode, role]);

  const ctaButtons = useMemo(() => {
    if (publicMode) {
      return [
        { label: 'Créer un compte', to: '/register', variant: 'primary' },
        { label: 'Contactez-nous', to: '/contact', variant: 'outline-light' },
      ];
    }

    if (isSuperAdmin) {
      return [
        { label: 'Dashboard', to: '/superadmin/dashboard', variant: 'primary' },
        { label: 'Entreprises', to: '/superadmin/companies', variant: 'outline-light' },
      ];
    }

    return [
      { label: 'Demander un congé', to: '/conges/nouveau', variant: 'primary' },
      { label: 'Calendrier', to: '/calendrier', variant: 'outline-light' },
    ];
  }, [isSuperAdmin, publicMode]);

  return (
    <footer className="app-footer bg-dark text-light py-5 mt-5">
      <div className="container">
        <div className="row">
          {/* Section principale */}
          <div className="col-lg-6 mb-4">
            <h2 className="h5 fw-bold text-white">TeamOff</h2>
            <p className="text-light-50">
              Tous les liens et informations essentiels à portée de main.
            </p>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {ctaButtons.map((item) => (
                <Button
                  as={Link}
                  key={item.to}
                  to={item.to}
                  variant={item.variant}
                  size="sm"
                  className="d-flex align-items-center gap-1"
                >
                  {item.label}
                  <FaArrowRight className="ms-1" />
                </Button>
              ))}
            </div>
          </div>

          {/* Accordéon footer */}
          <div className="col-lg-6">
            <FooterAccordion darkMode />
          </div>
        </div>

        <hr className="border-light mt-4" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-3">
          <small className="text-light-50 mb-2 mb-md-0">
            © 2026 TeamOff - Tous droits réservés
          </small>
          <div className="d-flex gap-3">
            {legalLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-light-50 text-decoration-none small">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;