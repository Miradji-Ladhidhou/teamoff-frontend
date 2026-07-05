import './historique-conges.css';
import '../../styles/settings.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Form, Table, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { congesService, quotasService, usersService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const STATUS_MAP = {
  en_attente_manager: { label: 'En attente',       cls: 'status-badge--pending' },
  valide_manager:     { label: 'Validé manager',   cls: 'status-badge--info'    },
  valide_final:       { label: 'Approuvé',          cls: 'status-badge--success' },
  refuse_manager:     { label: 'Refusé',            cls: 'status-badge--danger'  },
  refuse_final:       { label: 'Refusé',            cls: 'status-badge--danger'  },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtNum = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? (v % 1 === 0 ? String(v) : v.toFixed(1)) : '—';
};

const HistoriqueCongesPage = () => {
  const { user } = useAuth();
  const alert = useAlert();

  const isEmployee = user?.role === 'employe';
  const canViewOthers = ['manager', 'admin_entreprise', 'super_admin'].includes(user?.role);

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedUserId, setSelectedUserId] = useState(isEmployee ? (user?.id || '') : '');
  const [statusFilter, setStatusFilter] = useState('');

  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load users for manager/admin dropdown
  useEffect(() => {
    if (!canViewOthers) return;
    usersService.getAll()
      .then((resp) => {
        const list = Array.isArray(resp.data) ? resp.data : [];
        setUsers(
          list
            .filter((u) => ['employe', 'manager'].includes(u.role))
            .sort((a, b) =>
              `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')
            )
        );
      })
      .catch(() => {});
  }, [canViewOthers]);

  const loadData = useCallback(async () => {
    const userId = isEmployee ? user?.id : selectedUserId;
    setLoading(true);
    try {
      const params = { limit: 200, annee: selectedYear };
      if (userId) params.utilisateur_id = userId;

      const [leavesResp, balanceResp] = await Promise.all([
        congesService.getAll(params),
        userId
          ? quotasService.getSoldes(userId, { annee: selectedYear })
          : Promise.resolve(null),
      ]);

      const items = Array.isArray(leavesResp.data?.items)
        ? leavesResp.data.items
        : Array.isArray(leavesResp.data)
        ? leavesResp.data
        : [];

      setLeaves(items);
      setBalance(balanceResp?.data?.soldes || []);
    } catch {
      alert.error("Impossible de charger l'historique des congés.");
    } finally {
      setLoading(false);
    }
  }, [isEmployee, user?.id, selectedUserId, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLeaves = useMemo(() => {
    const sorted = [...leaves].sort(
      (a, b) => new Date(b.date_debut) - new Date(a.date_debut)
    );
    if (!statusFilter) return sorted;
    return sorted.filter((l) => l.statut === statusFilter);
  }, [leaves, statusFilter]);

  const selectedUserLabel = useMemo(() => {
    if (!selectedUserId) return null;
    if (selectedUserId === user?.id) return `${user?.prenom} ${user?.nom}`;
    const u = users.find((u) => u.id === selectedUserId);
    return u ? `${u.prenom} ${u.nom}` : null;
  }, [selectedUserId, users, user]);

  const showEmployeeCol = canViewOthers && !selectedUserId;

  return (
    <Container fluid="sm">
      <div className="page-title-bar mb-3">
        <span className="section-title-bar__text">Historique des congés</span>
      </div>

      {/* ── Filtres ── */}
      <div className="settings-card mb-3">
        <div className="settings-card__body">
          <Row className="g-2 align-items-end">
            <Col xs={6} sm="auto">
              <Form.Label className="form-label">Année</Form.Label>
              <Form.Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ width: 110 }}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Form.Select>
            </Col>

            {canViewOthers && (
              <Col xs={12} sm>
                <Form.Label className="form-label">Employé</Form.Label>
                <Form.Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Tous les employés</option>
                  <option value={user?.id}>Moi — {user?.prenom} {user?.nom}</option>
                  {users
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.prenom} {u.nom}{u.service ? ` (${u.service})` : ''}
                      </option>
                    ))}
                </Form.Select>
              </Col>
            )}

            <Col xs={6} sm="auto">
              <Form.Label className="form-label">Statut</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente_manager">En attente</option>
                <option value="valide_manager">Validé manager</option>
                <option value="valide_final">Approuvé</option>
                <option value="refuse_manager">Refusé (manager)</option>
                <option value="refuse_final">Refusé (admin)</option>
              </Form.Select>
            </Col>
          </Row>
        </div>
      </div>

      {/* ── Soldes par type ── */}
      {!loading && balance.length > 0 && (
        <div className="mb-3">
          <div className="section-label-title mb-2">
            Soldes {selectedYear}
            {selectedUserLabel ? ` — ${selectedUserLabel}` : ''}
          </div>
          <div className="historique-balance-grid">
            {balance.map((b) => (
              <div key={b.conge_type_id} className="historique-balance-card">
                <div className="historique-balance-card__type">{b.conge_type}</div>
                <div className="historique-balance-card__stats">
                  <div className="historique-balance-stat">
                    <span className="historique-balance-stat__val">{fmtNum(b.jours_acquis)}</span>
                    <span className="historique-balance-stat__lbl">Acquis</span>
                  </div>
                  <div className="historique-balance-stat">
                    <span
                      className="historique-balance-stat__val"
                      style={{ color: 'var(--dk-success)' }}
                    >
                      {fmtNum(b.jours_pris)}
                    </span>
                    <span className="historique-balance-stat__lbl">Pris</span>
                  </div>
                  <div className="historique-balance-stat">
                    <span
                      className="historique-balance-stat__val"
                      style={{ color: 'var(--dk-warning)' }}
                    >
                      {fmtNum(b.jours_reserves)}
                    </span>
                    <span className="historique-balance-stat__lbl">Réservés</span>
                  </div>
                  <div className="historique-balance-stat">
                    <span
                      className="historique-balance-stat__val"
                      style={{ color: 'var(--dk-accent)' }}
                    >
                      {fmtNum(b.solde_disponible)}
                    </span>
                    <span className="historique-balance-stat__lbl">Solde</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Liste des congés ── */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="settings-card">
          <div className="settings-card__body text-center py-4 text-muted">
            Aucun congé pour {selectedYear}
            {statusFilter ? ` avec le statut sélectionné` : ''}.
          </div>
        </div>
      ) : (
        <div className="conges-list-wrap">
          {/* Mobile */}
          <div className="user-list-mobile d-md-none">
            {filteredLeaves.map((leave) => {
              const s = STATUS_MAP[leave.statut] || { label: leave.statut, cls: 'status-badge--pending' };
              const typeLabel = leave.conge_type_libelle || leave.conge_type?.libelle || '—';
              const comment = leave.commentaire_admin || leave.commentaire_manager || leave.commentaire_employe || '';
              return (
                <Link
                  key={leave.id}
                  to={`/conges/${leave.id}`}
                  className="user-row-btn"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="d-flex justify-content-between align-items-start w-100 gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{typeLabel}</div>
                      <div className="small" style={{ color: 'var(--dk-text-soft)' }}>
                        {fmtDate(leave.date_debut)} → {fmtDate(leave.date_fin)}
                      </div>
                      {showEmployeeCol && leave.utilisateur_nom && (
                        <div className="small" style={{ color: 'var(--dk-text-muted)' }}>
                          {leave.utilisateur_nom}
                        </div>
                      )}
                      {comment ? (
                        <div
                          className="small mt-1"
                          style={{ color: 'var(--dk-text-muted)', fontStyle: 'italic' }}
                        >
                          {comment.length > 60 ? comment.slice(0, 60) + '…' : comment}
                        </div>
                      ) : null}
                    </div>
                    <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
                      <span className={`status-badge ${s.cls}`}>{s.label}</span>
                      <span className="small fw-semibold" style={{ color: 'var(--dk-text-soft)' }}>
                        {fmtNum(leave.jours_calcules)} j
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop */}
          <Table hover className="users-dense-table mb-0 d-none d-md-table">
            <thead>
              <tr>
                {showEmployeeCol && <th>Employé</th>}
                <th>Type</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Jours</th>
                <th>Statut</th>
                <th>Commentaire</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => {
                const s = STATUS_MAP[leave.statut] || { label: leave.statut, cls: 'status-badge--pending' };
                const typeLabel = leave.conge_type_libelle || leave.conge_type?.libelle || '—';
                const comment =
                  leave.commentaire_admin || leave.commentaire_manager || leave.commentaire_employe || '';
                return (
                  <tr key={leave.id}>
                    {showEmployeeCol && (
                      <td style={{ fontWeight: 500 }}>{leave.utilisateur_nom || '—'}</td>
                    )}
                    <td>
                      <span className="badge info">{typeLabel}</span>
                    </td>
                    <td>{fmtDate(leave.date_debut)}</td>
                    <td>{fmtDate(leave.date_fin)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtNum(leave.jours_calcules)} j</td>
                    <td>
                      <span className={`status-badge ${s.cls}`}>{s.label}</span>
                    </td>
                    <td
                      className="text-muted small"
                      style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={comment}
                    >
                      {comment || '—'}
                    </td>
                    <td>
                      <Link to={`/conges/${leave.id}`} className="btn btn-sm btn-outline-primary">
                        Voir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default HistoriqueCongesPage;
