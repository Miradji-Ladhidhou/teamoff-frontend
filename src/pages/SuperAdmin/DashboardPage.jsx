import './dashboard.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaChartLine, FaCog } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
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

  const colorMap = { primary: 'blue', success: 'green', warning: 'amber', info: 'blue' };
  const StatCard = ({ title, value, color, subtitle }) => (
    <div className={`stat-card ${colorMap[color] || 'blue'}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{title}</div>
      {subtitle && <div className="stat-sub">{subtitle}</div>}
    </div>
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
      <div className="page-title-bar">
        <span className="section-title-bar__text">Dashboard SuperAdmin</span>
        <div className="d-flex gap-2">
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

      {/* Statistiques principales */}
      <div className="stats-grid mb-4">
        <StatCard title="Utilisateurs" value={stats.totalUsers} color="primary" subtitle="Tous rôles" />
        <StatCard title="Entreprises" value={stats.totalCompanies} color="success" subtitle="Actives" />
        <StatCard title="Congés" value={stats.totalLeaves} color="warning" subtitle={`${stats.pendingLeaves} en attente`} />
        <StatCard title="Disponibilité" value={systemHealth.uptime} color="info" subtitle="Uptime" />
      </div>

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
                          <span className="badge info">{activity.type || 'Info'}</span>
                        </td>
                        <td>{activity.message || 'Activité système'}</td>
                        <td>{new Date(activity.createdAt || Date.now()).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <span className={`badge ${activity.read ? 'approved' : 'pending'}`}>
                            {activity.read ? 'Lu' : 'Non lu'}
                          </span>
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
                  <span className={`badge ${systemHealth.database === 'healthy' ? 'approved' : 'refused'}`}>
                    {systemHealth.database === 'healthy' ? '✓' : '✗'} {systemHealth.database}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>API REST</span>
                  <span className={`badge ${systemHealth.api === 'healthy' ? 'approved' : 'refused'}`}>
                    {systemHealth.api === 'healthy' ? '✓' : '✗'} {systemHealth.api}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>WebSocket</span>
                  <span className={`badge ${systemHealth.websocket === 'healthy' ? 'approved' : 'refused'}`}>
                    {systemHealth.websocket === 'healthy' ? '✓' : '✗'} {systemHealth.websocket}
                  </span>
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