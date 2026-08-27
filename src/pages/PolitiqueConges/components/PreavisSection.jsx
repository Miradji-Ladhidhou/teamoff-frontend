import React from 'react';
import { Form, Button } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';

const PreavisSection = ({ policy, setPolicy }) => {
  const tiers = Array.isArray(policy.notice_period_tiers) ? policy.notice_period_tiers : [];

  const setTiers = (newTiers) => {
    setPolicy((prev) => ({ ...prev, notice_period_tiers: newTiers }));
  };

  const addTier = () => {
    const sorted = [...tiers].sort((a, b) => (a.max_jours ?? Infinity) - (b.max_jours ?? Infinity));
    const lastBounded = sorted.filter((t) => t.max_jours !== undefined);
    const nextMax = lastBounded.length > 0 ? (lastBounded[lastBounded.length - 1].max_jours + 3) : 2;
    const hasFallback = tiers.some((t) => t.max_jours === undefined);

    if (hasFallback) {
      setTiers([...tiers, { max_jours: nextMax, preavis_jours: 1 }]);
    } else {
      setTiers([...tiers, { preavis_jours: 1 }]);
    }
  };

  const removeTier = (index) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    setTiers(tiers.map((t, i) => {
      if (i !== index) return t;
      if (field === 'max_jours') {
        if (value === '' || value === null) {
          const { max_jours: _, ...rest } = t;
          return rest;
        }
        return { ...t, max_jours: Number(value) };
      }
      return { ...t, [field]: Number(value) };
    }));
  };

  const sorted = [...tiers]
    .map((t, originalIndex) => ({ ...t, originalIndex }))
    .sort((a, b) => (a.max_jours ?? Infinity) - (b.max_jours ?? Infinity));

  return (
    <div className="mb-4">
      <div className="section-label-title mb-1">Délai de préavis dynamique</div>
      <p className="text-muted small mb-3">
        Définissez des paliers de préavis selon la durée calendaire du congé demandé.
        Si aucun palier n'est configuré, le préavis global est utilisé. Le dernier palier sans durée max couvre tous les congés plus longs.
      </p>

      {tiers.length === 0 && (
        <div className="text-muted small mb-3 fst-italic">
          Aucun palier configuré — seul le préavis global s'applique.
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mb-3">
          <div className="d-flex gap-2 mb-2 d-none d-md-flex" style={{ fontSize: 11, color: 'var(--dk-text-muted)', fontWeight: 600, paddingLeft: 2 }}>
            <div style={{ flex: '0 0 180px' }}>Durée max du congé (jours)</div>
            <div style={{ flex: '0 0 180px' }}>Préavis requis (jours)</div>
            <div style={{ flex: '0 0 32px' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((tier) => {
              const idx = tier.originalIndex;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  background: 'var(--dk-elevated)',
                  border: '1px solid var(--dk-border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                }}>
                  <div style={{ flex: '0 0 180px', minWidth: 140 }}>
                    <label className="d-md-none" style={{ fontSize: 11, color: 'var(--dk-text-muted)', display: 'block', marginBottom: 2 }}>Durée max (jours)</label>
                    <Form.Control
                      type="number"
                      min={1}
                      placeholder="∞ (sans limite)"
                      value={tier.max_jours !== undefined ? tier.max_jours : ''}
                      onChange={(e) => updateTier(idx, 'max_jours', e.target.value)}
                      size="sm"
                      style={{ maxWidth: 170 }}
                    />
                  </div>
                  <div style={{ flex: '0 0 180px', minWidth: 140 }}>
                    <label className="d-md-none" style={{ fontSize: 11, color: 'var(--dk-text-muted)', display: 'block', marginBottom: 2 }}>Préavis requis (jours)</label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={tier.preavis_jours}
                      onChange={(e) => updateTier(idx, 'preavis_jours', e.target.value)}
                      size="sm"
                      style={{ maxWidth: 170 }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeTier(idx)}
                    style={{ padding: '4px 8px', flexShrink: 0 }}
                    title="Supprimer ce palier"
                  >
                    <FaTrash size={11} />
                  </Button>
                  <div style={{ fontSize: 11, color: 'var(--dk-text-muted)', flexBasis: '100%' }}>
                    {tier.max_jours !== undefined
                      ? `→ Congé ≤ ${tier.max_jours} jour(s) : préavis de ${tier.preavis_jours} jour(s)`
                      : `→ Congé de toute durée (palier final) : préavis de ${tier.preavis_jours} jour(s)`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button type="button" variant="outline-primary" size="sm" onClick={addTier}>
        <FaPlus size={10} className="me-1" /> Ajouter un palier
      </Button>

      {tiers.length > 0 && (
        <div className="mt-3 p-2" style={{ background: 'var(--dk-elevated)', borderRadius: 8, border: '1px solid var(--dk-border)' }}>
          <div className="section-label-title mb-2" style={{ fontSize: 10 }}>Aperçu des règles</div>
          {sorted.map((tier, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--dk-text-soft)', marginBottom: 2 }}>
              {tier.max_jours !== undefined
                ? `• Congé ≤ ${tier.max_jours} j → préavis ${tier.preavis_jours} j`
                : `• Congé plus long → préavis ${tier.preavis_jours} j`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreavisSection;
