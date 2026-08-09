import './jours-bloques.css';
import '../../styles/settings.css';
import React, { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Form,
  Spinner,
} from 'react-bootstrap';
import { entreprisesService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import AsyncButton from '../../components/AsyncButton';
import BlockedDaysPicker from './BlockedDaysPicker';

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

const normalizeBlockedWeekdays = (days) => (
  Array.isArray(days)
    ? [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    : []
);

const isoLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const enumerateDateRange = (startDate, endDate, maxDays = 366) => {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < maxDays) {
    dates.push(isoLocal(cursor));
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

  useEffect(() => {
    if (!entrepriseId) return;
    const load = async () => {
      try {
        setLoading(true);
        const policyRes = await entreprisesService.getPolitique(entrepriseId);
        const policy = policyRes.data?.politique_conges || {};
        const next = { ...DEFAULT_BLOCKED_DAYS, ...(policy.blocked_days || {}) };
        setBlockedDays({
          ...next,
          weekdays: normalizeBlockedWeekdays(next.weekdays),
          specific_dates: Array.isArray(next.specific_dates) ? next.specific_dates : [],
        });
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

  const removeSpecificDate = (date) => {
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: (prev.specific_dates || []).filter((d) => d !== date),
    }));
  };

  const handlePickerAdd = (start, end) => {
    const range = enumerateDateRange(start, end);
    if (!range.length) return;
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: [...new Set([...(prev.specific_dates || []), ...range])].sort(),
    }));
  };

  const handlePickerRemove = (start, end) => {
    const toRemove = new Set(enumerateDateRange(start, end));
    setBlockedDays((prev) => ({
      ...prev,
      specific_dates: (prev.specific_dates || []).filter((d) => !toRemove.has(d)),
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
            <BlockedDaysPicker
              blockedDates={blockedDays.specific_dates || []}
              onAdd={handlePickerAdd}
              onRemove={handlePickerRemove}
            />
            {(blockedDays.specific_dates || []).length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-3">
                {(blockedDays.specific_dates || []).map((date) => {
                  const [y, m, d] = date.split('-');
                  const label = y && m && d ? `${d}/${m}/${y}` : date;
                  return (
                    <span key={date} className="badge info d-inline-flex align-items-center gap-2">
                      {label}
                      <button
                        type="button"
                        className="btn-close"
                        style={{ fontSize: '0.55rem' }}
                        onClick={() => removeSpecificDate(date)}
                        aria-label={`Supprimer ${date}`}
                      />
                    </span>
                  );
                })}
              </div>
            )}
          </Form.Group>
        </div>

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
