import './help.css';
import React, { useEffect } from 'react';

export default function HelpPage() {
  useEffect(() => {
    const container = document.querySelector('.page-content, .role-content');
    if (container) container.style.scrollBehavior = 'smooth';

    const sections = document.querySelectorAll('.guide-page section[id]');
    const links = document.querySelectorAll('.guide-page .nav-links a');
    if (!sections.length || !links.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.id;
            links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
          }
        });
      },
      { root: container || null, threshold: 0.25, rootMargin: '-10% 0px -55% 0px' }
    );

    sections.forEach((s) => obs.observe(s));
    if (links[0]) links[0].classList.add('active');

    return () => {
      obs.disconnect();
      if (container) container.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="guide-page">

      {/* ── NAV INTERNE ── */}
      <nav>
        <div className="nav-inner">
          <div className="nav-logo">
            <svg className="logo-svg" viewBox="0 0 30 30" fill="none">
              <rect width="30" height="30" rx="8" fill="url(#lg-nav)"/>
              <text x="7.5" y="21" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="15" fill="white">T</text>
              <circle cx="23" cy="21" r="2.8" fill="#f59e0b"/>
              <defs><linearGradient id="lg-nav" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient></defs>
            </svg>
            team<strong>Off</strong>
          </div>
          <div className="nav-links">
            <a href="#roles">Rôles</a>
            <a href="#workflow">Congés</a>
            <a href="#calendrier">Calendrier</a>
            <a href="#soldes">Soldes</a>
            <a href="#admin">Administration</a>
            <a href="#securite">Sécurité</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero">
        <div className="wrap">
          <div className="hero-inner">
            <div>
              <div className="hero-eyebrow">
                <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#34d399"/></svg>
                Guide de prise en main
              </div>
              <h1 className="hero-title">Gérez vos congés<br/>simplement avec <span>TeamOff</span></h1>
              <p className="hero-sub">Plateforme multi-entreprises de gestion des absences. Demandes, validations, soldes et calendrier partagé — tout en un seul endroit.</p>
              <div className="hero-badges">
                <div className="hbadge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  5 rôles
                </div>
                <div className="hbadge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Calendrier partagé
                </div>
                <div className="hbadge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Circuit personnalisable
                </div>
                <div className="hbadge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Double authentification
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <svg width="400" height="295" viewBox="0 0 400 295" fill="none">
                <rect x="6" y="6" width="388" height="283" rx="12" fill="#f0f2f5" stroke="rgba(255,255,255,.15)" strokeWidth="1"/>
                <rect x="6" y="6" width="388" height="32" rx="12" fill="rgba(0,0,0,.18)"/>
                <rect x="6" y="26" width="388" height="12" fill="rgba(0,0,0,.18)"/>
                <circle cx="24" cy="22" r="4.5" fill="#ef4444" opacity=".8"/>
                <circle cx="38" cy="22" r="4.5" fill="#f59e0b" opacity=".8"/>
                <circle cx="52" cy="22" r="4.5" fill="#10b981" opacity=".8"/>
                <text x="90" y="27" fontFamily="Arial,sans-serif" fontSize="10" fill="rgba(255,255,255,.6)">TeamOff</text>
                <rect x="6" y="38" width="78" height="251" fill="white"/>
                <rect x="83" y="38" width="1" height="251" fill="rgba(0,0,0,.08)"/>
                <rect x="14" y="48" width="20" height="20" rx="5" fill="url(#lg-mock)"/>
                <text x="17.5" y="63" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="11" fill="white">T</text>
                <circle cx="31" cy="63" r="2" fill="#f59e0b"/>
                <text x="38" y="63" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="10" fill="#111827">team</text>
                <rect x="12" y="80" width="62" height="24" rx="7" fill="#eef2ff"/>
                <text x="20" y="96" fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="600" fill="#4f46e5">Tableau de bord</text>
                <text x="20" y="118" fontFamily="Arial,sans-serif" fontSize="8.8" fill="rgba(0,0,0,.5)">Mes congés</text>
                <text x="20" y="136" fontFamily="Arial,sans-serif" fontSize="9.5" fill="rgba(0,0,0,.5)">Calendrier</text>
                <text x="20" y="154" fontFamily="Arial,sans-serif" fontSize="8.5" fill="rgba(0,0,0,.5)">Historique solde</text>
                <text x="20" y="172" fontFamily="Arial,sans-serif" fontSize="8.8" fill="rgba(0,0,0,.5)">Prise en main</text>
                <text x="20" y="190" fontFamily="Arial,sans-serif" fontSize="9.5" fill="rgba(0,0,0,.5)">Notifications</text>
                <rect x="84" y="38" width="310" height="251" fill="#f0f2f5"/>
                <rect x="84" y="38" width="310" height="34" fill="white"/>
                <rect x="84" y="71" width="310" height="1" fill="rgba(0,0,0,.08)"/>
                <text x="98" y="58" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="11" fill="#111827">Tableau de bord</text>
                <circle cx="374" cy="55" r="9" fill="#eef2ff"/>
                <text x="370" y="59" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="700" fill="#4f46e5">ET</text>
                <rect x="96" y="82" width="286" height="52" rx="12" fill="url(#lg-hero-card)"/>
                <rect x="96" y="82" width="286" height="52" rx="12" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
                <circle cx="366" cy="72" r="30" fill="rgba(255,255,255,.05)"/>
                <circle cx="352" cy="115" r="22" fill="rgba(255,255,255,.04)"/>
                <text x="110" y="104" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="11" fill="white">Bonjour, Emma 👋</text>
                <text x="110" y="118" fontFamily="Arial,sans-serif" fontSize="9" fill="rgba(255,255,255,.6)">Vendredi 14 août 2026</text>
                <rect x="316" y="93" width="58" height="22" rx="7" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.3)" strokeWidth="1"/>
                <text x="325" y="108" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="600" fill="white">+ Demande</text>
                <rect x="96" y="143" width="67" height="40" rx="8" fill="white" stroke="rgba(0,0,0,.08)" strokeWidth="1"/>
                <text x="104" y="157" fontFamily="Arial,sans-serif" fontSize="8" fill="#6b7280">En attente</text>
                <text x="104" y="174" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="14" fill="#d97706">2</text>
                <rect x="170" y="143" width="67" height="40" rx="8" fill="white" stroke="rgba(0,0,0,.08)" strokeWidth="1"/>
                <text x="178" y="157" fontFamily="Arial,sans-serif" fontSize="8" fill="#6b7280">Validés</text>
                <text x="178" y="174" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="14" fill="#059669">5</text>
                <rect x="244" y="143" width="67" height="40" rx="8" fill="white" stroke="rgba(0,0,0,.08)" strokeWidth="1"/>
                <text x="252" y="157" fontFamily="Arial,sans-serif" fontSize="8" fill="#6b7280">Solde CP</text>
                <text x="252" y="174" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="14" fill="#4f46e5">18,5j</text>
                <rect x="318" y="143" width="62" height="40" rx="8" fill="white" stroke="rgba(0,0,0,.08)" strokeWidth="1"/>
                <text x="326" y="157" fontFamily="Arial,sans-serif" fontSize="8" fill="#6b7280">Refusés</text>
                <text x="326" y="174" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="14" fill="#dc2626">0</text>
                <rect x="96" y="192" width="286" height="18" rx="5" fill="white" stroke="rgba(0,0,0,.06)" strokeWidth="1"/>
                <circle cx="108" cy="201" r="4" fill="rgba(52,211,153,.14)" stroke="#059669" strokeWidth="1"/>
                <circle cx="108" cy="201" r="2" fill="#059669"/>
                <text x="118" y="205" fontFamily="Arial,sans-serif" fontSize="9" fill="#111827">Vacances été</text>
                <text x="232" y="205" fontFamily="Arial,sans-serif" fontSize="9" fill="#9ca3af">7 – 11 sept.</text>
                <rect x="334" y="196" width="40" height="12" rx="10" fill="rgba(52,211,153,.12)"/>
                <text x="341" y="206" fontFamily="Arial,sans-serif" fontSize="8" fontWeight="600" fill="#047857">Validé</text>
                <rect x="96" y="215" width="286" height="18" rx="5" fill="white" stroke="rgba(0,0,0,.06)" strokeWidth="1"/>
                <circle cx="108" cy="224" r="4" fill="rgba(240,168,85,.14)" stroke="#d97706" strokeWidth="1"/>
                <circle cx="108" cy="224" r="2" fill="#d97706"/>
                <text x="118" y="228" fontFamily="Arial,sans-serif" fontSize="9" fill="#111827">Pont novembre</text>
                <text x="232" y="228" fontFamily="Arial,sans-serif" fontSize="9" fill="#9ca3af">11 nov.</text>
                <rect x="316" y="219" width="62" height="12" rx="10" fill="rgba(240,168,85,.14)"/>
                <text x="322" y="229" fontFamily="Arial,sans-serif" fontSize="8" fontWeight="600" fill="#92400e">En attente</text>
                <rect x="96" y="238" width="286" height="18" rx="5" fill="white" stroke="rgba(0,0,0,.06)" strokeWidth="1"/>
                <circle cx="108" cy="247" r="4" fill="rgba(124,58,237,.14)" stroke="#7c3aed" strokeWidth="1"/>
                <circle cx="108" cy="247" r="2" fill="#7c3aed"/>
                <text x="118" y="251" fontFamily="Arial,sans-serif" fontSize="9" fill="#111827">Noël 2027</text>
                <text x="232" y="251" fontFamily="Arial,sans-serif" fontSize="9" fill="#9ca3af">24–26 déc.</text>
                <rect x="316" y="243" width="64" height="12" rx="10" fill="rgba(124,58,237,.12)"/>
                <text x="317" y="253" fontFamily="Arial,sans-serif" fontSize="7.5" fontWeight="600" fill="#6d28d9">Réservé 2027</text>
                <defs>
                  <linearGradient id="lg-mock" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                  <linearGradient id="lg-hero-card" x1="96" y1="82" x2="382" y2="134" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1e3a6e"/><stop offset=".5" stopColor="#2d5bb9"/><stop offset="1" stopColor="#3d72e0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── RÔLES ── */}
      <section id="roles">
        <div className="wrap">
          <div className="s-head">
            <div className="s-eye">Rôles</div>
            <h2 className="s-title">Qui fait quoi dans TeamOff ?</h2>
            <p className="s-sub">Votre rôle est attribué par l'administrateur de votre entreprise et détermine vos droits d'accès.</p>
          </div>
          <div className="roles-grid">
            <div className="role-card" style={{ '--rc': '#4f74f2', '--rc-soft': 'rgba(79,116,242,.10)' }}>
              <div className="role-hd">
                <div className="role-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f74f2" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>
                <div><div className="role-name">Employé · Apprenti</div><div className="role-badge">Accès de base</div></div>
              </div>
              <ul className="role-list">
                <li>Soumettre une demande de congé</li>
                <li>Voir et modifier ses propres demandes</li>
                <li>Consulter ses soldes par type de congé</li>
                <li>Accéder au calendrier partagé</li>
                <li>Déclarer une absence (maladie, exceptionnelle)</li>
                <li>Télécharger une attestation PDF</li>
                <li>Anticiper des congés pour l'année suivante</li>
              </ul>
            </div>

            <div className="role-card" style={{ '--rc': '#d97706', '--rc-soft': 'rgba(217,119,6,.10)' }}>
              <div className="role-hd">
                <div className="role-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="7" r="3"/><path d="M2 20c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M13.5 20c0-2.5 1.6-4.5 3.5-4.5s3.5 2 3.5 4.5" strokeDasharray="3 2"/></svg></div>
                <div><div className="role-name">Manager</div><div className="role-badge">Validation équipe</div></div>
              </div>
              <ul className="role-list">
                <li>Tout ce que fait un employé</li>
                <li>Valider ou refuser les demandes de l'équipe</li>
                <li>Voir les congés de toute l'entreprise</li>
                <li>Détecter les chevauchements à la validation</li>
                <li>Activer une anticipation de congé pour l'année suivante</li>
                <li>Consulter les soldes de l'équipe</li>
              </ul>
            </div>

            <div className="role-card" style={{ '--rc': '#059669', '--rc-soft': 'rgba(5,150,105,.10)' }}>
              <div className="role-hd">
                <div className="role-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg></div>
                <div><div className="role-name">Admin entreprise</div><div className="role-badge">Gestion complète</div></div>
              </div>
              <ul className="role-list">
                <li>Tout ce que fait un manager</li>
                <li>Validation finale des congés (2ème niveau)</li>
                <li>Inviter, activer/désactiver des utilisateurs</li>
                <li>Configurer la politique de congés</li>
                <li>Gérer les types de congé et jours fériés</li>
                <li>Ajuster manuellement les soldes</li>
                <li>Exporter les données (CSV, PDF)</li>
              </ul>
            </div>

            <div className="role-card" style={{ '--rc': '#7c3aed', '--rc-soft': 'rgba(124,58,237,.10)' }}>
              <div className="role-hd">
                <div className="role-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                <div><div className="role-name">Super Admin</div><div className="role-badge">Multi-entreprises</div></div>
              </div>
              <ul className="role-list">
                <li>Créer, gérer et désactiver des entreprises</li>
                <li>Accès à toutes les entreprises de la plateforme</li>
                <li>Suivi du bon fonctionnement de la plateforme</li>
                <li>Historique complet de toutes les actions</li>
                <li>Réinitialiser la double authentification d'un utilisateur</li>
                <li>Paramètres généraux de la plateforme</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section id="workflow" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <div className="s-head">
            <div className="s-eye">Congés</div>
            <h2 className="s-title">Circuit de demande et validation</h2>
            <p className="s-sub">De la demande initiale à la validation finale, le parcours complet selon le circuit configuré par votre entreprise.</p>
          </div>
          <div className="wf-layout">
            <div className="steps">
              <div className="step">
                <div className="step-track"><div className="step-num">1</div><div className="step-line"></div></div>
                <div className="step-body">
                  <div className="step-title">Créer une demande</div>
                  <div className="step-desc">Rendez-vous dans <strong>Mes congés → Nouvelle demande</strong> (employés et apprentis) ou <strong>Congés équipe</strong> (managers). Choisissez le type, les dates (demi-journée disponible) et ajoutez un commentaire si besoin. Le nombre de jours ouvrés est calculé automatiquement.</div>
                  <div className="step-who">Employé · Apprenti · Manager</div>
                </div>
              </div>
              <div className="step">
                <div className="step-track"><div className="step-num">2</div><div className="step-line"></div></div>
                <div className="step-body">
                  <div className="step-title">Validation manager (1er niveau)</div>
                  <div className="step-desc">Le manager reçoit une notification. Il vérifie les chevauchements d'équipe et valide ou refuse avec un commentaire. <strong>Un commentaire est recommandé en cas de chevauchement détecté.</strong></div>
                  <div className="step-who" style={{ background: 'rgba(217,119,6,.10)', color: '#92400e' }}>Manager</div>
                </div>
              </div>
              <div className="step">
                <div className="step-track"><div className="step-num">3</div><div className="step-line"></div></div>
                <div className="step-body">
                  <div className="step-title">Validation admin (2ème niveau)</div>
                  <div className="step-desc">Uniquement si le circuit <strong>manager + admin</strong> est activé. L'administrateur approuve ou refuse en dernier ressort. Le nombre maximum de personnes absentes en même temps est vérifié à cette étape.</div>
                  <div className="step-who" style={{ background: 'rgba(5,150,105,.10)', color: '#047857' }}>Admin entreprise</div>
                </div>
              </div>
              <div className="step">
                <div className="step-track"><div className="step-num">4</div><div className="step-line"></div></div>
                <div className="step-body">
                  <div className="step-title">Notification & mise à jour du solde</div>
                  <div className="step-desc">Un email et une notification dans l'application sont envoyés à l'employé. Le solde est mis à jour automatiquement. En cas de refus, les jours sont restitués sans action de votre part.</div>
                  <div className="step-who" style={{ background: 'rgba(124,58,237,.10)', color: '#6d28d9' }}>Automatique</div>
                </div>
              </div>
            </div>

            <div>
              <div className="flow-card">
                <div className="flow-label">Statuts d'un congé</div>
                <div className="fn"><div className="fdot" style={{ background: '#7c3aed' }}></div><span style={{ color: '#6d28d9', fontWeight: 700 }}>Réservé</span> — anticipé pour l'année suivante</div>
                <div className="farrow">↓ activation manager / admin</div>
                <div className="fn"><div className="fdot" style={{ background: '#d97706' }}></div><span style={{ color: '#92400e', fontWeight: 700 }}>En attente manager</span></div>
                <div className="farrow">↓</div>
                <div className="fsplit">
                  <div className="fn" style={{ background: 'rgba(52,211,153,.08)', borderColor: 'rgba(52,211,153,.25)' }}><div className="fdot" style={{ background: '#059669' }}></div><span style={{ color: '#047857', fontWeight: 700 }}>Validé manager</span></div>
                  <div className="fn" style={{ background: 'rgba(248,113,113,.08)', borderColor: 'rgba(248,113,113,.25)' }}><div className="fdot" style={{ background: '#dc2626' }}></div><span style={{ color: '#991b1b', fontWeight: 700 }}>Refusé</span></div>
                </div>
                <div className="farrow">↓ (si circuit manager + admin)</div>
                <div className="fn" style={{ background: 'rgba(52,211,153,.08)', borderColor: 'rgba(52,211,153,.25)' }}><div className="fdot" style={{ background: '#059669' }}></div><span style={{ color: '#047857', fontWeight: 700 }}>Validé final ✓</span></div>
              </div>
              <div className="ftip">
                <strong>Circuits disponibles :</strong> <em>Automatique</em> (validé sans action), <em>Manager seul</em> (1 étape), <em>Manager puis Admin</em> (2 étapes), <em>Admin seul</em>. À configurer par l'administrateur dans les paramètres de congés.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALENDRIER ── */}
      <section id="calendrier">
        <div className="wrap">
          <div className="s-head">
            <div className="s-eye">Calendrier</div>
            <h2 className="s-title">Calendrier partagé de l'équipe</h2>
            <p className="s-sub">Vue mensuelle de toutes les absences et congés. Filtrez par employé, service ou statut.</p>
          </div>
          <div className="cal-layout">
            <div>
              <div className="legend">
                <div className="leg-item"><div className="leg-dot" style={{ background: 'rgba(52,211,153,.7)', outline: '1px solid #059669' }}></div>Validé final</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#6366f1' }}></div>Validé manager</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#d97706' }}></div>En attente</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#7c3aed' }}></div>Réservé (année suivante)</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#dc2626' }}></div>Refusé</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#f97316' }}></div>Arrêt maladie</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#9ca3af' }}></div>Absence exceptionnelle</div>
                <div className="leg-item"><div className="leg-dot" style={{ background: '#e5e7eb', border: '1px solid #d1d5db' }}></div>Férié / Bloqué</div>
              </div>
              <div className="cal-note">
                <strong>Confidentialité médicale</strong><br/>
                Le motif d'un arrêt maladie reste privé : vos collègues voient l'absence sur le calendrier, mais pas le commentaire. Seuls les managers et admins y ont accès.
              </div>
            </div>
            <div className="mini-cal">
              <div className="mcal-head">
                <span className="mcal-month">Septembre 2026</span>
                <span style={{ fontSize: '.78rem', opacity: '.7' }}>Vue équipe</span>
              </div>
              <div className="mcal-grid">
                <div className="mday-name">L</div><div className="mday-name">M</div><div className="mday-name">M</div>
                <div className="mday-name">J</div><div className="mday-name">V</div><div className="mday-name">S</div><div className="mday-name">D</div>
                <div className="mday empty"></div><div className="mday">1</div><div className="mday">2</div><div className="mday">3</div>
                <div className="mday">4</div><div className="mday holiday">5</div><div className="mday holiday">6</div>
                <div className="mday approved">7</div><div className="mday approved">8</div><div className="mday approved">9</div>
                <div className="mday approved">10</div><div className="mday approved">11</div><div className="mday holiday">12</div><div className="mday holiday">13</div>
                <div className="mday">14</div><div className="mday pending">15</div><div className="mday pending">16</div>
                <div className="mday pending">17</div><div className="mday sick">18</div><div className="mday holiday">19</div><div className="mday holiday">20</div>
                <div className="mday today">21</div><div className="mday">22</div><div className="mday">23</div>
                <div className="mday reserved">24</div><div className="mday reserved">25</div><div className="mday holiday">26</div><div className="mday holiday">27</div>
                <div className="mday refused">28</div><div className="mday">29</div><div className="mday">30</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLDES ── */}
      <section id="soldes" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <div className="s-head">
            <div className="s-eye">Soldes</div>
            <h2 className="s-title">Comprendre son solde de congés</h2>
            <p className="s-sub">Chaque type de congé a son propre compteur, mis à jour automatiquement à chaque demande ou validation.</p>
          </div>
          <div className="bal-layout">
            <div className="bal-card">
              <div className="bal-head">
                <div className="bal-type">Congés Payés — 2026</div>
                <div className="bal-val">18,5 j</div>
                <div className="bal-sub">jours restants cette année</div>
              </div>
              <div className="bal-rows">
                <div className="brow"><span className="blabel">Acquis</span><div className="bbar-wrap"><div className="bbar" style={{ width: '100%', background: '#4f74f2' }}></div></div><span className="bval" style={{ color: '#4f46e5' }}>25,0</span></div>
                <div className="brow"><span className="blabel">Pris</span><div className="bbar-wrap"><div className="bbar" style={{ width: '26%', background: '#dc2626' }}></div></div><span className="bval" style={{ color: '#dc2626' }}>6,5</span></div>
                <div className="brow"><span className="blabel">Réservés</span><div className="bbar-wrap"><div className="bbar" style={{ width: '0%', background: '#d97706' }}></div></div><span className="bval" style={{ color: '#d97706' }}>0,0</span></div>
                <div className="brow" style={{ paddingTop: '11px' }}><span className="blabel" style={{ fontWeight: 700, color: 'var(--text)' }}>Disponible</span><div className="bbar-wrap"><div className="bbar" style={{ width: '74%', background: '#059669' }}></div></div><span className="bval" style={{ color: '#059669', fontSize: '.95rem' }}>18,5</span></div>
              </div>
            </div>
            <div className="qf-grid">
              <div className="qf-item">
                <div className="qf-ico" style={{ background: 'rgba(79,116,242,.10)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f74f2" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                <div><div className="qf-title">Jours crédités chaque mois</div><div className="qf-desc">Vos jours de congé sont ajoutés automatiquement chaque mois, selon les règles définies par votre entreprise. Aucune action de votre part n'est nécessaire.</div></div>
              </div>
              <div className="qf-item">
                <div className="qf-ico" style={{ background: 'rgba(124,58,237,.10)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                <div><div className="qf-title">Anticiper l'année suivante</div><div className="qf-desc">Posez des dates de congé pour l'année suivante même si vous n'avez pas encore assez de jours. Ces congés restent en attente jusqu'à ce qu'un manager les active.</div></div>
              </div>
              <div className="qf-item">
                <div className="qf-ico" style={{ background: 'rgba(5,150,105,.10)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></div>
                <div><div className="qf-title">Report d'une année à l'autre</div><div className="qf-desc">Si votre entreprise l'autorise, les jours non pris peuvent être reportés en début d'année suivante, dans la limite du plafond configuré.</div></div>
              </div>
              <div className="qf-item">
                <div className="qf-ico" style={{ background: 'rgba(217,119,6,.10)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
                <div><div className="qf-title">Alerte solde faible</div><div className="qf-desc">Un email est envoyé automatiquement quand il reste moins de 3 jours disponibles après une validation, pour vous permettre d'anticiper.</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ADMINISTRATION ── */}
      <section id="admin">
        <div className="wrap">
          <div className="s-head">
            <div className="s-eye">Administration</div>
            <h2 className="s-title">Outils pour les administrateurs</h2>
            <p className="s-sub">L'admin entreprise dispose d'un panel complet pour configurer et piloter la plateforme au quotidien.</p>
          </div>
          <div className="feat-grid">
            <div className="feat-card">
              <div className="feat-ico" style={{ background: 'rgba(79,116,242,.10)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f74f2" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></div>
              <div className="feat-title">Gestion des utilisateurs</div>
              <div className="feat-desc">Invitez des collaborateurs par email, changez leur rôle, activez ou désactivez leur compte. Les invités reçoivent un lien pour définir leur mot de passe.</div>
            </div>
            <div className="feat-card">
              <div className="feat-ico" style={{ background: 'rgba(5,150,105,.10)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
              <div className="feat-title">Politique de congés</div>
              <div className="feat-desc">Choisissez le circuit de validation, le nombre maximum de personnes absentes en même temps, le préavis minimum et les règles d'accumulation des jours.</div>
            </div>
            <div className="feat-card">
              <div className="feat-ico" style={{ background: 'rgba(217,119,6,.10)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
              <div className="feat-title">Types de congé</div>
              <div className="feat-desc">Créez autant de types que nécessaire (CP, RTT, sans solde, ancienneté…) avec quota annuel, accumulation et autorisation de demi-journée.</div>
            </div>
            <div className="feat-card">
              <div className="feat-ico" style={{ background: 'rgba(124,58,237,.10)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg></div>
              <div className="feat-title">Jours fériés & bloqués</div>
              <div className="feat-desc">Importez les jours fériés nationaux automatiquement ou ajoutez manuellement des jours bloqués. Ils sont exclus du calcul des jours ouvrés.</div>
            </div>
            <div className="feat-card">
              <div className="feat-ico" style={{ background: 'rgba(45,91,185,.10)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5bb9" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
              <div className="feat-title">Exports</div>
              <div className="feat-desc">Téléchargez les congés, absences, arrêts maladie, utilisateurs et rapports d'activité aux formats PDF et tableur (compatible Excel).</div>
            </div>
            <div className="feat-card">
              <div className="feat-ico" style={{ background: 'rgba(220,38,38,.08)' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
              <div className="feat-title">Historique des actions</div>
              <div className="feat-desc">Toutes les actions importantes sont enregistrées : validations, refus, changements de rôle, ajustements de jours. Recherchez par personne, action ou période.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SÉCURITÉ ── */}
      <section id="securite" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <div className="s-head">
            <div className="s-eye">Sécurité</div>
            <h2 className="s-title">Votre compte est protégé</h2>
            <p className="s-sub">TeamOff applique des mesures de sécurité renforcées pour protéger vos données et l'accès à votre compte.</p>
          </div>
          <div className="sec-grid">
            <div className="sec-card top-accent">
              <div className="sec-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Authentification à deux facteurs (2FA)
              </div>
              <div className="sec-desc">La double authentification protège votre compte même si quelqu'un connaît votre mot de passe — il lui faudrait aussi votre téléphone pour se connecter.</div>
              <div className="sec-steps">
                <div className="sec-step"><div className="sec-num">1</div>Allez dans <strong>Mon profil → Sécurité</strong></div>
                <div className="sec-step"><div className="sec-num">2</div>Scannez le QR code avec Google Authenticator, Authy ou une application similaire</div>
                <div className="sec-step"><div className="sec-num">3</div>Saisissez le code à 6 chiffres affiché pour confirmer</div>
                <div className="sec-step"><div className="sec-num">4</div>À chaque connexion, un nouveau code vous sera demandé en plus de votre mot de passe</div>
              </div>
            </div>
            <div className="sec-card">
              <div className="sec-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Mot de passe & sessions
              </div>
              <div className="sec-desc">Votre mot de passe est stocké de façon sécurisée — personne ne peut le lire, même en interne. En cas d'oubli, cliquez sur <em>Mot de passe oublié</em> : un lien valable 1 heure vous est envoyé par email.</div>
              <div style={{ marginTop: '14px' }}>
                <div className="sec-title" style={{ marginTop: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Sessions sécurisées
                </div>
                <div className="sec-desc">Votre session reste active en toute sécurité. Dès que vous vous déconnectez, l'accès est coupé immédiatement sur tous les appareils.</div>
              </div>
            </div>
          </div>
          <div className="sec-pills">
            <div className="sec-pill"><strong>🛡️ Protection anti-abus</strong>Les tentatives de connexion répétées sont automatiquement bloquées pour empêcher quelqu'un de deviner votre mot de passe.</div>
            <div className="sec-pill"><strong>🏢 Données séparées par entreprise</strong>Les informations de votre entreprise sont totalement isolées. Aucun autre utilisateur ne peut y accéder.</div>
            <div className="sec-pill"><strong>🔍 Historique complet</strong>Toutes les actions importantes sont enregistrées avec la date, l'heure et la personne concernée. Les administrateurs peuvent consulter cet historique à tout moment.</div>
          </div>
        </div>
      </section>

    </div>
  );
}
