import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import { FaCalendarTimes, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { joursFeriesService, entreprisesService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const JoursFeriesPage = () => {
  const confirmDialog = useConfirmDialog();
  const { user } = useAuth();
  const [joursFeries, setJoursFeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingJourFerie, setEditingJourFerie] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [importCountry, setImportCountry] = useState('FR');
  const [importLoading, setImportLoading] = useState(false);
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

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadEntreprises();
    } else {
      loadJoursFeries();
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin' && selectedEntrepriseId) {
      loadJoursFeries({ entreprise_id: selectedEntrepriseId });
    }
  }, [selectedEntrepriseId, user?.role]);

  useEffect(() => {
    loadTemplates();
  }, []);

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
      setError('Erreur lors du chargement des entreprises');
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
      setError('Erreur lors du chargement des modèles de jours fériés');
    }
  };

  const loadJoursFeries = async (params = {}) => {
    try {
      setLoading(true);
      const response = await joursFeriesService.getAll(params);
      setJoursFeries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erreur chargement jours fériés:', err);
      setError('Erreur lors du chargement des jours fériés');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
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
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du jour férié');
    }
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
    const confirmed = await confirmDialog({
      title: 'Supprimer un jour férié',
      message: 'Ce jour férié sera supprimé définitivement.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await joursFeriesService.delete(id, user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {});
      await loadJoursFeries(user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {});
      setSuccess('Jour férié supprimé.');
    } catch (err) {
      console.error('Erreur suppression jour férié:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression du jour férié');
    }
  };

  const handleNew = () => {
    setEditingJourFerie(null);
    setFormData({ date: '', libelle: '', recurrent: false, est_travail: false });
    setShowModal(true);
  };

  const handleImportNational = async () => {
    try {
      setError('');
      setSuccess('');

      if (importYear < 2000 || importYear > 2100) {
        setError('Veuillez saisir une année valide entre 2000 et 2100.');
        return;
      }

      if (!/^[A-Z]{2}$/.test(importCountry)) {
        setError('Le code pays doit contenir exactement 2 lettres, par exemple FR.');
        return;
      }

      if (user?.role === 'super_admin' && !selectedEntrepriseId) {
        setError('Sélectionnez une entreprise avant de lancer l\'import API.');
        return;
      }

      setImportLoading(true);
      const params = user?.role === 'super_admin' ? { entreprise_id: selectedEntrepriseId } : {};
      const response = await joursFeriesService.importNational(importYear, { country: importCountry }, params);

      await loadJoursFeries(params);
      setSuccess(response.data?.message || 'Import terminé.');
    } catch (err) {
      console.error('Erreur import jours fériés:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'import des jours fériés nationaux');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateTemplateFromCurrent = async () => {
    try {
      setError('');
      setSuccess('');

      if (!templateName.trim()) {
        setError('Nom du modèle requis.');
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
      setError(err.response?.data?.message || 'Erreur lors de la création du modèle');
    }
  };

  const handleExportTemplateCsv = async () => {
    try {
      setError('');
      setSuccess('');
      if (!selectedTemplateId) {
        setError('Sélectionnez un modèle à exporter.');
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
      setError(err.response?.data?.message || 'Erreur lors de l\'export du modèle CSV');
    }
  };

  const handleImportTemplateCsv = async () => {
    try {
      setError('');
      setSuccess('');

      if (!templateName.trim()) {
        setError('Nom du modèle requis pour l\'import CSV.');
        return;
      }
      if (!templateCsvContent.trim()) {
        setError('Collez le contenu CSV avant import.');
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
      setError(err.response?.data?.message || 'Erreur lors de l\'import du modèle CSV');
    }
  };

  const handleApplyTemplate = async () => {
    try {
      setError('');
      setSuccess('');

      if (!selectedTemplateId) {
        setError('Sélectionnez un modèle à appliquer.');
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
      setError(err.response?.data?.message || 'Erreur lors de l\'application du modèle');
    }
  };

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
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Chargement des jours fériés...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Jours fériés</h1>
          <p className="text-muted">Gestion des jours fériés et jours travaillés</p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            onClick={handleNew}
            className="d-flex align-items-center"
          >
            <FaPlus className="me-2" />
            Nouveau jour férié
          </Button>
        )}
      </div>

      <InfoCardInfo title="Pourquoi gérer les jours fériés ?">
        <p>
          Les jours fériés sont pris en compte dans le calcul des congés. Une bonne configuration
          évite les erreurs de décompte et garantit des soldes justes pour toute l'entreprise.
        </p>
        <ul className="mb-0">
          <li>Type "Férié" : journée non travaillée</li>
          <li>Type "Travaillé" : journée exceptionnelle travaillée</li>
          <li>Les jours fériés impactent le calcul des jours de congé</li>
        </ul>
      </InfoCardInfo>

      {canManage && (
        <TipCard title="Mini tutoriel rapide">
          Ajoutez d'abord les jours fériés nationaux, puis les exceptions locales. Vérifiez ensuite
          le calendrier des congés pour confirmer l'impact visuel.
        </TipCard>
      )}

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {canManage && (
        <Card className="mb-3">
          <Card.Body>
            <Row className="g-3 align-items-end">
              {user?.role === 'super_admin' && (
                <Col md={5}>
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
              <Col md={user?.role === 'super_admin' ? 2 : 3}>
                <Form.Label>Année</Form.Label>
                <Form.Control
                  type="number"
                  value={importYear}
                  onChange={(e) => setImportYear(Number(e.target.value))}
                />
              </Col>
              <Col md={user?.role === 'super_admin' ? 2 : 3}>
                <Form.Label>Pays</Form.Label>
                <Form.Control
                  type="text"
                  value={importCountry}
                  onChange={(e) => setImportCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </Col>
              <Col md={user?.role === 'super_admin' ? 3 : 6}>
                <Button
                  variant="outline-primary"
                  onClick={handleImportNational}
                  disabled={importLoading || (user?.role === 'super_admin' && !selectedEntrepriseId)}
                >
                  {importLoading ? 'Import en cours...' : 'Importer les jours fériés via API'}
                </Button>
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
              <Col md={4}>
                <Form.Label>Nom du modèle</Form.Label>
                <Form.Control
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: FR - Réunion"
                />
              </Col>
              <Col md={3}>
                <Form.Label>Région</Form.Label>
                <Form.Control
                  type="text"
                  value={templateRegion}
                  onChange={(e) => setTemplateRegion(e.target.value)}
                  placeholder="Ex: Reunion"
                />
              </Col>
              <Col md={5} className="d-flex gap-2">
                <Button variant="outline-primary" onClick={handleCreateTemplateFromCurrent}>
                  Créer depuis l'entreprise
                </Button>
                <Button variant="outline-success" onClick={handleImportTemplateCsv}>
                  Importer CSV en modèle
                </Button>
              </Col>
            </Row>

            <Row className="g-3 align-items-end mt-1">
              <Col md={6}>
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
              <Col md={6} className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={handleExportTemplateCsv} disabled={!selectedTemplateId}>
                  Exporter modèle CSV
                </Button>
                <Button variant="primary" onClick={handleApplyTemplate} disabled={!selectedTemplateId}>
                  Appliquer à l'entreprise
                </Button>
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
                <Button variant="primary" onClick={handleNew}>
                  <FaPlus className="me-2" />
                  Ajouter le premier jour férié
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Libellé</th>
                    <th>Récurrent</th>
                    <th>Type</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {joursFeries.map((jourFerie) => (
                    <tr key={jourFerie.id}>
                      <td>{formatDate(jourFerie.date)}</td>
                      <td>{jourFerie.libelle}</td>
                      <td>
                        <Badge bg={jourFerie.recurrent ? 'info' : 'secondary'}>
                          {jourFerie.recurrent ? 'Oui' : 'Non'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={jourFerie.est_travail ? 'success' : 'secondary'}>
                          {jourFerie.est_travail ? 'Travaillé' : 'Férié'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(jourFerie)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(jourFerie.id)}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal d'édition/ajout */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingJourFerie ? 'Modifier le jour férié' : 'Nouveau jour férié'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Check
                    type="switch"
                    label="Jour travaillé"
                    checked={formData.est_travail}
                    onChange={(e) => setFormData(prev => ({ ...prev, est_travail: e.target.checked }))}
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
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              {editingJourFerie ? 'Modifier' : 'Créer'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default JoursFeriesPage;