import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Table, Button, Form, Spinner, Modal, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaBuilding, FaEye, FaCheck, FaTimes, FaSync } from 'react-icons/fa';
import { congesService, entreprisesService } from '../../services/api';
import { useAlert, useConfirmation } from '../../hooks/useAlert';
import AsyncButton from '../../components/AsyncButton';
import { useAsyncAction } from '../../hooks/useAsyncAction';

const STATUT_BADGE = {
  reserve: 'reserve', en_attente_manager: 'pending', valide_manager: 'info',
  valide_final: 'approved', refuse_manager: 'refused', refuse_final: 'refused',
};
const STATUT_LABELS = {
  reserve: 'Réservé', en_attente_manager: 'En attente', valide_manager: 'Validé manager',
  valide_final: 'Approuvé', refuse_manager: 'Refusé manager', refuse_final: 'Refusé',
};

const fmtDate = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—';

const ITEMS_PER_PAGE = 25;

const SALeavesPage = () => {
  const alert = useAlert();
  const { confirm } = useConfirmation();
  const actionRunner = useAsyncAction();

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statutFilter, setStatutFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectModal, setRejectModal] = useState(null); // { id, nom }
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => {
    entreprisesService.getAll()
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : [];
        setCompanies(items);
        if (items.length > 0) setSelectedCompanyId(items[0].id);
      })
      .catch(() => alert.error('Erreur chargement entreprises'));
  }, []);

  const loadConges = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      setLoading(true);
      const params = { entreprise_id: selectedCompanyId, limit: 500 };
      if (statutFilter) params.statut = statutFilter;
      const res = await congesService.getAll(params);
      const items = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
      setConges(items);
      setCurrentPage(1);
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur chargement des congés');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, statutFilter]);

  useEffect(() => { loadConges(); }, [loadConges]);

  // Filtre texte côté client (nom/email/type)
  const filtered = useMemo(() => {
    if (!searchFilter.trim()) return conges;
    const q = searchFilter.toLowerCase();
    return conges.filter(c => {
      const name = `${c.utilisateur?.prenom || ''} ${c.utilisateur?.nom || ''}`.toLowerCase();
      const email = (c.utilisateur?.email || '').toLowerCase();
      const type = (c.conge_type?.libelle || '').toLowerCase();
      return name.includes(q) || email.includes(q) || type.includes(q);
    });
  }, [conges, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleValidate = (conge) => {
    confirm({
      title: 'Valider ce congé ?',
      description: `Valider définitivement le congé de ${conge.utilisateur?.prenom} ${conge.utilisateur?.nom} ?`,
      confirmLabel: 'Valider',
      onConfirm: async () => {
        await actionRunner.run(async () => {
          await congesService.validate(conge.id, {});
          alert.success('Congé validé');
          loadConges();
        });
      }
    });
  };

  const openRejectModal = (conge) => {
    setRejectComment('');
    setRejectModal({ id: conge.id, nom: `${conge.utilisateur?.prenom} ${conge.utilisateur?.nom}` });
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await actionRunner.run(async () => {
      await congesService.reject(rejectModal.id, { commentaire: rejectComment || 'Refusé par le super admin' });
      alert.success('Congé refusé');
      setRejectModal(null);
      loadConges();
    });
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const pendingCount = conges.filter(c => c.statut === 'en_attente_manager' || c.statut === 'valide_manager').length;

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Congés</span>
        <Button variant="outline-secondary" size="sm" onClick={loadConges} disabled={loading}>
          <FaSync className={loading ? 'fa-spin' : ''} />
        </Button>
      </div>

      {/* Selector entreprise */}
      <div className="sa-company-bar mb-3">
        <FaBuilding className="sa-company-bar__icon" />
        <Form.Select
          className="sa-company-bar__select"
          value={selectedCompanyId}
          onChange={e => { setSelectedCompanyId(e.target.value); setStatutFilter(''); setSearchFilter(''); }}
        >
          {companies.length === 0 && <option value="">Chargement…</option>}
          {companies.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Form.Select>
        {selectedCompany && (
          <span className={`badge ${selectedCompany.statut === 'active' ? 'approved' : 'info'} sa-company-bar__badge`}>
            {selectedCompany.statut === 'active' ? 'Active' : selectedCompany.statut}
          </span>
        )}
        {pendingCount > 0 && (
          <span className="badge pending sa-company-bar__badge">{pendingCount} en attente</span>
        )}
      </div>

      {/* Filtres */}
      <div className="users-filter-bar mb-3">
        <Form.Control
          className="users-filter-bar__search"
          placeholder="Recherche salarié, email, type…"
          value={searchFilter}
          onChange={e => { setSearchFilter(e.target.value); setCurrentPage(1); }}
          style={{ flex: '1 1 180px', minWidth: 140 }}
        />
        <Form.Select
          className="users-filter-bar__select"
          value={statutFilter}
          onChange={e => setStatutFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente_manager">En attente</option>
          <option value="valide_manager">Validé manager</option>
          <option value="valide_final">Approuvé</option>
          <option value="refuse_manager">Refusé manager</option>
          <option value="refuse_final">Refusé</option>
          <option value="reserve">Réservé</option>
        </Form.Select>
        <span className="badge info users-filter-bar__count">
          {filtered.length}{conges.length !== filtered.length ? `/${conges.length}` : ''}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          {!selectedCompanyId ? 'Sélectionnez une entreprise.' : 'Aucun congé trouvé.'}
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="user-list-mobile d-md-none">
            {paged.map(c => {
              const canAct = ['en_attente_manager', 'valide_manager'].includes(c.statut);
              return (
                <div key={c.id} className="sa-leave-mobile-row">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div>
                      <div className="fw-semibold">{c.utilisateur?.prenom} {c.utilisateur?.nom}</div>
                      <small className="text-muted">{c.conge_type?.libelle || '—'}</small>
                    </div>
                    <span className={`badge ${STATUT_BADGE[c.statut] || 'info'}`}>{STATUT_LABELS[c.statut] || c.statut}</span>
                  </div>
                  <div className="text-muted small mb-2">{fmtDate(c.date_debut)} → {fmtDate(c.date_fin)} · {c.jours_calcules ?? '?'} j</div>
                  <div className="d-flex gap-2">
                    <Button as={Link} to={`/superadmin/leaves/${c.id}`} variant="outline-secondary" size="sm"><FaEye /></Button>
                    {canAct && <>
                      <AsyncButton variant="outline-success" size="sm" onClick={() => handleValidate(c)} isLoading={actionRunner.isRunning} loadingText=""><FaCheck /></AsyncButton>
                      <AsyncButton variant="outline-danger" size="sm" onClick={() => openRejectModal(c)} isLoading={actionRunner.isRunning} loadingText=""><FaTimes /></AsyncButton>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="d-none d-md-block users-management-table-wrap">
            <Table hover responsive className="users-dense-table">
              <thead>
                <tr>
                  <th>Salarié</th>
                  <th>Type</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Jours</th>
                  <th>Statut</th>
                  <th style={{ width: 1 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(c => {
                  const canAct = ['en_attente_manager', 'valide_manager'].includes(c.statut);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="user-display-name">{c.utilisateur?.prenom} {c.utilisateur?.nom}</div>
                        <div className="user-display-email">{c.utilisateur?.email}</div>
                      </td>
                      <td><small className="text-muted">{c.conge_type?.libelle || '—'}</small></td>
                      <td><small>{fmtDate(c.date_debut)}</small></td>
                      <td><small>{fmtDate(c.date_fin)}</small></td>
                      <td><span className="badge info">{c.jours_calcules ?? '?'}</span></td>
                      <td><span className={`badge ${STATUT_BADGE[c.statut] || 'info'}`}>{STATUT_LABELS[c.statut] || c.statut}</span></td>
                      <td>
                        <div className="d-flex gap-1 flex-nowrap">
                          <Button as={Link} to={`/superadmin/leaves/${c.id}`} variant="outline-secondary" size="sm" title="Détails"><FaEye /></Button>
                          {canAct && <>
                            <AsyncButton variant="outline-success" size="sm" title="Valider" onClick={() => handleValidate(c)} isLoading={actionRunner.isRunning} loadingText=""><FaCheck /></AsyncButton>
                            <AsyncButton variant="outline-danger" size="sm" title="Refuser" onClick={() => openRejectModal(c)} isLoading={actionRunner.isRunning} loadingText=""><FaTimes /></AsyncButton>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-3 py-2 users-pager border-top">
              <small className="text-muted">
                {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length}
              </small>
              <div className="d-flex gap-1">
                <Button size="sm" variant="outline-secondary" disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹ Préc.</Button>
                <Button size="sm" variant="outline-secondary" disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Suiv. ›</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal refus */}
      <Modal show={!!rejectModal} onHide={() => setRejectModal(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Refuser le congé</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">Congé de <strong>{rejectModal?.nom}</strong></p>
          <Form.Group>
            <Form.Label>Motif du refus</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              placeholder="Motif (optionnel)"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRejectModal(null)}>Annuler</Button>
          <AsyncButton variant="danger" onClick={handleReject} isLoading={actionRunner.isRunning} loadingText="Refus…">Refuser</AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SALeavesPage;
