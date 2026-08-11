import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Badge, Spinner, Button, Modal, Form, ButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCheck, FaTimes, FaChevronRight, FaInbox } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { congesService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const TYPE_LABELS = { cancel: 'Annulation', modify: 'Modification' };
const STATUT_LABELS = { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée' };

const formatDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('fr-FR');
};

const CongeActionRequestsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const alert = useAlert();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminComment, setAdminComment] = useState('');

  const approveAction = useAsyncAction();
  const rejectAction = useAsyncAction();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await congesService.getActionRequests({
        statut: statutFilter || undefined,
        page,
        limit: 15,
      });
      const data = res.data;
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [statutFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openApprove = (req) => {
    setSelectedRequest(req);
    setAdminComment('');
    setShowApproveModal(true);
  };

  const openReject = (req) => {
    setSelectedRequest(req);
    setAdminComment('');
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    await approveAction.run(async () => {
      try {
        await congesService.approveActionRequest(selectedRequest.id, { commentaire: adminComment.trim() || undefined });
        alert.success('Demande approuvée.');
        setShowApproveModal(false);
        setStatutFilter('approved');
        setPage(1);
      } catch (err) {
        alert.error(err.response?.data?.message || 'Erreur lors de l\'approbation');
      }
    });
  };

  const handleReject = async () => {
    await rejectAction.run(async () => {
      try {
        await congesService.rejectActionRequest(selectedRequest.id, { commentaire: adminComment.trim() });
        alert.success('Demande refusée.');
        setShowRejectModal(false);
        setStatutFilter('rejected');
        setPage(1);
      } catch (err) {
        alert.error(err.response?.data?.message || 'Erreur lors du refus');
      }
    });
  };

  const congeLink = (req) => {
    const congeId = req.conge_id;
    if (isSuperAdmin) return `/superadmin/leaves/${congeId}`;
    return `/conges/${congeId}`;
  };

  const statutBadge = (statut) => {
    const variantMap = { pending: 'warning', approved: 'success', rejected: 'danger' };
    return <Badge bg={variantMap[statut] || 'secondary'}>{STATUT_LABELS[statut] || statut}</Badge>;
  };

  return (
    <Container fluid="sm">
      <div style={{ padding: '16px 4px 8px' }}>
        <h5 className="mb-0" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FaInbox size={16} style={{ color: 'var(--accent-blue, #5b8dee)' }} />
          Demandes de modification / annulation
        </h5>
        <p className="text-muted small mb-0 mt-1">
          Demandes soumises par les employés pour leurs congés validés
        </p>
      </div>

      {/* Filtres statut */}
      <div className="d-flex gap-2 flex-wrap mb-3">
        <ButtonGroup size="sm">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <Button
              key={s}
              variant={statutFilter === s ? 'primary' : 'outline-secondary'}
              onClick={() => { setStatutFilter(s); setPage(1); }}
            >
              {s === '' ? 'Toutes' : STATUT_LABELS[s]}
            </Button>
          ))}
        </ButtonGroup>
        {total > 0 && <span className="text-muted small align-self-center">{total} résultat(s)</span>}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-5 text-muted small">
          {statutFilter === 'pending' ? 'Aucune demande en attente.' : 'Aucune demande trouvée.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table hover className="align-middle mb-0">
            <thead>
              <tr style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <th>Employé</th>
                <th>Type</th>
                <th>Congé</th>
                <th>Période demandée</th>
                <th>Soumis le</th>
                <th>Statut</th>
                {statutFilter !== 'pending' && <th>Décision admin</th>}
                {statutFilter !== 'pending' && <th>Traité le</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const employeNom = req.utilisateur
                  ? `${req.utilisateur.prenom || ''} ${req.utilisateur.nom || ''}`.trim()
                  : '-';
                const congeType = req.conge?.conge_type_libelle || req.conge?.conge_type?.libelle || 'Congé';
                const congePeriode = req.conge
                  ? `${formatDate(req.conge.date_debut)} → ${formatDate(req.conge.date_fin)}`
                  : '-';
                const nouvellePeriode = req.type === 'modify' && req.date_debut_demandee
                  ? `${formatDate(req.date_debut_demandee)} → ${formatDate(req.date_fin_demandee)}`
                  : null;

                return (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>{employeNom}</td>
                    <td>
                      <Badge bg={req.type === 'cancel' ? 'danger' : 'primary'} style={{ fontSize: '11px' }}>
                        {TYPE_LABELS[req.type] || req.type}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>{congeType}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{congePeriode}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {nouvellePeriode ? (
                        <span>{nouvellePeriode}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>{formatDate(req.created_at)}</td>
                    <td>{statutBadge(req.statut)}</td>
                    {statutFilter !== 'pending' && (
                      <td style={{ fontSize: '12px', maxWidth: 180 }}>
                        {req.commentaire_admin
                          ? <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{req.commentaire_admin}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    )}
                    {statutFilter !== 'pending' && (
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {req.updated_at ? formatDate(req.updated_at) : '—'}
                      </td>
                    )}
                    <td>
                      <div className="d-flex gap-2 align-items-center">
                        {req.statut === 'pending' && (
                          <>
                            <Button size="sm" variant="outline-success" onClick={() => openApprove(req)} title="Approuver">
                              <FaCheck size={11} />
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => openReject(req)} title="Refuser">
                              <FaTimes size={11} />
                            </Button>
                          </>
                        )}
                        <Link to={congeLink(req)} style={{ fontSize: '11px', color: 'var(--accent-blue, #5b8dee)' }}>
                          <FaChevronRight size={10} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-3">
          <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="small align-self-center">{page} / {totalPages}</span>
          <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}

      {/* Modal Approuver */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} backdrop="static" keyboard={!approveAction.isRunning} centered>
        <Modal.Header closeButton={!approveAction.isRunning}>
          <Modal.Title>Approuver la demande</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <p className="small text-muted mb-3">
              Demande de <strong>{TYPE_LABELS[selectedRequest.type]?.toLowerCase()}</strong> de{' '}
              <strong>
                {selectedRequest.utilisateur
                  ? `${selectedRequest.utilisateur.prenom} ${selectedRequest.utilisateur.nom}`
                  : 'l\'employé'}
              </strong>.
              {selectedRequest.type === 'modify' && selectedRequest.date_debut_demandee && (
                <> Nouvelles dates : <strong>{formatDate(selectedRequest.date_debut_demandee)} → {formatDate(selectedRequest.date_fin_demandee)}</strong>.</>
              )}
            </p>
          )}
          <div className="p-2 mb-3 rounded" style={{ background: 'var(--bs-light, #f8f9fa)', fontSize: '13px', fontStyle: 'italic', borderLeft: '3px solid #5b8dee' }}>
            {selectedRequest?.commentaire_employe || '—'}
          </div>
          <Form.Group>
            <Form.Label>Commentaire (optionnel)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Message à l'employé..."
              disabled={approveAction.isRunning}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)} disabled={approveAction.isRunning}>Annuler</Button>
          <AsyncButton variant="success" onClick={handleApprove} action={approveAction} loadingText="Approbation...">
            Approuver
          </AsyncButton>
        </Modal.Footer>
      </Modal>

      {/* Modal Refuser */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} backdrop="static" keyboard={!rejectAction.isRunning} centered>
        <Modal.Header closeButton={!rejectAction.isRunning}>
          <Modal.Title>Refuser la demande</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <p className="small text-muted mb-3">
              Demande de <strong>{TYPE_LABELS[selectedRequest.type]?.toLowerCase()}</strong> de{' '}
              <strong>
                {selectedRequest.utilisateur
                  ? `${selectedRequest.utilisateur.prenom} ${selectedRequest.utilisateur.nom}`
                  : 'l\'employé'}
              </strong>.
            </p>
          )}
          <div className="p-2 mb-3 rounded" style={{ background: 'var(--bs-light, #f8f9fa)', fontSize: '13px', fontStyle: 'italic', borderLeft: '3px solid #5b8dee' }}>
            {selectedRequest?.commentaire_employe || '—'}
          </div>
          <Form.Group>
            <Form.Label>Motif du refus (requis)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Expliquez la raison du refus..."
              disabled={rejectAction.isRunning}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)} disabled={rejectAction.isRunning}>Annuler</Button>
          <AsyncButton
            variant="danger"
            onClick={handleReject}
            action={rejectAction}
            disabled={!adminComment.trim()}
            loadingText="Refus..."
          >
            Refuser
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CongeActionRequestsPage;
