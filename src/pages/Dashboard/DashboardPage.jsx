import './dashboard.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaPlus, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, quotasService, notificationsService, congeTypesService, entreprisesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import OnboardingWizard from '../../components/OnboardingWizard/OnboardingWizard';

const accentToBarColor = (accent) => {
  const map = { pending: 'amber', info: 'blue', success: 'green', danger: 'red' };
  return map[accent] || 'blue';
};

const accentToBadgeClass = (accent) => {
  const map = { pending: 'pending', info: 'info', success: 'approved', danger: 'refused' };
  return map[accent] || 'pending';
};

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const currentYear = new Date().getFullYear();

  const [stats, setStats] = useState({
    totalConges: 0,
    enAttente: 0,
    enAttenteAdmin: 0,
    valides: 0,
    refuses: 0,
    aValiderManager: 0,
    aValiderAdmin: 0,
  });
  const [workflow, setWorkflow] = useState('manager_admin');
  const [recentConges, setRecentConges] = useState([]);
  const [soldes, setSoldes] = useState(null);
  const [soldesLoadError, setSoldesLoadError] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [recentOverlapByCongeId, setRecentOverlapByCongeId] = useState({});
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const alert = useAlert();

  useEffect(() => {
    if (user?.role === 'admin_entreprise' && user?.id && !localStorage.getItem(`onboarding_${user.id}_done`)) {
      setShowOnboarding(true);
    }
  }, [user?.id, user?.role]);

  const handleDismissOnboarding = () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_${user.id}_done`, '1');
    }
    setShowOnboarding(false);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        let congesParams = {};
        if (user?.role === 'employe') {
          congesParams.utilisateur_id = user.id;
        }

        const isAdminRole = ['admin_entreprise', 'super_admin'].includes(user?.role);

        const [congesResponse, notificationsResponse, policyResponse] = await Promise.all([
          congesService.getAll(congesParams),
          notificationsService.getAll({ limit: 5 }),
          isAdminRole && user?.entreprise_id
            ? entreprisesService.getPolitique(user.entreprise_id).catch(() => null)
            : Promise.resolve(null),
        ]);

        const conges = Array.isArray(congesResponse.data?.items) ? congesResponse.data.items : (Array.isArray(congesResponse.data) ? congesResponse.data : []);
        const notifs = Array.isArray(notificationsResponse.data?.items) ? notificationsResponse.data.items : [];
        const wf = policyResponse?.data?.politique_conges?.approval_workflow || 'manager_admin';
        setWorkflow(wf);

        let statsData = {
          totalConges: congesResponse.data?.total ?? conges.length,
          enAttente: conges.filter(c => c.statut === 'en_attente_manager').length,
          enAttenteAdmin: conges.filter(c => c.statut === 'valide_manager').length,
          valides: conges.filter(c => c.statut === 'valide_final').length,
          refuses: conges.filter(c => c.statut === 'refuse_manager' || c.statut === 'refuse_final').length,
          aValiderManager: 0,
          aValiderAdmin: 0,
        };

        if (user?.role === 'manager' && (wf === 'manager_admin' || wf === 'manager_only')) {
          const r = await congesService.getAll({ statut: 'en_attente_manager', limit: 500 });
          const items = Array.isArray(r.data?.items) ? r.data.items : (Array.isArray(r.data) ? r.data : []);
          statsData.aValiderManager = items.length;
        }

        if (user?.role === 'admin_entreprise' || user?.role === 'super_admin') {
          if (wf === 'manager_admin') {
            const [rManager, rAdmin] = await Promise.all([
              congesService.getAll({ statut: 'en_attente_manager', limit: 500 }),
              congesService.getAll({ statut: 'valide_manager', limit: 500 }),
            ]);
            statsData.aValiderManager = (Array.isArray(rManager.data?.items) ? rManager.data.items : (Array.isArray(rManager.data) ? rManager.data : [])).length;
            statsData.aValiderAdmin = (Array.isArray(rAdmin.data?.items) ? rAdmin.data.items : (Array.isArray(rAdmin.data) ? rAdmin.data : [])).length;
          } else if (wf === 'admin_only') {
            const r = await congesService.getAll({ statut: 'en_attente_manager', limit: 500 });
            statsData.aValiderAdmin = (Array.isArray(r.data?.items) ? r.data.items : (Array.isArray(r.data) ? r.data : [])).length;
          }
        }

        setStats(statsData);
        setRecentConges(conges.slice(0, 5));
        setNotifications(notifs);

        if (['employe', 'manager'].includes(user?.role) && user.id) {
          try {
            const [soldesResponse, congeTypesResponse] = await Promise.all([
              quotasService.getSoldes(user.id),
              congeTypesService.getAll()
            ]);

            const soldesData = Array.isArray(soldesResponse.data?.soldes) ? soldesResponse.data.soldes : [];
            const congeTypesData = Array.isArray(congeTypesResponse.data) ? congeTypesResponse.data : [];

            const soldesByTypeId = new Map(
              soldesData
                .filter((item) => item?.conge_type_id)
                .map((item) => [String(item.conge_type_id), item])
            );

            const mergedSoldes = congeTypesData
              .slice()
              .sort((a, b) => String(a?.libelle || '').localeCompare(String(b?.libelle || ''), 'fr'))
              .map((type) => {
                const existing = soldesByTypeId.get(String(type.id));
                if (existing) {
                  return {
                    ...existing,
                    conge_type_id: existing.conge_type_id || type.id,
                    conge_type: typeof existing.conge_type === 'string'
                      ? existing.conge_type
                      : (existing.conge_type || { id: type.id, libelle: type.libelle }),
                    conge_type_libelle: existing.conge_type_libelle || type.libelle,
                    solde_disponible: existing.solde_disponible ?? existing.solde_restant ?? 0,
                  };
                }

                return {
                  conge_type_id: type.id,
                  conge_type: { id: type.id, libelle: type.libelle },
                  conge_type_libelle: type.libelle,
                  solde_disponible: 0,
                };
              });

            setSoldes(mergedSoldes);
          } catch {
            setSoldes([]);
            setSoldesLoadError(true);
          }
        }

      } catch (err) {
        alert.error(err.response?.data?.message || 'Impossible de charger les données du tableau de bord.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const canSeeOverlapAnnotations = ['manager', 'admin_entreprise', 'super_admin'].includes(user?.role);
    if (!canSeeOverlapAnnotations || !recentConges.length) {
      setRecentOverlapByCongeId({});
      return;
    }

    const canValidateConge = (conge) => {
      if (!conge) return false;
      if (user?.role === 'manager') return conge.statut === 'en_attente_manager';
      if (user?.role === 'admin_entreprise' || user?.role === 'super_admin') {
        return conge.statut === 'en_attente_manager' || conge.statut === 'valide_manager';
      }
      return false;
    };

    const targetConges = recentConges.filter(canValidateConge);
    if (!targetConges.length) {
      setRecentOverlapByCongeId({});
      return;
    }

    let cancelled = false;

    const loadRecentOverlaps = async () => {
      const results = await Promise.all(
        targetConges.map(async (conge) => {
          try {
            const response = await congesService.getValidationOverlap(conge.id);
            return [conge.id, response.data];
          } catch (_) {
            return [conge.id, null];
          }
        })
      );

      if (cancelled) return;
      const next = {};
      results.forEach(([congeId, data]) => {
        next[congeId] = data;
      });
      setRecentOverlapByCongeId(next);
    };

    loadRecentOverlaps();

    return () => {
      cancelled = true;
    };
  }, [recentConges, user?.role]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR');

  const getSoldeTypeLabel = (solde) => {
    if (solde?.conge_type?.libelle) return solde.conge_type.libelle;
    if (solde?.conge_type_libelle) return solde.conge_type_libelle;
    if (typeof solde?.conge_type === 'string' && solde.conge_type.trim()) return solde.conge_type;
    return 'Type inconnu';
  };

  const getSoldeJours = (solde) => {
    const raw = solde?.solde_restant ?? solde?.solde_disponible ?? solde?.solde ?? 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  };

  const getCongeAccent = (statut) => {
    switch (statut) {
      case 'en_attente_manager': return { accent: 'pending', label: 'EN ATTENTE' };
      case 'valide_manager':     return { accent: 'info',    label: 'VALIDÉ MANAGER' };
      case 'valide_final':       return { accent: 'success', label: 'VALIDÉ' };
      case 'refuse_manager':
      case 'refuse_final':       return { accent: 'danger',  label: 'REFUSÉ' };
      default:                   return { accent: 'pending', label: statut };
    }
  };

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="ui-text-soft">Chargement du tableau de bord...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      {showOnboarding && (
        <OnboardingWizard userId={user.id} onDismiss={handleDismissOnboarding} />
      )}
      {/* Hero greeting */}
      <div className="dashboard-hero">
        <div>
          <div className="dashboard-hero__greeting">Bonjour, {user?.prenom} 👋</div>
          <div className="dashboard-hero__date">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {['employe', 'manager'].includes(user?.role) && (
          <Button as={Link} to="/conges/nouveau" variant="primary" size="sm"
            className="d-none d-md-flex align-items-center gap-2 dashboard-hero__cta">
            <FaPlus size={12} /> Nouveau congé
          </Button>
        )}
      </div>

      {/* Notification banner */}
      {notifications.filter(n => !n.lu).length > 0 && (
        <div className="alert-banner alert-banner--info mb-3" role="status">
          <span className="alert-text">
            Vous avez {notifications.filter(n => !n.lu).length} notification(s) non lue(s)
          </span>
          <Button as={Link} to="/notifications" variant="outline-info" size="sm">Voir</Button>
        </div>
      )}

      {/* Stat cards — adaptées au rôle et au workflow */}
      <div className="stats-grid">
        {/* Employé : ses propres congés */}
        {user?.role === 'employe' && [
          { label: 'Total',         value: stats.totalConges,    color: 'blue' },
          { label: 'En att. manager', value: stats.enAttente,    color: 'amber', hide: stats.enAttente === 0 && stats.enAttenteAdmin === 0 },
          { label: 'En att. admin', value: stats.enAttenteAdmin, color: 'amber', hide: stats.enAttenteAdmin === 0 },
          { label: 'Approuvés',     value: stats.valides,        color: 'green' },
          { label: 'Refusés',       value: stats.refuses,        color: 'red' },
        ].filter(s => !s.hide).map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}

        {/* Manager */}
        {user?.role === 'manager' && [
          { label: 'Total équipe',  value: stats.totalConges,    color: 'blue' },
          { label: 'En att. admin', value: stats.enAttenteAdmin, color: 'amber', hide: stats.enAttenteAdmin === 0 },
          { label: 'Approuvés',     value: stats.valides,        color: 'green' },
          { label: 'Refusés',       value: stats.refuses,        color: 'red' },
        ].filter(s => !s.hide).map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
        {user?.role === 'manager' && (workflow === 'manager_admin' || workflow === 'manager_only') && (
          <div className={`stat-card amber${stats.aValiderManager > 0 ? ' pulse-urgent' : ''}`}>
            <div className="stat-label">À valider</div>
            <div className="stat-value amber">{stats.aValiderManager}</div>
            {stats.aValiderManager > 0 && (
              <Button as={Link} to="/conges-equipe" variant="outline-warning" size="sm" className="mt-2">Traiter →</Button>
            )}
          </div>
        )}

        {/* Admin entreprise — manager_admin : 2 étapes */}
        {user?.role === 'admin_entreprise' && workflow === 'manager_admin' && [
          { label: 'Total',              value: stats.totalConges,     color: 'blue' },
          { label: 'Validés',            value: stats.valides,         color: 'green' },
          { label: 'Refusés',            value: stats.refuses,         color: 'red' },
          { label: 'En att. manager',    value: stats.aValiderManager, color: 'amber', urgent: stats.aValiderManager > 0 },
          { label: 'À valider (admin)',  value: stats.aValiderAdmin,   color: 'red',   urgent: stats.aValiderAdmin > 0,   link: '/conges' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}${s.urgent ? ' pulse-urgent' : ''}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
            {s.urgent && s.link && s.value > 0 && (
              <Button as={Link} to={s.link} variant="outline-danger" size="sm" className="mt-2">Traiter →</Button>
            )}
          </div>
        ))}

        {/* Admin entreprise — admin_only : 1 étape */}
        {user?.role === 'admin_entreprise' && workflow === 'admin_only' && [
          { label: 'Total',   value: stats.totalConges,   color: 'blue' },
          { label: 'Validés', value: stats.valides,       color: 'green' },
          { label: 'Refusés', value: stats.refuses,       color: 'red' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
        {user?.role === 'admin_entreprise' && workflow === 'admin_only' && (
          <div className={`stat-card red${stats.aValiderAdmin > 0 ? ' pulse-urgent' : ''}`}>
            <div className="stat-label">À valider</div>
            <div className="stat-value red">{stats.aValiderAdmin}</div>
            {stats.aValiderAdmin > 0 && (
              <Button as={Link} to="/conges" variant="outline-danger" size="sm" className="mt-2">Traiter →</Button>
            )}
          </div>
        )}

        {/* Admin entreprise — manager_only : les managers gèrent tout */}
        {user?.role === 'admin_entreprise' && workflow === 'manager_only' && [
          { label: 'Total',              value: stats.totalConges,     color: 'blue' },
          { label: 'En att. validation', value: stats.enAttente,       color: 'amber' },
          { label: 'Validés',            value: stats.valides,         color: 'green' },
          { label: 'Refusés',            value: stats.refuses,         color: 'red' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}

        {/* Super admin */}
        {user?.role === 'super_admin' && [
          { label: 'Total',   value: stats.totalConges,   color: 'blue' },
          { label: 'En att.', value: stats.enAttente,     color: 'amber' },
          { label: 'Validés', value: stats.valides,       color: 'green' },
          { label: 'Refusés', value: stats.refuses,       color: 'red' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <Row>
        {/* Soldes section */}
        {soldes && !isAdmin() && (
          <Col lg={4} className="mb-4">
            <div className="section-header">
              <span className="section-title">Mes soldes {currentYear}</span>
            </div>
            <div className="soldes-grid">
              {soldesLoadError ? (
                <div className="solde-card solde-card--error">Impossible de charger les soldes.</div>
              ) : soldes.length === 0 ? (
                <div className="solde-card solde-card--empty">Aucun solde disponible</div>
              ) : (
                soldes.map((solde, idx) => {
                  const restant = getSoldeJours(solde);
                  const acquis = Number(solde?.jours_acquis ?? solde?.quota_annuel ?? 0) || 0;
                  const pct = acquis > 0 ? Math.min(100, Math.round((restant / acquis) * 100)) : 100;
                  const isLow = acquis > 0 && pct < 25;
                  return (
                    <div key={idx} className={`solde-card ${isLow ? 'solde-card--low' : ''}`}>
                      <div className="solde-card__days">{restant}<span className="solde-card__unit">j</span></div>
                      <div className="solde-card__label">{getSoldeTypeLabel(solde)}</div>
                      {acquis > 0 && (
                        <div className="solde-card__bar">
                          <div className="solde-card__bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Col>
        )}

        {/* Recent congés */}
        <Col lg={soldes && !isAdmin() ? 8 : 12}>
          <div className="section-header mb-2">
            <span className="section-title">Congés récents</span>
            <Button as={Link} to="/conges" variant="link" size="sm" className="section-action p-0">
              Voir tout
            </Button>
          </div>
          {recentConges.length === 0 ? (
            <Card>
              <Card.Body className="text-center py-5">
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
                <p style={{ color: 'var(--text-soft, var(--dk-text-soft))', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Aucun congé trouvé
                </p>
                {user?.role === 'employe' && (
                  <Button as={Link} to="/conges/nouveau" variant="primary" size="sm">
                    <FaPlus className="me-1" /> Créer votre premier congé
                  </Button>
                )}
              </Card.Body>
            </Card>
          ) : (
            <div className="d-flex flex-column gap-2">
              {recentConges.map((conge) => {
                const { accent, label: accentLabel } = getCongeAccent(conge.statut);
                return (
                  <Link key={conge.id} to={`/conges/${conge.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card-accented">
                      <div className={`card-accent-bar ${accentToBarColor(accent)}`} />
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <span className={`badge ${accentToBadgeClass(accent)}`}>{accentLabel}</span>
                          <span style={{ color: 'var(--text-muted, var(--dk-text-muted))', fontSize: '0.85rem' }}>›</span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text, var(--dk-text))' }}>
                          {isAdmin()
                            ? `${conge.utilisateur?.prenom || ''} ${conge.utilisateur?.nom || ''}`
                            : (conge.conge_type?.libelle || 'Type inconnu')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-soft, var(--dk-text-soft))' }}>
                          {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                          {conge.jours_calcules && <span className="ms-1">· {conge.jours_calcules}j</span>}
                        </div>
                        {recentOverlapByCongeId[conge.id]?.has_overlap === true && (
                          <div className="overlap-dash-annotation overlap mt-1">Chevauchement</div>
                        )}
                        {recentOverlapByCongeId[conge.id]?.has_overlap === false && (
                          <div className="overlap-dash-annotation no-overlap mt-1">Aucun chevauchement</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Col>
      </Row>

      {/* Mobile FAB — Nouveau congé */}
      {['employe', 'manager'].includes(user?.role) && (
        <Link to="/conges/nouveau" className="dashboard-fab d-md-none" aria-label="Nouveau congé">
          <FaPlus size={20} />
        </Link>
      )}
    </Container>
  );
};

export default DashboardPage;
