import './historique-solde.css';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Form, Spinner, Table } from 'react-bootstrap';
import { quotasService, usersService, congeTypesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

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

  const isAdmin = ['admin_entreprise', 'super_admin'].includes(user?.role);

  const [users,      setUsers]      = useState([]);
  const [congeTypes, setCongeTypes] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState(searchParams.get('userId') || (isAdmin ? '' : user?.id || ''));
  const [selectedYear,   setSelectedYear]   = useState(CURRENT_YEAR);
  const [selectedTypeId, setSelectedTypeId] = useState('');

  const [historique,   setHistorique]   = useState([]);
  const [loadingHist,  setLoadingHist]  = useState(false);

  /* ── Chargement initial ── */
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
            .filter((u) => u.role !== 'super_admin')
            .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
          setUsers(list);
          setSelectedUserId((prev) => {
            const urlUser = searchParams.get('userId');
            if (urlUser) {
              const match = list.find((u) => String(u.id) === String(urlUser));
              if (match) return match.id;
            }
            return prev;
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
    const allEmployees = isAdmin && !selectedUserId;
    if (!userId && !allEmployees) return;
    let cancelled = false;
    const load = async () => {
      setLoadingHist(true);
      try {
        const params = { annee: selectedYear, limit: 500 };
        if (selectedTypeId) params.conge_type_id = selectedTypeId;
        const res = allEmployees
          ? await quotasService.getHistoriqueEntreprise(params)
          : await quotasService.getHistorique(userId, params);
        if (!cancelled) setHistorique(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch {
        if (!cancelled) {
          alert.error("Impossible de charger l'historique.");
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

      {/* ── Filtres ── */}
      <div className="hist-filter-bar mb-3">
        <div className="hist-filter-bar__selects">
          {isAdmin && (
            <Form.Select
              className="hist-filter-bar__employee"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Tous les employés</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}{u.service ? ` — ${u.service}` : ''}
                </option>
              ))}
            </Form.Select>
          )}
          <Form.Select
            className="hist-filter-bar__year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value) || CURRENT_YEAR)}
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Form.Select>
          <Form.Select
            className="hist-filter-bar__type"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          >
            <option value="">Tous les types</option>
            {congeTypes.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
          </Form.Select>
        </div>
        <span className="badge info hist-filter-bar__count">{historique.length}</span>
      </div>

      {isAdmin && selectedUser && (
        <p className="small text-muted mb-3">
          Historique de <strong>{selectedUser.prenom} {selectedUser.nom}</strong> · {selectedYear}
        </p>
      )}
      {isAdmin && !selectedUserId && historique.length > 0 && (
        <p className="small text-muted mb-3">Tous les employés · {selectedYear}</p>
      )}

      {/* ── Contenu ── */}
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
          {/* ── Cartes mobile ── */}
          <div className="d-md-none">
            {historique.map((m) => {
              const meta = MOUVEMENT_META[m.type] || { color: '#94a3b8' };
              return (
                <div key={m.id} className="hist-card" style={{ borderLeftColor: meta.color }}>
                  <div className="hist-card__top">
                    <TypeBadge type={m.type} />
                    <span className="hist-card__date">{fmtDate(m.date)}</span>
                  </div>
                  {!selectedUserId && m.utilisateur && (
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--dk-text)', marginBottom: '0.15rem' }}>
                      {m.utilisateur.prenom} {m.utilisateur.nom}
                      {m.utilisateur.service && <span style={{ fontWeight: 400, color: 'var(--dk-text-muted)', marginLeft: 4 }}>· {m.utilisateur.service}</span>}
                    </div>
                  )}
                  {m.description && <div className="hist-card__desc">{m.description}</div>}
                  {m.conge_type?.libelle && (
                    <div className="hist-card__conge-type">{m.conge_type.libelle}</div>
                  )}
                  <div className="hist-card__bottom">
                    <div>
                      <span className="hist-card__label">Mouvement</span>
                      <QtyBadge value={m.quantite} />
                    </div>
                    <div>
                      <span className="hist-card__label">Solde</span>
                      <SoldeCell value={m.solde_apres} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tableau desktop ── */}
          <div className="hist-table-wrap d-none d-md-block">
            <Table hover className="users-dense-table mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  {!selectedUserId && <th>Employé</th>}
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
                    {!selectedUserId && (
                      <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {m.utilisateur ? `${m.utilisateur.prenom} ${m.utilisateur.nom}` : '—'}
                        {m.utilisateur?.service && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--dk-text-muted)', marginLeft: 4 }}>
                            · {m.utilisateur.service}
                          </span>
                        )}
                      </td>
                    )}
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
