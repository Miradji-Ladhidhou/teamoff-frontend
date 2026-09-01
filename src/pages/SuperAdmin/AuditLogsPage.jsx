import './audit-logs.css';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Row, Col, Card, Table, Button, Form,
  Modal, Spinner
} from 'react-bootstrap';
import {
  FaHistory, FaDownload, FaEye, FaUser, FaBuilding,
  FaCalendarCheck, FaTimes
} from 'react-icons/fa';
import { auditService, usersService, exportsService, entreprisesService, formatGeneratedAt } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

// ---------- Helpers purs (hors composant — stables entre renders) ----------

const ACTION_BADGE_CLASS = {
  // Auth
  LOGIN_SUCCESS: 'approved', LOGIN_FAILED: 'refused', LOGOUT: 'info',
  ACCOUNT_LOCKED: 'refused',
  PASSWORD_CHANGED: 'info', PASSWORD_RESET_REQUEST: 'pending', PASSWORD_RESET_SUCCESS: 'approved',
  TWO_FACTOR_ENABLED: 'approved', TWO_FACTOR_DISABLED: 'pending', TWO_FACTOR_VERIFIED: 'info',
  INVITE_EXPIRED: 'refused',
  // Congés
  CONGE_CREATED: 'approved', CONGE_UPDATED: 'info', CONGE_DELETED: 'refused',
  CONGE_APPROVED: 'approved', CONGE_REJECTED: 'refused',
  CONGE_RESERVE_ACTIVATED: 'info', CONGE_RESERVE_SKIPPED: 'pending',
  CONGE_OVERLAP_BLOCKED: 'refused', QUOTA_INSUFFICIENT: 'refused',
  // Imports
  IMPORT_USERS_SUCCESS: 'approved', IMPORT_USERS_FAILED: 'refused',
  IMPORT_CONGES_SUCCESS: 'approved', IMPORT_CONGES_FAILED: 'refused',
  // Exports
  EXPORT_CSV_GENERATED: 'info',
  // Users / entreprises
  USER_CREATED: 'approved', USER_UPDATED: 'info', USER_DELETED: 'refused', ROLE_CHANGED: 'pending',
  ENTREPRISE_CREATED: 'approved', ENTREPRISE_UPDATED: 'info', ENTREPRISE_DELETED: 'refused',
  // Compteurs
  COUNTER_UPDATED: 'info', COUNTER_DELETED: 'refused',
  // Système
  SYSTEM_SETTINGS_UPDATED: 'info', SYSTEM_BACKUP_CREATED: 'approved',
  SYSTEM_MAINTENANCE_TOGGLED: 'pending', SYSTEM_RESTART_REQUESTED: 'pending',
  SYSTEM_TEST_EMAIL_SENT: 'info', SYSTEM_BACKUP_DOWNLOADED: 'info',
};

const ACTION_LABELS = {
  LOGIN_SUCCESS: 'Connexion réussie', LOGIN_FAILED: 'Connexion échouée', LOGOUT: 'Déconnexion',
  ACCOUNT_LOCKED: 'Compte bloqué',
  PASSWORD_CHANGED: 'Mot de passe changé', PASSWORD_RESET_REQUEST: 'Reset demandé', PASSWORD_RESET_SUCCESS: 'Reset réussi',
  TWO_FACTOR_ENABLED: '2FA activé', TWO_FACTOR_DISABLED: '2FA désactivé', TWO_FACTOR_VERIFIED: '2FA vérifié',
  INVITE_EXPIRED: 'Invitation expirée',
  CONGE_CREATED: 'Congé créé', CONGE_UPDATED: 'Congé modifié', CONGE_DELETED: 'Congé supprimé',
  CONGE_APPROVED: 'Congé approuvé', CONGE_REJECTED: 'Congé refusé',
  CONGE_RESERVE_ACTIVATED: 'Réservation activée', CONGE_RESERVE_SKIPPED: 'Réservation ignorée',
  CONGE_OVERLAP_BLOCKED: 'Chevauchement bloqué', QUOTA_INSUFFICIENT: 'Solde insuffisant',
  IMPORT_USERS_SUCCESS: 'Import employés ✓', IMPORT_USERS_FAILED: 'Import employés ✗',
  IMPORT_CONGES_SUCCESS: 'Import congés ✓', IMPORT_CONGES_FAILED: 'Import congés ✗',
  EXPORT_CSV_GENERATED: 'Export CSV généré',
  USER_CREATED: 'Utilisateur créé', USER_UPDATED: 'Utilisateur modifié', USER_DELETED: 'Utilisateur supprimé',
  ROLE_CHANGED: 'Rôle modifié',
  ENTREPRISE_CREATED: 'Entreprise créée', ENTREPRISE_UPDATED: 'Entreprise modifiée', ENTREPRISE_DELETED: 'Entreprise supprimée',
  COUNTER_UPDATED: 'Solde modifié', COUNTER_DELETED: 'Compteur supprimé',
  SYSTEM_SETTINGS_UPDATED: 'Paramètres modifiés', SYSTEM_BACKUP_CREATED: 'Sauvegarde créée',
  SYSTEM_BACKUP_DOWNLOADED: 'Sauvegarde téléchargée',
  SYSTEM_MAINTENANCE_TOGGLED: 'Maintenance modifiée', SYSTEM_RESTART_REQUESTED: 'Redémarrage demandé',
  SYSTEM_TEST_EMAIL_SENT: 'Email test envoyé',
};

const ACTION_GROUPS = [
  { label: 'Authentification', actions: ['LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT','ACCOUNT_LOCKED','PASSWORD_CHANGED','PASSWORD_RESET_REQUEST','PASSWORD_RESET_SUCCESS','TWO_FACTOR_ENABLED','TWO_FACTOR_DISABLED','TWO_FACTOR_VERIFIED','INVITE_EXPIRED'] },
  { label: 'Congés', actions: ['CONGE_CREATED','CONGE_UPDATED','CONGE_DELETED','CONGE_APPROVED','CONGE_REJECTED','CONGE_RESERVE_ACTIVATED','CONGE_RESERVE_SKIPPED','CONGE_OVERLAP_BLOCKED','QUOTA_INSUFFICIENT'] },
  { label: 'Imports / Exports', actions: ['IMPORT_USERS_SUCCESS','IMPORT_USERS_FAILED','IMPORT_CONGES_SUCCESS','IMPORT_CONGES_FAILED','EXPORT_CSV_GENERATED'] },
  { label: 'Utilisateurs', actions: ['USER_CREATED','USER_UPDATED','USER_DELETED','ROLE_CHANGED'] },
  { label: 'Entreprises', actions: ['ENTREPRISE_CREATED','ENTREPRISE_UPDATED','ENTREPRISE_DELETED'] },
  { label: 'Soldes', actions: ['COUNTER_UPDATED','COUNTER_DELETED'] },
  { label: 'Système', actions: ['SYSTEM_SETTINGS_UPDATED','SYSTEM_BACKUP_CREATED','SYSTEM_BACKUP_DOWNLOADED','SYSTEM_MAINTENANCE_TOGGLED','SYSTEM_RESTART_REQUESTED','SYSTEM_TEST_EMAIL_SENT'] },
];

const getActionBadge = (action) => (
  <span className={`badge ${ACTION_BADGE_CLASS[action] || 'info'}`}>{ACTION_LABELS[action] || action}</span>
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

const formatDateTime = (ts) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

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
  const [allUsers, setAllUsers] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const alert = useAlert();
  const [selectedLog, setSelectedLog] = useState(null);
  const [exporting, setExporting] = useState(false);
  const LIMIT = 20;

  const userOptions = useMemo(() => {
    const filtered = companyFilter ? allUsers.filter(u => u.entreprise_id === companyFilter) : allUsers;
    return [...filtered].sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`));
  }, [allUsers, companyFilter]);

  useEffect(() => {
    usersService.getAll().then(({ data }) => setAllUsers(data || [])).catch(() => {});
    entreprisesService.getAll().then(({ data }) => setAllCompanies(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  // Logique métier inchangée
  const loadLogs = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);
      const params = {
        page: overrides.page ?? currentPage,
        limit: LIMIT,
      };
      const nextActionFilter  = overrides.actionFilter  ?? actionFilter;
      const nextUserFilter    = overrides.userFilter    ?? userFilter;
      const nextCompanyFilter = overrides.companyFilter ?? companyFilter;
      const nextDateDebut     = overrides.dateDebut     ?? dateDebut;
      const nextDateFin       = overrides.dateFin       ?? dateFin;
      const nextSortBy        = overrides.sortBy        ?? sortBy;
      const nextSortOrder     = overrides.sortOrder     ?? sortOrder;

      if (nextActionFilter)  params.action        = nextActionFilter;
      if (nextUserFilter)    params.utilisateur_id = nextUserFilter;
      if (nextCompanyFilter) params.entreprise_id  = nextCompanyFilter;
      if (nextDateDebut)     params.dateDebut      = nextDateDebut;
      if (nextDateFin)       params.dateFin        = nextDateFin;
      params.sortBy    = nextSortBy;
      params.sortOrder = nextSortOrder;

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
  }, [currentPage, userFilter, companyFilter, actionFilter, dateDebut, dateFin, sortBy, sortOrder]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleReset = () => {
    setUserFilter('');
    setCompanyFilter('');
    setActionFilter('');
    setDateDebut('');
    setDateFin('');
    setSortBy('date');
    setSortOrder('DESC');
    setCurrentPage(1);
    loadLogs({ page: 1, userFilter: '', companyFilter: '', actionFilter: '', dateDebut: '', dateFin: '', sortBy: 'date', sortOrder: 'DESC' });
  };

  const exportLogs = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await exportsService.exportAuditCSV({
        generatedAt:    formatGeneratedAt(),
        action:         actionFilter   || undefined,
        utilisateur_id: userFilter     || undefined,
        entreprise_id:  companyFilter  || undefined,
        dateDebut:      dateDebut      || undefined,
        dateFin:        dateFin        || undefined,
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
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container fluid="sm">

      {/* Header */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Logs d'Audit</span>
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={exportLogs} disabled={exporting}>
            <FaDownload className="me-2" />
            {exporting ? 'Export…' : 'Exporter CSV'}
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-2 align-items-end">

            {/* Entreprise */}
            <Col xs={12} sm={6} md={3}>
              <FilterLabel>Entreprise</FilterLabel>
              <Form.Select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setUserFilter(''); setCurrentPage(1); }}>
                <option value="">Toutes les entreprises</option>
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </Form.Select>
            </Col>

            {/* Utilisateur : pleine largeur sur mobile */}
            <Col xs={12} sm={6} md={3}>
              <FilterLabel>Utilisateur</FilterLabel>
              <Form.Select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">Tous les utilisateurs</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom}
                  </option>
                ))}
              </Form.Select>
            </Col>

            {/* Action */}
            <Col xs={12} sm={6} md={2}>
              <FilterLabel>Action</FilterLabel>
              <Form.Select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">Toutes les actions</option>
                {ACTION_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.actions.map(a => (
                      <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
                    ))}
                  </optgroup>
                ))}
              </Form.Select>
            </Col>

            {/* Dates : côte à côte sur mobile (xs=6) */}
            <Col xs={6} sm={3} md={2}>
              <FilterLabel>Du</FilterLabel>
              <Form.Control type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(1); }} />
            </Col>
            <Col xs={6} sm={3} md={2}>
              <FilterLabel>Au</FilterLabel>
              <Form.Control type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setCurrentPage(1); }} />
            </Col>

            {/* Tri */}
            <Col xs={6} sm={4} md={2}>
              <FilterLabel>Trier par</FilterLabel>
              <Form.Select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                <option value="date">Date</option>
                <option value="action">Action</option>
                <option value="entity">Entité</option>
                <option value="utilisateur">Salarié</option>
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

            {/* Compteur + reset — séparé visuellement sur mobile via CSS */}
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
                          <span className="audit-date">{formatDateTime(log.createdAt ?? log.created_at)}</span>
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
                          {[
                            { key: 'date',        label: 'Date/Heure' },
                            { key: 'utilisateur', label: 'Salarié' },
                            { key: 'action',      label: 'Action' },
                            { key: 'entity',      label: 'Entité' },
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
                          <th className="d-none d-lg-table-cell" style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => {
                              if (sortBy === 'entreprise') { setSortOrder(o => o === 'ASC' ? 'DESC' : 'ASC'); }
                              else { setSortBy('entreprise'); setSortOrder('ASC'); }
                              setCurrentPage(1);
                            }}
                          >
                            Entreprise{sortBy === 'entreprise' ? (sortOrder === 'DESC' ? ' ↓' : ' ↑') : ' ·'}
                          </th>
                          <th>IP</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const { date, time } = splitDateTime(log.createdAt ?? log.created_at);
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
                  <div>{formatDateTime(selectedLog.createdAt ?? selectedLog.created_at)}</div>
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
                  <pre className="border rounded p-3 mt-1 small scroll-modal-content" style={{ background: 'var(--dk-card, #f8f9fa)' }}>
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
