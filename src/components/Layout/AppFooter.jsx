import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import FooterAccordion from './FooterAccordion';
import { FaLinkedin, FaFacebook, FaInstagram, FaXTwitter, FaArrowRight } from 'react-icons/fa6';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationForRole } from '../../utils/navigation';

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: FaLinkedin },
  { label: 'X', href: 'https://x.com', icon: FaXTwitter },
  { label: 'Facebook', href: 'https://www.facebook.com', icon: FaFacebook },
  { label: 'Instagram', href: 'https://www.instagram.com', icon: FaInstagram },
];

const trustItems = [
  'Controle des acces par role',
  'Journal d\'audit des actions',
  'Sauvegardes et export des donnees',
  'Confidentialite des informations collaborateurs',
];

const AppFooter = ({ isSuperAdmin = false, publicMode = false }) => {
  const { user } = useAuth();
  const role = publicMode ? null : (isSuperAdmin ? 'super_admin' : user?.role);
  const routePrefix = isSuperAdmin ? '/superadmin' : '';

  const legalLinks = publicMode
    ? [
        { label: 'Informations legales', to: '/legal' },
        { label: 'Confidentialite', to: '/privacy' },
        { label: 'Contact', to: '/contact' },
        { label: 'Centre d\'aide', to: '/help' },
      ]
    : [
        { label: 'Informations legales', to: `${routePrefix}/legal` },
        { label: 'Confidentialite', to: `${routePrefix}/privacy` },
        { label: 'Contact', to: `${routePrefix}/contact` },
        { label: 'Centre d\'aide', to: `${routePrefix}/help` },
      ];

  const popularPages = useMemo(() => {
    if (publicMode) {
      return [
        { label: 'Connexion', to: '/' },
        { label: 'Creer un compte', to: '/register' },
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
        { label: 'Creer un compte', to: '/register', variant: 'primary' },
        { label: 'Contacter l\'equipe', to: '/contact', variant: 'outline-primary' },
      ];
    }

    if (isSuperAdmin) {
      return [
        { label: 'Voir le dashboard', to: '/superadmin/dashboard', variant: 'primary' },
        { label: 'Gerer les entreprises', to: '/superadmin/companies', variant: 'outline-primary' },
      ];
    }

    return [
      { label: 'Demander un conge', to: '/conges/nouveau', variant: 'primary' },
      { label: 'Ouvrir le calendrier', to: '/calendrier', variant: 'outline-primary' },
    ];
  }, [isSuperAdmin, publicMode]);

  return (
    <footer className="app-footer mt-4">
      <div className="app-footer__panel">
        <div className="app-footer__grid">
          <section>
            <p className="app-footer__eyebrow">TeamOff</p>
            <h2 className="app-footer__title">Une navigation utile jusqu'au dernier pixel.</h2>
            <p className="app-footer__text">
              Retrouvez toutes les informations utiles, moyens de contact, liens populaires et gages de confiance dans l'accordéon ci-dessous.
            </p>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {ctaButtons.map((item) => (
                <Button as={Link} key={item.to} to={item.to} variant={item.variant} size="sm">
                  {item.label}
                  <FaArrowRight className="ms-2" />
                </Button>
              ))}
            </div>
          </section>
          <section className="w-100 mt-3">
            <FooterAccordion />
          </section>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;