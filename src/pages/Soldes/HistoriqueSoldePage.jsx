import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Form, Spinner, Table } from 'react-bootstrap';
import { quotasService, usersService, congeTypesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';

const CURRENT_YEAR = new Date().getFullYear();

const toNum = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };

const MOUVEMENT_META = {
  credit_initial:         { label: 'Ouverture',    color: '#22c55e' },
  credit_mensuel:         { label: 'Crédit',        color: '#22c55e' },
  report_annee:           { label: 'Report N-1',    color: '#22c55e' },
  reservation:            { label: 'Réservé',       color: '#f97316' },
  validation_auto:        { label: 'Validé (auto)', color: '#ef4444' },
  validation:             { label: 'Validé',        color: '#94a3b8' },
  rejet:                  { label: 'Refusé',        color: '#22c55e' },
  annulation:             { label: 'Annulé',        color: '#22c55e' },
  activation_reservation: { label: 'Activé',        color: '#f97316' },
  ajustement_admin:       { label: 'Ajustement',    color: '#818cf8' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const QtyBadge = ({ value }) => {
  const n = toNum(value);
  if (n === 0) return <span style={{ color: 'var(--dk-text-muted)', fontWeight: 400 }}>—</span>;
  const color = n > 0 ? '#22c55e' : '#ef4444';
  const sign  = n > 0 ? '+' : '';
  const str   = sign + n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') + ' j';
  return <span style={{ color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{str}</span>;
};

const SoldeCell = ({ value }) => {
  const n = toNum(value);
  const color = n < 0 ? '#ef4444' : 'var(--dk-accent, #5b8dee)';
  return (
    <strong style={{ color, fontVariantNumeric: 'tabular-nums' }}>
      {n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} j
    </strong>
  );
};

const TypeBadge = ({ type }) => {
  const meta = MOUVEMENT_META[type] || { label: type, color: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.7rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 999,
      background: meta.color + '22',
      color: meta.color,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
};

const HistoriqueSoldePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const alert = useAlert();

  const isAdmin = ['admin_entreprise', 'super_admin', 'manager'].includes(user?.role);

  const [users, setUsers]           = useState([]);
  const [congeTypes, setCongeTypes] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [selectedUserId,    setSelectedUserId]    = useState(searchParams.get('userId') || (isAdmin ? '' : user?.id || ''));
  const [selectedYear,      setSelectedYear]      = useState(CURRENT_YEAR);
  const [selectedTypeId,    setSelectedTypeId]    = useState('');

  const [historique,        setHistorique]        = useState([]);
  const [loadingHist,       setLoadingHist]       = useState(false);

  /* ── Chargement initial (users + types) ── */
  useEffect(() => {
    if (!user?.entreprise_id) return;
    const load = async () => {
      try {
        const [typesRes, usersRes] = await Promise.all([
          congeTypesService.getAll({ entreprise_id: user.entreprise_id }),
          isAdmin ? usersService.getAll() : Promise.resolve({ data: [] }),
        ]);
        setCongeTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
        if (isAdmin) {
          const list = (Array.isArray(usersRes.data) ? usersRes.data : [])
            .filter((u) => ['employe', 'manager'].includes(u.role));
          setUsers(list);
          setSelectedUserId((prev) => {
            if (prev) return prev;
            const urlUser = searchParams.get('userId');
            const match = list.find((u) => String(u.id) === String(urlUser));
            if (match) return match.id;
            return list[0]?.id || '';
          });
        }
      } catch {
        alert.error('Impossible de charger les données.');
      } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, [user?.entreprise_id]);

  /* ── Chargement historique ── */
  useEffect(() => {
    const userId = isAdmin ? selectedUserId : user?.id;
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      setLoadingHist(true);
      try {
        const params = { annee: selectedYear, limit: 200 };
        if (selectedTypeId) params.conge_type_id = selectedTypeId;
        const res = await quotasService.getHistorique(userId, params);
        if (!cancelled) setHistorique(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch {
        if (!cancelled) {
          alert.error('Impossible de charger l\'historique.');
          setHistorique([]);
        }
      } finally {
        if (!cancelled) setLoadingHist(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedUserId, selectedYear, selectedTypeId, user?.id]);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(selectedUserId)),
    [users, selectedUserId]
  );

  if (loadingInit) {
    return <Container><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></Container>;
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Historique de solde</span>
      </div>

      {/* Filtres */}
      <div className="users-filter-bar mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        {isAdmin && (
          <Form.Select
            className="users-filter-bar__search"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.length === 0 && <option value="">Aucun utilisateur</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.prenom} {u.nom}{u.service ? ` — ${u.service}` : ''}
              </option>
            ))}
          </Form.Select>
        )}
        <Form.Control
          type="number"
          min="2020"
          max="2100"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value) || CURRENT_YEAR)}
          style={{ width: 90, flexShrink: 0 }}
          title="Année"
        />
        <Form.Select
          value={selectedTypeId}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          style={{ maxWidth: 220, flexShrink: 0 }}
        >
          <option value="">Tous les types</option>
          {congeTypes.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
        </Form.Select>
      </div>

      {isAdmin && selectedUser && (
        <div className="small text-muted mb-3">
          Historique de <strong>{selectedUser.prenom} {selectedUser.nom}</strong> · {selectedYear}
        </div>
      )}

      {/* Contenu */}
      {loadingHist ? (
        <div className="text-center py-5"><Spinner animation="border" size="sm" /></div>
      ) : historique.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          Aucun mouvement enregistré pour cette période.
          <div className="small mt-2">Les mouvements sont enregistrés à partir du déploiement de cette fonctionnalité.</div>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="d-md-none">
            {historique.map((m) => (
              <div key={m.id} style={{
                background: 'var(--dk-elevated)',
                border: '1px solid var(--dk-border)',
                borderRadius: 'var(--card-radius)',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
              }}>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <TypeBadge type={m.type} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--dk-text-muted)' }}>{fmtDate(m.date)}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--dk-text-soft)', margin: '4px 0' }}>
                  {m.description || '—'}
                  {m.conge_type?.libelle && (
                    <span style={{ marginLeft: 6, color: 'var(--dk-text-muted)', fontSize: '0.72rem' }}>
                      · {m.conge_type.libelle}
                    </span>
                  )}
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--dk-text-muted)', marginRight: 4 }}>Mouvement :</span>
                    <QtyBadge value={m.quantite} />
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--dk-text-muted)', marginRight: 4 }}>Solde :</span>
                    <SoldeCell value={m.solde_apres} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="conges-list-wrap d-none d-md-block">
            <Table hover className="users-dense-table mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Détail</th>
                  <th>Type de congé</th>
                  <th style={{ textAlign: 'right' }}>Mouvement</th>
                  <th style={{ textAlign: 'right' }}>Solde après</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((m) => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--dk-text-soft)', fontSize: '0.82rem' }}>
                      {fmtDate(m.date)}
                    </td>
                    <td><TypeBadge type={m.type} /></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--dk-text-soft)' }}>
                      {m.description || '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--dk-text-muted)' }}>
                      {m.conge_type?.libelle || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}><QtyBadge value={m.quantite} /></td>
                    <td style={{ textAlign: 'right' }}><SoldeCell value={m.solde_apres} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </Container>
  );
};

export default HistoriqueSoldePage;
