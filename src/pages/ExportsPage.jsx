import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, ProgressBar, Table } from 'react-bootstrap';
import { FaDownload, FaFileExcel, FaFilePdf, FaCalendarAlt, FaUsers, FaChartBar, FaHeartbeat } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { entreprisesService, exportsService, usersService } from '../services/api';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useAlert } from '../hooks/useAlert';
import { useAsyncAction } from '../hooks/useAsyncAction';
import AsyncButton from '../components/AsyncButton';

const ALLOWED_FORMATS_BY_TYPE = {
  conges: ['csv', 'pdf'],
  absences: ['csv', 'pdf'],
  arrets_maladie: ['csv', 'pdf'],
  utilisateurs: ['csv'],
  audit: ['csv'],
  usage: ['pdf'],
  statistiques: ['csv'],
};

const ExportsPage = () => {
  const { user } = useAuth();
  const exportAction = useAsyncAction();
  const previewAction = useAsyncAction();
  const alert = useAlert();
  const [success, setSuccess] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);

  const [exportParams, setExportParams] = useState({
    type: 'conges',
    format: 'csv',
    dateDebut: '',
    dateFin: '',
    statut: 'all',
    utilisateur: 'all',
    entrepriseId: '',
    service: '',
    salarie: '',
    sortBy: user?.role === 'super_admin' ? 'entreprise' : 'service',
    sortOrder: 'asc',
  });

  const exportOptions = user?.role === 'super_admin'
    ? [
      { value: 'conges', label: 'Demandes de congé' },
      { value: 'absences', label: 'Absences' },
      { value: 'arrets_maladie', label: 'Arrêts maladie' },
      { value: 'utilisateurs', label: 'Utilisateurs' },
      { value: 'audit', label: 'Logs d\'audit' },
      { value: 'usage', label: 'Rapport d\'usage' }
    ]
    : user?.role === 'manager'
      ? [
        { value: 'conges', label: 'Demandes de congé' },
        { value: 'absences', label: 'Absences' },
        { value: 'arrets_maladie', label: 'Arrêts maladie' }
      ]
      : [
        { value: 'conges', label: 'Demandes de congé' },
        { value: 'absences', label: 'Absences' },
        { value: 'arrets_maladie', label: 'Arrêts maladie' },
        { value: 'utilisateurs', label: 'Utilisateurs' },
        { value: 'statistiques', label: 'Statistiques' }
      ];

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;

    let cancelled = false;
    const loadEntreprises = async () => {
      try {
        const response = await entreprisesService.getAll();
        if (!cancelled) {
          setEntreprises(Array.isArray(response.data) ? response.data : []);
        }
      } catch (_) {
        if (!cancelled) setEntreprises([]);
      }
    };

    loadEntreprises();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    let cancelled = false;

    const loadUsersData = async () => {
      try {
        const response = await usersService.getAll();
        const allUsers = Array.isArray(response.data) ? response.data : [];
        const scopedUsers = user?.role === 'super_admin' && exportParams.entrepriseId
          ? allUsers.filter((u) => u.entreprise_id === exportParams.entrepriseId)
          : allUsers;

        const usersSorted = [...scopedUsers].sort((a, b) => {
          const aName = `${a.prenom || ''} ${a.nom || ''}`.trim().toLowerCase();
          const bName = `${b.prenom || ''} ${b.nom || ''}`.trim().toLowerCase();
          return aName.localeCompare(bName, 'fr');
        });

        const servicesSorted = [...new Set(
          scopedUsers
            .map((u) => (u.service || '').trim())
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, 'fr'));

        if (!cancelled) {
          setAvailableUsers(usersSorted);
          setAvailableServices(servicesSorted);
        }
      } catch (_) {
        if (!cancelled) {
          setAvailableUsers([]);
          setAvailableServices([]);
        }
      }
    };

    loadUsersData();
    return () => {
      cancelled = true;
    };
  }, [user?.role, exportParams.entrepriseId]);

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
        if (!queryParams.entrepriseId) delete queryParams.entrepriseId;
        if (!queryParams.service) delete queryParams.service;
        if (!queryParams.salarie) delete queryParams.salarie;
        if (!queryParams.sortBy) delete queryParams.sortBy;
        if (!queryParams.sortOrder) delete queryParams.sortOrder;
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
        } else if (type === 'absences') {
          if (format === 'csv') {
            response = await exportsService.exportAbsencesCSV(queryParams);
          } else if (format === 'pdf') {
            response = await exportsService.exportAbsencesPDF(queryParams);
          }
        } else if (type === 'arrets_maladie') {
          if (format === 'csv') {
            response = await exportsService.exportArretsMaladieCSV(queryParams);
          } else if (format === 'pdf') {
            response = await exportsService.exportArretsMaladiePDF(queryParams);
          }
        } else if (type === 'utilisateurs') {
          if (format === 'csv') {
            response = await exportsService.exportUtilisateursCSV();
          }
        } else if (type === 'audit') {
          if (format === 'csv') {
            response = await exportsService.exportAuditCSV(queryParams);
          }
        } else if (type === 'statistiques') {
          if (format === 'csv') {
            response = await exportsService.exportStatistiquesCSV(queryParams);
          }
        } else if (type === 'usage') {
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
    if (!queryParams.entrepriseId) delete queryParams.entrepriseId;
    if (!queryParams.service) delete queryParams.service;
    if (!queryParams.salarie) delete queryParams.salarie;
    if (!queryParams.sortBy) delete queryParams.sortBy;
    if (!queryParams.sortOrder) delete queryParams.sortOrder;
    if (queryParams.utilisateur === 'all') delete queryParams.utilisateur;
    if (queryParams.utilisateur === 'me') queryParams.utilisateur = user.id;

    return queryParams;
  };

  const handlePreview = async () => {
    await previewAction.run(async () => {
      try {
        const queryParams = buildQueryParams();
        const response = await exportsService.preview({
          type: exportParams.type, 
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

  const filteredSalaries = exportParams.service
    ? availableUsers.filter((u) => (u.service || '').trim() === exportParams.service)
    : availableUsers;

  const allowedFormats = ALLOWED_FORMATS_BY_TYPE[exportParams.type] || ['csv'];

  const getExportTypeIcon = (type) => {
    const icons = {
      conges: FaCalendarAlt,
      absences: FaCalendarAlt,
      arrets_maladie: FaHeartbeat,
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
      absences: 'Absences',
      arrets_maladie: 'Arrêts maladie',
      utilisateurs: 'Utilisateurs',
      statistiques: 'Statistiques',
      audit: 'Logs d\'audit',
      usage: 'Rapport d\'usage'
    };
    return labels[type] || type;
  };

  // Vérifier les permissions
  if (!['manager', 'admin_entreprise', 'super_admin'].includes(user.role)) {
    return (
      <Container fluid="sm">
        <div className="alert alert-danger text-center" role="alert">
          Accès non autorisé. Cette page est réservée aux managers et administrateurs.
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="d-flex align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Exports de données</h1>
          <p className="text-muted">Exportez vos données au format CSV</p>
        </div>
      </div>

      <InfoCardInfo title="Guide rapide des exports">
        <p className="mb-2">Suivez ces étapes pour obtenir un fichier propre et exploitable :</p>
        <ol className="mb-0">
          <li>Choisissez le type de données à exporter</li>
          <li>Exportez vos données au format CSV</li>
          <li>Affinez la période et les filtres, puis lancez l'export</li>
        </ol>
      </InfoCardInfo>

      <TipCard title="Astuce qualité de données">
        Pour des exports plus lisibles, commencez par un intervalle court puis élargissez progressivement.
      </TipCard>

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
                  <div className="d-flex flex-column flex-md-row gap-2 gap-md-3 export-options-group">
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
                  <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3 export-options-group">
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
                    {/*      <Form.Check
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
                    /> */}
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
                {(exportParams.type === 'conges' || exportParams.type === 'absences' || exportParams.type === 'arrets_maladie') && (
                  <>
                    {/* Statut uniquement pour congés */}
                    {exportParams.type === 'conges' && (
                      <Form.Group className="mb-3">
                        <Form.Label>Statut des congés</Form.Label>
                        <Form.Select
                          name="statut"
                          value={exportParams.statut}
                          onChange={handleParamChange}
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="en_attente_manager">En attente manager</option>
                          <option value="valide_manager">Validé manager</option>
                          <option value="refuse_manager">Refusé manager</option>
                          <option value="valide_final">Validé final</option>
                          <option value="refuse_final">Refusé final</option>
                        </Form.Select>
                      </Form.Group>
                    )}

                    {user?.role === 'super_admin' && (
                      <Form.Group className="mb-3">
                        <Form.Label>Entreprise</Form.Label>
                        <Form.Select
                          name="entrepriseId"
                          value={exportParams.entrepriseId}
                          onChange={handleParamChange}
                        >
                          <option value="">Toutes les entreprises</option>
                          {entreprises.map((entreprise) => (
                            <option key={entreprise.id} value={entreprise.id}>{entreprise.nom}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    )}

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Service</Form.Label>
                          <Form.Select
                            name="service"
                            value={exportParams.service}
                            onChange={handleParamChange}
                          >
                            <option value="">Tous les services</option>
                            {availableServices.map((service) => (
                              <option key={service} value={service}>{service}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Salarié</Form.Label>
                          <Form.Select
                            name="salarie"
                            value={exportParams.salarie}
                            onChange={handleParamChange}
                          >
                            <option value="">Tous les salariés</option>
                            {filteredSalaries.map((sal) => {
                              const fullName = `${sal.prenom || ''} ${sal.nom || ''}`.trim();
                              const label = fullName ? `${fullName} (${sal.email})` : sal.email;
                              return (
                                <option key={sal.id} value={sal.email}>{label}</option>
                              );
                            })}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Trier par</Form.Label>
                          <Form.Select name="sortBy" value={exportParams.sortBy} onChange={handleParamChange}>
                            {user?.role === 'super_admin' && <option value="entreprise">Entreprise</option>}
                            <option value="service">Service</option>
                            <option value="salarie">Salarié</option>
                            <option value="statut">Statut</option>
                            <option value="date_demande">Date de demande</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Ordre</Form.Label>
                          <Form.Select name="sortOrder" value={exportParams.sortOrder} onChange={handleParamChange}>
                            <option value="asc">Croissant</option>
                            <option value="desc">Décroissant</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                {(exportParams.type === 'statistiques' || exportParams.type === 'usage') && (
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
                <div className="d-flex flex-column flex-sm-row gap-2">
                  <AsyncButton
                    onClick={handlePreview}
                    disabled={loading}
                    variant="outline-secondary"
                    className="w-100"
                    action={previewAction}
                    loadingText="Prévisualisation..."
                  >
                    Prévisualiser les données
                  </AsyncButton>
                  <AsyncButton
                    onClick={handleExport}
                    variant="primary"
                    className="w-100"
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
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-1 mb-2">
                    <h6 className="mb-0">Aperçu des données à exporter ({getExportTypeLabel(previewData.type || exportParams.type)})</h6>
                    <small className="text-muted">{previewData.count} ligne(s) affichée(s) sur un maximum de {previewData.limitedTo}</small>
                  </div>
                  {previewData.rows?.length ? (
                    <>
                      <div className="d-md-none mobile-card-list">
                        {previewData.rows.map((row, index) => (
                          <Card key={`preview-mobile-row-${index}`} className="mb-2">
                            <Card.Body className="py-2 px-3">
                              {(previewData.columns || []).map((column) => (
                                <div key={`${column}-mobile-${index}`} className="d-flex justify-content-between gap-2 py-1 border-bottom small">
                                  <span className="text-muted">{column}</span>
                                  <span className="fw-semibold text-end">{String(row[column] ?? '-')}</span>
                                </div>
                              ))}
                            </Card.Body>
                          </Card>
                        ))}
                      </div>

                      <div className="table-responsive d-none d-md-block scroll-table-preview">
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
                    </>
                  ) : (
                    <div className="alert alert-info mb-0" role="status">Aucune donnée correspondant à ces filtres.</div>
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
              {/* <p><strong>PDF</strong> : Format adapté pour l'archivage et le partage</p> */}
              <hr />
              <p><strong>Demandes de congé</strong> : Liste complète avec statuts, dates, et commentaires</p>
              <p><strong>Absences</strong> : Toutes les absences hors maladie (absences exceptionnelles, etc.)</p>
              <p><strong>Arrêts maladie</strong> : Toutes les absences pour maladie avec justificatif</p>
              {user?.role !== 'manager' && (
                <p><strong>Utilisateurs</strong> : Informations des employés avec rôles et statuts</p>
              )}
              {user?.role !== 'manager' && (
                <p><strong>Statistiques</strong> : Tableaux de bord et métriques d'utilisation</p>
              )}
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