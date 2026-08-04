'use strict';
/**
 * calendrierFeriesRecurrents.test.js — Fix #38
 *
 * La logique getJourFerieForDay doit trouver un jour férié récurrent même si
 * l'année stockée en base diffère de l'année courante du calendrier.
 *
 * AVANT fix : comparaison getTime() stricte → Noël 2024 (recurrent) non trouvé
 *             quand on navigue sur décembre 2025.
 * APRÈS fix  : pour recurrent=true, seuls mois+jour sont comparés.
 */

// Reproduction exacte de la logique du composant (pas d'import du composant
// pour éviter les dépendances Auth/API dans ce test unitaire).

const normalizeLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'string') {
    const rawDate = value.slice(0, 10);
    const parts = rawDate.split('-').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

/**
 * getJourFerieForDay — version APRÈS fix.
 * Pour les fériés récurrents, compare uniquement mois + jour.
 */
function getJourFerieForDay(joursFeries, date) {
  const target = normalizeLocalDate(date);
  if (!target) return undefined;
  return joursFeries.find(jf => {
    const jfDate = normalizeLocalDate(jf.date);
    if (!jfDate) return false;
    if (jf.recurrent) {
      return jfDate.getMonth() === target.getMonth() &&
             jfDate.getDate()  === target.getDate();
    }
    return jfDate.getTime() === target.getTime();
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

// Noël créé en 2024, marqué récurrent → doit apparaître sur tous les 25 décembre
const noel2024 = { id: 'uuid-noel', date: '2024-12-25', libelle: 'Noël', recurrent: true };

// 14 juillet créé en 2023, récurrent
const bastille2023 = { id: 'uuid-bast', date: '2023-07-14', libelle: 'Fête Nationale', recurrent: true };

// Noël 2025 non-récurrent (entrée explicite pour cette année)
const noel2025 = { id: 'uuid-noel25', date: '2025-12-25', libelle: 'Noël 2025', recurrent: false };

// Ponts d'entreprise non-récurrent (une seule fois en 2024)
const pont2024 = { id: 'uuid-pont', date: '2024-05-10', libelle: 'Pont', recurrent: false };

const joursFeries = [noel2024, bastille2023, noel2025, pont2024];

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('Fix #38 — Fériés récurrents sur le calendrier', () => {

  describe('Fériés récurrents : correspondance mois+jour, année ignorée', () => {

    it('Noël 2024 récurrent → trouvé sur 2025-12-25 (AVANT fix : non trouvé)', () => {
      const result = getJourFerieForDay(joursFeries, '2025-12-25');
      expect(result).toBeDefined();
      expect(result.libelle).toBe('Noël');
      expect(result.recurrent).toBe(true);
    });

    it('Noël 2024 récurrent → trouvé sur 2026-12-25', () => {
      const result = getJourFerieForDay(joursFeries, '2026-12-25');
      expect(result).toBeDefined();
      expect(result.recurrent).toBe(true);
    });

    it('14 juillet 2023 récurrent → trouvé sur 2025-07-14', () => {
      const result = getJourFerieForDay(joursFeries, '2025-07-14');
      expect(result).toBeDefined();
      expect(result.libelle).toBe('Fête Nationale');
    });

    it('Fériés récurrents ne contaminent pas un autre mois (25 octobre ≠ 25 décembre)', () => {
      const result = getJourFerieForDay(joursFeries, '2025-10-25');
      expect(result).toBeUndefined();
    });

    it('Fériés récurrents ne contaminent pas un autre jour (26 décembre ≠ 25 décembre)', () => {
      const result = getJourFerieForDay(joursFeries, '2025-12-26');
      // Noël ne doit pas matcher le 26
      const matchedNoel = result?.libelle === 'Noël';
      expect(matchedNoel).toBe(false);
    });
  });

  describe('Fériés non-récurrents : correspondance exacte (pas de régression)', () => {

    it('Noël 2025 non-récurrent → trouvé exactement sur 2025-12-25', () => {
      const result = getJourFerieForDay([noel2025], '2025-12-25');
      expect(result).toBeDefined();
      expect(result.libelle).toBe('Noël 2025');
    });

    it('Pont 2024 non-récurrent → non trouvé sur 2025-05-10', () => {
      const result = getJourFerieForDay([pont2024], '2025-05-10');
      expect(result).toBeUndefined();
    });

    it('Pont 2024 non-récurrent → trouvé sur 2024-05-10', () => {
      const result = getJourFerieForDay([pont2024], '2024-05-10');
      expect(result).toBeDefined();
      expect(result.libelle).toBe('Pont');
    });
  });

  describe('Cas limites', () => {

    it('date null → undefined', () => {
      expect(getJourFerieForDay(joursFeries, null)).toBeUndefined();
    });

    it('liste vide → undefined', () => {
      expect(getJourFerieForDay([], '2025-12-25')).toBeUndefined();
    });

    it('férié avec date null → ignoré', () => {
      const withNull = [{ id: 'x', date: null, libelle: 'Invalide', recurrent: true }];
      expect(getJourFerieForDay(withNull, '2025-12-25')).toBeUndefined();
    });
  });
});
