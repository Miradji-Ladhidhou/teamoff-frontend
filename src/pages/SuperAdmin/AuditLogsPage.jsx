import './audit-logs.css';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Form,
  InputGroup, Modal, Spinner
} from 'react-bootstrap';
import {
  FaHistory, FaSearch, FaDownload, FaEye, FaUser, FaBuilding,
  FaCalendarCheck, FaTimes
} from 'react-icons/fa';
import { auditService, exportsService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

// ---------- Helpers purs (hors composant — stables entre renders) ----------

const ACTION_BADGE_CLASS = {
  CREATE: 'approved',
  UPDATE: 'info',
  DELETE: 'refused',
  LOGIN: 'info',
  LOGOUT: 'info',
  VALIDATE: 'approved',
  REJECT: 'pending',
};

const getActionBadge = (action) => (
  <span className={`badge ${ACTION_BADGE_CLASS[action] || 'info'}`}>{action}</span>
);

const getEntityIcon = (entity) => {
  switch (entity) {
    case 'USER':
    case 'UTILISATEUR':
      return <FaUser />;
    case 'CONGE':
      return <FaCalendarCheck />;
    case 'ENTREPRISE':
      return <FaBuilding />;
    default:
      return <FaHistory />;
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

// Calcul unique date+heure pour éviter le double appel dans la table desktop
const splitDateTime = (ts) => {
  const parts = formatDateTime(ts).split(' ');
  return { date: parts[0], time: parts[1] };
};

// ---------- Sous-composant label filtre (markup uniquement) ----------

const FilterLabel = ({ children }) => (
  <Form.Label className="audit-filter-label">{children}</Form.Label>
);

// ---------- Composant principal ----------

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

  // Logique métier inchangée
  const loadLogs = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);
      const params = {
        page: overrides.page ?? currentPage,
        limit: LIMIT,
      };
      const nextActionFilter = overrides.actionFilter ?? actionFilter;
      const nextSearchTerm   = overrides.searchTerm  ?? searchTerm;
      const nextDateDebut    = overrides.dateDebut   ?? dateDebut;
      const nextDateFin      = overrides.dateFin     ?? dateFin;

      if (nextActionFilter) params.action    = nextActionFilter;
      if (nextSearchTerm)   params.search    = nextSearchTerm;
      if (nextDateDebut)    params.dateDebut = nextDateDebut;
      if (nextDateFin)      params.dateFin   = nextDateFin;

      const { data } = await auditService.getAll(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Erreur chargement logs:', err);
      alert.error("Erreur lors du chargement des logs d'audit.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, actionFilter, dateDebut, dateFin]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Remet la page à 1 quand un filtre change.
  // NOTE : double passe voulue — ne pas modifier.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, dateDebut, dateFin]);

  const handleReset = () => {
    setSearchTerm('');
    setActionFilter('');
    setDateDebut('');
    setDateFin('');
    setCurrentPage(1);
    loadLogs({ page: 1, searchTerm: '', actionFilter: '', dateDebut: '', dateFin: '' });
  };

  // Fix Firefox : appendChild/removeChild autour du click
  const exportLogs = async () => {
    try {
      const response = await exportsService.exportAuditCSV({
        action:    actionFilter || undefined,
        search:    searchTerm  || undefined,
        dateDebut: dateDebut   || undefined,
        dateFin:   dateFin     || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert.error("Erreur lors de l'export CSV.");
    }
  };

  return (
    <Container fluid="sm">

      {/* Header */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Logs d'Audit</span>
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={exportLogs}>
            <FaDownload className="me-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">

            {/* Recherche : pleine largeur sur mobile */}
            <Col xs={12} md={3}>
              <FilterLabel>Recherche</FilterLabel>
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

            {/* Action : demi-largeur sur xs, propre sur sm+ */}
            <Col xs={12} sm={6} md={2}>
              <FilterLabel>Action</FilterLabel>
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

            {/* Dates : côte à côte sur mobile (xs=6) */}
            <Col xs={6} sm={3} md={2}>
              <FilterLabel>Du</FilterLabel>
              <Form.Control type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </Col>
            <Col xs={6} sm={3} md={2}>
              <FilterLabel>Au</FilterLabel>
              <Form.Control type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </Col>

            {/* Compteur + reset — séparé visuellement sur mobile via CSS */}
            <Col xs={12} md={3} className="audit-filters-actions">
              <span className="badge info">
                {total} résultat{total > 1 ? 's' : ''}
              </span>
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
              {logs.length > 0 && (
                <>
                  {/* ── MOBILE : cards empilées (< md) ── */}
                  <div className="d-md-none mobile-card-list">
                    {logs.map((log) => (
                      <div key={log.id} className="audit-log-mobile-card">

                        {/* Ligne 1 : utilisateur + badge action */}
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <div>
                            <div className="audit-user-name">{getUserLabel(log)}</div>
                            {log.utilisateur && (
                              <span className="audit-user-email">{log.utilisateur.email}</span>
                            )}
                          </div>
                          {getActionBadge(log.action)}
                        </div>

                        {/* Ligne 2 : date · entité */}
                        <div className="audit-log-meta">
                          <span className="audit-date">{formatDateTime(log.createdAt)}</span>
                          <span className="audit-entity">
                            {getEntityIcon(log.entity)}
                            {log.entity || '—'}
                          </span>
                        </div>

                        {/* Ligne 3 : IP */}
                        <div className="audit-log-ip">IP : {log.ip_address || '—'}</div>

                        <div className="audit-log-divider" />

                        {/* CTA */}
                        <Button
                          variant="outline-info"
                          size="sm"
                          title="Voir détails complets"
                          onClick={() => setSelectedLog(log)}
                        >
                          <FaEye className="me-2" />
                          Voir les détails
                        </Button>

                      </div>
                    ))}
                  </div>

                  {/* ── DESKTOP : table classique (≥ md) ── */}
                  <div className="d-none d-md-block">
                    <Table hover responsive>
                      <thead>
                        <tr>
                          <th>Date/Heure</th>
                          <th>Utilisateur</th>
                          <th>Action</th>
                          <th>Entité</th>
                          {/* Entreprise masquée sur md étroit, visible dès lg */}
                          <th className="d-none d-lg-table-cell">Entreprise</th>
                          <th>IP</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const { date, time } = splitDateTime(log.createdAt);
                          return (
                            <tr key={log.id}>
                              <td>
                                <small>
                                  <div className="audit-date-line">{date}</div>
                                  <span className="text-muted">{time}</span>
                                </small>
                              </td>
                              <td>
                                <strong>{getUserLabel(log)}</strong>
                                {log.utilisateur && (
                                  <div><small className="text-muted">{log.utilisateur.email}</small></div>
                                )}
                              </td>
                              <td>{getActionBadge(log.action)}</td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  {getEntityIcon(log.entity)}
                                  <span>{log.entity || '—'}</span>
                                </div>
                              </td>
                              <td className="d-none d-lg-table-cell">
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
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {/* État vide */}
              {logs.length === 0 && (
                <div className="audit-empty">
                  <FaHistory size={48} className="text-muted" />
                  <h5>Aucun log trouvé</h5>
                  <p className="text-muted">Aucun événement ne correspond aux filtres sélectionnés.</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="audit-pagination">
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
          <>
            <Modal.Body>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Date / Heure</strong>
                  <div>{formatDateTime(selectedLog.createdAt)}</div>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Action</strong>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Utilisateur</strong>
                  <div>{getUserLabel(selectedLog)}</div>
                  {selectedLog.utilisateur && (
                    <small className="text-muted">{selectedLog.utilisateur.email}</small>
                  )}
                </Col>
                <Col xs={12} md={6}>
                  <strong>Entreprise</strong>
                  <div>{selectedLog.entreprise?.nom || '—'}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12}>
                  <strong>Entité</strong>
                  <div>{selectedLog.entity || '—'}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Adresse IP</strong>
                  <div><code>{selectedLog.ip_address || '—'}</code></div>
                </Col>
                <Col xs={12} md={6}>
                  <strong>User Agent</strong>
                  <div className="text-break">
                    <small className="text-muted">{selectedLog.user_agent || '—'}</small>
                  </div>
                </Col>
              </Row>
              {selectedLog.metadata && (
                <div>
                  <strong>Métadonnées</strong>
                  <pre className="bg-light border rounded p-3 mt-1 small scroll-modal-content">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>Fermer</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

    </Container>
  );
};

export default AuditLogs;
