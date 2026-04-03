import './dashboard.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCalendarCheck, FaClock, FaCheckCircle, FaTimesCircle, FaPlus, FaEye } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, quotasService, notificationsService, congeTypesService } from '../../services/api';
import { InfoCardInfo } from '../../components/InfoCard';
import { useAlert } from '../../hooks/useAlert';

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const currentYear = new Date().getFullYear();

  const [stats, setStats] = useState({
    totalConges: 0,
    enAttente: 0,
    valides: 0,
    refuses: 0
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

        // Paramètres pour les congés selon le rôle
        let congesParams = {};
        if (user?.role === 'employe') {
          congesParams.utilisateur_id = user.id;
        }

        // Charger les congés et notifications en parallèle
        const [congesResponse, notificationsResponse] = await Promise.all([
          congesService.getAll(congesParams),
          notificationsService.getAll({ limit: 5 })
        ]);

        const conges = Array.isArray(congesResponse.data) ? congesResponse.data : [];
        const notifs = Array.isArray(notificationsResponse.data?.items) ? notificationsResponse.data.items : [];

        // Calcul des statistiques selon le rôle
        let statsData = {
          totalConges: conges.length,
          enAttente: conges.filter(c => c.statut === 'en_attente_manager').length,
          valides: conges.filter(c => c.statut === 'valide_final' || c.statut === 'valide_manager').length,
          refuses: conges.filter(c => c.statut === 'refuse_manager' || c.statut === 'refuse_final').length
        };

        // Pour les managers et admins, compter les congés à valider
        if (user?.role === 'manager' || user?.role === 'admin_entreprise') {
          const allCongesResponse = await congesService.getAll();
          const allConges = Array.isArray(allCongesResponse.data) ? allCongesResponse.data : [];
          statsData.aValider = allConges.filter(c => c.statut === 'en_attente_manager').length;
        }

        setStats(statsData);
        setRecentConges(conges.slice(0, 5));
        setNotifications(notifs);

        // Charger les soldes pour les employés et managers
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

  const getStatusBadge = (status) => {
    const statusMap = {
      'en_attente_manager': { variant: 'warning', label: 'En attente manager' },
      'valide_manager': { variant: 'info', label: 'Validé manager' },
      'valide_final': { variant: 'success', label: 'Validé' },
      'refuse_manager': { variant: 'danger', label: 'Refusé manager' },
      'refuse_final': { variant: 'danger', label: 'Refusé' }
    };

    const statusInfo = statusMap[status] || { variant: 'secondary', label: status };
    return <Badge bg={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

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

  const getRoleLabel = (role) => {
    const map = {
      super_admin: 'Super administrateur',
      admin_entreprise: 'Admin entreprise',
      manager: 'Manager',
      employe: 'Employé'
    };
    return map[role] || 'Rôle inconnu';
  };

  const getEntrepriseLabel = () => {
    if (user?.role === 'super_admin') return 'Multi-entreprises';
    if (user?.entreprise_nom) return user.entreprise_nom;
    return 'Entreprise non renseignée';
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
      {/* En-tête responsive */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="h4 mb-1 ui-page-title">Tableau de bord</h1>
          <p className="mb-0"><span className="ui-user-name fw-semibold">{user?.prenom || 'Utilisateur'} {user?.nom || ''}</span></p>
          <p className="ui-text-soft small mb-0">{getRoleLabel(user?.role)} — {getEntrepriseLabel()}</p>
        </div>
        {['employe', 'manager'].includes(user?.role) && (
          <div className="page-header-actions">
            <Button as={Link} to="/conges/nouveau" variant="primary" className="d-flex align-items-center">
              <FaPlus className="me-2" /> Nouveau congé
            </Button>
          </div>
        )}
      </div>

      

      <InfoCardInfo title="Repères rapides">
        <p className="mb-0">Indicateurs en haut, historique en bas.</p>
      </InfoCardInfo>

      {notifications.filter(n => !n.lu).length > 0 && (
        <div className="alert alert-info mb-4" role="status">
          <div className="d-flex justify-content-between align-items-center">
            <span>Vous avez {notifications.filter(n => !n.lu).length} notification(s) non lue(s)</span>
            <Button as={Link} to="/notifications" variant="outline-info" size="sm">Voir</Button>
          </div>
        </div>
      )}

      <Row className="mb-4">
        {[
          { icon: <FaCalendarCheck size={24} className="text-white mb-2" />, label: 'Total congés', value: stats.totalConges },
          { icon: <FaClock size={24} className="text-white mb-2" />, label: 'En attente', value: stats.enAttente },
          { icon: <FaCheckCircle size={24} className="text-white mb-2" />, label: 'Validés', value: stats.valides },
          { icon: <FaTimesCircle size={24} className="text-white mb-2" />, label: 'Refusés', value: stats.refuses }
        ].map((stat, idx) => (
          <Col xs={12} sm={6} lg={3} className="mb-3" key={idx}>
            <Card className="dashboard-stat-card h-100">
              <Card.Body className="text-center py-3">
                {stat.icon}
                <h4 className="h5 mb-1 text-white">{stat.value}</h4>
                <p className="text-white mb-0 small">{stat.label}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row>
        {soldes && !isAdmin() && (
          <Col lg={4} className="mb-4">
            <Card>
              <Card.Header><h5 className="mb-0">Mes soldes de congés</h5></Card.Header>
              <Card.Body>
                {soldes.length === 0 ? (
                  <p className="ui-text-soft mb-0">Aucun solde disponible</p>
                ) : (
                  soldes.map((solde, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center mb-2">
                      <span>{getSoldeTypeLabel(solde)}</span>
                      <Badge bg="info">{getSoldeJours(solde)} jours</Badge>
                    </div>
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
        )}

        <Col lg={soldes && !isAdmin() ? 8 : 12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Congés récents</h5>
              <Button as={Link} to="/conges" variant="outline-primary" size="sm">Voir tout</Button>
            </Card.Header>
            <Card.Body>
              {recentConges.length === 0 ? (
                <div className="text-center py-4">
                  <FaCalendarCheck size={48} className="ui-icon-soft mb-3" />
                  <p className="ui-text-soft">Aucun congé trouvé</p>
                  {user?.role === 'employe' && (
                    <Button as={Link} to="/conges/nouveau" variant="primary">Créer votre premier congé</Button>
                  )}
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentConges.map((conge) => (
                    <div key={conge.id} className="list-group-item px-0 py-2">
                      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold text-truncate small">
                            {isAdmin() ? `${conge.utilisateur?.prenom} ${conge.utilisateur?.nom}` : (conge.conge_type?.libelle || 'Type inconnu')}
                          </div>
                          <br />
                          <div className="ui-text-soft text-xs">
                            {formatDate(conge.date_debut)} → {formatDate(conge.date_fin)}
                          </div>
                           <br />
                          {recentOverlapByCongeId[conge.id]?.has_overlap === true && (
                            <div className="overlap-dash-annotation overlap">
                              Chevauchement
                            </div>
                          )}
                          {recentOverlapByCongeId[conge.id]?.has_overlap === false && (
                            <div className="overlap-dash-annotation no-overlap">
                              Aucun chevauchement
                            </div>
                          )}
                          
                          <div className="text-xxs">
                            {conge.jours_calcules && <span className="badge bg-info me-1">{conge.jours_calcules} j</span>}
                            {!isAdmin() && conge.conge_type && <span className="badge bg-light text-dark">{conge.conge_type.libelle}</span>}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                          {getStatusBadge(conge.statut)}
                          <Button as={Link} to={`/conges/${conge.id}`} variant="outline-secondary" size="sm"><FaEye /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;