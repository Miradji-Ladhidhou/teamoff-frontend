import './jours-bloques.css';
import '../../styles/settings.css';
import React, { useEffect, useState } from 'react';
import {
  Button,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { entreprisesService, congeTypesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import AsyncButton from '../../components/AsyncButton';

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
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBlockedWeekdays = (days) => (
  Array.isArray(days)
    ? [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    : []
);

const enumerateDateRange = (startDate, endDate, maxDays = 366) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < maxDays) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const JoursBloquesPage = () => {
  const { user } = useAuth();
  const entrepriseId = user?.entreprise_id;
  const alert = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [blockedDays, setBlockedDays] = useState(DEFAULT_BLOCKED_DAYS);
  const [accrualByType, setAccrualByType] = useState({});
  const [congeTypes, setCongeTypes] = useState([]);

  const [specificDateInput, setSpecificDateInput] = useState('');
  const [specificDateRangeStart, setSpecificDateRangeStart] = useState('');
  const [specificDateRangeEnd, setSpecificDateRangeEnd] = useState('');

  useEffect(() => {
    if (!entrepriseId) return;
    const load = async () => {
      try {
        setLoading(true);
        const [policyRes, typesRes] = await Promise.all([
          entreprisesService.getPolitique(entrepriseId),
          congeTypesService.getAll({ entreprise_id: entrepriseId }),
        ]);
        const policy = policyRes.data?.politique_conges || {};
        const next = { ...DEFAULT_BLOCKED_DAYS, ...(policy.blocked_days || {}) };
        setBlockedDays({
          ...next,
          weekdays: normalizeBlockedWeekdays(next.weekdays),
          specific_dates: Array.isArray(next.specific_dates) ? next.specific_dates : [],
        });
        setAccrualByType(policy.accrual_by_type || {});
        setCongeTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      } catch {
        alert.error('Impossible de charger les paramètres.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entrepriseId]);

  const toggleWeekday = (day) => {
    setBlockedDays((prev) => {
      const current = new Set(prev.weekdays || []);
      if (current.has(day)) current.delete(day); else current.add(day);
      return { ...prev, weekdays: Array.from(current).sort((a, b) => a - b) };
    });
  };

  const addSpecificDate = () => {
    const v = String(specificDateInput || '').trim();
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: [...new Set([...(prev.specific_dates || []), v])].sort(),
    }));
    setSpecificDateInput('');
  };

  const addSpecificDateRange = () => {
    const start = specificDateRangeStart.trim();
    const end = specificDateRangeEnd.trim();
    if (!start || !end) { alert.error('Renseignez les deux dates.'); return; }
    const range = enumerateDateRange(start, end);
    if (!range.length) { alert.error('Plage invalide.'); return; }
    if (range.length >= 366) { alert.error('Plage trop grande (max 366 j).'); return; }
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: [...new Set([...(prev.specific_dates || []), ...range])].sort(),
    }));
    setSpecificDateRangeStart('');
    setSpecificDateRangeEnd('');
  };

  const removeSpecificDate = (date) => {
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: (prev.specific_dates || []).filter((d) => d !== date),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
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
          const v = toNumber(accrualByType[type.id], NaN);
          if (Number.isFinite(v) && v >= 0) acc[type.id] = v;
          return acc;
        }, {}),
      };
      await entreprisesService.updatePolitique(entrepriseId, payload);
      alert.success('Paramètres enregistrés.');
    } catch (err) {
      alert.error(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
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
      <Form onSubmit={handleSave}>

        {/* ── Décompte des jours ── */}
        <div className="page-title-bar mb-3">
          <span className="section-title-bar__text">Règles de décompte</span>
        </div>

        <div className="filters-panel mb-4">
          <Form.Check
            className="mb-3"
            type="switch"
            id="exclude-weekends"
            label="Exclure les week-ends du décompte"
            checked={Boolean(blockedDays.exclude_weekends)}
            onChange={(e) => setBlockedDays((p) => ({ ...p, exclude_weekends: e.target.checked }))}
          />
          <Form.Check
            className="mb-3"
            type="switch"
            id="exclude-holidays"
            label="Exclure les jours fériés du décompte"
            checked={Boolean(blockedDays.exclude_holidays)}
            onChange={(e) => setBlockedDays((p) => ({ ...p, exclude_holidays: e.target.checked }))}
          />

          {blockedDays.exclude_weekends && (
            <div className="ps-3 border-start border-2 mb-3">
              <div className="small text-muted mb-2">Options semaine/week-end :</div>
              <Form.Check
                className="mb-2"
                type="switch"
                id="count-saturday"
                label="Compter le samedi malgré l'exclusion des week-ends"
                checked={Boolean(blockedDays.count_saturday)}
                onChange={(e) => setBlockedDays((p) => ({ ...p, count_saturday: e.target.checked }))}
              />
              <Form.Check
                className="mb-2"
                type="switch"
                id="count-sunday"
                label="Compter le dimanche malgré l'exclusion des week-ends"
                checked={Boolean(blockedDays.count_sunday)}
                onChange={(e) => setBlockedDays((p) => ({ ...p, count_sunday: e.target.checked }))}
              />
              <Form.Check
                className="mb-2"
                type="switch"
                id="sat-after-friday"
                label="Ajouter automatiquement le samedi si le congé se termine un vendredi"
                checked={Boolean(blockedDays.include_saturday_after_friday)}
                onChange={(e) => setBlockedDays((p) => ({ ...p, include_saturday_after_friday: e.target.checked }))}
              />
              <Form.Check
                type="switch"
                id="sun-after-friday"
                label="Ajouter automatiquement le dimanche si le congé se termine un vendredi"
                checked={Boolean(blockedDays.include_sunday_after_friday)}
                onChange={(e) => setBlockedDays((p) => ({ ...p, include_sunday_after_friday: e.target.checked }))}
              />
            </div>
          )}
        </div>

        {/* ── Jours bloqués manuels ── */}
        <div className="section-label-title mb-2">Jours bloqués manuellement</div>
        <div className="filters-panel mb-4">
          <Form.Group className="mb-3">
            <Form.Label className="small text-muted">Jours de la semaine toujours exclus</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={(blockedDays.weekdays || []).includes(opt.value) ? 'primary' : 'outline-secondary'}
                  onClick={() => toggleWeekday(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </Form.Group>

          <Form.Group>
            <Form.Label className="small text-muted">Dates spécifiques bloquées</Form.Label>
            <Row className="g-2 mb-2">
              <Col xs={9} md={4}>
                <Form.Control
                  type="date"
                  value={specificDateInput}
                  onChange={(e) => setSpecificDateInput(e.target.value)}
                  placeholder="Date unique"
                />
              </Col>
              <Col xs={3} md="auto">
                <Button type="button" variant="outline-primary" onClick={addSpecificDate} className="w-100">
                  Ajouter
                </Button>
              </Col>
            </Row>
            <Row className="g-2 mb-2">
              <Col xs={5} md={3}>
                <Form.Control
                  type="date"
                  value={specificDateRangeStart}
                  onChange={(e) => setSpecificDateRangeStart(e.target.value)}
                  placeholder="Du"
                />
              </Col>
              <Col xs={5} md={3}>
                <Form.Control
                  type="date"
                  value={specificDateRangeEnd}
                  onChange={(e) => setSpecificDateRangeEnd(e.target.value)}
                  placeholder="Au"
                />
              </Col>
              <Col xs={2} md="auto">
                <Button type="button" variant="outline-secondary" onClick={addSpecificDateRange} className="w-100">
                  + Plage
                </Button>
              </Col>
            </Row>
            {(blockedDays.specific_dates || []).length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {(blockedDays.specific_dates || []).map((date) => (
                  <span key={date} className="badge info d-inline-flex align-items-center gap-2">
                    {date}
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      style={{ fontSize: '0.55rem' }}
                      onClick={() => removeSpecificDate(date)}
                      aria-label={`Supprimer ${date}`}
                    />
                  </span>
                ))}
              </div>
            )}
          </Form.Group>
        </div>

        {/* ── Acquisition mensuelle ── */}
        {congeTypes.length > 0 && (
          <>
            <div className="section-label-title mb-2">Acquisition mensuelle automatique</div>
            <div className="conges-list-wrap mb-4">
              <Table size="sm" className="users-dense-table mb-0">
                <thead>
                  <tr>
                    <th>Type de congé</th>
                    <th>Jours / mois</th>
                  </tr>
                </thead>
                <tbody>
                  {congeTypes.map((type) => (
                    <tr key={type.id}>
                      <td>{type.libelle}</td>
                      <td style={{ width: 140 }}>
                        <Form.Control
                          type="number"
                          size="sm"
                          min="0"
                          step="0.25"
                          value={accrualByType[type.id] ?? ''}
                          placeholder={`Auto (${toNumber(type.quota_annuel, 0) / 12})`}
                          onChange={(e) => setAccrualByType((prev) => ({ ...prev, [type.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}

        {/* ── Enregistrer ── */}
        <div className="d-flex justify-content-end">
          <AsyncButton type="submit" isLoading={saving} loadingText="Enregistrement…">
            Enregistrer les règles
          </AsyncButton>
        </div>

      </Form>
    </Container>
  );
};

export default JoursBloquesPage;
