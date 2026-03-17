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

const DEFAULT_BLOCKED_DAYS = {
  exclude_weekends: true,
  exclude_holidays: true,
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

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const JoursBloquesPage = () => {
  const { user } = useAuth();
  const entrepriseId = user?.entreprise_id;

  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [blockedDays, setBlockedDays] = useState(DEFAULT_BLOCKED_DAYS);
  const [accrualByType, setAccrualByType] = useState({});
  const [specificDateInput, setSpecificDateInput] = useState('');

  const [users, setUsers] = useState([]);
  const [congeTypes, setCongeTypes] = useState([]);

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
        setError('');

        const [policyResponse, usersResponse, typesResponse] = await Promise.all([
          entreprisesService.getPolitique(entrepriseId),
          usersService.getAll(),
          congeTypesService.getAll(),
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
          weekdays: Array.isArray(nextBlockedDays.weekdays) ? nextBlockedDays.weekdays.map(Number) : [],
          specific_dates: Array.isArray(nextBlockedDays.specific_dates) ? nextBlockedDays.specific_dates : [],
        });
        setAccrualByType(policy.accrual_by_type || {});
        setUsers(nextUsers);
        setCongeTypes(nextTypes);

        if (nextUsers.length > 0) {
          setSelectedUserId((prev) => prev || nextUsers[0].id);
        }
      } catch (errLoad) {
        console.error('Erreur chargement paramètres jours bloqués:', errLoad);
        setError('Impossible de charger les paramètres de décompte et les soldes.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [entrepriseId]);

  useEffect(() => {
    if (!selectedUserId) return;

    const loadCounters = async () => {
      try {
        setLoadingCounters(true);
        const response = await quotasService.getUserCounters(selectedUserId, { annee: selectedYear });
        setCounters(Array.isArray(response.data?.items) ? response.data.items : []);
      } catch (errLoadCounters) {
        console.error('Erreur chargement compteurs:', errLoadCounters);
        setError(errLoadCounters.response?.data?.message || 'Impossible de charger les compteurs utilisateur.');
      } finally {
        setLoadingCounters(false);
      }
    };

    loadCounters();
  }, [selectedUserId, selectedYear]);

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
    setError('');
    setSuccess('');

    try {
      setSavingPolicy(true);
      const payload = {
        blocked_days: {
          exclude_weekends: Boolean(blockedDays.exclude_weekends),
          exclude_holidays: Boolean(blockedDays.exclude_holidays),
          weekdays: Array.isArray(blockedDays.weekdays) ? blockedDays.weekdays.map(Number) : [],
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
      setError(errSave.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const openCounterModal = (counter = null) => {
    if (counter) {
      setCounterForm({
        conge_type_id: counter.conge_type_id,
        jours_acquis: toNumber(counter.jours_acquis, 0),
        jours_pris: toNumber(counter.jours_pris, 0),
        jours_reportes: toNumber(counter.jours_reportes, 0),
        jours_reserves: toNumber(counter.jours_reserves, 0),
      });
    } else {
      setCounterForm({
        conge_type_id: congeTypes[0]?.id || '',
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
      setError('');
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
      setError(errCounter.response?.data?.message || 'Impossible de mettre à jour le compteur.');
    }
  };

  const deleteCounter = async (counterId) => {
    const confirmed = window.confirm('Supprimer ce compteur ?');
    if (!confirmed) return;

    try {
      setError('');
      await quotasService.deleteUserCounter(counterId);
      setCounters((prev) => prev.filter((item) => item.id !== counterId));
      setSuccess('Compteur supprimé.');
    } catch (errDelete) {
      console.error('Erreur suppression compteur:', errDelete);
      setError(errDelete.response?.data?.message || 'Impossible de supprimer le compteur.');
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-4">
        <h1 className="h3 mb-1">Paramètres jours bloqués et soldes</h1>
        <p className="text-muted mb-0">Configurez les jours non décomptés et ajustez les soldes de congés en cours d'année.</p>
      </div>

      <InfoCardInfo title="Impact métier">
        <p className="mb-0">
          Les paramètres de cette page sont appliqués lors du calcul des jours déduits et des acquisitions mensuelles automatiques.
        </p>
      </InfoCardInfo>

      <TipCard title="Cas d'entrée en cours d'année">
        Utilisez le tableau des compteurs pour ajuster précisément acquis, pris, reportés et réservés par type de congé.
      </TipCard>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

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
            <Form.Check
              className="mb-3"
              type="switch"
              label="Exclure les jours fériés du décompte"
              checked={Boolean(blockedDays.exclude_holidays)}
              onChange={(event) => setBlockedDays((prev) => ({ ...prev, exclude_holidays: event.target.checked }))}
            />

            <Form.Group className="mb-3">
              <Form.Label>Jours de semaine bloqués (en plus des week-ends)</Form.Label>
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
                <Col md={4}>
                  <Form.Control
                    type="date"
                    value={specificDateInput}
                    onChange={(event) => setSpecificDateInput(event.target.value)}
                  />
                </Col>
                <Col md={3}>
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
                      className="btn-close btn-close-white"
                      style={{ fontSize: '0.65rem' }}
                      onClick={() => removeSpecificDate(date)}
                      aria-label={`Supprimer ${date}`}
                    />
                  </Badge>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Acquisition mensuelle automatique par type</Form.Label>
              <Table responsive size="sm">
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
                      <td style={{ maxWidth: 220 }}>
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
            </Form.Group>

            <Button type="submit" disabled={savingPolicy}>
              {savingPolicy ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>CRUD soldes utilisateur</strong>
          <Button size="sm" onClick={() => openCounterModal()}>Ajouter ou modifier un solde</Button>
        </Card.Header>
        <Card.Body>
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                {userOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
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
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Acquis</th>
                  <th>Pris</th>
                  <th>Reportés</th>
                  <th>Réservés</th>
                  <th>Solde</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.conge_type?.libelle || '-'}</td>
                    <td>{counter.jours_acquis}</td>
                    <td>{counter.jours_pris}</td>
                    <td>{counter.jours_reportes}</td>
                    <td>{counter.jours_reserves}</td>
                    <td><strong>{counter.solde_disponible}</strong></td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-primary" onClick={() => openCounterModal(counter)}>Editer</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => deleteCounter(counter.id)}>Supprimer</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showCounterModal} onHide={() => setShowCounterModal(false)}>
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
              >
                {congeTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.libelle}</option>
                ))}
              </Form.Select>
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
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCounterModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default JoursBloquesPage;
