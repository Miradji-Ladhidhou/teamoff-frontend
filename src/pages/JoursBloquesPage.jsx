import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { entreprisesService, congeTypesService, quotasService, usersService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { InfoCardInfo, TipCard } from '../components/InfoCard';
import { useInlineConfirmation } from '../hooks/useInlineConfirmation';
import { useAlert } from '../hooks/useAlert';
import AsyncButton from '../components/AsyncButton';

const DEFAULT_BLOCKED_DAYS = {
  exclude_weekends: true,
  exclude_holidays: true,
  count_saturday: false,
  count_sunday: false,
  include_saturday_after_friday: false,
  include_sunday_after_friday: false,
  weekdays: [],
  specific_dates: [],
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBlockedWeekdays = (days) => (
  Array.isArray(days)
    ? [...new Set(days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
    : []
);

const JoursBloquesPage = () => {
  const { confirmationMessage, requestConfirmation, clearConfirmation } = useInlineConfirmation();
  const { user } = useAuth();
  const entrepriseId = user?.entreprise_id;

  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const alert = useAlert();
  const [success, setSuccess] = useState('');

  const [blockedDays, setBlockedDays] = useState(DEFAULT_BLOCKED_DAYS);
  const [accrualByType, setAccrualByType] = useState({});
  const [reportAutorise, setReportAutorise] = useState(false);
  const [reportMaxJours, setReportMaxJours] = useState(0);
  const [specificDateInput, setSpecificDateInput] = useState('');
  const [showAdvancedWeekendRules, setShowAdvancedWeekendRules] = useState(false);
  const [showCountersSection, setShowCountersSection] = useState(false);

  const [users, setUsers] = useState([]);
  const [congeTypes, setCongeTypes] = useState([]);
  const [loadingCongeTypes, setLoadingCongeTypes] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [counters, setCounters] = useState([]);
  const [loadingCounters, setLoadingCounters] = useState(false);

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterForm, setCounterForm] = useState({
    conge_type_id: '',
    jours_acquis: 0,
    jours_pris: 0,
    jours_reportes: 0,
    jours_reserves: 0,
  });

  useEffect(() => {
    if (!entrepriseId) return;

    const load = async () => {
      try {
        setLoading(true);

        const [policyResponse, usersResponse, typesResponse] = await Promise.all([
          entreprisesService.getPolitique(entrepriseId),
          usersService.getAll(),
          congeTypesService.getAll({ entreprise_id: entrepriseId }),
        ]);

        const policy = policyResponse.data?.politique_conges || {};
        const nextBlockedDays = {
          ...DEFAULT_BLOCKED_DAYS,
          ...(policy.blocked_days || {}),
        };

        const nextUsers = Array.isArray(usersResponse.data)
          ? usersResponse.data.filter((item) => item.role === 'employe' || item.role === 'manager')
          : [];

        const nextTypes = Array.isArray(typesResponse.data) ? typesResponse.data : [];

        setBlockedDays({
          ...nextBlockedDays,
          weekdays: normalizeBlockedWeekdays(nextBlockedDays.weekdays),
          specific_dates: Array.isArray(nextBlockedDays.specific_dates) ? nextBlockedDays.specific_dates : [],
        });
        setAccrualByType(policy.accrual_by_type || {});
        setReportAutorise(Boolean(policy.report_autorise));
        setReportMaxJours(Number(policy.report_max_jours) || 0);
        setUsers(nextUsers);
        setCongeTypes(nextTypes);

        if (nextUsers.length > 0) {
          setSelectedUserId((prev) => prev || nextUsers[0].id);
        }
      } catch (errLoad) {
        console.error('Erreur chargement paramètres jours bloqués:', errLoad);
        alert.error('Impossible de charger les paramètres de décompte et les soldes.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [entrepriseId]);

  const loadCongeTypes = async () => {
    if (!entrepriseId) return [];

    try {
      setLoadingCongeTypes(true);
      const response = await congeTypesService.getAll({ entreprise_id: entrepriseId });
      const nextTypes = Array.isArray(response.data) ? response.data : [];
      setCongeTypes(nextTypes);
      return nextTypes;
    } catch (errLoadTypes) {
      console.error('Erreur chargement types de congé:', errLoadTypes);
      alert.error(errLoadTypes.response?.data?.message || 'Impossible de charger les types de congé.');
      return [];
    } finally {
      setLoadingCongeTypes(false);
    }
  };

  useEffect(() => {
    if (!selectedUserId) return;

    const loadCounters = async () => {
      try {
        setLoadingCounters(true);
        const response = await quotasService.getUserCounters(selectedUserId, { annee: selectedYear });
        setCounters(Array.isArray(response.data?.items) ? response.data.items : []);
      } catch (errLoadCounters) {
        console.error('Erreur chargement compteurs:', errLoadCounters);
        alert.error(errLoadCounters.response?.data?.message || 'Impossible de charger les compteurs utilisateur.');
      } finally {
        setLoadingCounters(false);
      }
    };

    loadCounters();
  }, [selectedUserId, selectedYear]);

  useEffect(() => {
    if (!success) return;
    alert.showSuccessModal(success, { autoCloseMs: 4000 });
    setSuccess('');
  }, [success, alert]);

  const userOptions = useMemo(
    () => users.map((item) => ({ id: item.id, label: `${item.prenom} ${item.nom}`.trim() })),
    [users]
  );

  const addSpecificDate = () => {
    const value = String(specificDateInput || '').trim();
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;

    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: [...new Set([...(prev.specific_dates || []), value])].sort(),
    }));
    setSpecificDateInput('');
  };

  const removeSpecificDate = (date) => {
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: (prev.specific_dates || []).filter((item) => item !== date),
    }));
  };

  const toggleWeekday = (weekday) => {
    setBlockedDays((prev) => {
      const current = new Set(prev.weekdays || []);
      if (current.has(weekday)) current.delete(weekday);
      else current.add(weekday);
      return { ...prev, weekdays: Array.from(current).sort((a, b) => a - b) };
    });
  };

  const handleSavePolicy = async (event) => {
    event.preventDefault();
    setSuccess('');

    try {
      setSavingPolicy(true);
      const payload = {
        blocked_days: {
          exclude_weekends: Boolean(blockedDays.exclude_weekends),
          exclude_holidays: Boolean(blockedDays.exclude_holidays),
          count_saturday: Boolean(blockedDays.count_saturday),
          count_sunday: Boolean(blockedDays.count_sunday),
          include_saturday_after_friday: Boolean(blockedDays.include_saturday_after_friday),
          include_sunday_after_friday: Boolean(blockedDays.include_sunday_after_friday),
          weekdays: normalizeBlockedWeekdays(blockedDays.weekdays),
          specific_dates: Array.isArray(blockedDays.specific_dates) ? blockedDays.specific_dates : [],
        },
        accrual_by_type: congeTypes.reduce((acc, type) => {
          const value = toNumber(accrualByType[type.id], NaN);
          if (Number.isFinite(value) && value >= 0) {
            acc[type.id] = value;
          }
          return acc;
        }, {}),
      };

      await entreprisesService.updatePolitique(entrepriseId, payload);
      setSuccess('Paramètres enregistrés avec succès.');
    } catch (errSave) {
      console.error('Erreur enregistrement paramètres:', errSave);
      alert.error(errSave.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const openCounterModal = async (counter = null) => {
    const availableTypes = congeTypes.length > 0 ? congeTypes : await loadCongeTypes();

    if (counter) {
      setCounterForm({
        conge_type_id: counter.conge_type_id || availableTypes[0]?.id || '',
        jours_acquis: toNumber(counter.jours_acquis, 0),
        jours_pris: toNumber(counter.jours_pris, 0),
        jours_reportes: toNumber(counter.jours_reportes, 0),
        jours_reserves: toNumber(counter.jours_reserves, 0),
      });
    } else {
      setCounterForm({
        conge_type_id: availableTypes[0]?.id || '',
        jours_acquis: 0,
        jours_pris: 0,
        jours_reportes: 0,
        jours_reserves: 0,
      });
    }
    setShowCounterModal(true);
  };

  const saveCounter = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !counterForm.conge_type_id) return;

    try {
      await quotasService.upsertUserCounter(selectedUserId, {
        annee: selectedYear,
        conge_type_id: counterForm.conge_type_id,
        jours_acquis: toNumber(counterForm.jours_acquis, 0),
        jours_pris: toNumber(counterForm.jours_pris, 0),
        jours_reportes: toNumber(counterForm.jours_reportes, 0),
        jours_reserves: toNumber(counterForm.jours_reserves, 0),
      });
      setShowCounterModal(false);
      const response = await quotasService.getUserCounters(selectedUserId, { annee: selectedYear });
      setCounters(Array.isArray(response.data?.items) ? response.data.items : []);
      setSuccess('Solde utilisateur mis à jour.');
    } catch (errCounter) {
      console.error('Erreur sauvegarde compteur:', errCounter);
      alert.error(errCounter.response?.data?.message || 'Impossible de mettre à jour le compteur.');
    }
  };

  const deleteCounter = async (counterId) => {
    const confirmed = requestConfirmation(
      `delete-counter:${counterId}`,
      'Suppression demandée: cliquez une seconde fois sur Supprimer pour confirmer.'
    );
    if (!confirmed) return;

    try {
      clearConfirmation();
      await quotasService.deleteUserCounter(counterId);
      setCounters((prev) => prev.filter((item) => item.id !== counterId));
      setSuccess('Compteur supprimé.');
    } catch (errDelete) {
      console.error('Erreur suppression compteur:', errDelete);
      alert.error(errDelete.response?.data?.message || 'Impossible de supprimer le compteur.');
    }
  };

  if (loading) {
    return (
      <Container fluid="sm" className="page-loading">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-1">Paramètres jours bloqués et soldes</h1>
          <p className="text-muted mb-0">Configurez les jours non décomptés et ajustez les soldes de congés en cours d'année.</p>
        </div>
      </div>

      <InfoCardInfo title="Impact métier">
        <p className="mb-0">
          Les paramètres de cette page sont appliqués lors du calcul des jours déduits et des acquisitions mensuelles automatiques.
        </p>
      </InfoCardInfo>

      <TipCard title="Cas d'entrée en cours d'année">
        Utilisez le tableau des compteurs pour ajuster précisément acquis, pris, reportés et réservés par type de congé.
      </TipCard>

      <Card className="mb-4 border-0 bg-light">
        <Card.Body>
          <div className="fw-semibold mb-2">Par quoi commencer</div>
          <ol className="mb-0 ps-3">
            <li>Activez ou non l'exclusion des week-ends et des jours fériés selon votre règle RH.</li>
            <li>Testez une simulation simple (lundi-vendredi) pour vérifier le résultat attendu.</li>
            <li>N'ouvrez les sections avancées (week-end, compteurs) qu'en cas de besoin spécifique.</li>
          </ol>
        </Card.Body>
      </Card>

      <InfoCardInfo title="Exemples de configuration">
        <ul className="mb-0">
          <li>Entreprise classique: week-ends exclus, jours fériés exclus, aucun autre jour bloqué.</li>
          <li>Activité 6j/7: week-ends exclus désactivé, puis blocage manuel uniquement du dimanche.</li>
          <li>Règle RH stricte: ajouter automatiquement samedi/dimanche si le congé finit un vendredi.</li>
          <li>Ajustement de compteur: "Acquis 10, Pris 2" donne un solde disponible de 8 (hors réservés/reportés).</li>
        </ul>
      </InfoCardInfo>

      {confirmationMessage && (
        <div className="alert alert-warning inline-confirmation-alert fw-semibold d-flex justify-content-between align-items-center" role="status">
          <span>{confirmationMessage}</span>
          <Button type="button" size="sm" variant="outline-secondary" onClick={clearConfirmation}>Fermer</Button>
        </div>
      )}

      <Card className="mb-4">
        <Card.Header><strong>Règles de décompte</strong></Card.Header>
        <Card.Body>
          <Form onSubmit={handleSavePolicy}>
            <Form.Check
              className="mb-3"
              type="switch"
              label="Exclure les week-ends du décompte"
              checked={Boolean(blockedDays.exclude_weekends)}
              onChange={(event) => setBlockedDays((prev) => ({ ...prev, exclude_weekends: event.target.checked }))}
            />
            <Form.Text className="text-muted d-block mb-3">Exemple: activé = samedi/dimanche non déduits, sauf règles avancées activées ci-dessous.</Form.Text>
            <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="small text-muted">Règles week-end avancées</div>
              <Button
                type="button"
                size="sm"
                variant="outline-secondary"
                onClick={() => setShowAdvancedWeekendRules((prev) => !prev)}
              >
                {showAdvancedWeekendRules ? 'Masquer' : 'Afficher'}
              </Button>
            </div>
            {showAdvancedWeekendRules && (
              <>
                <Form.Check
                  className="mb-3"
                  type="switch"
                  label="Compter le samedi même si les week-ends sont exclus"
                  checked={Boolean(blockedDays.count_saturday)}
                  onChange={(event) => setBlockedDays((prev) => ({ ...prev, count_saturday: event.target.checked }))}
                  disabled={!Boolean(blockedDays.exclude_weekends)}
                />
                <Form.Check
                  className="mb-3"
                  type="switch"
                  label="Compter le dimanche même si les week-ends sont exclus"
                  checked={Boolean(blockedDays.count_sunday)}
                  onChange={(event) => setBlockedDays((prev) => ({ ...prev, count_sunday: event.target.checked }))}
                  disabled={!Boolean(blockedDays.exclude_weekends)}
                />
                <Form.Check
                  className="mb-3"
                  type="switch"
                  label="Ajouter automatiquement le samedi si le congé finit un vendredi"
                  checked={Boolean(blockedDays.include_saturday_after_friday)}
                  onChange={(event) => setBlockedDays((prev) => ({ ...prev, include_saturday_after_friday: event.target.checked }))}
                />
                <Form.Check
                  className="mb-3"
                  type="switch"
                  label="Ajouter automatiquement le dimanche si le congé finit un vendredi"
                  checked={Boolean(blockedDays.include_sunday_after_friday)}
                  onChange={(event) => setBlockedDays((prev) => ({ ...prev, include_sunday_after_friday: event.target.checked }))}
                />
                <Form.Text className="text-muted d-block mb-3">
                  Ces règles sont propres à votre entreprise et permettent de déduire samedi/dimanche même si la demande s'arrête au vendredi.
                </Form.Text>
              </>
            )}
            <Form.Check
              className="mb-3"
              type="switch"
              label="Exclure les jours fériés du décompte"
              checked={Boolean(blockedDays.exclude_holidays)}
              onChange={(event) => setBlockedDays((prev) => ({ ...prev, exclude_holidays: event.target.checked }))}
            />
            <Form.Text className="text-muted d-block mb-3">Exemple: activé = un jour férié pendant un congé n'est pas retiré du solde.</Form.Text>

            <Form.Group className="mb-3">
              <Form.Label>Jours bloqués manuellement (en plus des règles ci-dessus)</Form.Label>
              <Form.Text className="text-muted d-block mb-2">
                Pour bloquer uniquement Dimanche: désactivez "Exclure les week-ends du décompte" puis activez "Dimanche".
              </Form.Text>
              <div className="d-flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={(blockedDays.weekdays || []).includes(option.value) ? 'primary' : 'outline-secondary'}
                    onClick={() => toggleWeekday(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Dates spécifiques bloquées</Form.Label>
              <Row className="g-2">
                <Col xs={12} md={4}>
                  <Form.Control
                    type="date"
                    value={specificDateInput}
                    onChange={(event) => setSpecificDateInput(event.target.value)}
                  />
                </Col>
                <Col xs={12} md={3}>
                  <Button type="button" variant="outline-primary" onClick={addSpecificDate} className="w-100">
                    Ajouter la date
                  </Button>
                </Col>
              </Row>
              <div className="d-flex flex-wrap gap-2 mt-3">
                {(blockedDays.specific_dates || []).map((date) => (
                  <Badge key={date} bg="secondary" className="d-flex align-items-center gap-2">
                    {date}
                    <button
                      type="button"
                      className="btn-close btn-close-white text-3xs"
                      onClick={() => removeSpecificDate(date)}
                      aria-label={`Supprimer ${date}`}
                    />
                  </Badge>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Acquisition mensuelle automatique par type</Form.Label>
              <div className="d-md-none mobile-card-list">
                {congeTypes.map((type) => (
                  <div key={`accrual-mobile-${type.id}`} className="mobile-card-list__item">
                    <div className="fw-semibold mb-2">{type.libelle}</div>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.25"
                      value={accrualByType[type.id] ?? ''}
                      placeholder={`Auto (${toNumber(type.quota_annuel, 0) / 12})`}
                      onChange={(event) => setAccrualByType((prev) => ({
                        ...prev,
                        [type.id]: event.target.value,
                      }))}
                    />
                  </div>
                ))}
              </div>
              <div className="settings-table-wrap d-none d-md-block">
                <Table responsive size="sm" className="settings-table">
                  <thead>
                    <tr>
                      <th>Type de congé</th>
                      <th>Jours acquis / mois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {congeTypes.map((type) => (
                      <tr key={type.id}>
                        <td>{type.libelle}</td>
                        <td className="td-truncate">
                          <Form.Control
                            type="number"
                            min="0"
                            step="0.25"
                            value={accrualByType[type.id] ?? ''}
                            placeholder={`Auto (${toNumber(type.quota_annuel, 0) / 12})`}
                            onChange={(event) => setAccrualByType((prev) => ({
                              ...prev,
                              [type.id]: event.target.value,
                            }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Form.Group>

            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 border-top pt-3 mt-4">
              <small className="text-muted">Pensez à enregistrer après chaque ajustement de règle.</small>
              <div className="d-grid w-100 w-sm-auto">
                <AsyncButton
                  type="submit"
                  isLoading={savingPolicy}
                  showSpinner={savingPolicy}
                  loadingText="Enregistrement..."
                  className="w-100"
                >
                  Enregistrer les modifications
                </AsyncButton>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <strong>Gestion des soldes utilisateur</strong>
            <div className="small text-muted">Utilisez cette section uniquement pour les ajustements exceptionnels.</div>
          </div>
          <div className="d-grid d-sm-flex gap-2 w-100 w-sm-auto">
            <Button size="sm" variant="outline-secondary" onClick={() => setShowCountersSection((prev) => !prev)}>
              {showCountersSection ? 'Masquer' : 'Afficher'}
            </Button>
            <Button size="sm" onClick={() => openCounterModal()} disabled={!showCountersSection}>Ajouter ou modifier un solde</Button>
          </div>
        </Card.Header>
        {showCountersSection && (
        <Card.Body>
          <Row className="g-3 mb-3">
            <Col xs={12} md={6}>
              <Form.Select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                {userOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={6} md={3}>
              <Form.Control
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={(event) => setSelectedYear(toNumber(event.target.value, CURRENT_YEAR))}
              />
            </Col>
          </Row>

          {loadingCounters ? (
            <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>
          ) : (
            <div className="settings-table-wrap">
              {reportAutorise && (
                <div className="alert alert-info py-2 mb-2 small">
                  Report annuel activé (max {reportMaxJours} j) — colonne <strong>N-1 reporté</strong> = jours portés de {selectedYear - 1}.
                </div>
              )}
              <div className="d-md-none mobile-card-list">
                {counters.map((counter) => {
                  const joursReportes = toNumber(counter.jours_reportes, 0);
                  const joursAcquisAnnee = toNumber(counter.jours_acquis_annee ?? (toNumber(counter.jours_acquis, 0) - joursReportes), 0);
                  return (
                    <div key={`counter-mobile-${counter.id}`} className="mobile-card-list__item">
                      <div className="fw-semibold mb-2">{counter.conge_type?.libelle || '-'}</div>
                      <div className="small text-muted mb-1">N-1 ({selectedYear - 1}): {joursReportes > 0 ? `${joursReportes.toFixed(1)} j` : '0.0 j'}</div>
                      <div className="small text-muted mb-1">N ({selectedYear}): {joursAcquisAnnee.toFixed(1)} j</div>
                      <div className="mb-3"><strong className="text-primary">Solde: {toNumber(counter.solde_disponible, 0).toFixed(1)} j</strong></div>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => openCounterModal(counter)}>Editer</Button>
                        <Button size="sm" variant="outline-danger" className="flex-fill" onClick={() => deleteCounter(counter.id)}>Supprimer</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Table responsive hover className="settings-table d-none d-md-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th title={`Jours reportés depuis ${selectedYear - 1}`}>N-1 ({selectedYear - 1})</th>
                    <th>N ({selectedYear})</th>
                    <th>Solde</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {counters.map((counter) => {
                    const joursReportes = toNumber(counter.jours_reportes, 0);
                    const joursAcquisAnnee = toNumber(counter.jours_acquis_annee ?? (toNumber(counter.jours_acquis, 0) - joursReportes), 0);
                    return (
                      <tr key={counter.id}>
                        <td>{counter.conge_type?.libelle || '-'}</td>
                        <td>{joursReportes > 0 ? `${joursReportes.toFixed(1)} j` : '0.0 j'}</td>
                        <td><strong>{joursAcquisAnnee.toFixed(1)}</strong> j</td>
                        <td><strong className="text-primary">{toNumber(counter.solde_disponible, 0).toFixed(1)}</strong> j</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="outline-primary" onClick={() => openCounterModal(counter)}>Editer</Button>
                            <Button size="sm" variant="outline-danger" onClick={() => deleteCounter(counter.id)}>Supprimer</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
        )}
      </Card>

      <Modal show={showCounterModal} onHide={() => setShowCounterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Modifier le compteur</Modal.Title>
        </Modal.Header>
        <Form onSubmit={saveCounter}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Type de congé</Form.Label>
              <Form.Select
                value={counterForm.conge_type_id}
                onChange={(event) => setCounterForm((prev) => ({ ...prev, conge_type_id: event.target.value }))}
                required
                disabled={loadingCongeTypes || congeTypes.length === 0}
              >
                <option value="">
                  {loadingCongeTypes ? 'Chargement des types...' : 'Sélectionnez un type de congé'}
                </option>
                {congeTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.libelle}</option>
                ))}
              </Form.Select>
              {congeTypes.length === 0 && !loadingCongeTypes && (
                <div className="text-muted small mt-2">
                  Aucun type de congé disponible pour alimenter le compteur.
                </div>
              )}
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Jours acquis</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.5"
                    value={counterForm.jours_acquis}
                    onChange={(event) => setCounterForm((prev) => ({ ...prev, jours_acquis: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Jours pris</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.5"
                    value={counterForm.jours_pris}
                    onChange={(event) => setCounterForm((prev) => ({ ...prev, jours_pris: event.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Jours reportés</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.5"
                    value={counterForm.jours_reportes}
                    onChange={(event) => setCounterForm((prev) => ({ ...prev, jours_reportes: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Jours réservés</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.5"
                    value={counterForm.jours_reserves}
                    onChange={(event) => setCounterForm((prev) => ({ ...prev, jours_reserves: event.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="d-flex flex-column-reverse flex-sm-row gap-2">
            <Button variant="secondary" onClick={() => setShowCounterModal(false)} className="w-100 w-sm-auto">Annuler</Button>
            <AsyncButton type="submit" className="w-100 w-sm-auto" loadingText="Enregistrement...">
              Enregistrer
            </AsyncButton>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container>
  );
};

export default JoursBloquesPage;
