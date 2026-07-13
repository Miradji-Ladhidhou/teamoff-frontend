const couleur = '#1a56db';

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>{value}</span>
    </div>
  );
}

export default function AttestationTemplate({ data }) {
  const { employeur, salarie, conge, ville, date, reference } = data;

  const totalExclus = conge.dimanches + conge.samedis + conge.jours_feries;

  const feriesLabel = conge.feries_details?.length
    ? conge.feries_details.map(f => f.libelle).join(', ')
    : null;

  return (
    <div style={{
      width: '794px',
      background: '#ffffff',
      color: '#1a1a2e',
      fontFamily: 'Inter, -apple-system, Arial, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Bande haut */}
      <div style={{ background: couleur, height: '6px' }} />

      {/* Header */}
      <div style={{
        padding: '28px 52px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: `1.5px solid ${couleur}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '10px',
            background: couleur, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', flexShrink: 0,
          }}>
            {(employeur.entreprise || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{employeur.entreprise}</div>
            {employeur.adresse && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{employeur.adresse}</div>}
            {employeur.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{employeur.email}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Référence</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: couleur, marginTop: '2px' }}>{reference}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>Le {date}</div>
        </div>
      </div>

      {/* Titre + badge */}
      <div style={{ padding: '24px 52px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: couleur, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Document officiel</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Attestation de Congés Payés</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '20px', padding: '6px 16px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>APPROUVÉ</span>
        </div>
      </div>

      {/* Infos salarié + employeur */}
      <div style={{ padding: '20px 52px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { title: 'Salarié', rows: [
            { label: 'Nom', value: salarie.nom },
            ...(salarie.poste ? [{ label: 'Service', value: salarie.poste }] : []),
          ]},
          { title: 'Employeur', rows: [
            { label: 'Responsable', value: employeur.nom },
            { label: 'Fonction', value: employeur.fonction },
          ]},
        ].map((block, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 18px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '10px' }}>{block.title}</div>
            {block.rows.map((r, j) => (
              <Row key={j} label={r.label} value={r.value} />
            ))}
          </div>
        ))}
      </div>

      {/* Période */}
      <div style={{ padding: '16px 52px 0' }}>
        <div style={{ background: couleur, borderRadius: '10px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Période du congé</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Du {conge.debut} au {conge.fin}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Jours ouvrables</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{conge.jours_ouvrables}</div>
          </div>
        </div>
      </div>

      {/* Détail du calcul */}
      <div style={{ padding: '16px 52px 0' }}>
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '18px 22px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '12px' }}>Détail du calcul</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Jours calendaires (du {conge.debut} au {conge.fin} inclus)</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{conge.jours_calendaires} jours</span>
          </div>

          {/* Jours exclus */}
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', margin: '8px 0' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c2410c', marginBottom: '8px' }}>Jours exclus du décompte</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Dimanches</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>− {conge.dimanches} jour{conge.dimanches > 1 ? 's' : ''}</span>
            </div>
            {conge.samedis > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Samedis</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>− {conge.samedis} jour{conge.samedis > 1 ? 's' : ''}</span>
              </div>
            )}
            {conge.jours_feries > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Jours fériés{feriesLabel ? ` (${feriesLabel})` : ''}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>− {conge.jours_feries} jour{conge.jours_feries > 1 ? 's' : ''}</span>
              </div>
            )}
            <div style={{ borderTop: '1px dashed #fed7aa', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c' }}>Total exclus</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c' }}>− {totalExclus} jour{totalExclus > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Résultat */}
          <div style={{ borderTop: '2px solid #e2e8f0', marginTop: '4px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>= Jours ouvrables décomptés</span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: couleur }}>{conge.jours_ouvrables} jours</span>
          </div>
        </div>
      </div>

      {/* Soldes */}
      <div style={{ padding: '12px 52px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Solde avant congé', value: `${conge.solde_avant} j`, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
            { label: 'Congé posé', value: `− ${conge.jours_ouvrables} j`, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
            { label: 'Solde restant', value: `${conge.solde_apres} j`, color: couleur, bg: '#eff6ff', border: '#bfdbfe' },
          ].map((item, i) => (
            <div key={i} style={{ background: item.bg, borderRadius: '10px', border: `1px solid ${item.border}`, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '6px' }}>{item.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</div>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>ouvrables</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mention légale */}
      <div style={{ padding: '14px 52px 0' }}>
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 18px', fontSize: '11px', color: '#64748b', lineHeight: '1.7' }}>
          <strong style={{ color: '#475569' }}>Mention légale · </strong>
          Cette attestation est établie à la demande de l'intéressé(e) pour faire valoir ses droits auprès de toute administration ou organisme. Congés attribués conformément aux articles <strong style={{ color: '#475569' }}>L. 3141-1 et suivants du Code du travail</strong>.
        </div>
      </div>

      {/* Signature */}
      <div style={{ padding: '16px 52px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
        <div>
          {ville && (
            <div style={{ fontSize: '12px', color: '#334155', marginBottom: '6px' }}>
              Fait à <strong>{ville}</strong>, le <strong>{date}</strong>
            </div>
          )}
          {!ville && (
            <div style={{ fontSize: '12px', color: '#334155', marginBottom: '6px' }}>
              Le <strong>{date}</strong>
            </div>
          )}
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{employeur.nom}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{employeur.fonction} · {employeur.entreprise}</div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '4px' }}>Signature &amp; cachet</div>
          <div style={{ height: '44px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ width: '130px', height: '1px', background: '#cbd5e1' }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', padding: '12px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
        <div style={{ fontSize: '9px', color: '#94a3b8' }}>Document généré automatiquement · {employeur.entreprise}</div>
        <div style={{ fontSize: '9px', color: '#94a3b8' }}>Réf. {reference} · {date}</div>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleur, opacity: 0.35 }} />
      </div>

      {/* Bande bas */}
      <div style={{ background: couleur, height: '4px' }} />
    </div>
  );
}
