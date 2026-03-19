import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, ProgressBar, Table } from 'react-bootstrap';
import { FaDownload, FaFileExcel, FaFilePdf, FaCalendarAlt, FaUsers, FaChartBar } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { exportsService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useAlert } from '../hooks/useAlert';
import { useAsyncAction } from '../hooks/useAsyncAction';
import AsyncButton from '../components/AsyncButton';

const ALLOWED_FORMATS_BY_TYPE = {
  conges: ['csv', 'pdf'],
  utilisateurs: ['csv'],
  audit: ['csv'],
  usage: ['pdf'],
  statistiques: ['pdf'],
};

const ExportsPage = () => {
  const { user } = useAuth();
  const exportAction = useAsyncAction();
  const previewAction = useAsyncAction();
  const alert = useAlert();
  const [success, setSuccess] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);

  const [exportParams, setExportParams] = useState({
    type: 'conges',
    format: 'csv',
    dateDebut: '',
    dateFin: '',
    statut: 'all',
    utilisateur: 'all'
  });

  const exportOptions = user?.role === 'super_admin'
    ? [
        { value: 'conges', label: 'Demandes de congé' },
        { value: 'utilisateurs', label: 'Utilisateurs' },
        { value: 'audit', label: 'Logs d\'audit' },
        { value: 'usage', label: 'Rapport d\'usage' }
      ]
    : [
        { value: 'conges', label: 'Demandes de congé' },
        { value: 'utilisateurs', label: 'Utilisateurs' },
        { value: 'statistiques', label: 'Statistiques' }
      ];

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setExportParams(prev => {
      const next = {
        ...prev,
        [name]: value
      };

      if (name === 'type') {
        const allowed = ALLOWED_FORMATS_BY_TYPE[value] || ['csv'];
        if (!allowed.includes(next.format)) {
          next.format = allowed[0];
        }
      }

      return next;
    });
  };

  const handleExport = async () => {
    await exportAction.run(async () => {
      setSuccess('');
      setExportProgress(0);

      let progressInterval = null;
      try {
        // Simulation de la progression
        progressInterval = setInterval(() => {
          setExportProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);

        let response;
        const { type, format, ...queryParamsRaw } = exportParams;
        const queryParams = { ...queryParamsRaw };

        if (!queryParams.dateDebut) delete queryParams.dateDebut;
        if (!queryParams.dateFin) delete queryParams.dateFin;
        if (queryParams.utilisateur === 'all') delete queryParams.utilisateur;
        if (queryParams.utilisateur === 'me') queryParams.utilisateur = user.id;

        const allowedFormats = ALLOWED_FORMATS_BY_TYPE[type] || ['csv'];
        if (!allowedFormats.includes(format)) {
          throw new Error('Ce format n\'est pas disponible pour ce type d\'export.');
        }

        // Utiliser les bonnes fonctions selon le type et le format
        if (type === 'conges') {
          if (format === 'csv') {
            response = await exportsService.exportCongesCSV(queryParams);
          } else if (format === 'pdf') {
            response = await exportsService.exportCongesPDF(queryParams);
          }
        } else if (type === 'utilisateurs') {
          if (format === 'csv') {
            response = await exportsService.exportUtilisateursCSV();
          }
        } else if (type === 'audit') {
          if (format === 'csv') {
            response = await exportsService.exportAuditCSV(queryParams);
          }
        } else if (type === 'statistiques' || type === 'usage') {
          if (format === 'pdf') {
            response = await exportsService.exportUsagePDF();
          }
        }

        if (!response || !response.data) {
          throw new Error('Aucune réponse de l\'API pour cet export.');
        }

        clearInterval(progressInterval);
        setExportProgress(100);

        // Télécharger le fichier
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        const fileName = `export_${exportParams.type}_${new Date().toISOString().split('T')[0]}.${format}`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();

        setSuccess('Export terminé avec succès !');
        setExportProgress(0);
      } catch (err) {
        console.error('Erreur lors de l\'export:', err);
        const serverMessage = err?.response?.data?.error || err?.response?.data?.message;
        alert.error(serverMessage || err.message || 'Erreur lors de l\'export. Veuillez réessayer.');
        setExportProgress(0);
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }
    });
  };

  const buildQueryParams = () => {
    const { ...queryParamsRaw } = exportParams;
    const queryParams = { ...queryParamsRaw };

    if (!queryParams.dateDebut) delete queryParams.dateDebut;
    if (!queryParams.dateFin) delete queryParams.dateFin;
    if (queryParams.utilisateur === 'all') delete queryParams.utilisateur;
    if (queryParams.utilisateur === 'me') queryParams.utilisateur = user.id;

    return queryParams;
  };

  const handlePreview = async () => {
    await previewAction.run(async () => {
      try {
        const queryParams = buildQueryParams();
        const response = await exportsService.preview({
          ...queryParams,
          limit: 50,
        });
        setPreviewData(response.data);
      } catch (err) {
        console.error('Erreur preview export:', err);
        const serverMessage = err?.response?.data?.error || err?.response?.data?.message;
        alert.error(serverMessage || 'Erreur lors de la prévisualisation des données.');
        setPreviewData(null);
      }
    });
  };

  const loading = exportAction.isRunning;
  const previewLoading = previewAction.isRunning;

  const allowedFormats = ALLOWED_FORMATS_BY_TYPE[exportParams.type] || ['csv'];

  const getExportTypeIcon = (type) => {
    const icons = {
      conges: FaCalendarAlt,
      utilisateurs: FaUsers,
      statistiques: FaChartBar,
      audit: FaFileExcel,
      usage: FaChartBar
    };
    const Icon = icons[type] || FaFileExcel;
    return <Icon size={24} />;
  };

  const getExportTypeLabel = (type) => {
    const labels = {
      conges: 'Demandes de congé',
      utilisateurs: 'Utilisateurs',
      statistiques: 'Statistiques',
      audit: 'Logs d\'audit',
      usage: 'Rapport d\'usage'
    };
    return labels[type] || type;
  };

  // Vérifier les permissions
  if (!['admin_entreprise', 'super_admin'].includes(user.role)) {
    return (
      <Container>
        <Alert variant="danger" className="text-center">
          Accès non autorisé. Cette page est réservée aux administrateurs.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <div className="d-flex align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Exports de données</h1>
          <p className="text-muted">Exportez vos données au format CSV ou PDF</p>
        </div>
      </div>

      <InfoCardInfo title="Guide rapide des exports">
        <p className="mb-2">Suivez ces étapes pour obtenir un fichier propre et exploitable :</p>
        <ol className="mb-0">
          <li>Choisissez le type de données à exporter</li>
          <li>Sélectionnez le format (CSV pour tableur, PDF pour partage)</li>
          <li>Affinez la période et les filtres, puis lancez l'export</li>
        </ol>
      </InfoCardInfo>

      <TipCard title="Astuce qualité de données">
        Pour des exports plus lisibles, commencez par un intervalle court puis élargissez progressivement.
      </TipCard>

      {success && (
        <Alert variant="success" className="floating-success-alert" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Paramètres d'export</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                {/* Type d'export */}
                <Form.Group className="mb-3">
                  <Form.Label>Type d'export *</Form.Label>
                  <div className="d-flex gap-3">
                    {exportOptions.map((option) => (
                      <Form.Check
                        key={option.value}
                        type="radio"
                        id={`type-${option.value}`}
                        name="type"
                        value={option.value}
                        checked={exportParams.type === option.value}
                        onChange={handleParamChange}
                        label={
                          <div className="d-flex align-items-center">
                            {getExportTypeIcon(option.value)}
                            <span className="ms-2">{option.label}</span>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </Form.Group>

                {/* Format */}
                <Form.Group className="mb-3">
                  <Form.Label>Format de fichier *</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check
                      type="radio"
                      id="format-csv"
                      name="format"
                      value="csv"
                      checked={exportParams.format === 'csv'}
                      onChange={handleParamChange}
                      disabled={!allowedFormats.includes('csv')}
                      label={
                        <div className="d-flex align-items-center">
                          <FaFileExcel className="text-success me-2" />
                          CSV (.csv)
                        </div>
                      }
                    />
                    <Form.Check
                      type="radio"
                      id="format-pdf"
                      name="format"
                      value="pdf"
                      checked={exportParams.format === 'pdf'}
                      onChange={handleParamChange}
                      disabled={!allowedFormats.includes('pdf')}
                      label={
                        <div className="d-flex align-items-center">
                          <FaFilePdf className="text-danger me-2" />
                          PDF
                        </div>
                      }
                    />
                  </div>
                </Form.Group>

                {/* Période */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de début</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateDebut"
                        value={exportParams.dateDebut}
                        onChange={handleParamChange}
                      />
                      <Form.Text className="text-muted">
                        Laisser vide pour inclure toutes les données depuis le début
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de fin</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateFin"
                        value={exportParams.dateFin}
                        onChange={handleParamChange}
                        min={exportParams.dateDebut}
                      />
                      <Form.Text className="text-muted">
                        Laisser vide pour inclure toutes les données jusqu'à aujourd'hui
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Filtres spécifiques */}
                {exportParams.type === 'conges' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Statut des congés</Form.Label>
                    <Form.Select
                      name="statut"
                      value={exportParams.statut}
                      onChange={handleParamChange}
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="en_attente">En attente</option>
                      <option value="approuve">Approuvé</option>
                      <option value="refuse">Refusé</option>
                      <option value="annule">Annulé</option>
                    </Form.Select>
                  </Form.Group>
                )}

                {(exportParams.type === 'conges' || exportParams.type === 'statistiques' || exportParams.type === 'usage') && (
                  <Form.Group className="mb-4">
                    <Form.Label>Utilisateur</Form.Label>
                    <Form.Select
                      name="utilisateur"
                      value={exportParams.utilisateur}
                      onChange={handleParamChange}
                    >
                      <option value="all">Tous les utilisateurs</option>
                      <option value="me">Mes données uniquement</option>
                    </Form.Select>
                  </Form.Group>
                )}

                {/* Bouton d'export */}
                <div className="d-flex gap-2">
                  <AsyncButton
                    onClick={handlePreview}
                    disabled={loading}
                    variant="outline-secondary"
                    action={previewAction}
                    loadingText="Prévisualisation..."
                  >
                    Prévisualiser les données
                  </AsyncButton>
                  <AsyncButton
                    onClick={handleExport}
                    variant="primary"
                    className="flex-fill"
                    action={exportAction}
                    loadingText="Export en cours..."
                  >
                    {!loading && (
                      <>
                        <FaDownload className="me-2" />
                        Exporter
                      </>
                    )}
                  </AsyncButton>
                </div>

                {/* Barre de progression */}
                {loading && exportProgress > 0 && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Progression de l'export</small>
                      <small className="text-muted">{exportProgress}%</small>
                    </div>
                    <ProgressBar now={exportProgress} animated />
                  </div>
                )}
              </Form>

              {previewData && (
                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Aperçu des données à exporter ({getExportTypeLabel(previewData.type || exportParams.type)})</h6>
                    <small className="text-muted">{previewData.count} ligne(s) affichée(s) sur un maximum de {previewData.limitedTo}</small>
                  </div>
                  {previewData.rows?.length ? (
                    <div className="table-responsive" style={{ maxHeight: 360, overflow: 'auto' }}>
                      <Table striped bordered hover size="sm" className="mb-0">
                        <thead>
                          <tr>
                            {(previewData.columns || []).map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.rows.map((row, index) => (
                            <tr key={`preview-row-${index}`}>
                              {(previewData.columns || []).map((column) => (
                                <td key={`${column}-${index}`}>{String(row[column] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <Alert variant="info" className="mb-0">Aucune donnée correspondant à ces filtres.</Alert>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* Informations sur l'export */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">À propos des exports</h6>
            </Card.Header>
            <Card.Body className="small">
              <p><strong>CSV (.csv)</strong> : Format idéal pour analyser les données dans un tableur</p>
              <p><strong>PDF</strong> : Format adapté pour l'archivage et le partage</p>
              <hr />
              <p><strong>Demandes de congé</strong> : Liste complète avec statuts, dates, et commentaires</p>
              <p><strong>Utilisateurs</strong> : Informations des employés avec rôles et statuts</p>
              <p><strong>Statistiques</strong> : Tableaux de bord et métriques d'utilisation</p>
              {user?.role === 'super_admin' && <p><strong>Audit</strong> : Historique de sécurité et d'administration</p>}
            </Card.Body>
          </Card>

          {/* Exports récents */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Exports récents</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-center text-muted small">
                <p>Aucun export récent</p>
                <p>Les exports terminés apparaîtront ici</p>
              </div>
            </Card.Body>
          </Card>

          {/* Conseils */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Conseils</h6>
            </Card.Header>
            <Card.Body className="small">
              <ul className="mb-0">
                <li>Utilisez des filtres pour réduire la taille des fichiers</li>
                <li>Les exports volumineux peuvent prendre du temps</li>
                <li>Vérifiez vos paramètres avant de lancer l'export</li>
                <li>Les données sont exportées en temps réel</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ExportsPage;