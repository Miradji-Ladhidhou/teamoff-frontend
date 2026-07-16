import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { congesService } from '../../services/api';

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const fmtEmbauche = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const STATUT_LABELS = {
  valide_final: 'Validé',
  valide_manager: 'Validé (manager)',
  en_attente_manager: 'En attente',
  refuse_manager: 'Refusé (manager)',
  refuse_final: 'Refusé',
};

const DEMI_LABELS = {
  matin: 'matin',
  apres_midi: 'après-midi',
};

export default function AttestationPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const printedRef = useRef(false);

  useEffect(() => {
    congesService.getAttestationData(id)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Erreur lors du chargement de l\'attestation.');
      });
  }, [id]);

  useEffect(() => {
    if (data && !printedRef.current) {
      printedRef.current = true;
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const periodLabel = () => {
    if (!data) return '';
    const start = data.conge.debut_demi_journee
      ? `${fmt(data.conge.date_debut)} (${DEMI_LABELS[data.conge.debut_demi_journee] || data.conge.debut_demi_journee})`
      : fmt(data.conge.date_debut);
    const end = data.conge.fin_demi_journee
      ? `${fmt(data.conge.date_fin)} (${DEMI_LABELS[data.conge.fin_demi_journee] || data.conge.fin_demi_journee})`
      : fmt(data.conge.date_fin);
    return `${start} → ${end}`;
  };

  const commentaires = () => {
    if (!data) return [];
    const c = [];
    if (data.conge.commentaire_employe) c.push({ label: 'Employé', text: data.conge.commentaire_employe });
    if (data.conge.commentaire_manager) c.push({ label: 'Manager', text: data.conge.commentaire_manager });
    if (data.conge.commentaire_admin) c.push({ label: 'Administration', text: data.conge.commentaire_admin });
    return c;
  };

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#c0392b' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#6b7280' }}>
        Chargement de l'attestation…
      </div>
    );
  }

  const nomComplet = `${data.employe.prenom} ${data.employe.nom}`.trim();
  const jours = data.jours;
  const coms = commentaires();

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #e8edf2; }
        .print-btn {
          position: fixed; top: 16px; right: 16px; z-index: 1000;
          background: #1e3a5f; color: #fff; border: none; border-radius: 6px;
          padding: 9px 20px; font-size: 16px; font-weight: 600; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          display: flex; align-items: center; gap: 8px;
        }
        .print-btn:hover { background: #16304f; }
        .page-wrap { min-height: 100vh; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; }
        .doc {
          background: #fff;
          width: 794px;
          min-height: 1123px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.14);
          display: flex;
          flex-direction: column;
          font-family: 'Georgia', 'Times New Roman', serif;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }
        .doc-header {
          background: #1e3a5f;
          padding: 20px 28px 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .company-name {
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.5px;
          font-family: 'Georgia', serif;
        }
        .company-sub {
          color: rgba(255,255,255,0.55);
          font-size: 12px;
          margin-top: 2px;
          font-family: Arial, sans-serif;
          font-weight: 400;
        }
        .ref-block { text-align: right; }
        .ref-label { color: rgba(255,255,255,0.55); font-size: 10px; font-family: Arial, sans-serif; letter-spacing: 1px; text-transform: uppercase; }
        .ref-value { color: rgba(255,255,255,0.9); font-size: 12px; font-family: 'Courier New', monospace; margin-top: 1px; }
        .doc-stripe {
          height: 4px;
          background: linear-gradient(90deg, #2563eb 0%, #4f9cf9 60%, #93c5fd 100%);
        }
        .doc-title-band {
          padding: 9px 28px 8px;
          border-bottom: 1px solid #e5e9ef;
        }
        .doc-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e3a5f;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-family: 'Georgia', serif;
        }
        .doc-subtitle {
          font-size: 12px;
          color: #6b7f96;
          margin-top: 2px;
          font-family: Arial, sans-serif;
          font-weight: 400;
        }
        .doc-intro {
          padding: 10px 28px 0;
        }
        .doc-intro p {
          font-size: 13px;
          font-family: Arial, sans-serif;
          color: #2d3748;
          line-height: 1.65;
          margin: 0 0 5px 0;
          text-align: justify;
        }
        .doc-intro p strong {
          color: #1e3a5f;
          font-weight: 700;
        }
        .doc-intro .valoir-droit {
          font-size: 12px;
          color: #6b7f96;
          font-style: italic;
          margin-top: 2px;
        }
        .doc-body { flex: 1; padding: 10px 28px 0; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .section-card {
          border: 1px solid #e0e6ef;
          border-radius: 5px;
          overflow: hidden;
        }
        .section-head {
          background: #f4f7fb;
          padding: 5px 10px;
          font-size: 10px;
          font-weight: 700;
          color: #4a6080;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          font-family: Arial, sans-serif;
          border-bottom: 1px solid #e0e6ef;
        }
        .section-body { padding: 2px 0; }
        .info-row-doc {
          display: grid;
          grid-template-columns: 80px 1fr;
          padding: 4px 10px;
          border-bottom: 1px solid #f0f3f8;
          font-size: 12px;
          line-height: 1.35;
        }
        .info-row-doc:last-child { border-bottom: none; }
        .lbl { color: #6b7f96; font-family: Arial, sans-serif; font-weight: 400; }
        .val { color: #1a2b40; font-family: Arial, sans-serif; font-weight: 600; word-break: break-word; }
        .val.statut-ok { color: #15803d; }

        .bottom-zone { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

        .comments-block {
          border-left: 3px solid #d97706;
          background: #fffbeb;
          padding: 8px 10px;
          border-radius: 0 5px 5px 0;
        }
        .comments-head {
          font-size: 10px; font-weight: 700; color: #92400e;
          letter-spacing: 1px; text-transform: uppercase;
          font-family: Arial, sans-serif; margin-bottom: 5px;
        }
        .comment-item { margin-bottom: 5px; }
        .comment-item:last-child { margin-bottom: 0; }
        .comment-who { font-size: 10px; color: #a16207; font-family: Arial, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px; }
        .comment-text { font-size: 12px; color: #3b2e00; font-family: Arial, sans-serif; font-style: italic; line-height: 1.35; }
        .no-comment { font-size: 12px; color: #a0aec0; font-family: Arial, sans-serif; font-style: italic; }

        .calc-block {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 5px;
          padding: 8px 10px;
        }
        .calc-head {
          font-size: 10px; font-weight: 700; color: #1d4ed8;
          letter-spacing: 1px; text-transform: uppercase;
          font-family: Arial, sans-serif; margin-bottom: 3px;
        }
        .calc-period {
          font-size: 10px; color: #6b7f96; font-family: Arial, sans-serif;
          margin-bottom: 6px; font-style: italic;
        }
        .calc-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 3px 0;
          border-bottom: 1px solid rgba(37,99,235,0.1);
          font-size: 12px; font-family: Arial, sans-serif;
        }
        .calc-row:last-child { border-bottom: none; }
        .calc-label { color: #4a6080; }
        .calc-value { font-weight: 700; color: #1e3a5f; white-space: nowrap; }
        .calc-divider { border: none; border-top: 2px solid #2563eb; margin: 4px 0; }
        .calc-row.total .calc-label { color: #1e3a5f; font-weight: 700; }
        .calc-row.total .calc-value { color: #2563eb; font-size: 14px; }
        .detail-section { margin: 4px 0 2px; }
        .detail-title {
          font-size: 10px; font-weight: 700; color: #4a6080;
          text-transform: uppercase; letter-spacing: 0.8px;
          font-family: Arial, sans-serif; margin-bottom: 2px;
        }
        .detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1px 0 1px 6px;
          font-size: 10px; font-family: Arial, sans-serif; color: #4a6080;
        }
        .detail-date { flex: 1; }
        .badge-inclus {
          font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 10px;
          background: #dcfce7; color: #15803d;
        }
        .badge-exclu {
          font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 10px;
          background: #fee2e2; color: #b91c1c;
        }
        .detail-none { font-size: 10px; color: #94a3b8; font-family: Arial, sans-serif; padding: 1px 0 1px 6px; font-style: italic; }

        .legal-mention {
          font-size: 10px;
          color: #a0aec0;
          font-family: Arial, sans-serif;
          font-style: italic;
          text-align: center;
          padding: 0 28px 50px;
          line-height: 1.4;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 0 28px 100px;
        }
        .sig-block { padding: 10px 12px; border-radius: 5px; }
        .sig-block.employee { background: #eff6ff; border: 1px solid #bfdbfe; }
        .sig-block.direction { background: #f8f9fa; border: 1px solid #e0e6ef; }
        .sig-role {
          font-size: 8px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
          font-family: Arial, sans-serif; margin-bottom: 1px;
        }
        .sig-block.employee .sig-role { color: #1d4ed8; }
        .sig-block.direction .sig-role { color: #8a9ab0; }
        .sig-name { font-size: 12px; font-family: 'Georgia', serif; color: #1a2b40; font-weight: 700; margin-bottom: 1px; }
        .sig-block.direction .sig-name { color: #8a9ab0; font-size: 10px; font-weight: 400; font-style: italic; }
        .sig-line { margin-top: 22px; border-top: 1px solid; padding-top: 3px; font-size: 8px; font-family: Arial, sans-serif; }
        .sig-block.employee .sig-line { border-color: #bfdbfe; color: #93c5fd; }
        .sig-block.direction .sig-line { border-color: #d1d9e6; color: #b0bec5; }

        .doc-footer {
          background: #1e3a5f;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-left { color: rgba(255,255,255,0.55); font-size: 8px; font-family: Arial, sans-serif; }
        .footer-right { color: rgba(255,255,255,0.55); font-size: 8px; font-family: Arial, sans-serif; }

        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .print-btn { display: none !important; }
          .page-wrap { padding: 0 !important; background: transparent !important; }
          .doc {
            width: 100% !important;
            height: 297mm !important;
            min-height: unset !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
          @page { margin: 0; size: A4 portrait; }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Imprimer / PDF
      </button>

      <div className="page-wrap">
        <div className="doc">

          {/* En-tête */}
          <div className="doc-header">
            <div>
              <div className="company-name">{data.entreprise.nom}</div>
              <div className="company-sub">Document officiel — Usage interne</div>
            </div>
            <div className="ref-block">
              <div className="ref-label">Référence</div>
              <div className="ref-value">{data.reference}</div>
              <div className="ref-label" style={{ marginTop: 6 }}>Émis le</div>
              <div className="ref-value">{data.genere_le}</div>
            </div>
          </div>

          <div className="doc-stripe" />

          {/* Titre */}
          <div className="doc-title-band">
            <div className="doc-title">Attestation de congé</div>
            <div className="doc-subtitle">
              Délivrée par {data.entreprise.nom} · Généré automatiquement via TeamOff
            </div>
          </div>

          {/* Paragraphe d'attestation */}
          <div className="doc-intro">
            <p>
              La société <strong>{data.entreprise.nom}</strong> atteste par le présent document
              que <strong>{nomComplet}</strong>
              {data.employe.service ? <>, employé(e) au sein du service <strong>{data.employe.service}</strong>,</> : null}
              {data.employe.date_embauche ? <> en poste depuis le <strong>{fmtEmbauche(data.employe.date_embauche)}</strong>,</> : null}
              {' '}a bénéficié d'un congé de type <strong>« {data.conge.type} »</strong> du{' '}
              <strong>{fmt(data.conge.date_debut)}</strong> au <strong>{fmt(data.conge.date_fin)}</strong>,
              pour une durée de <strong>{jours.ouvres} jour{jours.ouvres > 1 ? 's' : ''} ouvré{jours.ouvres > 1 ? 's' : ''}</strong>,
              conformément à la politique de congés de l'entreprise.
            </p>
            <p className="valoir-droit">
              Ce document est établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.
            </p>
          </div>

          {/* Corps */}
          <div className="doc-body">

            {/* Salarié + Congé */}
            <div className="two-col">

              <div className="section-card">
                <div className="section-head">Salarié</div>
                <div className="section-body">
                  <div className="info-row-doc">
                    <span className="lbl">Nom</span>
                    <span className="val">{nomComplet}</span>
                  </div>
                  <div className="info-row-doc">
                    <span className="lbl">Email</span>
                    <span className="val" style={{ fontSize: 10 }}>{data.employe.email || '—'}</span>
                  </div>
                  <div className="info-row-doc">
                    <span className="lbl">Service</span>
                    <span className="val">{data.employe.service || '—'}</span>
                  </div>
                  <div className="info-row-doc">
                    <span className="lbl">Embauche</span>
                    <span className="val">{fmtEmbauche(data.employe.date_embauche)}</span>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <div className="section-head">Congé</div>
                <div className="section-body">
                  <div className="info-row-doc">
                    <span className="lbl">Type</span>
                    <span className="val">{data.conge.type}</span>
                  </div>
                  <div className="info-row-doc">
                    <span className="lbl">Période</span>
                    <span className="val" style={{ fontSize: 10 }}>{periodLabel()}</span>
                  </div>
                  <div className="info-row-doc">
                    <span className="lbl">Jours ouvrés</span>
                    <span className="val">{jours.ouvres} jour{jours.ouvres > 1 ? 's' : ''}</span>
                  </div>
                  <div className="info-row-doc">
                    <span className="lbl">Statut</span>
                    <span className={`val${data.conge.statut === 'valide_final' ? ' statut-ok' : ''}`}>
                      {STATUT_LABELS[data.conge.statut] || data.conge.statut}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Commentaires + Décompte */}
            <div className="bottom-zone">

              <div className="comments-block">
                <div className="comments-head">Commentaires</div>
                {coms.length === 0
                  ? <div className="no-comment">Aucun commentaire.</div>
                  : coms.map((c, i) => (
                    <div key={i} className="comment-item">
                      <div className="comment-who">{c.label}</div>
                      <div className="comment-text">« {c.text} »</div>
                    </div>
                  ))
                }
              </div>

              <div className="calc-block">
                <div className="calc-head">Décompte des jours</div>
                <div className="calc-period">du {fmt(data.conge.date_debut)} au {fmt(data.conge.date_fin)}</div>

                <div className="calc-row">
                  <span className="calc-label">Jours calendaires</span>
                  <span className="calc-value">{jours.calendaires} j</span>
                </div>

                {/* Week-ends */}
                {(() => {
                  const weekends = jours.detail.filter(d => d.type === 'weekend');
                  return weekends.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-title">Week-ends</div>
                      {weekends.map((d, i) => (
                        <div key={i} className="detail-row">
                          <span className="detail-date">{d.label} {fmt(d.date)}</span>
                          {d.inclus
                            ? <span className="badge-inclus">inclus</span>
                            : <span className="badge-exclu">exclu</span>
                          }
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Jours fériés */}
                {(() => {
                  const feries = jours.detail.filter(d => d.type === 'ferie');
                  return (
                    <div className="detail-section">
                      <div className="detail-title">Jours fériés</div>
                      {feries.length === 0
                        ? <div className="detail-none">Aucun jour férié sur la période</div>
                        : feries.map((d, i) => (
                          <div key={i} className="detail-row">
                            <span className="detail-date">{d.label} — {fmt(d.date)}</span>
                            <span className="badge-exclu">exclu</span>
                          </div>
                        ))
                      }
                    </div>
                  );
                })()}

                <hr className="calc-divider" />

                <div className="calc-row total">
                  <span className="calc-label">= Jours de congé accordés</span>
                  <span className="calc-value">{jours.ouvres} j</span>
                </div>
              </div>

            </div>

          </div>

          {/* Mention légale */}
          <div className="legal-mention">
            Ce document est généré automatiquement et constitue une attestation officielle de congé.
            Il ne requiert pas de signature manuscrite pour être valide.
          </div>

          {/* Signatures */}
          <div className="signatures">
            <div className="sig-block employee">
              <div className="sig-role">Le salarié</div>
              <div className="sig-name">{nomComplet}</div>
              <div className="sig-line">Signature</div>
            </div>
            <div className="sig-block direction">
              <div className="sig-role">Pour la direction</div>
              <div className="sig-name">Direction de {data.entreprise.nom}</div>
              <div className="sig-line">Cachet &amp; Signature</div>
            </div>
          </div>

          {/* Pied de page */}
          <div className="doc-footer">
            <div className="footer-left">{data.entreprise.nom} · Attestation de congé</div>
            <div className="footer-right">Ref. {data.reference} · {data.genere_le}</div>
          </div>

        </div>
      </div>
    </>
  );
}
