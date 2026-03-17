import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, ProgressBar, Badge } from 'react-bootstrap';
import { FaChartLine, FaClock, FaExclamationTriangle, FaUsers, FaServer } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { metricsService } from '../../services/api';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';

const normalizeMetrics = (raw = {}) => {
  const totalRequests = Number(raw.totalRequests ?? raw.requests ?? 0);
  const totalErrors = Number(raw.totalErrors ?? raw.errors ?? 0);
  const avgResponseTime = Number(raw.averageResponseTime ?? raw.avgResponseTime ?? 0);

  let errorRate = raw.errorRate;
  if (typeof errorRate === 'string') {
    errorRate = Number(errorRate);
  }
  errorRate = Number.isFinite(errorRate) ? errorRate : 0;
  // Le backend actuel renvoie un pourcentage (ex: 2.35), la UI utilise une fraction (0.0235)
  if (errorRate > 1) {
    errorRate = errorRate / 100;
  }

  const enterpriseUsageSource = raw.enterpriseUsage || {};
  const enterpriseUsage = Array.isArray(enterpriseUsageSource)
    ? enterpriseUsageSource
    : Object.entries(enterpriseUsageSource).map(([entreprise_id, count]) => ({
        entreprise_id,
        count: Number(count || 0),
      }));

  const minResponseTime = Number(raw.minResponseTime ?? avgResponseTime ?? 0);
  const maxResponseTime = Number(raw.maxResponseTime ?? avgResponseTime ?? 0);

  return {
    uptime: Number(raw.uptime ?? 0),
    memoryUsage: Number(raw.memoryUsage ?? 0),
    requests: totalRequests,
    avgResponseTime,
    errorRate,
    error4xx: Number(raw.error4xx ?? 0),
    error5xx: Number(raw.error5xx ?? totalErrors),
    enterpriseUsage,
    minResponseTime,
    maxResponseTime,
    requestsPerMinute: Number(raw.requestsPerMinute ?? 0),
    activeConnections: Number(raw.activeConnections ?? 0),
    dbConnections: Number(raw.dbConnections ?? 0),
    dbQueries: Number(raw.dbQueries ?? 0),
    cacheHitRate: Number(raw.cacheHitRate ?? 0),
  };
};

const MetricsPage = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role === 'super_admin') {
      loadMetrics();
    }
  }, [user]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await metricsService.getMetrics();
      setMetrics(normalizeMetrics(response.data));
    } catch (err) {
      console.error('Erreur lors du chargement des métriques:', err);
      setError('Erreur lors du chargement des métriques');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes < 1) return '0 Bytes';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Vérifier les permissions
  if (user.role !== 'super_admin') {
    return (
      <Container>
        <Alert variant="danger" className="text-center">
          Accès non autorisé. Cette page est réservée aux super administrateurs.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement des métriques...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex align-items-center mb-4">
        <FaChartLine className="text-primary me-3" size={32} />
        <div>
          <h1 className="h3 mb-0">Métriques Système</h1>
          <p className="text-muted mb-0">Surveillance des performances et utilisation</p>
        </div>
      </div>

      <InfoCardInfo title="Comment interpréter les métriques">
        <ul className="mb-0">
          <li>Uptime et erreurs indiquent la stabilité</li>
          <li>Temps de réponse et requêtes/minute indiquent la charge</li>
          <li>Usage par entreprise aide à anticiper la capacité</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Seuils d'alerte suggérés">
        Surveillez de près un taux d'erreur au-dessus de 1% et des pics prolongés de latence.
      </TipCard>

      {metrics && (
        <Row>
          {/* Métriques générales */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <FaServer className="me-2" />
                Métriques Générales
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Uptime</small>
                      <div className="h5 mb-0">{formatUptime(metrics.uptime)}</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Mémoire utilisée</small>
                      <div className="h5 mb-0">{formatBytes(metrics.memoryUsage)}</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Total requêtes</small>
                      <div className="h5 mb-0">{(metrics.requests || 0).toLocaleString()}</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Temps réponse moyen</small>
                      <div className="h5 mb-0">{metrics.avgResponseTime}ms</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Métriques d'erreurs */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <FaExclamationTriangle className="me-2" />
                Taux d'Erreurs
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Taux d'erreur global</span>
                    <Badge bg={metrics.errorRate > 0.05 ? 'danger' : metrics.errorRate > 0.01 ? 'warning' : 'success'}>
                      {(metrics.errorRate * 100).toFixed(2)}%
                    </Badge>
                  </div>
                  <ProgressBar
                    variant={metrics.errorRate > 0.05 ? 'danger' : metrics.errorRate > 0.01 ? 'warning' : 'success'}
                    now={Math.min(metrics.errorRate * 100, 100)}
                    style={{ height: '8px' }}
                  />
                </div>

                <Row>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Erreurs 4xx</small>
                      <div className="h5 mb-0">{metrics.error4xx}</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Erreurs 5xx</small>
                      <div className="h5 mb-0">{metrics.error5xx}</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Utilisation par entreprise */}
          <Col lg={12} className="mb-4">
            <Card>
              <Card.Header>
                <FaUsers className="me-2" />
                Utilisation par Entreprise
              </Card.Header>
              <Card.Body>
                {metrics.enterpriseUsage && metrics.enterpriseUsage.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Entreprise</th>
                          <th>Requêtes</th>
                          <th>% du total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.enterpriseUsage.map((usage, index) => (
                          <tr key={index}>
                            <td>{usage.entreprise_nom || `ID ${usage.entreprise_id}`}</td>
                            <td>{usage.count}</td>
                            <td>
                              <Badge bg="info">
                                {metrics.requests > 0 ? ((usage.count / metrics.requests) * 100).toFixed(1) : '0.0'}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Aucune donnée d'utilisation disponible</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Métriques de performance */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <FaClock className="me-2" />
                Performance
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Temps réponse min</small>
                      <div className="h5 mb-0">{metrics.minResponseTime}ms</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Temps réponse max</small>
                      <div className="h5 mb-0">{metrics.maxResponseTime}ms</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Requêtes/minute</small>
                      <div className="h5 mb-0">{metrics.requestsPerMinute}</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Connexions actives</small>
                      <div className="h5 mb-0">{metrics.activeConnections}</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Métriques de base de données */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>
                <FaServer className="me-2" />
                Base de Données
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Connexions DB</small>
                      <div className="h5 mb-0">{metrics.dbConnections}</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div className="mb-3">
                      <small className="text-muted">Queries exécutées</small>
                      <div className="h5 mb-0">{(metrics.dbQueries || 0).toLocaleString()}</div>
                    </div>
                  </Col>
                  <Col sm={12}>
                    <div className="mb-3">
                      <small className="text-muted">Cache hit rate</small>
                      <div className="d-flex align-items-center">
                        <ProgressBar
                          className="flex-grow-1 me-2"
                          now={metrics.cacheHitRate * 100}
                          style={{ height: '8px' }}
                        />
                        <small>{(metrics.cacheHitRate * 100).toFixed(1)}%</small>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default MetricsPage;