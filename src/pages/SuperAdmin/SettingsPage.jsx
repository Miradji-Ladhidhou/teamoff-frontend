import './settings.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Tab, Tabs, Table, Modal } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { FaSave, FaDatabase, FaServer, FaShieldAlt, FaEnvelope, FaDownload } from 'react-icons/fa';
import { settingsService, quotasService, googleDriveAuthService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';
import AsyncButton from '../../components/AsyncButton';

const SystemSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState({
    // Paramètres généraux
    appName: 'TeamOff',
    appVersion: '1.0.0',
    maintenanceMode: false,
    maintenanceMessage: 'Application en maintenance. Veuillez reessayer plus tard.',
    maxFileSize: 10, // MB

    // Paramètres email
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',      // champ de saisie seulement — jamais pré-rempli depuis l'API
    smtpPasswordSet: false, // true si un mot de passe est configuré côté serveur
    emailFrom: '',

    // Paramètres sécurité
    sessionTimeout: 60, // minutes
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,

    // Paramètres notifications
    emailNotifications: true,
    pushNotifications: true,
    slackWebhook: '',       // champ de saisie seulement — jamais pré-rempli depuis l'API
    slackWebhookSet: false,

    // Paramètres base de données
    dbBackupFrequency: 'daily',
    dbRetentionDays: 30
  });

  const [loading, setLoading] = useState(false);
  const alert = useAlert();
  const [success, setSuccess] = useState('');
  const [systemInfo, setSystemInfo] = useState({});
  const [confirmModal, setConfirmModal] = useState({ show: false, action: '', label: '', payload: null });
  const [driveBackups, setDriveBackups] = useState([]);
  const [loadingDriveBackups, setLoadingDriveBackups] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null); // null=chargement, {connected, email, source}
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [settingsHistory, setSettingsHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySortBy, setHistorySortBy] = useState('date');
  const [historySortOrder, setHistorySortOrder] = useState('desc');

  // Onglet Quotas — crédit mensuel manuel
  const now = new Date();
  const [accrualYear,    setAccrualYear]    = useState(now.getFullYear());
  const [accrualMonth,   setAccrualMonth]   = useState(now.getMonth() + 1);
  const [accrualResults, setAccrualResults] = useState(null);
  const [accrualLoading, setAccrualLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSystemInfo();
    // Statut connexion Google Drive
    googleDriveAuthService.getStatus()
      .then(({ data }) => setDriveStatus(data))
      .catch(() => setDriveStatus({ connected: false }));
    // Retour OAuth Google (redirect depuis backend)
    const driveConnected = searchParams.get('drive_connected');
    const driveError     = searchParams.get('drive_error');
    if (driveConnected === 'true') {
      alert.showSuccessModal('Google Drive connecté avec succès !', { autoCloseMs: 4000 });
      googleDriveAuthService.getStatus().then(({ data }) => setDriveStatus(data)).catch(() => {});
      setSearchParams(p => { p.delete('drive_connected'); return p; });
    } else if (driveError) {
      alert.error(`Erreur connexion Google Drive : ${driveError}`);
      setSearchParams(p => { p.delete('drive_error'); return p; });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadHistory();
  }, [historyPage, historyPageSize, historySortBy, historySortOrder]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  const loadSettings = async () => {
    try {
      const response = await settingsService.getAll();
      const serverSettings = response.data || {};
      setSettings(prev => ({
        ...prev,
        ...serverSettings,
        // Ne jamais pré-remplir les secrets depuis l'API : le champ reste vide.
        // smtpPasswordSet / slackWebhookSet indiquent si une valeur est configurée.
        smtpPassword: '',
        slackWebhook: '',
      }));
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      alert.error('Impossible de charger les paramètres système');
    }
  };

  const loadSystemInfo = async () => {
    try {
      const response = await settingsService.getSystemInfo();
      setSystemInfo(response.data || {});
    } catch (error) {
      console.error('Erreur chargement info système:', error);
      alert.error('Impossible de charger les informations système');
    }
  };

  const loadHistory = async (overrides = {}) => {
    try {
      const nextPage = overrides.page ?? historyPage;
      const nextPageSize = overrides.pageSize ?? historyPageSize;
      const nextSortBy = overrides.sortBy ?? historySortBy;
      const nextSortOrder = overrides.sortOrder ?? historySortOrder;

      const response = await settingsService.getHistory({
        page: nextPage,
        pageSize: nextPageSize,
        sortBy: nextSortBy,
        sortOrder: nextSortOrder,
      });
      setSettingsHistory(
        (response.data?.logs || []).map((log) => ({
          ...log,
          createdAt: log.createdAt ?? log.created_at,
        }))
      );

      const pagination = response.data?.pagination;
      if (pagination) {
        setHistoryPage(pagination.page || 1);
        setHistoryPageSize(pagination.pageSize || 20);
        setHistoryTotalPages(pagination.totalPages || 1);
        setHistoryTotal(pagination.total || 0);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const handleSave = async (section, label) => {
    try {
      setLoading(true);
      setSuccess('');

      const sectionFields = {
        general: ['appName', 'maintenanceMode', 'maintenanceMessage', 'maxFileSize'],
        security: ['sessionTimeout', 'maxLoginAttempts', 'passwordMinLength', 'requireSpecialChars'],
        email: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'emailFrom'],
        database: ['dbBackupFrequency', 'dbRetentionDays']
      };

      const fields = sectionFields[section] || [];
      const SKIP_IF_EMPTY = ['smtpPassword', 'slackWebhook'];
      const payload = {};
      fields.forEach((field) => {
        // Ne pas envoyer les champs secrets si l'admin n'a rien saisi :
        // une chaîne vide ne doit pas écraser un secret existant côté serveur.
        if (SKIP_IF_EMPTY.includes(field) && !settings[field]) return;
        payload[field] = settings[field];
      });

      const response = await settingsService.updateSection(section, payload);
      const updatedSettings = response.data?.settings;
      if (updatedSettings) {
        setSettings(prev => ({
          ...prev,
          ...updatedSettings,
          // Réinitialiser les champs de saisie secret après sauvegarde
          smtpPassword: '',
          slackWebhook: '',
        }));
      }

      await loadHistory({ page: 1 });
      setSuccess(`Paramètres ${label} sauvegardés avec succès`);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderSectionActions = ({ onSave, extraActions = null, hint = 'Les modifications sont appliquées après sauvegarde.' }) => (
    <div className="d-flex justify-content-between align-items-start align-items-sm-center flex-column flex-sm-row gap-2 border-top pt-3 mt-4">
      <small className="text-muted">{hint}</small>
      <div className="d-grid d-sm-flex gap-2">
        {extraActions}
        <AsyncButton
          variant="primary"
          onClick={onSave}
          isLoading={loading}
          showSpinner={loading}
          loadingText="Sauvegarde..."
        >
          <FaSave className="me-2" />
          Enregistrer les modifications
        </AsyncButton>
      </div>
    </div>
  );

  const openConfirm = (action, label, payload = null) => setConfirmModal({ show: true, action, label, payload });
  const closeConfirm = () => setConfirmModal({ show: false, action: '', label: '', payload: null });

  const loadDriveBackups = async () => {
    setLoadingDriveBackups(true);
    try {
      const res = await settingsService.getDriveBackups();
      setDriveBackups(Array.isArray(res.data?.files) ? res.data.files : []);
    } catch {
      alert.error('Impossible de charger les sauvegardes Google Drive.');
    } finally {
      setLoadingDriveBackups(false);
    }
  };

  const executeSystemAction = async () => {
    const { action } = confirmModal;
    closeConfirm();
    try {
      setLoading(true);

      let message = 'Action exécutée.';

      if (action === 'backup') {
        const response = await settingsService.runBackup();
        message = response.data?.message || 'Sauvegarde manuelle lancée.';

        const backup = response.data?.backup;
        if (backup?.filename) {
          const backupResponse = await settingsService.downloadBackup(backup.filename);
          const blob = new Blob([backupResponse.data], { type: 'application/sql' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = backup.filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      } else if (action === 'backup-drive') {
        const response = await settingsService.runBackupDrive();
        message = response.data?.message || 'Sauvegarde envoyée sur Google Drive.';
        const driveLink = response.data?.drive?.webViewLink;
        if (driveLink) window.open(driveLink, '_blank', 'noopener,noreferrer');
        await loadDriveBackups();
      } else if (action === 'restore-drive') {
        const { fileId, filename } = confirmModal.payload || {};
        const response = await settingsService.runRestoreDrive(fileId, filename);
        const v = response.data?.verification;
        message = response.data?.message || 'Base de données restaurée.';
        if (v) {
          message += `\n\nVérification : ${v.utilisateurs} utilisateur(s), ${v.entreprises} entreprise(s), ${v.conges} congé(s).`;
        }
      } else if (action === 'restart') {
        const response = await settingsService.runRestart();
        message = response.data?.message || 'Redémarrage demandé.';
      } else if (action === 'maintenance') {
        const response = await settingsService.setMaintenance(!settings.maintenanceMode, settings.maintenanceMessage);
        message = response.data?.message || 'Mode maintenance mis à jour.';
      }

      if (action === 'maintenance') {
        setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }));
      }

      await loadSettings();
      await loadSystemInfo();
      await loadHistory({ page: 1 });
      setSuccess(message);
    } catch {
      alert.error('Erreur lors de l\'exécution de l\'action.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setLoading(true);
      setSuccess('');

      await settingsService.sendTestEmail(testEmailRecipient || settings.emailFrom || settings.smtpUser);
      setSuccess('Email de test envoyé avec succès.');
    } catch (error) {
      alert.error(error.response?.data?.message || 'Erreur lors de l\'envoi de l\'email de test.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportHistoryCSV = async () => {
    try {
      setLoading(true);

      const response = await settingsService.exportHistoryCSV();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings_history_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      let msg = 'Erreur lors de l\'export CSV de l\'historique.';
      const errData = exportError.response?.data;
      if (errData instanceof Blob) {
        try { const t = await errData.text(); msg = JSON.parse(t)?.message || msg; } catch { /* ignore */ }
      } else if (errData?.message) {
        msg = errData.message;
      }
      alert.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds && seconds !== 0) return 'Inconnu';
    const s = Number(seconds);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);

    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getActionLabel = (action) => {
    const labels = {
      SYSTEM_SETTINGS_UPDATED: 'Parametres modifies',
      SYSTEM_BACKUP_CREATED: 'Sauvegarde SQL creee',
      SYSTEM_MAINTENANCE_TOGGLED: 'Mode maintenance mis a jour',
      SYSTEM_RESTART_REQUESTED: 'Demande de redemarrage',
      SYSTEM_TEST_EMAIL_SENT: 'Email de test envoye',
    };

    return labels[action] || action;
  };

  const formatActor = (log) => {
    const user = log?.utilisateur;
    if (!user) return '-';
    const fullName = [user.prenom, user.nom].filter(Boolean).join(' ').trim();
    return fullName || user.email || '-';
  };

  const formatDetails = (log) => {
    const metadata = log?.metadata || {};
    if (metadata.scope) {
      return `Section: ${metadata.scope}`;
    }
    if (metadata.filename) {
      return `Fichier: ${metadata.filename}`;
    }
    if (typeof metadata.enabled === 'boolean') {
      return metadata.enabled ? 'Maintenance activee' : 'Maintenance desactivee';
    }
    if (metadata.recipient) {
      return `Destinataire: ${metadata.recipient}`;
    }
    return '-';
  };

  return (
    <Container fluid="sm">
      <div className="page-title-bar">
        <span className="section-title-bar__text">Paramètres Système</span>
        <div className="d-flex gap-2">
        </div>
      </div>

      {/* Mobile : select dropdown */}
      <div className="d-md-none mb-3">
        <Form.Select
          value={activeTab}
          onChange={(e) => {
            const t = e.target.value;
            setActiveTab(t);
            setSearchParams({ tab: t });
          }}
        >
          <option value="general">Général</option>
          <option value="security">Sécurité</option>
          <option value="email">Email</option>
          <option value="database">Base de données</option>
          <option value="system">Informations système</option>
          <option value="history">Historique</option>
          <option value="quotas">Quotas</option>
        </Form.Select>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(eventKey) => {
          const nextTab = eventKey || 'general';
          setActiveTab(nextTab);
          setSearchParams({ tab: nextTab });
        }}
        className="mb-4 settings-tabs-mobile"
      >
        {/* Onglet Général */}
        <Tab eventKey="general" title="Général">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Paramètres généraux</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nom de l'application</Form.Label>
                    <Form.Control
                      type="text"
                      value={settings.appName}
                      onChange={(e) => handleInputChange('appName', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Version</Form.Label>
                    <Form.Control
                      type="text"
                      value={settings.appVersion}
                      onChange={(e) => handleInputChange('appVersion', e.target.value)}
                      disabled
                    />
                    <Form.Text className="text-muted">
                      Version automatique
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Taille max des fichiers (MB)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.maxFileSize}
                      onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value, 10) || 0)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      label="Mode maintenance"
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                    />
                    <Form.Text className="text-muted">
                      Desactive l'acces utilisateur pendant la maintenance (les super_admin restent autorises).
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Message maintenance affiche aux utilisateurs</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={settings.maintenanceMessage}
                      onChange={(e) => handleInputChange('maintenanceMessage', e.target.value)}
                      placeholder="Application en maintenance. Veuillez reessayer plus tard."
                    />
                  </Form.Group>
                </Col>
              </Row>

              {renderSectionActions({
                onSave: () => handleSave('general', 'généraux'),
              })}
            </Card.Body>
          </Card>
        </Tab>

        {/* Onglet Sécurité */}
        <Tab eventKey="security" title="Sécurité">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Paramètres de sécurité</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Timeout de session (minutes)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value, 10) || 0)}
                    />
                    <Form.Text className="text-muted">Exemple: 60 = déconnexion automatique après 1h d'inactivité.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tentatives de connexion max</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value, 10) || 0)}
                    />
                    <Form.Text className="text-muted">Exemple: 5 = blocage temporaire après 5 échecs.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Longueur min du mot de passe</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.passwordMinLength}
                      onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value, 10) || 0)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      label="Caractères spéciaux requis"
                      checked={settings.requireSpecialChars}
                      onChange={(e) => handleInputChange('requireSpecialChars', e.target.checked)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {renderSectionActions({
                onSave: () => handleSave('security', 'de sécurité'),
              })}
            </Card.Body>
          </Card>
        </Tab>

        {/* Onglet Email */}
        <Tab eventKey="email" title="Email">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Configuration SMTP</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Serveur SMTP</Form.Label>
                    <Form.Control
                      type="text"
                      value={settings.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Port SMTP</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value, 10) || 0)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Utilisateur SMTP</Form.Label>
                    <Form.Control
                      type="email"
                      value={settings.smtpUser}
                      onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Mot de passe SMTP
                      {settings.smtpPasswordSet && (
                        <span className="text-muted ms-2" style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
                          (configuré — laisser vide pour conserver)
                        </span>
                      )}
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={settings.smtpPassword}
                      onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                      placeholder={settings.smtpPasswordSet ? '••••••••' : 'Entrer le mot de passe SMTP'}
                      autoComplete="new-password"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Email expéditeur</Form.Label>
                <Form.Control
                  type="email"
                  value={settings.emailFrom}
                  onChange={(e) => handleInputChange('emailFrom', e.target.value)}
                  placeholder="noreply@teamoff.com"
                />
                <Form.Text className="text-muted">Exemple: utilisez une adresse dédiée type noreply@entreprise.com.</Form.Text>
              </Form.Group>

              {renderSectionActions({
                onSave: () => handleSave('email', 'email'),
                hint: 'Testez d\'abord la configuration SMTP, puis enregistrez.',
                extraActions: (
                  <AsyncButton
                    variant="outline-secondary"
                    onClick={handleSendTestEmail}
                    isLoading={loading}
                    showSpinner={loading}
                    loadingText="Envoi..."
                    disabled={!testEmailRecipient && !settings.emailFrom && !settings.smtpUser}
                  >
                    <FaEnvelope className="me-2" />
                    Tester l'envoi
                  </AsyncButton>
                ),
              })}

              <Form.Group className="mt-3">
                <Form.Label>Destinataire email de test</Form.Label>
                <Form.Control
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder={settings.emailFrom || settings.smtpUser || 'admin@exemple.com'}
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Tab>

        {/* Onglet Base de données */}
        <Tab eventKey="database" title="Base de données">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Paramètres de base de données</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Fréquence de sauvegarde</Form.Label>
                    <Form.Select
                      value={settings.dbBackupFrequency}
                      onChange={(e) => handleInputChange('dbBackupFrequency', e.target.value)}
                    >
                      <option value="hourly">Toutes les heures</option>
                      <option value="daily">Quotidienne</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuelle</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Rétention des sauvegardes (jours)</Form.Label>
                    <Form.Control
                      type="number"
                      value={settings.dbRetentionDays}
                      onChange={(e) => handleInputChange('dbRetentionDays', parseInt(e.target.value, 10) || 0)}
                    />
                    <Form.Text className="text-muted">Exemple: 30 = conservation des sauvegardes pendant 1 mois.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {renderSectionActions({
                onSave: () => handleSave('database', 'base de données'),
                hint: 'Conservez des valeurs prudentes pour éviter une perte de sauvegardes.',
                extraActions: (
                  <>
                    <Button
                      variant="outline-info"
                      onClick={() => openConfirm('backup', 'Lancer une sauvegarde manuelle de la base de données ?')}
                      disabled={loading}
                    >
                      <FaDatabase className="me-2" />
                      Sauvegarde manuelle
                    </Button>
                    <Button
                      variant="outline-success"
                      onClick={() => openConfirm('backup-drive', 'Sauvegarder la base de données sur Google Drive ?')}
                      disabled={loading}
                    >
                      ☁️ Sauvegarder sur Google Drive
                    </Button>
                  </>
                ),
              })}
            </Card.Body>
          </Card>

          {/* Connexion Google Drive */}
          <Card className="mt-3">
            <Card.Header><h5 className="mb-0">☁️ Connexion Google Drive</h5></Card.Header>
            <Card.Body>
              {driveStatus === null ? (
                <span className="text-muted small">Chargement…</span>
              ) : driveStatus.connected ? (
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="badge bg-success">Connecté</span>
                  {driveStatus.email && <span className="small text-muted">{driveStatus.email}</span>}
                  {driveStatus.source === 'env' && (
                    <span className="badge bg-secondary small">via variable d'env</span>
                  )}
                  {driveStatus.source === 'db' && (
                    <Button
                      variant="outline-danger" size="sm"
                      onClick={async () => {
                        if (!window.confirm('Déconnecter Google Drive ?')) return;
                        try {
                          await googleDriveAuthService.disconnect();
                          setDriveStatus({ connected: false });
                          alert.showSuccessModal('Google Drive déconnecté.', { autoCloseMs: 3000 });
                        } catch { alert.error('Erreur lors de la déconnexion.'); }
                      }}
                    >Déconnecter</Button>
                  )}
                </div>
              ) : (
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span className="badge bg-secondary">Non connecté</span>
                  <Button
                    variant="outline-primary" size="sm"
                    disabled={driveConnecting}
                    onClick={async () => {
                      setDriveConnecting(true);
                      try {
                        const { data } = await googleDriveAuthService.getAuthUrl();
                        window.location.href = data.url;
                      } catch (e) {
                        alert.error(e.response?.data?.message || 'Impossible de générer l\'URL OAuth.');
                        setDriveConnecting(false);
                      }
                    }}
                  >
                    {driveConnecting ? 'Redirection…' : '🔗 Connecter un compte Google'}
                  </Button>
                  <span className="small text-muted">Requiert GOOGLE_OAUTH_CLIENT_ID et CLIENT_SECRET sur le serveur.</span>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Sauvegardes Google Drive */}
          <Card className="mt-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">☁️ Sauvegardes Google Drive</h5>
              <Button variant="outline-secondary" size="sm" onClick={loadDriveBackups} disabled={loadingDriveBackups}>
                {loadingDriveBackups ? 'Chargement…' : 'Actualiser'}
              </Button>
            </Card.Header>
            <Card.Body>
              {driveBackups.length === 0 ? (
                <div className="text-center py-3 text-muted small">
                  Cliquez sur "Actualiser" pour afficher les sauvegardes disponibles sur Google Drive.
                </div>
              ) : (
                <div className="settings-table-wrap">
                <Table hover className="drive-backup-table mb-0">
                  <thead>
                    <tr>
                      <th>Fichier</th>
                      <th>Date</th>
                      <th>Taille</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {driveBackups.map((file) => (
                      <tr key={file.id}>
                        <td style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{file.name}</td>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'var(--dk-text-soft)' }}>
                          {file.createdTime ? new Date(file.createdTime).toLocaleString('fr-FR') : '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--dk-text-soft)' }}>
                          {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} Mo` : '—'}
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            {file.webViewLink && (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => window.open(file.webViewLink, '_blank', 'noopener,noreferrer')}
                                title="Voir sur Drive"
                              >
                                <FaDownload />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => openConfirm(
                                'restore-drive',
                                `⚠️ Restaurer "${file.name}" ? Cette action écrasera toutes les données actuelles de la base de données. Cette opération est irréversible.`,
                                { fileId: file.id, filename: file.name }
                              )}
                              disabled={loading}
                            >
                              Restaurer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Onglet Informations système */}
        <Tab eventKey="system" title="Informations système">
          <Card>
            <Card.Header>
              <h5 className="mb-0">État du système</h5>
            </Card.Header>
            <Card.Body>
              <div className="settings-table-wrap">
                <div className="settings-table-hint d-md-none">Glissez horizontalement si le tableau dépasse l'écran.</div>
                <Table bordered responsive className="settings-table">
                <tbody>
                  <tr>
                    <td><strong>Version Node.js</strong></td>
                    <td>{systemInfo.nodeVersion}</td>
                  </tr>
                  <tr>
                    <td><strong>Plateforme</strong></td>
                    <td>{systemInfo.platform}</td>
                  </tr>
                  <tr>
                    <td><strong>Mémoire disponible</strong></td>
                    <td>{systemInfo.memory || 'Inconnu'}</td>
                  </tr>
                  <tr>
                    <td><strong>Mémoire libre</strong></td>
                    <td>{systemInfo.freeMemory || 'Inconnu'}</td>
                  </tr>
                  <tr>
                    <td><strong>Cœurs CPU</strong></td>
                    <td>{systemInfo.cores}</td>
                  </tr>
                  <tr>
                    <td><strong>Uptime serveur</strong></td>
                    <td>{formatUptime(systemInfo.uptime)}</td>
                  </tr>
                  <tr>
                    <td><strong>État base de données</strong></td>
                    <td>
                      <span className={`badge ${systemInfo.dbStatus === 'connected' ? 'approved' : 'refused'}`}>
                        {systemInfo.dbStatus || 'unknown'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Dernière sauvegarde</strong></td>
                    <td>
                      {systemInfo.lastBackupAt
                        ? new Date(systemInfo.lastBackupAt).toLocaleString('fr-FR')
                        : 'Aucune'}
                    </td>
                  </tr>
                </tbody>
                </Table>
              </div>

              <div className="settings-system-actions justify-content-end mt-3">
                <Button
                  variant="outline-warning"
                  onClick={() => openConfirm('restart', 'Redémarrer les services applicatifs ? Les sessions actives seront maintenues.')}
                  disabled={loading}
                >
                  <FaServer className="me-2" />
                  Redémarrer services
                </Button>
                <Button
                  variant={settings.maintenanceMode ? 'warning' : 'outline-danger'}
                  onClick={() => openConfirm(
                    'maintenance',
                    settings.maintenanceMode
                      ? 'Désactiver le mode maintenance et rendre l\'application accessible ?'
                      : 'Activer le mode maintenance ? L\'application sera inaccessible pour les utilisateurs.'
                  )}
                  disabled={loading}
                >
                  <FaShieldAlt className="me-2" />
                  {settings.maintenanceMode ? 'Désactiver maintenance' : 'Mode maintenance'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="history" title="Historique">
          <Card>
            <Card.Header>
              <div className="d-flex settings-history-header justify-content-between align-items-center gap-2 flex-wrap">
                <h5 className="mb-0">Historique des modifications systeme</h5>
                <div className="settings-history-toolbar align-items-center flex-wrap">
                  <Form.Select
                    size="sm"
                    className="settings-history-control"
                    value={historySortBy}
                    onChange={(e) => {
                      setHistorySortBy(e.target.value);
                      setHistoryPage(1);
                    }}
                  >
                    <option value="date">Trier par date</option>
                    <option value="action">Trier par action</option>
                    <option value="actor">Trier par auteur</option>
                  </Form.Select>
                  <Form.Select
                    size="sm"
                    className="settings-history-control"
                    value={historySortOrder}
                    onChange={(e) => {
                      setHistorySortOrder(e.target.value);
                      setHistoryPage(1);
                    }}
                  >
                    <option value="desc">Descendant</option>
                    <option value="asc">Ascendant</option>
                  </Form.Select>
                  <Form.Select
                    size="sm"
                    className="settings-history-control"
                    value={historyPageSize}
                    onChange={(e) => {
                      setHistoryPageSize(Number(e.target.value));
                      setHistoryPage(1);
                    }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </Form.Select>
                  <AsyncButton
                    variant="outline-primary"
                    size="sm"
                    onClick={handleExportHistoryCSV}
                    isLoading={loading}
                    showSpinner={loading}
                    loadingText="Export..."
                  >
                    <FaDownload className="me-2" />
                    Export CSV
                  </AsyncButton>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="settings-history-meta justify-content-between align-items-center mb-2">
                <small className="text-muted">
                  {historyTotal} action(s) trouvee(s)
                </small>
                <small className="text-muted">
                  Page {historyPage} / {historyTotalPages}
                </small>
              </div>
              <div className="settings-table-wrap">
                <div className="settings-table-hint d-md-none">Glissez horizontalement pour voir l'historique complet.</div>
                <Table bordered responsive className="settings-table settings-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Par</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsHistory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">Aucune action systeme recente</td>
                    </tr>
                  )}
                  {settingsHistory.map((log) => (
                    <tr key={log.id}>
                      <td data-label="Date">{new Date(log.createdAt).toLocaleString('fr-FR')}</td>
                      <td data-label="Action">{getActionLabel(log.action)}</td>
                      <td data-label="Par">{formatActor(log)}</td>
                      <td data-label="Détails">{formatDetails(log)}</td>
                    </tr>
                  ))}
                </tbody>
                </Table>
              </div>

              <div className="settings-history-pagination justify-content-end gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={historyPage <= 1 || loading}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Precedent
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={historyPage >= historyTotalPages || loading}
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="quotas" title="Quotas">
          <Card className="settings-card">
            <Card.Body>
              <h5 className="mb-1">Crédit mensuel — rattrapage manuel</h5>
              <p className="text-muted small mb-4">
                Permet de simuler (audit) puis d'appliquer le crédit mensuel pour toutes les entreprises actives.
                Utilisez le mode simulation d'abord pour vérifier les montants avant d'appliquer.
              </p>

              <Row className="g-3 align-items-end mb-4">
                <Col xs={6} md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Année</Form.Label>
                    <Form.Control
                      type="number"
                      min={2020}
                      max={2100}
                      value={accrualYear}
                      onChange={(e) => setAccrualYear(Number(e.target.value))}
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold">Mois</Form.Label>
                    <Form.Select value={accrualMonth} onChange={(e) => setAccrualMonth(Number(e.target.value))}>
                      {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={6} className="d-flex gap-2 flex-wrap">
                  <Button
                    variant="outline-primary"
                    disabled={accrualLoading}
                    onClick={async () => {
                      setAccrualLoading(true);
                      setAccrualResults(null);
                      try {
                        const { data } = await quotasService.monthlyAccrual({ annee: accrualYear, mois: accrualMonth, apply: false });
                        setAccrualResults({ ...data, simulated: true });
                      } catch (e) {
                        alert.error(e.response?.data?.message || 'Erreur simulation');
                      } finally { setAccrualLoading(false); }
                    }}
                  >
                    {accrualLoading ? 'Chargement…' : 'Simuler (audit)'}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={accrualLoading}
                    onClick={async () => {
                      if (!window.confirm(`Appliquer le crédit ${accrualYear}-${String(accrualMonth).padStart(2,'0')} pour TOUTES les entreprises ?`)) return;
                      setAccrualLoading(true);
                      setAccrualResults(null);
                      try {
                        const { data } = await quotasService.monthlyAccrual({ annee: accrualYear, mois: accrualMonth, apply: true });
                        setAccrualResults({ ...data, simulated: false });
                        alert.showSuccessModal(data.message, { autoCloseMs: 5000 });
                      } catch (e) {
                        alert.error(e.response?.data?.message || 'Erreur application');
                      } finally { setAccrualLoading(false); }
                    }}
                  >
                    Appliquer le crédit
                  </Button>
                </Col>
              </Row>

              {accrualResults && (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span className={`badge ${accrualResults.simulated ? 'bg-secondary' : 'bg-success'} fs-6`}>
                      {accrualResults.simulated ? 'SIMULATION' : 'APPLIQUÉ'}
                    </span>
                    <span className="small text-muted">
                      {accrualResults.simulated
                        ? <>À créditer : <strong>{accrualResults.total_to_apply ?? '—'}</strong></>
                        : <>Crédits posés : <strong>{accrualResults.total_applied ?? '—'}</strong></>
                      } · Ignorés (déjà crédités) : <strong>{accrualResults.total_skipped ?? '—'}</strong>
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <Table bordered size="sm" className="settings-table mb-0">
                      <thead>
                        <tr>
                          <th>Entreprise</th>
                          <th className="text-center">{accrualResults.simulated ? 'À créditer' : 'Posés'}</th>
                          <th className="text-center">Ignorés</th>
                          <th className="text-center">Jours ajoutés</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(accrualResults.results || []).map((r) => (
                          <tr key={r.entreprise_id} className={r.error ? 'table-danger' : ''}>
                            <td>{r.nom}</td>
                            <td className="text-center">{r.error ? '—' : (accrualResults.simulated ? (r.to_apply ?? 0) : (r.applied ?? 0))}</td>
                            <td className="text-center">{r.error ? '—' : (r.skipped ?? 0)}</td>
                            <td className="text-center">{r.error ? '—' : (r.total_added ?? 0)}</td>
                            <td>{r.error ? <span className="text-danger small">{r.error}</span> : <span className="text-success small">OK</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modale de confirmation actions système */}
      <Modal show={confirmModal.show} onHide={closeConfirm} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>{confirmModal.label}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeConfirm}>Annuler</Button>
          <AsyncButton
            variant="primary"
            onClick={executeSystemAction}
            isLoading={loading}
            showSpinner={loading}
            loadingText="Exécution..."
          >
            Confirmer
          </AsyncButton>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SystemSettings;