import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUsers, FaBuilding, FaCalendarCheck, FaChartLine, FaCog, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';
import { useAlert } from '../../hooks/useAlert';

const normalizeStatus = (ok) => (ok ? 'healthy' : 'unhealthy');

const formatUptime = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return '-';

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    totalLeaves: 0,
    pendingLeaves: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const alert = useAlert();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [usersResult, companiesResult, leavesResult, activityResult, healthResult, metricsResult] = await Promise.allSettled([
        api.usersService.getAll(),
        api.entreprisesService.getAll(),
        api.congesService.getAll(),
        api.notificationsService.getAll({ limit: 10 }),
        api.systemService.health(),
        api.metricsService.getMetrics()
      ]);

      const users = usersResult.status === 'fulfilled' && Array.isArray(usersResult.value.data)
        ? usersResult.value.data
        : [];
      const entreprises = companiesResult.status === 'fulfilled' && Array.isArray(companiesResult.value.data)
        ? companiesResult.value.data
        : [];
      const conges = leavesResult.status === 'fulfilled' && Array.isArray(leavesResult.value.data)
        ? leavesResult.value.data
        : [];
      const pendingLeaves = conges.filter((conge) => String(conge?.statut || '').startsWith('en_attente')).length;
      const activeCompanies = entreprises.filter((entreprise) => entreprise?.statut === 'active').length;

      setStats({
        totalUsers: users.length,
        totalCompanies: activeCompanies,
        totalLeaves: conges.length,
        pendingLeaves
      });

      const activityItems = activityResult.status === 'fulfilled' && Array.isArray(activityResult.value.data?.items)
        ? activityResult.value.data.items
        : [];
      setRecentActivity(activityItems);

      const healthData = healthResult.status === 'fulfilled' ? healthResult.value.data : null;
      const metricsData = metricsResult.status === 'fulfilled' ? metricsResult.value.data : null;

      const isApiHealthy = healthData?.status === 'ok';
      const isDbHealthy = healthData?.db === 'connected';

      setSystemHealth({
        database: normalizeStatus(isDbHealthy),
        api: normalizeStatus(isApiHealthy),
        websocket: isApiHealthy ? 'healthy' : 'unhealthy',
        uptime: formatUptime(metricsData?.uptime)
      });

      if (!isApiHealthy || !isDbHealthy) {
        alert.error('Certaines données système sont indisponibles actuellement.');
      }

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      alert.error('Erreur de chargement des données');

      setStats({
        totalUsers: 0,
        totalCompanies: 0,
        totalLeaves: 0,
        pendingLeaves: 0
      });

      setRecentActivity([]);

      setSystemHealth({
        database: 'unhealthy',
        api: 'unhealthy',
        websocket: 'unhealthy',
        uptime: '-'
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <Card className="h-100">
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className={`p-3 rounded-circle bg-${color} bg-opacity-10 me-3`}>
            <Icon size={24} className={`text-${color}`} />
          </div>
          <div>
            <h3 className="mb-0">{value}</h3>
            <p className="text-muted mb-0">{title}</p>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <Container>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2">Chargement du dashboard superadmin...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h4 mb-1">Dashboard SuperAdmin</h1>
          <p className="text-muted small mb-0">Vue d'ensemble de votre plateforme TeamOff</p>
        </div>
        <div className="page-header-actions">
          <Button as={Link} to="/superadmin/settings" variant="outline-primary" size="sm">
            <FaCog className="me-1" />
            <span className="d-none d-sm-inline">Paramètres</span>
          </Button>
          <Button as={Link} to="/superadmin/metrics" variant="outline-info" size="sm">
            <FaChartLine className="me-1" />
            <span className="d-none d-sm-inline">Rapports</span>
          </Button>
        </div>
      </div>

      

      <InfoCardInfo title="Lecture rapide du dashboard super admin">
        <ul className="mb-0">
          <li>La première ligne donne la santé globale de la plateforme</li>
          <li>L'activité récente met en évidence les événements à surveiller</li>
          <li>Les actions rapides envoient vers les réglages critiques</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Rituel recommandé">
        Commencez la journée par les métriques et les activités récentes, puis vérifiez les alertes système.
      </TipCard>

      {/* Statistiques principales */}
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <StatCard
            title="Utilisateurs"
            value={stats.totalUsers}
            icon={FaUsers}
            color="primary"
            subtitle="Tous rôles"
          />
        </Col>
        <Col xs={6} md={3}>
          <StatCard
            title="Entreprises"
            value={stats.totalCompanies}
            icon={FaBuilding}
            color="success"
            subtitle="Actives"
          />
        </Col>
        <Col xs={6} md={3}>
          <StatCard
            title="Congés"
            value={stats.totalLeaves}
            icon={FaCalendarCheck}
            color="warning"
            subtitle={`${stats.pendingLeaves} en attente`}
          />
        </Col>
        <Col xs={6} md={3}>
          <StatCard
            title="Disponibilité"
            value={systemHealth.uptime}
            icon={FaShieldAlt}
            color="info"
            subtitle="Uptime"
          />
        </Col>
      </Row>

      <Row>
        {/* Activité récente */}
        <Col xs={12} md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0 card-section-title">Activité récente</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {recentActivity.length > 0 ? (
                <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity, index) => (
                      <tr key={index}>
                        <td>
                          <Badge bg="secondary">{activity.type || 'Info'}</Badge>
                        </td>
                        <td>{activity.message || 'Activité système'}</td>
                        <td>{new Date(activity.createdAt || Date.now()).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <Badge bg={activity.read ? 'success' : 'warning'}>
                            {activity.read ? 'Lu' : 'Non lu'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                </div>
              ) : (
                <div className="alert alert-info m-3" role="status">
                  <p className="mb-0">Aucune activité récente. Les activités système apparaîtront ici.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Santé système */}
        <Col xs={12} md={4} className="mt-4 mt-md-0">
          <Card>
            <Card.Header>
              <h5 className="mb-0 card-section-title">État du système</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Base de données</span>
                  <Badge bg={systemHealth.database === 'healthy' ? 'success' : 'danger'}>
                    {systemHealth.database === 'healthy' ? '✓' : '✗'} {systemHealth.database}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>API REST</span>
                  <Badge bg={systemHealth.api === 'healthy' ? 'success' : 'danger'}>
                    {systemHealth.api === 'healthy' ? '✓' : '✗'} {systemHealth.api}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>WebSocket</span>
                  <Badge bg={systemHealth.websocket === 'healthy' ? 'success' : 'danger'}>
                    {systemHealth.websocket === 'healthy' ? '✓' : '✗'} {systemHealth.websocket}
                  </Badge>
                </div>
              </div>

              <hr />

              <div className="text-center">
                <h6>Actions rapides</h6>
                <div className="d-grid gap-2">
                  <Button as={Link} to="/superadmin/settings?tab=system" variant="outline-primary" size="sm">
                    État du système
                  </Button>
                  <Button as={Link} to="/superadmin/settings?tab=db" variant="outline-warning" size="sm">
                    Base de données
                  </Button>
                  <Button as={Link} to="/superadmin/settings" variant="outline-secondary" size="sm">
                    Paramètres système
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SuperAdminDashboard;