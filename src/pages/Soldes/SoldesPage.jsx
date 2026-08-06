import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Form, Row, Col, Table, Spinner, Button, Modal, Nav } from 'react-bootstrap';
import { quotasService, usersService, congeTypesService, entreprisesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import { useInlineConfirmation } from '../../hooks/useInlineConfirmation';
import AsyncButton from '../../components/AsyncButton';

const CURRENT_YEAR = new Date().getFullYear();

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const SoldesPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlUserId = searchParams.get('userId');
  const alert = useAlert();
  const { confirmationMessage, requestConfirmation, clearConfirmation } = useInlineConfirmation();

  const [users, setUsers] = useState([]);
  const [congeTypes, setCongeTypes] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(urlUserId || '');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [reportAutorise, setReportAutorise] = useState(false);
  const [reportMaxJours, setReportMaxJours] = useState(0);

  const [activeTab, setActiveTab] = useState('soldes');
  const [historique, setHistorique] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [histCongeTypeId, setHistCongeTypeId] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    conge_type_id: '',
    jours_acquis_n: 0,
    jours_reportes: 0,
    jours_pris: 0,
    jours_reserves: 0,
  });

  /* ── Chargement initial ── */
  useEffect(() => {
    if (!user?.entreprise_id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [usersRes, typesRes, policyRes] = await Promise.all([
          usersService.getAll(),
          congeTypesService.getAll({ entreprise_id: user.entreprise_id }),
          entreprisesService.getPolitique(user.entreprise_id),
        ]);

        const filteredUsers = (Array.isArray(usersRes.data) ? usersRes.data : [])
          .filter((u) => u.role === 'employe' || u.role === 'manager');

        const policy = policyRes.data?.politique_conges || {};
        setReportAutorise(Boolean(policy.report_autorise));
        setReportMaxJours(Number(policy.report_max_jours) || 0);
        setUsers(filteredUsers);
        setCongeTypes(Array.isArray(typesRes.data) ? typesRes.data : []);

        setSelectedUserId((prev) => {
          if (prev) {
            const match = filteredUsers.find((u) => String(u.id) === String(prev));
            if (match) return prev;
          }
          if (urlUserId) {
            const match = filteredUsers.find((u) => String(u.id) === String(urlUserId));
            if (match) return match.id;
          }
          return filteredUsers[0]?.id || '';
        });
      } catch {
        alert.error('Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.entreprise_id]);

  /* ── Chargement soldes ── */
  useEffect(() => {
    if (!selectedUserId) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCounters(true);
      try {
        const res = await quotasService.getUserCounters(selectedUserId, { annee: selectedYear });
        if (!cancelled) setCounters(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch {
        if (!cancelled) alert.error('Impossible de charger les soldes.');
      } finally {
        if (!cancelled) setLoadingCounters(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedUserId, selectedYear]);

  /* ── Chargement historique ── */
  useEffect(() => {
    if (!selectedUserId || activeTab !== 'historique') return;
    let cancelled = false;
    const load = async () => {
      setLoadingHistorique(true);
      try {
        const params = { annee: selectedYear, limit: 100 };
        if (histCongeTypeId) params.conge_type_id = histCongeTypeId;
        const res = await quotasService.getHistorique(selectedUserId, params);
        if (!cancelled) setHistorique(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch {
        if (!cancelled) setHistorique([]);
      } finally {
        if (!cancelled) setLoadingHistorique(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedUserId, selectedYear, activeTab, histCongeTypeId]);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(selectedUserId)),
    [users, selectedUserId]
  );

  /* ── Ouvrir la modal ── */
  const openModal = (counter = null) => {
    if (counter) {
      const nMoinsUn = toNum(counter.jours_reportes);
      const acquisN = toNum(counter.jours_acquis_annee ?? (toNum(counter.jours_acquis) - nMoinsUn));
      setEditingCounter(counter);
      setForm({
        conge_type_id: counter.conge_type_id || '',
        jours_acquis_n: acquisN,
        jours_reportes: nMoinsUn,
        jours_pris: toNum(counter.jours_pris),
        jours_reserves: toNum(counter.jours_reserves),
      });
    } else {
      setEditingCounter(null);
      setForm({
        conge_type_id: congeTypes[0]?.id || '',
        jours_acquis_n: 0,
        jours_reportes: 0,
        jours_pris: 0,
        jours_reserves: 0,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingCounter(null); };

  /* ── Sauvegarder ── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !form.conge_type_id) return;
    setSaving(true);
    try {
      const acquisN = toNum(form.jours_acquis_n);
      const reportes = toNum(form.jours_reportes);
      const saveRes = await quotasService.upsertUserCounter(selectedUserId, {
        annee: selectedYear,
        conge_type_id: form.conge_type_id,
        jours_acquis: acquisN + reportes,
        jours_reportes: reportes,
        jours_pris: toNum(form.jours_pris),
        jours_reserves: toNum(form.jours_reserves),
      });
      closeModal();
      const res = await quotasService.getUserCounters(selectedUserId, { annee: selectedYear });
      setCounters(Array.isArray(res.data?.items) ? res.data.items : []);

      const activated = saveRes.data?.reservations_activees ?? [];
      const pending = saveRes.data?.reservations_en_attente ?? [];
      if (activated.length > 0) {
        const detail = activated
          .map((r) => {
            const debut = r.date_debut ? new Date(r.date_debut).toLocaleDateString('fr-FR') : '';
            const fin = r.date_fin ? new Date(r.date_fin).toLocaleDateString('fr-FR') : '';
            const label = r.new_statut === 'valide_final' ? 'validé automatiquement' : 'en attente de validation';
            return `${debut}–${fin} (${label})`;
          })
          .join(', ');
        alert.success(
          `Solde enregistré. ${activated.length} réservation(s) activée(s) : ${detail}.` +
            (pending.length > 0 ? ` ${pending.length} en attente de solde suffisant.` : '')
        );
      } else {
        alert.success('Solde enregistré.');
      }
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Supprimer ── */
  const handleDelete = async (counterId) => {
    const confirmed = requestConfirmation(`del:${counterId}`, 'Cliquez à nouveau sur Supprimer pour confirmer.');
    if (!confirmed) return;
    try {
      clearConfirmation();
      await quotasService.deleteUserCounter(counterId);
      setCounters((prev) => prev.filter((c) => c.id !== counterId));
      alert.success('Solde supprimé.');
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const soldePreview = toNum(form.jours_acquis_n) + toNum(form.jours_reportes) - toNum(form.jours_reserves);

  const MOUVEMENT_META = {
    credit_initial:        { label: 'Ouverture',    color: '#22c55e' },
    credit_mensuel:        { label: 'Crédit',        color: '#22c55e' },
    report_annee:          { label: 'Report N-1',    color: '#22c55e' },
    reservation:           { label: 'Réservé',       color: '#f97316' },
    validation_auto:       { label: 'Déduit (auto)', color: '#ef4444' },
    validation:            { label: 'Validé',        color: '#94a3b8' },
    rejet:                 { label: 'Refusé',        color: '#22c55e' },
    annulation:            { label: 'Annulé',        color: '#22c55e' },
    activation_reservation:{ label: 'Activé',        color: '#f97316' },
    ajustement_admin:      { label: 'Ajustement',    color: '#818cf8' },
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const fmtQty  = (q) => {
    const n = Number(q);
    if (n === 0) return null;
    return (n > 0 ? '+' : '') + n.toFixed(2).replace('.00', '') + ' j';
  };

  /* ── Rendu ── */
  if (loading) {
    return (
      <Container>
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Soldes congés</span>
        <Button variant="primary" size="sm" onClick={() => openModal()}>+ Nouveau solde</Button>
      </div>

      {confirmationMessage && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center mb-3">
          <span>{confirmationMessage}</span>
          <Button size="sm" variant="outline-secondary" onClick={clearConfirmation}>Annuler</Button>
        </div>
      )}

      {/* Filtre */}
      <div className="users-filter-bar mb-3">
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
        <Form.Control
          type="number"
          min="2020"
          max="2100"
          value={selectedYear}
          onChange={(e) => setSelectedYear(toNum(e.target.value, CURRENT_YEAR))}
          style={{ width: 90, flexShrink: 0 }}
          title="Année"
        />
      </div>

      {/* Onglets */}
      <Nav variant="tabs" className="mb-3" activeKey={activeTab} onSelect={setActiveTab}>
        <Nav.Item><Nav.Link eventKey="soldes">Soldes</Nav.Link></Nav.Item>
        <Nav.Item><Nav.Link eventKey="historique">Historique</Nav.Link></Nav.Item>
      </Nav>

      {activeTab === 'soldes' && reportAutorise && (
        <div className="small text-muted mb-3">
          Report N→N+1 activé — max {reportMaxJours} j par type. La colonne N-1 montre les jours portés depuis {selectedYear - 1}.
        </div>
      )}

      {/* Onglet Soldes */}
      {activeTab === 'soldes' && (loadingCounters ? (
        <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
      ) : counters.length === 0 ? (
        <div className="text-center py-5">
          <div className="text-muted mb-3">
            Aucun solde pour <strong>{selectedUser?.prenom} {selectedUser?.nom}</strong> en {selectedYear}
          </div>
          <Button variant="outline-primary" size="sm" onClick={() => openModal()}>
            + Ajouter le premier solde
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="user-list-mobile d-md-none">
            {counters.map((counter) => {
              const nMoinsUn = toNum(counter.jours_reportes);
              const acquisN = toNum(counter.jours_acquis_annee ?? (toNum(counter.jours_acquis) - nMoinsUn));
              const solde = toNum(counter.solde_disponible);
              return (
                <div
                  key={counter.id}
                  className="user-row-btn"
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, cursor: 'default' }}
                >
                  <div className="d-flex justify-content-between align-items-center w-100">
                    <strong style={{ fontSize: 13 }}>{counter.conge_type?.libelle || '—'}</strong>
                    <strong style={{ color: solde < 0 ? 'var(--dk-error)' : 'var(--dk-accent)' }}>
                      {solde.toFixed(1)} j
                    </strong>
                  </div>
                  <div className="d-flex gap-3 small" style={{ color: 'var(--dk-text-soft)' }}>
                    {nMoinsUn > 0 && <span>N-1 : <strong>{nMoinsUn.toFixed(1)} j</strong></span>}
                    <span>N : {acquisN.toFixed(1)} j</span>
                    <span>Pris : {toNum(counter.jours_pris).toFixed(1)} j</span>
                  </div>
                  <div className="d-flex gap-2 w-100 mt-1">
                    <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => openModal(counter)}>Modifier</Button>
                    <Button size="sm" variant="outline-danger" className="flex-fill" onClick={() => handleDelete(counter.id)}>Supprimer</Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="conges-list-wrap d-none d-md-block">
            <Table hover className="users-dense-table mb-0">
              <thead>
                <tr>
                  <th>Type de congé</th>
                  <th title={`Jours reportés depuis ${selectedYear - 1}`}>N-1 ({selectedYear - 1})</th>
                  <th>Acquis {selectedYear}</th>
                  <th>Pris</th>
                  <th>Solde</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => {
                  const nMoinsUn = toNum(counter.jours_reportes);
                  const acquisN = toNum(counter.jours_acquis_annee ?? (toNum(counter.jours_acquis) - nMoinsUn));
                  const solde = toNum(counter.solde_disponible);
                  return (
                    <tr key={counter.id}>
                      <td><strong>{counter.conge_type?.libelle || '—'}</strong></td>
                      <td>
                        {nMoinsUn > 0
                          ? <span className="badge info">{nMoinsUn.toFixed(1)} j</span>
                          : <span style={{ color: 'var(--dk-text-muted)' }}>—</span>}
                      </td>
                      <td>{acquisN.toFixed(1)} j</td>
                      <td style={{ color: 'var(--dk-text-soft)' }}>{toNum(counter.jours_pris).toFixed(1)} j</td>
                      <td>
                        <strong style={{ color: solde < 0 ? 'var(--dk-error)' : 'var(--dk-accent)' }}>
                          {solde.toFixed(1)} j
                        </strong>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-nowrap">
                          <Button size="sm" variant="outline-primary" onClick={() => openModal(counter)}>Modifier</Button>
                          <Button size="sm" variant="outline-danger" onClick={() => handleDelete(counter.id)}>Supprimer</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      ))}

      {/* Onglet Historique */}
      {activeTab === 'historique' && (
        <>
          {/* Filtre type de congé */}
          <Form.Select
            className="mb-3"
            value={histCongeTypeId}
            onChange={(e) => setHistCongeTypeId(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            <option value="">Tous les types</option>
            {congeTypes.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
          </Form.Select>

          {loadingHistorique ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
          ) : historique.length === 0 ? (
            <div className="text-center py-5 text-muted">
              Aucun mouvement enregistré pour cette période.<br />
              <small>Les mouvements sont enregistrés à partir de maintenant.</small>
            </div>
          ) : (
            <div className="conges-list-wrap">
              <Table hover className="users-dense-table mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Détail</th>
                    <th style={{ textAlign: 'right' }}>Mouvement</th>
                    <th style={{ textAlign: 'right' }}>Solde après</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((m) => {
                    const meta = MOUVEMENT_META[m.type] || { label: m.type, color: '#94a3b8' };
                    const qty = fmtQty(m.quantite);
                    const qtyColor = Number(m.quantite) > 0 ? '#22c55e' : Number(m.quantite) < 0 ? '#ef4444' : '#94a3b8';
                    return (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--dk-text-soft)', fontSize: '0.82rem' }}>
                          {fmtDate(m.date)}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: meta.color + '22',
                            color: meta.color,
                            whiteSpace: 'nowrap',
                          }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--dk-text-soft)' }}>
                          {m.description || '—'}
                          {m.conge_type?.libelle && (
                            <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--dk-text-muted)' }}>
                              · {m.conge_type.libelle}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: qtyColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {qty || <span style={{ color: 'var(--dk-text-muted)', fontWeight: 400 }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          <strong style={{ color: Number(m.solde_apres) < 0 ? '#ef4444' : 'var(--dk-accent)' }}>
                            {Number(m.solde_apres).toFixed(2).replace('.00', '')} j
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCounter
              ? `Modifier — ${editingCounter.conge_type?.libelle || 'solde'}`
              : 'Nouveau solde'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            {/* Type */}
            <Form.Group className="mb-4">
              <Form.Label>Type de congé</Form.Label>
              <Form.Select
                value={form.conge_type_id}
                onChange={(e) => setForm((p) => ({ ...p, conge_type_id: e.target.value }))}
                required
                disabled={!!editingCounter}
              >
                <option value="">Sélectionner</option>
                {congeTypes.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
              </Form.Select>
            </Form.Group>

            {/* N-1 + N côte à côte */}
            <Row className="g-3 mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Solde N-1 <span className="text-muted fw-normal">({selectedYear - 1}→{selectedYear})</span>
                  </Form.Label>
                  <Form.Control
                    type="number" step="0.5" min="0"
                    value={form.jours_reportes}
                    onChange={(e) => setForm((p) => ({ ...p, jours_reportes: e.target.value }))}
                  />
                  <Form.Text className="text-muted">Jours reportés de l'année précédente</Form.Text>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Acquis N <span className="text-muted fw-normal">({selectedYear})</span>
                  </Form.Label>
                  <Form.Control
                    type="number" step="0.5" min="0"
                    value={form.jours_acquis_n}
                    onChange={(e) => setForm((p) => ({ ...p, jours_acquis_n: e.target.value }))}
                  />
                  <Form.Text className="text-muted">Quota acquis cette année</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-4">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>Jours pris</Form.Label>
                  <Form.Control
                    type="number" step="0.5" min="0"
                    value={form.jours_pris}
                    onChange={(e) => setForm((p) => ({ ...p, jours_pris: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>Jours réservés</Form.Label>
                  <Form.Control
                    type="number" step="0.5" min="0"
                    value={form.jours_reserves}
                    onChange={(e) => setForm((p) => ({ ...p, jours_reserves: e.target.value }))}
                  />
                  <Form.Text className="text-muted">Congés en attente de validation</Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Aperçu solde */}
            <div className="solde-preview">
              <div className="d-flex justify-content-between align-items-baseline">
                <span className="small" style={{ color: 'var(--dk-text-soft)' }}>Solde disponible</span>
                <span
                  className="solde-preview__value"
                  style={{ color: soldePreview < 0 ? 'var(--dk-error)' : 'var(--dk-accent)' }}
                >
                  {soldePreview.toFixed(1)} j
                </span>
              </div>
              <div className="solde-preview__formula">
                ({toNum(form.jours_reportes).toFixed(1)} N-1
                {' + '}
                {toNum(form.jours_acquis_n).toFixed(1)} N)
                {toNum(form.jours_reserves) > 0 ? ` − ${toNum(form.jours_reserves).toFixed(1)} réservés` : ''}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>Annuler</Button>
            <AsyncButton type="submit" variant="primary" isLoading={saving} loadingText="Enregistrement…">
              Enregistrer
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SoldesPage;
