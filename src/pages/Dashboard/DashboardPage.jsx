import './dashboard.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, quotasService, notificationsService, congeTypesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

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
    valides: 0,
    refuses: 0,
    aValider: 0
  });
  const [recentConges, setRecentConges] = useState([]);
  const [soldes, setSoldes] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [recentOverlapByCongeId, setRecentOverlapByCongeId] = useState({});
  const [loading, setLoading] = useState(true);
  const alert = useAlert();

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

        const [congesResponse, notificationsResponse] = await Promise.all([
          congesService.getAll(congesParams),
          notificationsService.getAll({ limit: 5 })
        ]);

        const conges = Array.isArray(congesResponse.data) ? congesResponse.data : [];
        const notifs = Array.isArray(notificationsResponse.data?.items) ? notificationsResponse.data.items : [];

        let statsData = {
          totalConges: conges.length,
          enAttente: conges.filter(c => c.statut === 'en_attente_manager').length,
          valides: conges.filter(c => c.statut === 'valide_final' || c.statut === 'valide_manager').length,
          refuses: conges.filter(c => c.statut === 'refuse_manager' || c.statut === 'refuse_final').length
        };

        if (user?.role === 'manager' || user?.role === 'admin_entreprise' || user?.role === 'super_admin') {
          const allCongesResponse = await congesService.getAll();
          const allConges = Array.isArray(allCongesResponse.data) ? allCongesResponse.data : [];
          statsData.aValider = allConges.filter(c => c.statut === 'en_attente_manager').length;
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
          } catch (soldesError) {
            console.warn('Erreur chargement soldes:', soldesError);
            setSoldes([]);
          }
        }

      } catch (err) {
        console.error('Erreur dashboard:', err);
        alert.error('Impossible de charger les données du tableau de bord.');
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
      {/* Hero greeting */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__greeting">Bonjour, {user?.prenom} 👋</div>
        <div className="dashboard-hero__date">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
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

      {/* Stat cards — 2-col mobile, 4-col desktop */}
      <div className="stats-grid">
        {[
          { label: 'Total congés', value: stats.totalConges, color: 'blue' },
          { label: 'En attente',   value: stats.enAttente,   color: 'amber' },
          { label: 'Validés',      value: stats.valides,     color: 'green' },
          { label: 'Refusés',      value: stats.refuses,     color: 'red' },
        ].map((stat, idx) => (
          <div key={idx} className={`stat-card ${stat.color}`}>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-value ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
        {stats.aValider !== undefined && (
          <div className="stat-card red pulse-urgent">
            <div className="stat-label">À valider</div>
            <div className="stat-value red">{stats.aValider}</div>
            {stats.aValider > 0 && (
              <Button as={Link} to="/conges" variant="outline-danger" size="sm" className="mt-2">
                Traiter →
              </Button>
            )}
          </div>
        )}
      </div>

      <Row>
        {/* Soldes section */}
        {soldes && !isAdmin() && (
          <Col lg={4} className="mb-4">
            <div className="section-header">
              <span className="section-title">Mes soldes de congés</span>
              <span className="section-action">{currentYear}</span>
            </div>
            <Card>
              <Card.Body>
                {soldes.length === 0 ? (
                  <p className="ui-text-soft mb-0">Aucun solde disponible</p>
                ) : (
                  soldes.map((solde, idx) => {
                    const restant = getSoldeJours(solde);
                    const acquis = Number(solde?.jours_acquis ?? solde?.quota_annuel ?? 0) || 0;
                    const pct = acquis > 0 ? Math.min(100, Math.round((restant / acquis) * 100)) : 100;
                    return (
                      <div key={idx} className="solde-row">
                        <div className="solde-row__header">
                          <span className="text-truncate me-2">{getSoldeTypeLabel(solde)}</span>
                          <span className="fw-semibold flex-shrink-0">{restant} j</span>
                        </div>
                        {acquis > 0 && (
                          <div className="solde-row__bar">
                            <div className="solde-row__bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </Card.Body>
            </Card>
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

      {/* Mobile-only "Nouveau congé" button */}
      {['employe', 'manager'].includes(user?.role) && (
        <div className="d-lg-none mt-4">
          <Button as={Link} to="/conges/nouveau" variant="primary" className="w-100 d-flex align-items-center justify-content-center">
            <FaPlus className="me-2" /> Nouveau congé
          </Button>
        </div>
      )}
    </Container>
  );
};

export default DashboardPage;
