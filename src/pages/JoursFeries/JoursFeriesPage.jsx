import './jours-feries.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Spinner, Form, Modal } from 'react-bootstrap';
import { FaCalendarTimes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { joursFeriesService, entreprisesService } from '../../services/api';
import { useAlert, useConfirmation } from '../../hooks/useAlert';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import AsyncButton from '../../components/AsyncButton';

const JoursFeriesPage = () => {
  const { confirm } = useConfirmation();
  const { user } = useAuth();
  const [joursFeries, setJoursFeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const alert = useAlert();
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingJourFerie, setEditingJourFerie] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJourFerieDetails, setSelectedJourFerieDetails] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [importCountry, setImportCountry] = useState('FR');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateRegion, setTemplateRegion] = useState('');
  const [templateCsvContent, setTemplateCsvContent] = useState('');
  const [formData, setFormData] = useState({
    date: '',
    libelle: '',
    recurrent: false,
    est_travail: false,
  });
  const saveAction = useAsyncAction();
  const importNationalAction = useAsyncAction();
  const createTemplateAction = useAsyncAction();
  const importTemplateAction = useAsyncAction();
  const exportTemplateAction = useAsyncAction();
  const applyTemplateAction = useAsyncAction();
  const deleteAction = useAsyncAction();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadEntreprises();
    } else {
      loadJoursFeries();
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'super_admin' || !selectedEntrepriseId) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const response = await joursFeriesService.getAll({ entreprise_id: selectedEntrepriseId });
        if (!cancelled) setJoursFeries(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Erreur chargement jours fériés:', err);
        if (!cancelled) alert.error('Erreur lors du chargement des jours fériés');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedEntrepriseId, user?.role]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  const loadEntreprises = async () => {
    try {
      setLoading(true);
      const response = await entreprisesService.getAll();
      const list = Array.isArray(response.data) ? response.data : [];
      setEntreprises(list);

      if (list.length > 0) {
        setSelectedEntrepriseId((prev) => prev || list[0].id);
      } else {
        setJoursFeries([]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur chargement entreprises:', err);
      alert.error('Erreur lors du chargement des entreprises');
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await joursFeriesService.getTemplates();
      const list = Array.isArray(response.data) ? response.data : [];
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplateId((prev) => prev || list[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement modèles:', err);
      alert.error('Erreur lors du chargement des modèles de jours fériés');
    }
  };

  const loadJoursFeries = async (params = {}) => {
    try {
      setLoading(true);
      const response = await joursFeriesService.getAll(params);
      setJoursFeries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erreur chargement jours fériés:', err);
      alert.error('Erreur lors du chargement des jours fériés');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveAction.run(async () => {
      try {
        setSuccess('');

        const payload = {
          ...formData,
          entreprise_id: user?.role === 'super_admin' ? selectedEntrepriseId : undefined,
        };

        if (editingJourFerie) {
          await joursFeriesService.update(editingJourFerie.id, payload);
        } else {
          await joursFeriesService.create(payload);
        }
        setShowModal(false);
        setEditingJourFerie(null);
        setFormData({ date: '', libelle: '', recurrent: false, est_travail: false });
        await loadJoursFeries(user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {});
        setSuccess('Jour férié enregistré avec succès.');
      } catch (err) {
        console.error('Erreur sauvegarde jour férié:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de la sauvegarde du jour férié');
      }
    });
  };

  const handleEdit = (jourFerie) => {
    setEditingJourFerie(jourFerie);
    setFormData({
      date: jourFerie.date.split('T')[0],
      libelle: jourFerie.libelle,
      recurrent: Boolean(jourFerie.recurrent),
      est_travail: Boolean(jourFerie.est_travail),
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    confirm({
      title: 'Supprimer ce jour férié ?',
      description: 'Cette action est irréversible et affectera les calculs de congés des utilisateurs.',
      confirmLabel: 'Supprimer définitivement',
      cancelLabel: 'Annuler',
      danger: true,
      onConfirm: async () => {
        await deleteAction.run(async () => {
          try {
            await joursFeriesService.delete(id, user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {});
            await loadJoursFeries(user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {});
            alert.success('Jour férié supprimé.');
          } catch (err) {
            console.error('Erreur suppression jour férié:', err);
            alert.error(err.response?.data?.message || 'Erreur lors de la suppression du jour férié');
          }
        });
      }
    });
  };

  const handleNew = () => {
    setEditingJourFerie(null);
    setFormData({ date: '', libelle: '', recurrent: false, est_travail: false });
    setShowModal(true);
  };

  const openDetailsModal = (jourFerie) => {
    setSelectedJourFerieDetails(jourFerie);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedJourFerieDetails(null);
  };

  const handleImportNational = async () => {
    await importNationalAction.run(async () => {
      try {
        setSuccess('');

        if (importYear < 2000 || importYear > 2100) {
          alert.error('Veuillez saisir une année valide entre 2000 et 2100.');
          return;
        }

        if (!/^[A-Z]{2}$/.test(importCountry)) {
          alert.error('Le code pays doit contenir exactement 2 lettres, par exemple FR.');
          return;
        }

        if (user?.role === 'super_admin' && !selectedEntrepriseId) {
          alert.error('Sélectionnez une entreprise avant de lancer l\'import API.');
          return;
        }

        const params = user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {};
        const response = await joursFeriesService.importNational(importYear, { country: importCountry }, params);

        await loadJoursFeries(params);
        setSuccess(response.data?.message || 'Import terminé.');
      } catch (err) {
        console.error('Erreur import jours fériés:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de l\'import des jours fériés nationaux');
      }
    });
  };

  const handleCreateTemplateFromCurrent = async () => {
    await createTemplateAction.run(async () => {
      try {
        setSuccess('');

        if (!templateName.trim()) {
          alert.error('Nom du modèle requis.');
          return;
        }

        const params = user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {};
        const payload = {
          name: templateName.trim(),
          region: templateRegion.trim() || null,
          sourceEntrepriseId: user?.role === 'super_admin' ? selectedEntrepriseId : undefined,
        };

        await joursFeriesService.createTemplate(payload, params);
        await loadTemplates();
        setSuccess('Modèle créé depuis les jours fériés de l\'entreprise sélectionnée.');
      } catch (err) {
        console.error('Erreur création modèle:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de la création du modèle');
      }
    });
  };

  const handleExportTemplateCsv = async () => {
    await exportTemplateAction.run(async () => {
      try {
        setSuccess('');
        if (!selectedTemplateId) {
          alert.error('Sélectionnez un modèle à exporter.');
          return;
        }

        const response = await joursFeriesService.exportTemplateCSV(selectedTemplateId);
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `modele_jours_feries_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Erreur export modèle CSV:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de l\'export du modèle CSV');
      }
    });
  };

  const handleImportTemplateCsv = async () => {
    await importTemplateAction.run(async () => {
      try {
        setSuccess('');

        if (!templateName.trim()) {
          alert.error('Nom du modèle requis pour l\'import CSV.');
          return;
        }
        if (!templateCsvContent.trim()) {
          alert.error('Collez le contenu CSV avant import.');
          return;
        }

        await joursFeriesService.importTemplateCSV({
          name: templateName.trim(),
          region: templateRegion.trim() || null,
          csvContent: templateCsvContent,
        });

        await loadTemplates();
        setSuccess('Modèle importé depuis CSV avec succès.');
      } catch (err) {
        console.error('Erreur import modèle CSV:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de l\'import du modèle CSV');
      }
    });
  };

  const handleApplyTemplate = async () => {
    await applyTemplateAction.run(async () => {
      try {
        setSuccess('');

        if (!selectedTemplateId) {
          alert.error('Sélectionnez un modèle à appliquer.');
          return;
        }

        const params = user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {};
        const response = await joursFeriesService.applyTemplate(
          selectedTemplateId,
          { replaceExisting: false },
          params
        );

        await loadJoursFeries(params);
        setSuccess(response.data?.message || 'Modèle appliqué.');
      } catch (err) {
        console.error('Erreur application modèle:', err);
        alert.error(err.response?.data?.message || 'Erreur lors de l\'application du modèle');
      }
    });
  };

  const importLoading = importNationalAction.isRunning;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const canManage = user?.role === 'admin_entreprise' || user?.role === 'super_admin';

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des jours fériés...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Jours fériés</span>
        {canManage && (
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => setShowInfoModal(true)}>
              Info
            </Button>
            <Button
              variant="primary"
              onClick={handleNew}
              className="d-flex align-items-center justify-content-center"
            >
              <FaPlus className="me-2" />
              Nouveau
            </Button>
          </div>
        )}
      </div>

      {canManage && (
        <Card className="mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              {user?.role === 'super_admin' && (
                <Col xs={12} md={5}>
                  <Form.Label>Entreprise</Form.Label>
                  <Form.Select
                    value={selectedEntrepriseId}
                    onChange={(e) => setSelectedEntrepriseId(e.target.value)}
                  >
                    {entreprises.map((e) => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </Form.Select>
                </Col>
              )}
              <Col xs={6} md={user?.role === 'super_admin' ? 2 : 3}>
                <Form.Label>Année</Form.Label>
                <Form.Control
                  type="number"
                  value={importYear}
                  onChange={(e) => setImportYear(Number(e.target.value))}
                />
              </Col>
              <Col xs={6} md={user?.role === 'super_admin' ? 2 : 3}>
                <Form.Label>Pays</Form.Label>
                <Form.Control
                  type="text"
                  value={importCountry}
                  onChange={(e) => setImportCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </Col>
              <Col xs={12} md={user?.role === 'super_admin' ? 3 : 6}>
                <AsyncButton
                  variant="outline-primary"
                  onClick={handleImportNational}
                  disabled={user?.role === 'super_admin' && !selectedEntrepriseId}
                  className="w-100"
                  action={importNationalAction}
                  loadingText="Import en cours..."
                >
                  Importer les jours fériés via API
                </AsyncButton>
              </Col>
            </Row>
            <div className="text-muted small mt-3">
              L'import récupère les jours fériés officiels depuis une API externe selon l'année et le pays sélectionnés,
              puis ajoute uniquement les dates encore absentes pour l'entreprise cible.
            </div>
          </Card.Body>
        </Card>
      )}

      {canManage && (
        <Card className="mb-3">
          <Card.Header>
            <h6 className="mb-0">Modèles régionaux (copier/coller, export/import CSV)</h6>
          </Card.Header>
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col xs={12} md={4}>
                <Form.Label>Nom du modèle</Form.Label>
                <Form.Control
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: FR - Réunion"
                />
              </Col>
              <Col xs={12} md={3}>
                <Form.Label>Région</Form.Label>
                <Form.Control
                  type="text"
                  value={templateRegion}
                  onChange={(e) => setTemplateRegion(e.target.value)}
                  placeholder="Ex: Reunion"
                />
              </Col>
              <Col xs={12} md={5} className="d-flex flex-column flex-md-row gap-2">
                <AsyncButton
                  variant="outline-primary"
                  onClick={handleCreateTemplateFromCurrent}
                  className="w-100"
                  action={createTemplateAction}
                  loadingText="Création du modèle..."
                >
                  Créer depuis l'entreprise
                </AsyncButton>
                <AsyncButton
                  variant="outline-success"
                  onClick={handleImportTemplateCsv}
                  className="w-100"
                  action={importTemplateAction}
                  loadingText="Import du modèle..."
                >
                  Importer CSV en modèle
                </AsyncButton>
              </Col>
            </Row>

            <Row className="g-3 align-items-end mt-1">
              <Col xs={12} md={6}>
                <Form.Label>Modèles disponibles</Form.Label>
                <Form.Select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">Sélectionnez un modèle</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.region ? `(${tpl.region})` : ''} - {tpl.itemsCount || 0} jour(s)
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12} md={6} className="d-flex flex-column flex-md-row gap-2">
                <AsyncButton
                  variant="outline-secondary"
                  onClick={handleExportTemplateCsv}
                  disabled={!selectedTemplateId}
                  className="w-100"
                  action={exportTemplateAction}
                  loadingText="Export du modèle..."
                >
                  Exporter modèle CSV
                </AsyncButton>
                <AsyncButton
                  variant="primary"
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplateId}
                  className="w-100"
                  action={applyTemplateAction}
                  loadingText="Application..."
                >
                  Appliquer à l'entreprise
                </AsyncButton>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Label>Coller un CSV (colonnes: date,libelle,recurrent,est_travail)</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={templateCsvContent}
                onChange={(e) => setTemplateCsvContent(e.target.value)}
                placeholder={"date,libelle,recurrent,est_travail\n2026-01-01,Jour de l'An,true,false"}
              />
            </Form.Group>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body className="p-0">
          {joursFeries.length === 0 ? (
            <div className="text-center py-5">
              <FaCalendarTimes size={48} className="text-muted mb-3" />
              <h5 className="text-muted">Aucun jour férié</h5>
              <p className="text-muted">Aucun jour férié n'est configuré</p>
              {canManage && (
                <Button variant="primary" onClick={handleNew} className="w-100 w-sm-auto">
                  <FaPlus className="me-2" />
                  Ajouter le premier jour férié
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="d-md-none mobile-card-list px-3 py-2">
                {joursFeries.map((jourFerie) => (
                  <div key={`mobile-${jourFerie.id}`} className="mobile-card-list__item">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="fw-semibold">{jourFerie.libelle}</div>
                        <div className="small text-muted">{formatDate(jourFerie.date)}</div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="flex-fill justify-content-center"
                        onClick={() => openDetailsModal(jourFerie)}
                      >
                        Detail
                      </Button>
                      {canManage && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="flex-fill justify-content-center"
                          onClick={() => handleEdit(jourFerie)}
                        >
                          <FaEdit className="me-1" />
                          Modifier
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="flex-fill justify-content-center"
                          onClick={() => handleDelete(jourFerie.id)}
                          disabled={deleteAction.isRunning}
                        >
                          <FaTrash className="me-1" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="table-responsive d-none d-md-block">
                <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Libellé</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {joursFeries.map((jourFerie) => (
                    <tr key={jourFerie.id}>
                      <td>{formatDate(jourFerie.date)}</td>
                      <td>{jourFerie.libelle}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => openDetailsModal(jourFerie)}
                          >
                            Detail
                          </Button>
                          {canManage && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(jourFerie)}
                            >
                              <FaEdit />
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(jourFerie.id)}
                              disabled={deleteAction.isRunning}
                            >
                              <FaTrash />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </Table>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal d'édition/ajout */}
      <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static" keyboard={!saveAction.isRunning} centered>
        <Modal.Header closeButton={!saveAction.isRunning}>
          <Modal.Title>
            {editingJourFerie ? 'Modifier le jour férié' : 'Nouveau jour férié'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    disabled={saveAction.isRunning}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Check
                    type="switch"
                    label="Jour travaillé"
                    checked={formData.est_travail}
                    onChange={(e) => setFormData(prev => ({ ...prev, est_travail: e.target.checked }))}
                    disabled={saveAction.isRunning}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                label="Jour férié récurrent (chaque année)"
                checked={formData.recurrent}
                onChange={(e) => setFormData(prev => ({ ...prev, recurrent: e.target.checked }))}
                disabled={saveAction.isRunning}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Libellé *</Form.Label>
              <Form.Control
                type="text"
                value={formData.libelle}
                onChange={(e) => setFormData(prev => ({ ...prev, libelle: e.target.value }))}
                placeholder="Ex: Jour de l'An, Noël..."
                required
                disabled={saveAction.isRunning}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="d-flex flex-column-reverse flex-sm-row gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saveAction.isRunning} className="w-100 w-sm-auto">
              Annuler
            </Button>
            <AsyncButton
              variant="primary"
              type="submit"
              action={saveAction}
              loadingText={editingJourFerie ? 'Modification...' : 'Création...'}
              className="w-100 w-sm-auto"
            >
              {editingJourFerie ? 'Modifier' : 'Créer'}
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Info jours fériés</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="mb-0">
            <li>La liste reste minimale: date et libellé.</li>
            <li>Utilisez Detail pour voir type et récurrence.</li>
            <li>Import API et modèles sont disponibles en dessous.</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInfoModal(false)}>Fermer</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailsModal} onHide={closeDetailsModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detail jour ferie</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedJourFerieDetails && (
            <div className="d-grid gap-2 small">
              <div><strong>Date:</strong> {formatDate(selectedJourFerieDetails.date)}</div>
              <div><strong>Libelle:</strong> {selectedJourFerieDetails.libelle}</div>
              <div>
                <strong>Type:</strong>{' '}
                <span className={`badge ${selectedJourFerieDetails.est_travail ? 'approved' : 'info'}`}>
                  {selectedJourFerieDetails.est_travail ? 'Travaille' : 'Ferie'}
                </span>
              </div>
              <div>
                <strong>Recurrence:</strong>{' '}
                <span className={`badge ${selectedJourFerieDetails.recurrent ? 'info' : 'pending'}`}>
                  {selectedJourFerieDetails.recurrent ? 'Recurrent' : 'Ponctuel'}
                </span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDetailsModal}>Fermer</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default JoursFeriesPage;