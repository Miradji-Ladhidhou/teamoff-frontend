import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Badge, Form,
  InputGroup, Alert, Modal, Spinner
} from 'react-bootstrap';
import {
  FaHistory, FaSearch, FaDownload, FaEye, FaUser, FaBuilding,
  FaCalendarCheck, FaTimes
} from 'react-icons/fa';
import { auditService, exportsService } from '../../services/api';
import { InfoCardInfo, TipCard } from '../../components/InfoCard';
import { useAlert } from '../../hooks/useAlert';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const alert = useAlert();
  const [selectedLog, setSelectedLog] = useState(null);
  const LIMIT = 20;

  const loadLogs = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);
      const params = {
        page: overrides.page ?? currentPage,
        limit: LIMIT,
      };
      const nextActionFilter = overrides.actionFilter ?? actionFilter;
      const nextSearchTerm = overrides.searchTerm ?? searchTerm;
      const nextDateDebut = overrides.dateDebut ?? dateDebut;
      const nextDateFin = overrides.dateFin ?? dateFin;

      if (nextActionFilter) params.action = nextActionFilter;
      if (nextSearchTerm) params.search = nextSearchTerm;
      if (nextDateDebut) params.dateDebut = nextDateDebut;
      if (nextDateFin) params.dateFin = nextDateFin;

      const { data } = await auditService.getAll(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Erreur chargement logs:', err);
      alert.error('Erreur lors du chargement des logs d\'audit.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, actionFilter, dateDebut, dateFin]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Remet la page à 1 quand un filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, dateDebut, dateFin]);

  const handleReset = () => {
    setSearchTerm('');
    setActionFilter('');
    setDateDebut('');
    setDateFin('');
    setCurrentPage(1);
    loadLogs({
      page: 1,
      searchTerm: '',
      actionFilter: '',
      dateDebut: '',
      dateFin: '',
    });
  };

  const exportLogs = async () => {
    try {
      const response = await exportsService.exportAuditCSV({
        action: actionFilter || undefined,
        search: searchTerm || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert.error('Erreur lors de l\'export CSV.');
    }
  };

  const getActionBadge = (action) => {
    const variants = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'danger',
      LOGIN: 'primary',
      LOGOUT: 'secondary',
      VALIDATE: 'success',
      REJECT: 'warning',
    };
    return <Badge bg={variants[action] || 'secondary'}>{action}</Badge>;
  };

  const getEntityIcon = (entity) => {
    switch (entity) {
      case 'USER': case 'UTILISATEUR': return <FaUser />;
      case 'CONGE': return <FaCalendarCheck />;
      case 'ENTREPRISE': return <FaBuilding />;
      default: return <FaHistory />;
    }
  };

  const formatDateTime = (ts) =>
    new Date(ts).toLocaleString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const getUserLabel = (log) => {
    if (log.utilisateur) {
      return `${log.utilisateur.prenom || ''} ${log.utilisateur.nom}`.trim();
    }
    return 'Système';
  };

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-1">Logs d'Audit</h1>
          <p className="text-muted">Historique des actions système et utilisateur</p>
        </div>
        <Button variant="outline-success" onClick={exportLogs}>
          <FaDownload className="me-2" />
          Exporter CSV
        </Button>
      </div>

      

      <InfoCardInfo title="Utiliser les logs d'audit">
        <ul className="mb-0">
          <li>Filtrez par action pour retrouver un événement précis</li>
          <li>Croisez utilisateur, entreprise et IP pour enquêter</li>
          <li>Exportez en CSV pour archiver ou partager l'analyse</li>
        </ul>
      </InfoCardInfo>

      <TipCard title="Réflexe sécurité">
        Concentrez-vous sur les actions sensibles (DELETE, LOGIN, UPDATE) et vérifiez les adresses IP inhabituelles.
      </TipCard>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={3}>
              <Form.Label className="mb-1 small">Recherche</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Utilisateur, action, IP…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1 small">Action</Form.Label>
              <Form.Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">Toutes les actions</option>
                <option value="LOGIN_SUCCESS">Connexion réussie</option>
                <option value="LOGIN_FAILED">Connexion échouée</option>
                <option value="SYSTEM_SETTINGS_UPDATED">Paramètres système modifiés</option>
                <option value="SYSTEM_MAINTENANCE_TOGGLED">Mode maintenance modifié</option>
                <option value="SYSTEM_BACKUP_CREATED">Sauvegarde créée</option>
                <option value="SYSTEM_TEST_EMAIL_SENT">Email de test envoyé</option>
                <option value="SYSTEM_RESTART_REQUESTED">Redémarrage demandé</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1 small">Du</Form.Label>
              <Form.Control type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1 small">Au</Form.Label>
              <Form.Control type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </Col>
            <Col md={3} className="d-flex align-items-end justify-content-end gap-2">
              <Badge bg="secondary" className="py-2 px-3">{total} résultat{total > 1 ? 's' : ''}</Badge>
              <Button variant="outline-secondary" size="sm" onClick={handleReset}>
                <FaTimes className="me-1" />Réinitialiser
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table des logs */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Chargement des logs…</p>
            </div>
          ) : (
            <>
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Date/Heure</th>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>Entreprise</th>
                    <th>IP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <small>
                          <div>{formatDateTime(log.createdAt).split(' ')[0]}</div>
                          <span className="text-muted">{formatDateTime(log.createdAt).split(' ')[1]}</span>
                        </small>
                      </td>
                      <td>
                        <div>
                          <strong>{getUserLabel(log)}</strong>
                          {log.utilisateur && (
                            <div><small className="text-muted">{log.utilisateur.email}</small></div>
                          )}
                        </div>
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          {getEntityIcon(log.entity)}
                          <span>{log.entity || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <small>{log.entreprise?.nom || '—'}</small>
                      </td>
                      <td><code className="small">{log.ip_address || '—'}</code></td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          title="Voir détails complets"
                          onClick={() => setSelectedLog(log)}
                        >
                          <FaEye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {logs.length === 0 && (
                <div className="text-center py-4">
                  <FaHistory size={48} className="text-muted mb-3" />
                  <h5>Aucun log trouvé</h5>
                  <p className="text-muted">Aucun événement ne correspond aux filtres sélectionnés.</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center align-items-center gap-3 mt-3">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Précédent
                  </Button>
                  <span className="text-muted small">Page {currentPage} / {totalPages}</span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modale détails */}
      <Modal show={!!selectedLog} onHide={() => setSelectedLog(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Détails du log d'audit</Modal.Title>
        </Modal.Header>
        {selectedLog && (
          <Modal.Body>
            <Row className="mb-3">
              <Col md={6}>
                <strong>Date / Heure</strong>
                <div>{formatDateTime(selectedLog.createdAt)}</div>
              </Col>
              <Col md={6}>
                <strong>Action</strong>
                <div>{getActionBadge(selectedLog.action)}</div>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}>
                <strong>Utilisateur</strong>
                <div>{getUserLabel(selectedLog)}</div>
                {selectedLog.utilisateur && (
                  <div><small className="text-muted">{selectedLog.utilisateur.email}</small></div>
                )}
              </Col>
              <Col md={6}>
                <strong>Entreprise</strong>
                <div>{selectedLog.entreprise?.nom || '—'}</div>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={12}>
                <strong>Entité</strong>
                <div>{selectedLog.entity || '—'}</div>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}>
                <strong>Adresse IP</strong>
                <div><code>{selectedLog.ip_address || '—'}</code></div>
              </Col>
              <Col md={6}>
                <strong>User Agent</strong>
                <div className="text-break">
                  <small className="text-muted">{selectedLog.user_agent || '—'}</small>
                </div>
              </Col>
            </Row>
            {selectedLog.metadata && (
              <div>
                <strong>Métadonnées</strong>
                <pre
                  className="bg-light border rounded p-3 mt-1 small"
                  style={{ maxHeight: 200, overflowY: 'auto' }}
                >
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedLog(null)}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AuditLogs;