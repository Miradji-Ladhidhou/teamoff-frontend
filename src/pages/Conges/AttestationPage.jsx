import React, { useEffect, useState, useRef } from 'react';
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
  reserve:              'Réservé (prévisionnel)',
  valide_final:         'Validé',
  valide_manager:       'Validé (manager)',
  en_attente_manager:   'En attente',
  refuse_manager:       'Refusé (manager)',
  refuse_final:         'Refusé',
};

const DEMI_LABELS = {
  matin:       'matin',
  apres_midi:  'après-midi',
};

const politiqueLabel = (p) => {
  if (!p) return null;
  if (p.count_saturday && p.count_sunday) return 'Jours calendaires';
  if (p.count_saturday) return 'Jours ouvrables (lun. – sam.)';
  return 'Jours ouvrés (lun. – ven.)';
};

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #b8b4ae; }

  .action-btns {
    position: fixed; top: 16px; right: 16px; z-index: 1000;
    display: flex; gap: 8px;
  }
  .att-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 3px;
    font-family: Arial, sans-serif; font-size: 12px; font-weight: 600;
    cursor: pointer; border: 1px solid #555;
    background: #fff; color: #222;
    box-shadow: 0 2px 8px rgba(0,0,0,.15);
    transition: background .12s;
  }
  .att-btn:hover:not(:disabled) { background: #f0f0f0; }
  .att-btn:disabled { opacity: .6; cursor: default; }
  .att-btn.email-ok  { background: #15803d; color: #fff; border-color: #15803d; }
  .att-btn.email-err { background: #b91c1c; color: #fff; border-color: #b91c1c; }

  .page-wrap {
    min-height: 100vh;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @media screen and (max-width: 840px) { .page-wrap { padding: 20px 0; } .doc { zoom: .82; } }
  @media screen and (max-width: 640px) { .doc { zoom: .62; } }
  @media screen and (max-width: 480px) { .page-wrap { padding: 10px 0; } .doc { zoom: .44; } }

  /* ── Document ── */
  .doc {
    background: #fff;
    width: 794px;
    padding: 48px 60px 44px;
    box-shadow: 0 4px 24px rgba(0,0,0,.18);
    display: flex;
    flex-direction: column;
    font-family: 'Georgia', 'Times New Roman', serif;
  }

  /* ── Header ── */
  .att-hd {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 1px solid #111;
  }
  .att-hd-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .att-logo {
    max-height: 44px;
    max-width: 130px;
    object-fit: contain;
  }
  .att-co {
    font-size: 16px;
    font-weight: 700;
    color: #111;
    letter-spacing: .2px;
  }
  .att-ref-val {
    font-family: 'Courier New', monospace;
    font-size: 11px; color: #333;
    letter-spacing: .3px; margin-bottom: 3px;
    text-align: right;
  }
  .att-ref-date {
    font-family: Arial, sans-serif;
    font-size: 10px; color: #777; font-style: italic;
    text-align: right;
  }

  /* ── Title ── */
  .att-title-zone {
    padding: 22px 0 0;
    text-align: center;
  }
  .att-title {
    font-size: 15px; font-weight: 700;
    color: #111; letter-spacing: 4px;
    text-transform: uppercase;
  }
  .att-title-rule {
    width: 44px; height: 1px;
    background: #111; margin: 10px auto 0; opacity: .25;
  }

  /* ── Section label ── */
  .att-sec {
    font-family: Arial, sans-serif;
    font-size: 7.5px; text-transform: uppercase;
    letter-spacing: 2px; color: #999; font-weight: 700;
    margin: 24px 0 8px;
  }
  .att-hr {
    border: none; border-top: 1px solid #eee; margin: 0 0 10px;
  }

  /* ── Intro ── */
  .att-intro {
    font-size: 12.5px; line-height: 1.9;
    color: #222; text-align: justify;
  }
  .att-intro strong { font-weight: 700; color: #111; }
  .att-valoir {
    font-family: Arial, sans-serif;
    font-size: 10px; font-style: italic;
    color: #aaa; text-align: center; margin-top: 9px;
  }

  /* ── Info tables ── */
  .att-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }
  table.att-t {
    width: 100%; border-collapse: collapse;
    font-family: Arial, sans-serif; font-size: 11.5px;
  }
  table.att-t tr { border-bottom: 1px solid #f0f0f0; }
  table.att-t tr:last-child { border-bottom: none; }
  table.att-t td { padding: 6px 4px; vertical-align: top; line-height: 1.4; }
  .tl { color: #888; font-style: italic; width: 38%; padding-right: 8px; }
  .ts { color: #ccc; width: 8px; }
  .tv { color: #111; font-weight: 700; }
  .tv-ok {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 9.5px; font-weight: 700;
    color: #166534; background: #f0fdf4;
    border: 1px solid #bbf7d0; border-radius: 2px;
    padding: 1px 6px;
  }
  .tv-ok::before { content: '✓'; }

  /* ── Décompte ── */
  .att-dc-wrap {
    border: 1px solid #ddd; border-radius: 2px;
  }
  .att-dc-head {
    padding: 6px 14px;
    border-bottom: 1px solid #ddd;
    font-family: Arial, sans-serif;
    background: #fafafa;
    display: flex; justify-content: space-between; align-items: center;
  }
  .att-dc-head-left {
    font-size: 7.5px; text-transform: uppercase;
    letter-spacing: 1.5px; color: #aaa; font-weight: 700;
  }
  .att-dc-head-right {
    font-size: 7.5px; color: #888; font-style: italic;
  }
  .att-dc-body { display: flex; }
  .att-dc-cell {
    flex: 1; padding: 12px 6px;
    display: flex; flex-direction: column;
    align-items: center; gap: 4px;
    border-right: 1px solid #eee;
    position: relative;
    font-family: Arial, sans-serif;
  }
  .att-dc-cell:last-child { border-right: none; background: #fafafa; }
  .att-dc-num {
    font-family: 'Courier New', monospace;
    font-size: 20px; font-weight: 500;
    color: #111; line-height: 1;
  }
  .att-dc-num.dim { color: #bbb; font-size: 17px; }
  .att-dc-lbl {
    font-size: 8px; text-transform: uppercase;
    letter-spacing: .5px; color: #aaa;
    text-align: center; line-height: 1.3;
  }
  .att-dc-tag {
    font-size: 7px; font-style: italic;
    color: #bbb; text-align: center; line-height: 1.3;
  }
  .att-dc-op {
    position: absolute; right: -7px; top: 50%;
    transform: translateY(-50%);
    font-family: Arial, sans-serif;
    font-size: 10px; color: #ccc;
    background: #fff; padding: 1px 2px;
    z-index: 2; line-height: 1;
  }
  .att-dc-cell:last-child .att-dc-op { display: none; }

  /* ── Solde ── */
  .att-solde-row {
    margin-top: 12px;
    border: 1px solid #ddd; border-radius: 2px;
    display: flex; align-items: center;
    padding: 13px 16px; gap: 10px;
    font-family: Arial, sans-serif;
  }
  .att-solde-lbl {
    font-size: 7.5px; text-transform: uppercase;
    letter-spacing: 1.5px; color: #999; font-weight: 700;
    flex: 1; line-height: 1.5;
  }
  .att-solde-val {
    font-family: 'Courier New', monospace;
    font-size: 24px; font-weight: 600; color: #111;
  }
  .att-solde-unit {
    font-size: 10px; color: #999; font-weight: 500;
    align-self: flex-end; margin-bottom: 3px;
  }

  /* ── Legal ── */
  .att-legal {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e8e8e8;
    font-family: Arial, sans-serif;
    font-size: 9px; color: #aaa;
    font-style: italic; text-align: center; line-height: 1.7;
  }

  /* ── Signatures ── */
  .att-sig-zone {
    margin-top: 28px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    font-family: Arial, sans-serif;
  }
  .att-sig-role {
    font-size: 7.5px; text-transform: uppercase;
    letter-spacing: 1.5px; color: #aaa; font-weight: 700;
    margin-bottom: 2px;
  }
  .att-sig-name { font-size: 13px; font-family: 'Georgia', serif; font-weight: 700; color: #111; margin-bottom: 1px; }
  .att-sig-sub { font-size: 10px; font-style: italic; color: #aaa; margin-bottom: 18px; }
  .att-sig-line-lbl {
    font-size: 7px; text-transform: uppercase;
    letter-spacing: 1px; color: #ccc; margin-bottom: 4px;
  }
  .att-sig-underline { border-bottom: 1px solid #ccc; height: 26px; }

  /* ── Footer ── */
  .att-footer {
    margin-top: 28px;
    padding-top: 9px;
    border-top: 1px solid #111;
    display: flex; justify-content: space-between; align-items: center;
    font-family: Arial, sans-serif;
  }
  .att-foot-l { font-size: 8px; color: #aaa; }
  .att-foot-r { font-family: 'Courier New', monospace; font-size: 8px; color: #bbb; }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .action-btns { display: none !important; }
    .page-wrap { padding: 0 !important; background: transparent !important; display: block !important; }
    .doc { width: 210mm !important; box-shadow: none !important; padding: 16mm 18mm !important; zoom: 1 !important; }
    @page { margin: 0; size: A4 portrait; }
  }
`;

export default function AttestationPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [emailState, setEmailState] = useState('idle');
  const printedRef = useRef(false);

  useEffect(() => {
    congesService.getAttestationData(id)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Erreur lors du chargement de l\'attestation.'));
  }, [id]);

  useEffect(() => {
    if (data && !printedRef.current) {
      printedRef.current = true;
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [data]);

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}>
      Chargement de l'attestation…
    </div>
  );

  const nomComplet = `${data.employe.prenom} ${data.employe.nom}`.trim();
  const jours = data.jours;
  const pol = jours.politique;

  const nbSam    = jours.detail.filter(d => d.label === 'Samedi').length;
  const nbDim    = jours.detail.filter(d => d.label === 'Dimanche').length;
  const nbFeries = jours.detail.filter(d => d.type === 'ferie').length;

  const periodLabel = () => {
    const s = data.conge.debut_demi_journee
      ? `${fmt(data.conge.date_debut)} (${DEMI_LABELS[data.conge.debut_demi_journee] || data.conge.debut_demi_journee})`
      : fmt(data.conge.date_debut);
    const e = data.conge.fin_demi_journee
      ? `${fmt(data.conge.date_fin)} (${DEMI_LABELS[data.conge.fin_demi_journee] || data.conge.fin_demi_journee})`
      : fmt(data.conge.date_fin);
    return `${s} → ${e}`;
  };

  const emailBtnClass = `att-btn${emailState === 'success' ? ' email-ok' : emailState === 'error' ? ' email-err' : ''}`;
  const emailBtnLabel = emailState === 'sending' ? 'Envoi…' : emailState === 'success' ? 'Envoyé !' : emailState === 'error' ? 'Erreur' : 'Envoyer par email';

  return (
    <>
      <style>{CSS}</style>

      <div className="action-btns">
        <button className="att-btn" onClick={() => window.print()}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimer / PDF
        </button>
        <button className={emailBtnClass} onClick={handleSendEmail} disabled={emailState === 'sending'}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          {emailBtnLabel}
        </button>
      </div>

      <div className="page-wrap">
        <div className="doc">

          {/* Header */}
          <div className="att-hd">
            <div className="att-hd-left">
              {data.entreprise.logo && (
                <img className="att-logo" src={data.entreprise.logo} alt={`Logo ${data.entreprise.nom}`} />
              )}
              <div className="att-co">{data.entreprise.nom}</div>
            </div>
            <div>
              <div className="att-ref-val">{data.reference}</div>
              <div className="att-ref-date">Émis le {data.genere_le}</div>
            </div>
          </div>

          {/* Title */}
          <div className="att-title-zone">
            <div className="att-title">Attestation de Congé</div>
            <div className="att-title-rule"></div>
          </div>

          {/* Attestation */}
          <div className="att-sec">Attestation</div>
          <hr className="att-hr" />
          <p className="att-intro">
            Nous soussignés, <strong>{data.entreprise.nom}</strong>, attestons que{' '}
            <strong>{nomComplet}</strong>
            {data.employe.service ? <>, employé(e) au sein du service <strong>{data.employe.service}</strong>,</> : null}
            {data.employe.date_embauche ? <> en poste depuis le <strong>{fmtLong(data.employe.date_embauche)}</strong>,</> : null}
            {data.conge.statut === 'reserve'
              ? <>{' '}a soumis une <strong>réservation prévisionnelle</strong> de congé de type <strong>« {data.conge.type} »</strong>{' '}
                  du <strong>{fmt(data.conge.date_debut)}</strong> au <strong>{fmt(data.conge.date_fin)}</strong>,
                  pour une durée de <strong>{jours.ouvres} jour{jours.ouvres > 1 ? 's' : ''} ouvré{jours.ouvres > 1 ? 's' : ''}</strong>.
                  Cette réservation est en attente de validation.</>
              : <>{' '}a bénéficié d'un congé de type <strong>« {data.conge.type} »</strong>{' '}
                  du <strong>{fmt(data.conge.date_debut)}</strong> au <strong>{fmt(data.conge.date_fin)}</strong>,
                  pour une durée de <strong>{jours.ouvres} jour{jours.ouvres > 1 ? 's' : ''} ouvré{jours.ouvres > 1 ? 's' : ''}</strong>,
                  conformément à la politique de congés de l'entreprise.</>
            }
          </p>
          <p className="att-valoir">Ce document est établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.</p>

          {/* Informations */}
          <div className="att-sec" style={{ marginTop: 22 }}>Informations</div>
          <hr className="att-hr" />
          <div className="att-two-col">
            <table className="att-t">
              <tbody>
                <tr><td className="tl">Nom</td><td className="ts">·</td><td className="tv">{nomComplet}</td></tr>
                <tr><td className="tl">Email</td><td className="ts">·</td><td className="tv" style={{ fontSize: 10 }}>{data.employe.email || '—'}</td></tr>
                <tr><td className="tl">Service</td><td className="ts">·</td><td className="tv">{data.employe.service || '—'}</td></tr>
                {data.employe.date_embauche && (
                  <tr><td className="tl">Embauche</td><td className="ts">·</td><td className="tv">{fmtLong(data.employe.date_embauche)}</td></tr>
                )}
              </tbody>
            </table>
            <table className="att-t">
              <tbody>
                <tr><td className="tl">Type</td><td className="ts">·</td><td className="tv">{data.conge.type}</td></tr>
                <tr><td className="tl">Du</td><td className="ts">·</td><td className="tv">{fmt(data.conge.date_debut)}</td></tr>
                <tr><td className="tl">Au</td><td className="ts">·</td><td className="tv">{fmt(data.conge.date_fin)}</td></tr>
                <tr>
                  <td className="tl">Statut</td><td className="ts">·</td>
                  <td className="tv">
                    {data.conge.statut === 'valide_final'
                      ? <span className="tv-ok">Validé</span>
                      : (STATUT_LABELS[data.conge.statut] || data.conge.statut)
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Décompte */}
          <div className="att-sec" style={{ marginTop: 22 }}>Décompte des jours</div>
          <hr className="att-hr" />
          <div className="att-dc-wrap">
            <div className="att-dc-head">
              <span className="att-dc-head-left">{fmt(data.conge.date_debut)} → {fmt(data.conge.date_fin)}</span>
              {pol && <span className="att-dc-head-right">Politique : {politiqueLabel(pol)}</span>}
            </div>
            <div className="att-dc-body">

              <div className="att-dc-cell">
                <div className="att-dc-num">{jours.calendaires}</div>
                <div className="att-dc-lbl">Calendaires</div>
                <div className="att-dc-op">−</div>
              </div>

              <div className="att-dc-cell">
                <div className={`att-dc-num${pol && !pol.count_saturday ? ' dim' : ''}`}>{nbSam}</div>
                <div className="att-dc-lbl">Samedis</div>
                {pol && !pol.count_saturday && <div className="att-dc-tag">non décomptés</div>}
                <div className="att-dc-op">−</div>
              </div>

              <div className="att-dc-cell">
                <div className={`att-dc-num${pol && !pol.count_sunday ? ' dim' : ''}`}>{nbDim}</div>
                <div className="att-dc-lbl">Dimanches</div>
                {pol && !pol.count_sunday && <div className="att-dc-tag">non décomptés</div>}
                <div className="att-dc-op">−</div>
              </div>

              <div className="att-dc-cell">
                <div className="att-dc-num dim">{nbFeries}</div>
                <div className="att-dc-lbl">Fériés</div>
                <div className="att-dc-tag">non décomptés</div>
                <div className="att-dc-op">=</div>
              </div>

              <div className="att-dc-cell">
                <div className="att-dc-num">{jours.ouvres}</div>
                <div className="att-dc-lbl">Jours ouvrés</div>
              </div>

            </div>
          </div>

          {/* Solde restant */}
          {data.solde && (
            <div className="att-solde-row">
              <div className="att-solde-lbl">Solde restant<br />après ce congé · {data.solde.type} {data.solde.annee}</div>
              <div className="att-solde-val">{data.solde.solde_restant}</div>
              <div className="att-solde-unit">jours</div>
            </div>
          )}

          {/* Legal */}
          <div className="att-legal">
            Document généré automatiquement par TeamOff · Réf. {data.reference}<br />
            Toute falsification constitue un délit passible de poursuites.
          </div>

          {/* Signatures */}
          <div className="att-sig-zone">
            <div>
              <div className="att-sig-role">Le salarié</div>
              <div className="att-sig-name">{nomComplet}</div>
              <div className="att-sig-sub">{data.conge.type} · {fmt(data.conge.date_debut)} – {fmt(data.conge.date_fin)}</div>
              <div className="att-sig-line-lbl">Signature</div>
              <div className="att-sig-underline"></div>
            </div>
            <div>
              <div className="att-sig-role">Le responsable</div>
              <div className="att-sig-name">Direction / RH</div>
              <div className="att-sig-sub">{data.entreprise.nom}</div>
              <div className="att-sig-line-lbl">Signature &amp; cachet</div>
              <div className="att-sig-underline"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="att-footer">
            <span className="att-foot-l">{data.entreprise.nom} · Document confidentiel</span>
            <span className="att-foot-r">{data.reference} · TeamOff</span>
          </div>

        </div>
      </div>
    </>
  );
}
