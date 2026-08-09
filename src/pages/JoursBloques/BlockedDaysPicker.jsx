import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './blocked-days-picker.css';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const toISO = (d) => d.toISOString().slice(0, 10);

const buildGrid = (year, month) => {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Start grid on Monday
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - (startOffset - i));
    cells.push({ date: toISO(d), isCurrentMonth: false });
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

const BlockedDaysPicker = ({ blockedDates = [], onAdd, onRemove }) => {
  const today = toISO(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [rangeStart, setRangeStart] = useState(null);
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

  const getRange = () => {
    if (!rangeStart) return null;
    const end = hovered || rangeStart;
    const [a, b] = normalize(rangeStart, end);
    return { start: a, end: b };
  };

  const range = getRange();

  const inRange = (date) => range && date >= range.start && date <= range.end;
  const isEdge = (date) => range && (date === range.start || date === range.end);

  const handleClick = (date) => {
    if (!rangeStart) {
      setRangeStart(date);
    } else {
      // range already selected: reset to new start
      if (rangeStart === date) {
        setRangeStart(null);
        return;
      }
      // finalize — keep rangeStart set, hovered will hold the end
      // nothing more to do; user now clicks Add or Remove
    }
  };

  const handleAdd = () => {
    if (!range) return;
    onAdd(range.start, range.end);
    setRangeStart(null);
    setHovered(null);
  };

  const handleRemove = () => {
    if (!range) return;
    onRemove(range.start, range.end);
    setRangeStart(null);
    setHovered(null);
  };

  const reset = () => { setRangeStart(null); setHovered(null); };

  // Preview counts
  const rangeISOs = range
    ? (() => {
        const out = [];
        const cur = new Date(`${range.start}T00:00:00`);
        const end = new Date(`${range.end}T00:00:00`);
        while (cur <= end) { out.push(toISO(cur)); cur.setDate(cur.getDate() + 1); }
        return out;
      })()
    : [];
  const toAddCount = rangeISOs.filter(d => !blocked.has(d)).length;
  const toRemoveCount = rangeISOs.filter(d => blocked.has(d)).length;

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

      {/* Grid */}
      <div className="bdp-grid">
        {WEEK_DAYS.map((d, i) => (
          <div key={i} className="bdp-header">{d}</div>
        ))}
        {cells.map(({ date, isCurrentMonth }) => {
          const isBlocked = blocked.has(date);
          const isToday = date === today;
          const sel = inRange(date);
          const edge = isEdge(date);
          const isStart = rangeStart !== null && hovered === null && date === rangeStart;

          return (
            <div
              key={date}
              className={[
                'bdp-day',
                !isCurrentMonth && 'bdp-day--other',
                isToday && 'bdp-day--today',
                isBlocked && 'bdp-day--blocked',
                sel && 'bdp-day--in-range',
                edge && 'bdp-day--edge',
                isStart && 'bdp-day--start-only',
              ].filter(Boolean).join(' ')}
              onClick={() => isCurrentMonth && handleClick(date)}
              onMouseEnter={() => rangeStart && isCurrentMonth && setHovered(date)}
              onMouseLeave={() => rangeStart && setHovered(null)}
            >
              <span className="bdp-day-num">{parseInt(date.slice(8), 10)}</span>
              {isBlocked && <span className="bdp-blocked-dot" />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bdp-legend">
        <span className="bdp-legend-item"><span className="bdp-legend-dot bdp-legend-dot--blocked" />Bloqué</span>
        <span className="bdp-legend-item"><span className="bdp-legend-dot bdp-legend-dot--range" />Sélection</span>
      </div>

      {/* Action panel */}
      {!rangeStart && (
        <p className="bdp-hint">Cliquez sur un premier jour pour commencer la sélection.</p>
      )}
      {rangeStart && !hovered && (
        <p className="bdp-hint">Survolez puis cliquez sur le jour de fin.</p>
      )}
      {range && rangeISOs.length > 0 && (
        <div className="bdp-actions">
          <div className="bdp-preview-line">
            {range.start === range.end
              ? <><b>1 jour</b> sélectionné</>
              : <><b>{rangeISOs.length} jours</b> sélectionnés ({range.start.split('-').reverse().join('/')} → {range.end.split('-').reverse().join('/')})</>
            }
          </div>
          <div className="bdp-preview-line bdp-preview-line--add">
            {toAddCount > 0 ? `+ ${toAddCount} à ajouter` : 'Aucun nouveau jour à ajouter'}
          </div>
          <div className="bdp-preview-line bdp-preview-line--remove">
            {toRemoveCount > 0 ? `− ${toRemoveCount} à supprimer` : 'Aucun jour bloqué dans cette plage'}
          </div>
          <div className="bdp-btn-row">
            <Button
              type="button"
              size="sm"
              variant="outline-primary"
              onClick={handleAdd}
              disabled={toAddCount === 0}
            >
              + Ajouter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline-danger"
              onClick={handleRemove}
              disabled={toRemoveCount === 0}
            >
              − Supprimer
            </Button>
            <Button type="button" size="sm" variant="outline-secondary" onClick={reset}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedDaysPicker;
