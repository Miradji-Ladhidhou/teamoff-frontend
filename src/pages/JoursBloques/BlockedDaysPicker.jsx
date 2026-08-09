import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './blocked-days-picker.css';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const toISO = (d) => d.toISOString().slice(0, 10);

const buildGrid = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: toISO(new Date(year, month, 1 - (startOffset - i))), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: toISO(new Date(year, month, d)), isCurrentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: toISO(new Date(year, month + 1, i)), isCurrentMonth: false });
    }
  }
  return cells;
};

const normalize = (a, b) => (a <= b ? [a, b] : [b, a]);

const enumerateRange = (start, end) => {
  const out = [];
  const cur = new Date(`${start}T00:00:00`);
  const stop = new Date(`${end}T00:00:00`);
  while (cur <= stop) { out.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
  return out;
};

// États de sélection :
//  idle      → rangeStart=null, rangeEnd=null
//  selecting → rangeStart=date, rangeEnd=null  (en attente du 2e clic, hover = aperçu)
//  confirmed → rangeStart=date, rangeEnd=date  (plage verrouillée, boutons actifs)

const BlockedDaysPicker = ({ blockedDates = [], onAdd, onRemove }) => {
  const today = toISO(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hovered, setHovered] = useState(null);

  const blocked = new Set(blockedDates);
  const cells = buildGrid(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const reset = () => { setRangeStart(null); setRangeEnd(null); setHovered(null); };

  const handleClick = (date) => {
    if (!rangeStart) {
      // État idle → sélection du 1er jour
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (!rangeEnd) {
      // État selecting → 2e clic : verrouille la plage
      if (date === rangeStart) {
        // clic sur le même jour = annule
        reset();
        return;
      }
      setRangeEnd(date);
      setHovered(null);
      return;
    }
    // État confirmed → nouveau clic = recommence une sélection
    setRangeStart(date);
    setRangeEnd(null);
    setHovered(null);
  };

  // Plage affichée
  const confirmedRange = rangeStart && rangeEnd
    ? (() => { const [a, b] = normalize(rangeStart, rangeEnd); return { start: a, end: b }; })()
    : null;

  const previewRange = rangeStart && !rangeEnd && hovered
    ? (() => { const [a, b] = normalize(rangeStart, hovered); return { start: a, end: b }; })()
    : null;

  const displayRange = confirmedRange || previewRange;

  const inRange = (date) => displayRange && date >= displayRange.start && date <= displayRange.end;
  const isEdge  = (date) => displayRange && (date === displayRange.start || date === displayRange.end);
  const isStartOnly = (date) => rangeStart && !rangeEnd && !hovered && date === rangeStart;

  // Décomptes (uniquement sur plage confirmée)
  const confirmedISOs = confirmedRange ? enumerateRange(confirmedRange.start, confirmedRange.end) : [];
  const toAddCount    = confirmedISOs.filter(d => !blocked.has(d)).length;
  const toRemoveCount = confirmedISOs.filter(d => blocked.has(d)).length;

  const handleAdd = () => {
    if (!confirmedRange) return;
    onAdd(confirmedRange.start, confirmedRange.end);
    reset();
  };

  const handleRemove = () => {
    if (!confirmedRange) return;
    onRemove(confirmedRange.start, confirmedRange.end);
    reset();
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="bdp-root">
      {/* Navigation */}
      <div className="bdp-nav">
        <button type="button" className="bdp-nav-arrow" onClick={prevMonth} aria-label="Mois précédent">
          <FaChevronLeft />
        </button>
        <span className="bdp-month-label">{monthLabel}</span>
        <button type="button" className="bdp-nav-arrow" onClick={nextMonth} aria-label="Mois suivant">
          <FaChevronRight />
        </button>
      </div>

      {/* Grille */}
      <div className="bdp-grid">
        {WEEK_DAYS.map((d, i) => (
          <div key={i} className="bdp-header">{d}</div>
        ))}
        {cells.map(({ date, isCurrentMonth }) => (
          <div
            key={date}
            className={[
              'bdp-day',
              !isCurrentMonth       && 'bdp-day--other',
              date === today        && 'bdp-day--today',
              blocked.has(date)     && 'bdp-day--blocked',
              inRange(date)         && 'bdp-day--in-range',
              isEdge(date)          && 'bdp-day--edge',
              isStartOnly(date)     && 'bdp-day--start-only',
              confirmedRange        && 'bdp-day--confirmed-mode',
            ].filter(Boolean).join(' ')}
            onClick={() => isCurrentMonth && handleClick(date)}
            onMouseEnter={() => rangeStart && !rangeEnd && isCurrentMonth && setHovered(date)}
            onMouseLeave={() => rangeStart && !rangeEnd && setHovered(null)}
          >
            <span className="bdp-day-num">{parseInt(date.slice(8), 10)}</span>
            {blocked.has(date) && <span className="bdp-blocked-dot" />}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="bdp-legend">
        <span className="bdp-legend-item"><span className="bdp-legend-dot bdp-legend-dot--blocked" />Bloqué</span>
        <span className="bdp-legend-item"><span className="bdp-legend-dot bdp-legend-dot--range" />Sélection</span>
      </div>

      {/* Instructions */}
      {!rangeStart && (
        <p className="bdp-hint">Cliquez sur un jour pour démarrer la sélection.</p>
      )}
      {rangeStart && !rangeEnd && (
        <p className="bdp-hint">
          Début : <b>{rangeStart.split('-').reverse().join('/')}</b> — cliquez sur le jour de fin.
        </p>
      )}

      {/* Panneau d'action (plage confirmée) */}
      {confirmedRange && (
        <div className="bdp-actions">
          <div className="bdp-preview-line">
            {confirmedRange.start === confirmedRange.end
              ? <><b>1 jour</b> sélectionné ({confirmedRange.start.split('-').reverse().join('/')})</>
              : <><b>{confirmedISOs.length} jours</b> sélectionnés&nbsp;
                  ({confirmedRange.start.split('-').reverse().join('/')} → {confirmedRange.end.split('-').reverse().join('/')})</>
            }
          </div>
          <div className="bdp-preview-line bdp-preview-line--add">
            {toAddCount > 0 ? `+ ${toAddCount} à ajouter` : 'Aucun nouveau jour à ajouter'}
          </div>
          <div className="bdp-preview-line bdp-preview-line--remove">
            {toRemoveCount > 0 ? `− ${toRemoveCount} à supprimer` : 'Aucun jour bloqué dans cette plage'}
          </div>
          <div className="bdp-btn-row">
            <Button type="button" size="sm" variant="outline-primary"  onClick={handleAdd}    disabled={toAddCount === 0}>+ Ajouter</Button>
            <Button type="button" size="sm" variant="outline-danger"   onClick={handleRemove} disabled={toRemoveCount === 0}>− Supprimer</Button>
            <Button type="button" size="sm" variant="outline-secondary" onClick={reset}>Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedDaysPicker;
