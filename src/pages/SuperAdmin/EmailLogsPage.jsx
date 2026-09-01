import './audit-logs.css';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Form,
  Modal, Spinner
} from 'react-bootstrap';
import {
  FaEnvelope, FaEye, FaBuilding, FaTimes
} from 'react-icons/fa';
import { emailLogsService, entreprisesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

// ---------- Données statiques ----------

const EMAIL_GROUPS = [
  { label: 'Compte', types: [
    ['set-password-invitation', 'Invitation (définir mot de passe)'],
    ['welcome', 'Bienvenue'],
    ['welcome-activated', 'Activation compte'],
    ['password-reset', 'Réinitialisation mot de passe'],
    ['password-reset-confirmation', 'Confirmation reset mdp'],
    ['account-locked', 'Compte bloqué'],
    ['account-reactivated', 'Compte réactivé'],
    ['account-deactivated', 'Compte désactivé'],
    ['invitation-reminder', 'Relance invitation'],
    ['role-changed', 'Changement de rôle'],
    ['email-changed', 'Changement email'],
    ['2fa-enabled', 'Double authentification activée'],
    ['2fa-disabled', 'Double authentification désactivée'],
  ]},
  { label: 'Congés', types: [
    ['conge-validated', 'Congé validé'],
    ['conge-rejected', 'Congé refusé'],
    ['leave-reminder', 'Rappel congé'],
    ['leave-pending-reminder', 'Rappel validation en attente'],
    ['leave-updated-self-confirm', 'Modification congé (confirmation)'],
    ['leave-cancelled-by-admin', 'Annulation par admin'],
    ['leave-cancelled-self-confirm', 'Annulation (confirmation)'],
    ['low-balance', 'Solde faible'],
    ['balance-adjusted', 'Solde ajusté'],
    ['delegate-assigned', 'Délégué assigné'],
  ]},
  { label: 'Entreprise', types: [
    ['entreprise-created', 'Entreprise créée'],
    ['registration-confirmation', 'Confirmation inscription'],
    ['superadmin-notification', 'Notification super admin'],
    ['enterprise-suspended', 'Entreprise suspendue'],
    ['enterprise-reactivated', 'Entreprise réactivée'],
    ['monthly-report', 'Rapport mensuel'],
    ['alert', 'Alerte système'],
  ]},
];

const TYPE_LABELS = {};
EMAIL_GROUPS.forEach(g => g.types.forEach(([key, label]) => { TYPE_LABELS[key] = label; }));

const STATUT_BADGE = {
  success:   'approved',
  failed:    'refused',
  simulated: 'info',
};

const STATUT_LABELS = {
  success:   'Succès',
  failed:    'Échoué',
  simulated: 'Simulé',
};

// ---------- Helpers ----------

const formatDateTime = (ts) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const splitDateTime = (ts) => {
  const parts = formatDateTime(ts).split(' ');
  return { date: parts[0], time: parts[1] };
};

const getStatutBadge = (statut) => (
  <span className={`badge ${STATUT_BADGE[statut] || 'info'}`}>{STATUT_LABELS[statut] || statut}</span>
);

const getTypeBadge = (type) => (
  <span className="badge info" style={{ fontSize: '0.75em' }}>{TYPE_LABELS[type] || type || '—'}</span>
);

// ---------- Sous-composant label filtre ----------

const FilterLabel = ({ children }) => (
  <Form.Label className="audit-filter-label">{children}</Form.Label>
);

// ---------- Composant principal ----------

const EmailLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [allCompanies, setAllCompanies] = useState([]);

  const [companyFilter, setCompanyFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedLog, setSelectedLog] = useState(null);
  const alert = useAlert();
  const LIMIT = 25;

  useEffect(() => {
    entreprisesService.getAll().then(({ data }) => setAllCompanies(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const loadLogs = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);
      const params = {
        page:      overrides.page      ?? currentPage,
        limit:     LIMIT,
        sortBy:    overrides.sortBy    ?? sortBy,
        sortOrder: overrides.sortOrder ?? sortOrder,
      };

      const nextCompany  = overrides.companyFilter  ?? companyFilter;
      const nextTo       = overrides.toFilter       ?? toFilter;
      const nextType     = overrides.typeFilter     ?? typeFilter;
      const nextStatut   = overrides.statutFilter   ?? statutFilter;
      const nextDateDebut = overrides.dateDebut     ?? dateDebut;
      const nextDateFin   = overrides.dateFin       ?? dateFin;

      if (nextCompany)   params.entreprise_id = nextCompany;
      if (nextTo)        params.to_address    = nextTo;
      if (nextType)      params.type          = nextType;
      if (nextStatut)    params.statut        = nextStatut;
      if (nextDateDebut) params.dateDebut     = nextDateDebut;
      if (nextDateFin)   params.dateFin       = nextDateFin;

      const { data } = await emailLogsService.getAll(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Erreur chargement email logs:', err);
      alert.error('Erreur lors du chargement des logs email.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, companyFilter, toFilter, typeFilter, statutFilter, dateDebut, dateFin, sortBy, sortOrder]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleReset = () => {
    setCompanyFilter('');
    setToFilter('');
    setTypeFilter('');
    setStatutFilter('');
    setDateDebut('');
    setDateFin('');
    setSortBy('date');
    setSortOrder('DESC');
    setCurrentPage(1);
    loadLogs({
      page: 1,
      companyFilter: '', toFilter: '', typeFilter: '', statutFilter: '',
      dateDebut: '', dateFin: '', sortBy: 'date', sortOrder: 'DESC',
    });
  };

  return (
    <Container fluid="sm">

      {/* Header */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Logs Emails</span>
      </div>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">

            {/* Entreprise */}
            <Col xs={12} sm={6} md={3}>
              <FilterLabel>Entreprise</FilterLabel>
              <Form.Select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">Toutes les entreprises</option>
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </Form.Select>
            </Col>

            {/* Destinataire */}
            <Col xs={12} sm={6} md={2}>
              <FilterLabel>Destinataire</FilterLabel>
              <Form.Control
                type="text"
                placeholder="email@exemple.com"
                value={toFilter}
                onChange={(e) => { setToFilter(e.target.value); setCurrentPage(1); }}
              />
            </Col>

            {/* Type d'email */}
            <Col xs={12} sm={6} md={3}>
              <FilterLabel>Type d'email</FilterLabel>
              <Form.Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">Tous les types</option>
                {EMAIL_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.types.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </optgroup>
                ))}
              </Form.Select>
            </Col>

            {/* Statut */}
            <Col xs={12} sm={6} md={2}>
              <FilterLabel>Statut</FilterLabel>
              <Form.Select value={statutFilter} onChange={(e) => { setStatutFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">Tous</option>
                <option value="success">Succès</option>
                <option value="failed">Échoué</option>
                <option value="simulated">Simulé</option>
              </Form.Select>
            </Col>

            {/* Dates */}
            <Col xs={6} sm={3} md={1}>
              <FilterLabel>Du</FilterLabel>
              <Form.Control type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(1); }} />
            </Col>
            <Col xs={6} sm={3} md={1}>
              <FilterLabel>Au</FilterLabel>
              <Form.Control type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setCurrentPage(1); }} />
            </Col>

            {/* Tri */}
            <Col xs={6} sm={4} md={2}>
              <FilterLabel>Trier par</FilterLabel>
              <Form.Select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                <option value="date">Date</option>
                <option value="type">Type</option>
                <option value="statut">Statut</option>
                <option value="to">Destinataire</option>
                <option value="entreprise">Entreprise</option>
              </Form.Select>
            </Col>
            <Col xs={6} sm={2} md={1}>
              <FilterLabel>Ordre</FilterLabel>
              <Form.Select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}>
                <option value="DESC">↓ Récent</option>
                <option value="ASC">↑ Ancien</option>
              </Form.Select>
            </Col>

            {/* Compteur + reset */}
            <Col xs={12} md={2} className="audit-filters-actions">
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
                  {/* MOBILE : cards empilées (< md) */}
                  <div className="d-md-none mobile-card-list">
                    {logs.map((log) => (
                      <div key={log.id} className="audit-log-mobile-card">

                        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                          <div>
                            <div className="audit-user-name">{log.to_address || '—'}</div>
                            {log.entreprise && (
                              <span className="audit-user-email">{log.entreprise.nom}</span>
                            )}
                          </div>
                          {getStatutBadge(log.statut)}
                        </div>

                        <div className="audit-log-meta">
                          <span className="audit-date">{formatDateTime(log.created_at)}</span>
                          <span className="audit-entity">{getTypeBadge(log.type)}</span>
                        </div>

                        {log.provider && (
                          <div className="audit-log-ip">Provider : {log.provider}</div>
                        )}

                        <div className="audit-log-divider" />

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

                  {/* DESKTOP : table classique (>= md) */}
                  <div className="d-none d-md-block">
                    <Table hover responsive>
                      <thead>
                        <tr>
                          {[
                            { key: 'date',   label: 'Date/Heure' },
                            { key: 'to',     label: 'Destinataire' },
                            { key: 'type',   label: 'Type' },
                            { key: 'statut', label: 'Statut' },
                          ].map(col => (
                            <th key={col.key} style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => {
                                if (sortBy === col.key) { setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC'); }
                                else { setSortBy(col.key); setSortOrder('DESC'); }
                                setCurrentPage(1);
                              }}
                            >
                              {col.label}
                              {sortBy === col.key ? (sortOrder === 'DESC' ? ' ↓' : ' ↑') : ' ·'}
                            </th>
                          ))}
                          <th>Provider</th>
                          <th className="d-none d-lg-table-cell" style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => {
                              if (sortBy === 'entreprise') { setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC'); }
                              else { setSortBy('entreprise'); setSortOrder('ASC'); }
                              setCurrentPage(1);
                            }}
                          >
                            Entreprise{sortBy === 'entreprise' ? (sortOrder === 'DESC' ? ' ↓' : ' ↑') : ' ·'}
                          </th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const { date, time } = splitDateTime(log.created_at);
                          return (
                            <tr key={log.id}>
                              <td>
                                <small>
                                  <div className="audit-date-line">{date}</div>
                                  <span className="text-muted">{time}</span>
                                </small>
                              </td>
                              <td>
                                <strong>{log.to_address || '—'}</strong>
                                {log.utilisateur && (
                                  <div><small className="text-muted">{log.utilisateur.prenom} {log.utilisateur.nom}</small></div>
                                )}
                              </td>
                              <td>{getTypeBadge(log.type)}</td>
                              <td>{getStatutBadge(log.statut)}</td>
                              <td>
                                {log.provider ? (
                                  <code className="small">{log.provider}</code>
                                ) : '—'}
                              </td>
                              <td className="d-none d-lg-table-cell">
                                <small>{log.entreprise?.nom || '—'}</small>
                              </td>
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
                  <FaEnvelope size={48} className="text-muted" />
                  <h5>Aucun log trouvé</h5>
                  <p className="text-muted">Aucun email ne correspond aux filtres sélectionnés.</p>
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
          <Modal.Title>Détails du log email</Modal.Title>
        </Modal.Header>
        {selectedLog && (
          <>
            <Modal.Body>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Date / Heure</strong>
                  <div>{formatDateTime(selectedLog.created_at)}</div>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Statut</strong>
                  <div>{getStatutBadge(selectedLog.statut)}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Type</strong>
                  <div>{getTypeBadge(selectedLog.type)}</div>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Provider</strong>
                  <div>{selectedLog.provider ? <code>{selectedLog.provider}</code> : '—'}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Expéditeur</strong>
                  <div><code className="small">{selectedLog.from_address || '—'}</code></div>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Destinataire</strong>
                  <div><code className="small">{selectedLog.to_address || '—'}</code></div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12}>
                  <strong>Sujet</strong>
                  <div>{selectedLog.subject || '—'}</div>
                </Col>
              </Row>
              {selectedLog.message_id && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <strong>Message ID (provider)</strong>
                    <div><code className="small text-break">{selectedLog.message_id}</code></div>
                  </Col>
                </Row>
              )}
              {selectedLog.error_message && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <strong>Erreur</strong>
                    <div className="text-danger small text-break">{selectedLog.error_message}</div>
                  </Col>
                </Row>
              )}
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Entreprise</strong>
                  <div>{selectedLog.entreprise?.nom || '—'}</div>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Utilisateur lié</strong>
                  <div>
                    {selectedLog.utilisateur
                      ? `${selectedLog.utilisateur.prenom} ${selectedLog.utilisateur.nom} — ${selectedLog.utilisateur.email}`
                      : '—'}
                  </div>
                </Col>
              </Row>
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

export default EmailLogsPage;
