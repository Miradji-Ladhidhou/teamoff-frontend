import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { congesService } from '../../services/api';

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const fmtLong = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const STATUT_LABELS = {
  reserve:            'Réservé (prévisionnel)',
  valide_final:       'Validé',
  valide_manager:     'Validé (manager)',
  en_attente_manager: 'En attente',
  refuse_manager:     'Refusé (manager)',
  refuse_final:       'Refusé',
};

const DEMI_LABELS = { matin: 'matin', apres_midi: 'après-midi' };

const politiqueLabel = (p) => {
  if (!p) return null;
  if (p.count_saturday && p.count_sunday) return 'Jours calendaires';
  if (p.count_saturday) return 'Jours ouvrables (lun. – sam.)';
  return 'Jours ouvrés (lun. – ven.)';
};

const jourTypeWord = (p) => {
  if (!p) return 'ouvré';
  if (p.count_saturday && p.count_sunday) return 'calendaire';
  if (p.count_saturday) return 'ouvrable';
  return 'ouvré';
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #9a9590; font-family: 'Inter', Arial, sans-serif; }

  /* ── Toolbar ── */
  .att-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(255,255,255,.96);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid #e0e0e0;
    padding: 10px 20px;
    display: flex; align-items: center; gap: 12px;
  }
  .att-toolbar-brand {
    display: flex; align-items: center; gap: 10px;
    margin-right: auto;
  }
  .att-toolbar-logo {
    height: 32px; width: auto; max-width: 100px;
    object-fit: contain;
  }
  .att-toolbar-co {
    font-size: 14px; font-weight: 700; color: #111;
  }
  .att-toolbar-doc {
    font-size: 11px; color: #666;
    padding-left: 12px; border-left: 1px solid #ddd;
  }
  .att-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 13px; border: 1px solid #666; border-radius: 3px;
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11px; font-weight: 500; cursor: pointer;
    background: #fff; color: #222; transition: background .12s;
    white-space: nowrap;
  }
  .att-btn:hover:not(:disabled) { background: #f0f0f0; }
  .att-btn:disabled { opacity: .6; cursor: default; }
  .att-btn.ok  { background: #15803d; color: #fff; border-color: #15803d; }
  .att-btn.err { background: #b91c1c; color: #fff; border-color: #b91c1c; }

  /* ── Page ── */
  .att-page {
    padding: 72px 20px 48px;
    display: flex; flex-direction: column; align-items: center;
    min-height: 100vh;
  }

  @media (max-width: 860px) { .att-doc { zoom: .78; } }
  @media (max-width: 640px) { .att-doc { zoom: .58; } }
  @media (max-width: 480px) { .att-doc { zoom: .42; } .att-toolbar-doc { display: none; } }

  /* ══ A4 ══ */
  .att-doc {
    background: #fff;
    width: 794px;
    height: 1123px;
    box-shadow: 0 6px 32px rgba(0,0,0,.2);
    display: flex; flex-direction: column;
    padding: 48px 58px 40px;
    overflow: hidden;
    font-family: 'Inter', Arial, sans-serif;
  }

  /* ── Header doc ── */
  .d-hd { display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; }
  .d-hd-left { display: flex; align-items: center; gap: 12px; }
  .d-logo { height: 44px; width: auto; max-width: 120px; object-fit: contain; }
  .d-logo-placeholder {
    width: 44px; height: 44px;
    border: 1px solid #e4e4e4; border-radius: 4px; background: #f8f8f8;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; color: #bbb; text-align: center; line-height: 1.3; flex-shrink: 0;
  }
  .d-co { font-size: 17px; font-weight: 700; color: #111; line-height: 1; }
  .d-hd-right { text-align: right; }
  .d-ref-lbl { font-size: 7.5px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-weight: 600; margin-bottom: 2px; }
  .d-ref-val { font-family: 'DM Mono', monospace; font-size: 11px; color: #333; letter-spacing: .3px; }
  .d-ref-date { font-size: 9.5px; color: #555; margin-top: 3px; }

  .d-rule { border: none; border-top: 1px solid #111; margin: 14px 0 0; flex-shrink: 0; }
  .d-rule-light { border: none; border-top: 1px solid #e8e8e8; margin: 0; flex-shrink: 0; }

  /* ── Title ── */
  .d-title-zone { text-align: center; padding: 20px 0 18px; flex-shrink: 0; }
  .d-title { font-size: 16px; font-weight: 700; color: #111; letter-spacing: 4.5px; text-transform: uppercase; }
  .d-subtitle { font-size: 9.5px; color: #666; margin-top: 4px; letter-spacing: .3px; }

  /* ── Intro ── */
  .d-intro-wrap { flex-shrink: 0; margin-top: 14px; }
  .d-intro { font-size: 11.5px; line-height: 1.9; color: #222; text-align: justify; }
  .d-intro strong { font-weight: 700; color: #111; }
  .d-intro em { font-style: normal; color: #1d4ed8; font-weight: 600; }
  .d-valoir { font-size: 9px; font-style: italic; color: #666; margin-top: 8px; text-align: center; }

  /* ── Section ── */
  .d-sec { flex-shrink: 0; }
  .d-sec-head { font-size: 7px; text-transform: uppercase; letter-spacing: 2.5px; color: #666; font-weight: 700; padding: 12px 0 6px; }

  /* ── Info ── */
  .d-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
  .d-irow { display: flex; align-items: baseline; padding: 4.5px 0; border-bottom: 1px solid #f2f2f2; font-size: 11px; }
  .d-irow:last-child { border-bottom: none; }
  .d-il { color: #555; width: 88px; flex-shrink: 0; }
  .d-is { color: #bbb; margin: 0 6px; }
  .d-iv { color: #111; font-weight: 600; }
  .d-iv.sm { font-size: 9.5px; }
  .d-badge-ok {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 9px; font-weight: 700; color: #15803d;
    background: #f0fdf4; border: 1px solid #86efac; border-radius: 2px; padding: 1px 7px;
  }
  .d-badge-ok::before { content: '✓'; }

  /* ── Décompte ── */
  .d-dc-wrap { border: 1px solid #e8e8e8; border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .d-dc-row { display: flex; }
  .d-dc-cell {
    flex: 1; padding: 11px 6px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    border-right: 1px solid #f0f0f0; position: relative;
  }
  .d-dc-cell:last-child { border-right: none; }
  .d-dc-cell.accent { background: #eff6ff; }
  .d-dc-num { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 500; color: #111; line-height: 1; }
  .d-dc-num.muted { color: #999; font-size: 17px; }
  .d-dc-num.blue { color: #1d4ed8; }
  .d-dc-lbl { font-size: 7.5px; text-transform: uppercase; letter-spacing: .4px; color: #666; text-align: center; line-height: 1.3; }
  .d-dc-lbl.blue { color: #1d4ed8; font-weight: 600; }
  .d-dc-note { font-size: 6.5px; color: #999; font-style: italic; }
  .d-dc-op {
    position: absolute; right: -6px; top: 50%; transform: translateY(-50%);
    font-size: 10px; color: #999; background: #fff; padding: 1px; z-index: 2; line-height: 1;
  }
  .d-dc-cell:last-child .d-dc-op { display: none; }
  .d-dc-footer { padding: 5px 12px; border-top: 1px solid #e0e0e0; background: #fafafa; font-size: 7.5px; color: #555; font-style: italic; }

  /* ── Solde ── */
  .d-solde-row {
    margin-top: 10px; display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border: 1px solid #ddd; border-radius: 3px;
    flex-shrink: 0;
  }
  .d-solde-lbl { font-size: 7.5px; text-transform: uppercase; letter-spacing: 1.5px; color: #555; font-weight: 700; flex: 1; line-height: 1.6; }
  .d-solde-num { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; color: #1d4ed8; }
  .d-solde-unit { font-size: 10px; color: #555; }

  .d-grow { flex: 1; }

  /* ── Legal ── */
  .d-legal { font-size: 8px; font-style: italic; color: #777; text-align: center; line-height: 1.7; padding-top: 10px; border-top: 1px solid #ddd; flex-shrink: 0; }

  /* ── Signatures ── */
  .d-sig-zone { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; flex-shrink: 0; }
  .d-sig-role { font-size: 7px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-weight: 700; margin-bottom: 2px; }
  .d-sig-name { font-size: 12px; font-weight: 700; color: #111; margin-bottom: 1px; }
  .d-sig-detail { font-size: 9px; font-style: italic; color: #666; margin-bottom: 14px; }
  .d-sig-line-lbl { font-size: 7px; text-transform: uppercase; letter-spacing: 1px; color: #777; margin-bottom: 3px; }
  .d-sig-line { border-bottom: 1px solid #bbb; height: 22px; }

  /* ── Footer doc ── */
  .d-footer { margin-top: 14px; padding-top: 9px; border-top: 1px solid #111; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
  .d-foot-l { font-size: 7.5px; color: #555; }
  .d-foot-r { font-family: 'DM Mono', monospace; font-size: 7.5px; color: #666; }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #fff !important; }
    .att-toolbar { display: none !important; }
    .att-page { padding: 0 !important; background: transparent !important; display: block !important; }
    .att-doc { width: 210mm !important; height: 297mm !important; box-shadow: none !important; padding: 13mm 18mm 12mm !important; zoom: 1 !important; }
    @page { margin: 0; size: A4 portrait; }
  }
`;

export default function AttestationPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [emailState, setEmailState] = useState('idle');
  useEffect(() => {
    congesService.getAttestationData(id)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Erreur lors du chargement de l\'attestation.'));
  }, [id]);


  const handleSendEmail = async () => {
    setEmailState('sending');
    try {
      await congesService.sendAttestationEmail(id);
      setEmailState('success');
      setTimeout(() => setEmailState('idle'), 4000);
    } catch {
      setEmailState('error');
      setTimeout(() => setEmailState('idle'), 4000);
    }
  };

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#c0392b' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
        <div>{error}</div>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#555' }}>
      Chargement de l'attestation…
    </div>
  );

  const nomComplet = `${data.employe.prenom} ${data.employe.nom}`.trim();
  const jours = data.jours;
  const pol = jours.politique;
  const nbSam    = jours.detail.filter(d => d.label === 'Samedi').length;
  const nbDim    = jours.detail.filter(d => d.label === 'Dimanche').length;
  const nbFeries = jours.detail.filter(d => d.type === 'ferie').length;

  const periodFmt = () => {
    const s = data.conge.debut_demi_journee
      ? `${fmt(data.conge.date_debut)} (${DEMI_LABELS[data.conge.debut_demi_journee] || data.conge.debut_demi_journee})`
      : fmt(data.conge.date_debut);
    const e = data.conge.fin_demi_journee
      ? `${fmt(data.conge.date_fin)} (${DEMI_LABELS[data.conge.fin_demi_journee] || data.conge.fin_demi_journee})`
      : fmt(data.conge.date_fin);
    return `${s} → ${e}`;
  };

  const logo = data.entreprise.logo || null;
  const emailBtnClass = `att-btn${emailState === 'success' ? ' ok' : emailState === 'error' ? ' err' : ''}`;

  return (
    <>
      <style>{CSS}</style>

      {/* Toolbar fixe */}
      <div className="att-toolbar">
        <div className="att-toolbar-brand">
          {logo
            ? <img className="att-toolbar-logo" src={logo} alt={data.entreprise.nom} />
            : null
          }
          <span className="att-toolbar-co">{data.entreprise.nom}</span>
          <span className="att-toolbar-doc">Attestation de congé · {data.reference}</span>
        </div>

        <button className="att-btn" onClick={() => window.print()}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimer / PDF
        </button>

        <button className={emailBtnClass} onClick={handleSendEmail} disabled={emailState === 'sending'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          {emailState === 'sending' ? 'Envoi…' : emailState === 'success' ? 'Envoyé !' : emailState === 'error' ? 'Erreur' : 'Envoyer par email'}
        </button>
      </div>

      {/* Page */}
      <div className="att-page">
        <div className="att-doc">

          {/* Header */}
          <div className="d-hd">
            <div className="d-hd-left">
              {logo
                ? <img className="d-logo" src={logo} alt={data.entreprise.nom} />
                : <div className="d-logo-placeholder">{data.entreprise.nom.charAt(0)}</div>
              }
              <div className="d-co">{data.entreprise.nom}</div>
            </div>
            <div className="d-hd-right">
              <div className="d-ref-lbl">Référence</div>
              <div className="d-ref-val">{data.reference}</div>
              <div className="d-ref-date">Émis le {data.genere_le}</div>
            </div>
          </div>

          <hr className="d-rule" />

          {/* Title */}
          <div className="d-title-zone">
            <div className="d-title">Attestation de Congé</div>
            <div className="d-subtitle">Document officiel · Usage interne · Généré par TeamOff</div>
          </div>

          <hr className="d-rule-light" />

          {/* Intro */}
          <div className="d-intro-wrap">
            <p className="d-intro">
              Nous soussignés, <strong>{data.entreprise.nom}</strong>, attestons que{' '}
              <strong>{nomComplet}</strong>
              {data.employe.service ? <>, employé(e) au sein du service <strong>{data.employe.service}</strong>,</> : null}
              {data.employe.date_embauche ? <> en poste depuis le <strong>{fmtLong(data.employe.date_embauche)}</strong>,</> : null}
              {data.conge.statut === 'reserve'
                ? <>{' '}a soumis une <strong>réservation prévisionnelle</strong> de congé de type <strong>« {data.conge.type} »</strong>{' '}
                    du <strong>{fmt(data.conge.date_debut)}</strong> au <strong>{fmt(data.conge.date_fin)}</strong>,
                    pour une durée de <em>{jours.ouvres} jour{jours.ouvres > 1 ? 's' : ''} {jourTypeWord(pol)}{jours.ouvres > 1 ? 's' : ''}</em>.
                    Cette réservation est en attente de validation.</>
                : <>{' '}a bénéficié d'un congé de type <strong>« {data.conge.type} »</strong>{' '}
                    du <strong>{fmt(data.conge.date_debut)}</strong> au <strong>{fmt(data.conge.date_fin)}</strong>,
                    pour une durée de <em>{jours.ouvres} jour{jours.ouvres > 1 ? 's' : ''} {jourTypeWord(pol)}{jours.ouvres > 1 ? 's' : ''}</em>,
                    conformément à la politique de congés de l'entreprise.</>
              }
            </p>
            <p className="d-valoir">Ce document est établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.</p>
          </div>

          {/* Informations */}
          <div className="d-sec">
            <div className="d-sec-head">Informations</div>
            <div className="d-info-grid">
              <div>
                <div className="d-irow"><span className="d-il">Nom</span><span className="d-is">·</span><span className="d-iv">{nomComplet}</span></div>
                <div className="d-irow"><span className="d-il">Email</span><span className="d-is">·</span><span className="d-iv sm">{data.employe.email || '—'}</span></div>
                <div className="d-irow"><span className="d-il">Service</span><span className="d-is">·</span><span className="d-iv">{data.employe.service || '—'}</span></div>
                {data.employe.date_embauche && (
                  <div className="d-irow"><span className="d-il">Embauche</span><span className="d-is">·</span><span className="d-iv">{fmtLong(data.employe.date_embauche)}</span></div>
                )}
              </div>
              <div>
                <div className="d-irow"><span className="d-il">Type de congé</span><span className="d-is">·</span><span className="d-iv">{data.conge.type}</span></div>
                <div className="d-irow"><span className="d-il">Du</span><span className="d-is">·</span><span className="d-iv">{fmt(data.conge.date_debut)}</span></div>
                <div className="d-irow"><span className="d-il">Au</span><span className="d-is">·</span><span className="d-iv">{fmt(data.conge.date_fin)}</span></div>
                <div className="d-irow">
                  <span className="d-il">Statut</span><span className="d-is">·</span>
                  <span className="d-iv">
                    {data.conge.statut === 'valide_final'
                      ? <span className="d-badge-ok">Validé</span>
                      : (STATUT_LABELS[data.conge.statut] || data.conge.statut)
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Décompte */}
          <div className="d-sec" style={{ marginTop: 18 }}>
            <div className="d-sec-head">Décompte des jours</div>
            <div className="d-dc-wrap">
              <div className="d-dc-row">
                <div className="d-dc-cell">
                  <div className="d-dc-num">{jours.calendaires}</div>
                  <div className="d-dc-lbl">Calendaires</div>
                  <div className="d-dc-op">−</div>
                </div>
                <div className="d-dc-cell">
                  <div className={`d-dc-num${pol && !pol.count_saturday ? ' muted' : ''}`}>{nbSam}</div>
                  <div className="d-dc-lbl">Samedis</div>
                  {pol && !pol.count_saturday && <div className="d-dc-note">non décomptés</div>}
                  <div className="d-dc-op">−</div>
                </div>
                <div className="d-dc-cell">
                  <div className={`d-dc-num${pol && !pol.count_sunday ? ' muted' : ''}`}>{nbDim}</div>
                  <div className="d-dc-lbl">Dimanches</div>
                  {pol && !pol.count_sunday && <div className="d-dc-note">non décomptés</div>}
                  <div className="d-dc-op">−</div>
                </div>
                <div className="d-dc-cell">
                  <div className="d-dc-num muted">{nbFeries}</div>
                  <div className="d-dc-lbl">Fériés</div>
                  <div className="d-dc-note">non décomptés</div>
                  <div className="d-dc-op">=</div>
                </div>
                <div className="d-dc-cell accent">
                  <div className="d-dc-num blue">{jours.ouvres}</div>
                  <div className="d-dc-lbl blue">Jours {jourTypeWord(pol)}s</div>
                </div>
              </div>
              {pol && (
                <div className="d-dc-footer">
                  Politique : {politiqueLabel(pol)}{pol.count_saturday || pol.count_sunday ? '' : ' · les samedis et dimanches ne sont pas décomptés'}
                </div>
              )}
            </div>
          </div>

          {/* Solde */}
          {data.solde && (
            <div className="d-solde-row">
              <span className="d-solde-lbl">Solde restant après ce congé<br />{data.solde.type} · Année {data.solde.annee}</span>
              <span className="d-solde-num">{data.solde.solde_restant}</span>
              <span className="d-solde-unit">jours</span>
            </div>
          )}

          <div className="d-grow" />

          {/* Legal */}
          <div className="d-legal">
            Document généré automatiquement par TeamOff · Réf. {data.reference} · Toute falsification constitue un délit passible de poursuites.
          </div>

          {/* Signatures */}
          <div className="d-sig-zone">
            <div>
              <div className="d-sig-role">Le salarié</div>
              <div className="d-sig-name">{nomComplet}</div>
              <div className="d-sig-detail">{data.conge.type} · {fmt(data.conge.date_debut)} – {fmt(data.conge.date_fin)}</div>
              <div className="d-sig-line-lbl">Signature</div>
              <div className="d-sig-line"></div>
            </div>
            <div>
              <div className="d-sig-role">Le responsable</div>
              <div className="d-sig-name">Direction / RH</div>
              <div className="d-sig-detail">{data.entreprise.nom}</div>
              <div className="d-sig-line-lbl">Signature &amp; cachet</div>
              <div className="d-sig-line"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="d-footer">
            <span className="d-foot-l">{data.entreprise.nom} · Document confidentiel</span>
            <span className="d-foot-r">{data.reference} · TeamOff</span>
          </div>

        </div>
      </div>
    </>
  );
}
