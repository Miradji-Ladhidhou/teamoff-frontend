import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './absences-equipe.css';
import { api, usersService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import { Container, Card, Modal, Spinner } from 'react-bootstrap';
import { FaUserMinus, FaPlus, FaSearch, FaFilter, FaUserClock, FaPaperclip, FaCamera, FaImage, FaTimes } from 'react-icons/fa';

const PAGE_SIZE = 15;

const TYPE_LABELS = {
  maladie: 'Arrêt maladie',
  absence_exceptionnelle: 'Abs. exceptionnelle',
};

function diffJours(debut, fin) {
  if (!debut || !fin) return '-';
  const diff = Math.round((new Date(fin) - new Date(debut)) / 86400000) + 1;
  return diff > 1 ? `${diff} j` : '1 j';
}

function fmtDate(str) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initials(prenom, nom) {
  return `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase();
}

function Avatar({ prenom, nom }) {
  return <span className="aeq-avatar" aria-hidden="true">{initials(prenom, nom)}</span>;
}

function StatCard({ label, value, mod }) {
  return (
    <div className={`aeq-stat aeq-stat--${mod}`}>
      <span className="aeq-stat__val">{value}</span>
      <span className="aeq-stat__lbl">{label}</span>
    </div>
  );
}

function BadgeType({ type }) {
  return (
    <span className={`aeq-badge aeq-badge--type aeq-badge--${type}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const AbsencesEquipePage = () => {
  const alert = useAlert();

  const [absences, setAbsences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  /* filters */
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  /* declare modal */
  const [showDeclare, setShowDeclare] = useState(false);
  const [decl, setDecl] = useState({
    utilisateur_id: '',
    type_absence: '',
    date_debut: '',
    date_fin: '',
    commentaire: '',
  });
  const [declFile, setDeclFile] = useState(null);
  const declFileInputRef = React.useRef(null);
  const declCameraInputRef = React.useRef(null);
  const [declError, setDeclError] = useState('');
  const [declSending, setDeclSending] = useState(false);

  const loadAbsences = useCallback(async () => {
    try {
      const res = await api.get('/absences');
      setAbsences(Array.isArray(res.data) ? res.data : (res.data?.absences || []));
    } catch {
      alert.error('Impossible de charger les absences.');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersService.getAll({ statut: 'actif' });
      const list = Array.isArray(res.data) ? res.data : (res.data?.users || res.data?.data || []);
      setUsers(list.filter(u => ['employe', 'apprenti', 'manager', 'admin_entreprise'].includes(u.role)));
    } catch {
      /* non-bloquant */
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadAbsences(), loadUsers()]);
      setLoading(false);
    })();
  }, [loadAbsences, loadUsers]);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total: absences.length,
    maladie: absences.filter(a => a.type_absence === 'maladie').length,
    exceptionnelle: absences.filter(a => a.type_absence === 'absence_exceptionnelle').length,
  }), [absences]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return absences.filter(a => {
      const u = a.utilisateur || {};
      const fullName = `${u.prenom || ''} ${u.nom || ''}`.toLowerCase();
      if (q && !fullName.includes(q)) return false;
      if (filterType && a.type_absence !== filterType) return false;
      return true;
    });
  }, [absences, search, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  /* ── Declare for someone ── */
  const handleDeclare = async (e) => {
    e.preventDefault();
    setDeclError('');
    if (!decl.utilisateur_id || !decl.type_absence || !decl.date_debut || !decl.date_fin || !decl.commentaire.trim()) {
      setDeclError('Tous les champs sont obligatoires.');
      return;
    }
    if (decl.date_fin < decl.date_debut) {
      setDeclError('La date de fin doit être >= la date de début.');
      return;
    }
    setDeclSending(true);
    try {
      const formData = new FormData();
      formData.append('utilisateur_id', decl.utilisateur_id);
      formData.append('type_absence', decl.type_absence);
      formData.append('date_debut', decl.date_debut);
      formData.append('date_fin', decl.date_fin);
      formData.append('commentaire', decl.commentaire.trim());
      if (declFile) {
        formData.append('justificatif', declFile);
      }

      await api.post('/absences', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert.success('Absence déclarée avec succès.');
      setShowDeclare(false);
      setDecl({ utilisateur_id: '', type_absence: '', date_debut: '', date_fin: '', commentaire: '' });
      setDeclFile(null);
      if (declFileInputRef.current) declFileInputRef.current.value = '';
      if (declCameraInputRef.current) declCameraInputRef.current.value = '';
      await loadAbsences();
    } catch (err) {
      setDeclError(err.response?.data?.message || 'Erreur lors de la déclaration.');
    } finally {
      setDeclSending(false);
    }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="aeq-loading">
        <Spinner animation="border" size="sm" variant="primary" />
        <span>Chargement…</span>
      </div>
    );
  }

  return (
    <Container fluid="sm" className="aeq-page">
      {/* Header */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Absences — équipe</span>
        <button className="aeq-btn-declare" onClick={() => setShowDeclare(true)}>
          <FaPlus size={12} />
          Déclarer pour un collaborateur
        </button>
      </div>

      {/* Stats */}
      <div className="aeq-stats">
        <StatCard label="Total" value={stats.total} mod="total" />
        <StatCard label="Arrêts maladie" value={stats.maladie} mod="maladie" />
        <StatCard label="Abs. exceptionnelles" value={stats.exceptionnelle} mod="exceptionnelle" />
      </div>

      {/* Filters */}
      <Card className="aeq-filters-card mb-3">
        <Card.Body className="aeq-filters">
          <div className="aeq-search-wrap">
            <FaSearch className="aeq-search-icon" size={13} />
            <input
              className="aeq-search"
              placeholder="Rechercher un collaborateur…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
            />
          </div>

          <div className="aeq-filter-group">
            <FaFilter size={12} className="aeq-filter-icon" />
            <select
              className="aeq-select"
              value={filterType}
              onChange={e => { setFilterType(e.target.value); resetPage(); }}
            >
              <option value="">Tous les types</option>
              <option value="maladie">Arrêt maladie</option>
              <option value="absence_exceptionnelle">Absence exceptionnelle</option>
            </select>
          </div>

          {(search || filterType) && (
            <button
              className="aeq-btn-reset"
              onClick={() => { setSearch(''); setFilterType(''); resetPage(); }}
            >
              Réinitialiser
            </button>
          )}
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="aeq-table-card">
        <div className="aeq-table-wrap">
          {filtered.length === 0 ? (
            <div className="aeq-empty">
              <FaUserClock size={32} className="aeq-empty-icon" />
              <p>Aucune absence trouvée.</p>
            </div>
          ) : (
            <table className="aeq-table">
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Déclarée le</th>
                  <th>Commentaire</th>
                  <th>Justificatif</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map(absence => {
                  const u = absence.utilisateur || {};
                  const meta = absence.justificatif_metadata;
                  return (
                    <tr key={absence.id}>
                      <td>
                        <div className="aeq-collab">
                          <Avatar prenom={u.prenom} nom={u.nom} />
                          <div className="aeq-collab-info">
                            <span className="aeq-collab-name">{u.prenom} {u.nom}</span>
                            {u.service && <span className="aeq-collab-service">{u.service}</span>}
                          </div>
                        </div>
                      </td>
                      <td><BadgeType type={absence.type_absence} /></td>
                      <td>
                        <div className="aeq-dates">
                          <span>{fmtDate(absence.date_debut)}</span>
                          {absence.date_debut !== absence.date_fin && (
                            <>
                              <span className="aeq-dates-sep">→</span>
                              <span>{fmtDate(absence.date_fin)}</span>
                            </>
                          )}
                          <span className="aeq-dates-dur">{diffJours(absence.date_debut, absence.date_fin)}</span>
                        </div>
                      </td>
                      <td className="aeq-declared-at">{fmtDate(absence.created_at || absence.createdAt)}</td>
                      <td className="aeq-comment">{absence.commentaire || <span className="aeq-no-comment">—</span>}</td>
                      <td>
                        {meta ? (
                          <span
                            className="aeq-justif-tag"
                            title={`Document transmis par email aux RH/managers\nTaille : ${meta.taille_formatee || ''}\nSHA-256 : ${meta.sha256 || ''}`}
                          >
                            <FaPaperclip className="me-1" size={11} />
                            {meta.nom_original}
                          </span>
                        ) : absence.justificatif ? (
                          <span className="aeq-justif-tag" title="Transmis par email">
                            <FaPaperclip className="me-1" size={11} />
                            {absence.justificatif}
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="aeq-pagination">
            <button
              className="aeq-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <span className="aeq-page-info">Page {currentPage} / {totalPages}</span>
            <button
              className="aeq-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        )}

        <div className="aeq-count">
          {filtered.length} absence{filtered.length !== 1 ? 's' : ''}
          {(search || filterType) && ` sur ${absences.length}`}
        </div>
      </Card>

      {/* ── Modal : Déclarer pour un collaborateur ── */}
      <Modal show={showDeclare} onHide={() => { setShowDeclare(false); setDeclError(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-semibold">
            <FaUserMinus className="me-2" size={15} />
            Déclarer une absence
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleDeclare}>
          <Modal.Body>
            <p className="text-muted small mb-3">
              L'absence est enregistrée immédiatement comme <em>signalée</em>.
            </p>

            <div className="aeq-form-grid">
              <div className="aeq-form-field aeq-form-field--full">
                <label className="aeq-modal-label">Collaborateur <span className="aeq-required">*</span></label>
                <select
                  className="aeq-modal-select"
                  value={decl.utilisateur_id}
                  onChange={e => setDecl(d => ({ ...d, utilisateur_id: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner…</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.prenom} {u.nom}{u.service ? ` — ${u.service}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="aeq-form-field aeq-form-field--full">
                <label className="aeq-modal-label">Type d'absence <span className="aeq-required">*</span></label>
                <select
                  className="aeq-modal-select"
                  value={decl.type_absence}
                  onChange={e => setDecl(d => ({ ...d, type_absence: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner…</option>
                  <option value="maladie">Arrêt maladie</option>
                  <option value="absence_exceptionnelle">Absence exceptionnelle</option>
                </select>
              </div>

              <div className="aeq-form-field">
                <label className="aeq-modal-label">Date de début <span className="aeq-required">*</span></label>
                <input
                  type="date"
                  className="aeq-modal-input"
                  value={decl.date_debut}
                  onChange={e => setDecl(d => ({ ...d, date_debut: e.target.value }))}
                  required
                />
              </div>

              <div className="aeq-form-field">
                <label className="aeq-modal-label">Date de fin <span className="aeq-required">*</span></label>
                <input
                  type="date"
                  className="aeq-modal-input"
                  value={decl.date_fin}
                  min={decl.date_debut || undefined}
                  onChange={e => setDecl(d => ({ ...d, date_fin: e.target.value }))}
                  required
                />
              </div>

              <div className="aeq-form-field aeq-form-field--full">
                <label className="aeq-modal-label">Commentaire <span className="aeq-required">*</span></label>
                <textarea
                  className="aeq-modal-textarea"
                  rows={3}
                  placeholder="Motif, précisions…"
                  value={decl.commentaire}
                  onChange={e => setDecl(d => ({ ...d, commentaire: e.target.value }))}
                  required
                />
              </div>

              <div className="aeq-form-field aeq-form-field--full">
                <label className="aeq-modal-label">Pièce jointe / Justificatif <small className="text-muted">(optionnel)</small></label>
                <input
                  ref={declFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setDeclFile(f);
                  }}
                />
                <input
                  ref={declCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setDeclFile(f);
                  }}
                />

                {!declFile ? (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="aeq-modal-btn aeq-modal-btn--cancel py-1 px-3 d-inline-flex align-items-center gap-1"
                      onClick={() => declFileInputRef.current?.click()}
                    >
                      <FaImage size={13} className="text-primary" /> Fichier / Galerie
                    </button>
                    <button
                      type="button"
                      className="aeq-modal-btn aeq-modal-btn--cancel py-1 px-3 d-inline-flex align-items-center gap-1"
                      onClick={() => declCameraInputRef.current?.click()}
                    >
                      <FaCamera size={13} className="text-success" /> Photo
                    </button>
                  </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-between p-2 rounded border bg-light">
                    <span className="small text-truncate me-2">
                      <FaPaperclip className="me-1" />
                      {declFile.name} ({(declFile.size / 1024).toFixed(1)} Ko)
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => {
                        setDeclFile(null);
                        if (declFileInputRef.current) declFileInputRef.current.value = '';
                        if (declCameraInputRef.current) declCameraInputRef.current.value = '';
                      }}
                      title="Supprimer"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
                <div className="text-muted small mt-1" style={{ fontSize: '0.74rem' }}>
                  🔒 Envoyé par email aux RH/managers puis supprimé. Seule la preuve reste enregistrée.
                </div>
              </div>
            </div>

            {declError && <p className="aeq-form-error">{declError}</p>}
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="aeq-modal-btn aeq-modal-btn--cancel"
              onClick={() => { setShowDeclare(false); setDeclError(''); }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="aeq-modal-btn aeq-modal-btn--confirm"
              disabled={declSending}
            >
              {declSending ? <Spinner animation="border" size="sm" /> : "Déclarer l'absence"}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </Container>
  );
};

export default AbsencesEquipePage;
