import{u as me,r as m,a1 as P,b as e,C as V,j as n,S as he,B as y,K as fe,L as Y,x as pe,c as L,i as ge,a2 as be,a3 as xe}from"./index-82d35380.js";import{I as q,T as ye}from"./InfoCard-57c4be26.js";import{u as ve}from"./useAlert-746b425c.js";import{A as we}from"./Alert-de75141d.js";import{C as g}from"./Card-14c7968f.js";import{R as G}from"./Row-adfb5c86.js";import{C as $}from"./Col-b8ebf11a.js";import{F as v}from"./Form-78a6ab15.js";import"./ElementChildren-ab0d8d2c.js";const o=a=>{if(!a)return null;if(a instanceof Date)return new Date(a.getFullYear(),a.getMonth(),a.getDate());if(typeof a=="string"){const u=a.slice(0,10).split("-").map(Number);if(u.length===3&&u.every(Number.isFinite))return new Date(u[0],u[1]-1,u[2])}const l=new Date(a);return Number.isNaN(l.getTime())?null:new Date(l.getFullYear(),l.getMonth(),l.getDate())},H=a=>{const l=o(a);if(!l)return"";const b=l.getFullYear(),u=String(l.getMonth()+1).padStart(2,"0"),x=String(l.getDate()).padStart(2,"0");return`${b}-${u}-${x}`},W=a=>{const l=o(a);return l?l.toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"long",year:"numeric"}):"-"},K=a=>{var u,x,k,F;const l=[a==null?void 0:a.utilisateur_prenom,a==null?void 0:a.prenom,(u=a==null?void 0:a.utilisateur)==null?void 0:u.prenom];for(const w of l){const h=String(w||"").trim();if(h)return h}const b=[a==null?void 0:a.utilisateur_nom,(x=a==null?void 0:a.utilisateur)==null?void 0:x.nom_complet,`${((k=a==null?void 0:a.utilisateur)==null?void 0:k.prenom)||""} ${((F=a==null?void 0:a.utilisateur)==null?void 0:F.nom)||""}`];for(const w of b){const h=String(w||"").trim();if(h)return h.split(/\s+/)[0]}return"Salarié"},O=a=>{var l;return typeof(a==null?void 0:a.conge_type)=="string"?a.conge_type:(l=a==null?void 0:a.conge_type)!=null&&l.libelle?a.conge_type.libelle:(a==null?void 0:a.conge_type_libelle)||"Congé"},$e=()=>{const{user:a}=me(),[l,b]=m.useState(new Date),[u,x]=m.useState([]),[k,F]=m.useState([]),[w,h]=m.useState(!0),U=ve(),[j,Q]=m.useState(!1),[c,z]=m.useState(null),[f,_]=m.useState(null),[M,X]=m.useState({statut:"all",utilisateur:"all"});m.useEffect(()=>{Z()},[l,M]);const Z=async()=>{try{h(!0);const t=l.getFullYear(),r=l.getMonth()+1,i=await P.getCongesByMonth(t,r,M);x(i.data);const s=await P.getJoursFeriesByMonth(t,r);F(s.data)}catch(t){console.error("Erreur lors du chargement du calendrier:",t),U.error("Erreur lors du chargement du calendrier")}finally{h(!1)}},B=t=>{b(r=>{const i=new Date(r);return i.setMonth(i.getMonth()+t),i})},I=t=>{const r=t.getFullYear(),i=t.getMonth(),s=new Date(r,i,1),T=new Date(r,i+1,0).getDate(),R=(s.getDay()+6)%7,p=[];for(let d=0;d<R;d++){const C=new Date(r,i,-d);p.unshift({date:C,isCurrentMonth:!1,dayNumber:C.getDate()})}for(let d=1;d<=T;d++)p.push({date:new Date(r,i,d),isCurrentMonth:!0,dayNumber:d});const D=42-p.length;for(let d=1;d<=D;d++)p.push({date:new Date(r,i+1,d),isCurrentMonth:!1,dayNumber:d});return p},ee=t=>u.filter(r=>{const i=o(t),s=o(r.date_debut),N=o(r.date_fin);return!i||!s||!N?!1:i>=s&&i<=N}),ae=t=>k.find(r=>{const i=o(r.date),s=o(t);return(i==null?void 0:i.getTime())===(s==null?void 0:s.getTime())}),te=t=>({en_attente_manager:"warning",valide_manager:"info",valide_final:"success",refuse_manager:"danger",refuse_final:"danger"})[t]||"secondary",re=t=>t.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),ne=t=>{const r=o(t),i=r==null?void 0:r.getDay();return i===0||i===6},E=t=>!!o(t),ie=t=>{const r=o(t);if(r&&E(r)){if(!c||c&&f){z(r),_(null);return}r<c?(_(c),z(r)):_(r)}},le=t=>{const r=o(t==null?void 0:t.date);r&&ie(r)},se=t=>{if(!c)return!1;const r=o(t);if(!r)return!1;const i=f||c;return r>=c&&r<=i},de=t=>{const r=o(t);if(!r||!c)return!1;const i=f||c;return r.getTime()===c.getTime()||r.getTime()===i.getTime()},A=t=>{const{name:r,value:i}=t.target;X(s=>({...s,[r]:i}))},oe=I(l),ce=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];return w?e(V,{className:"d-flex justify-content-center align-items-center",style:{minHeight:"50vh"},children:n("div",{className:"text-center",children:[e(he,{animation:"border",variant:"primary",className:"mb-3"}),e("p",{className:"text-muted",children:"Chargement du calendrier..."})]})}):n(V,{children:[n("div",{className:"d-flex justify-content-between align-items-center mb-4",children:[e("h1",{className:"h3 mb-0",children:"Calendrier des congés"}),n("div",{className:"d-flex gap-2",children:[n(y,{variant:"outline-secondary",onClick:()=>Q(!j),children:[e(fe,{className:"me-1"}),"Filtres"]}),n(y,{as:Y,to:"/conges/nouveau",variant:"primary",children:[e(pe,{className:"me-1"}),"Nouveau congé"]})]})]}),n(q,{title:"Lisez le calendrier des congés",children:[e("p",{children:"Ce calendrier affiche tous les congés validés et les jours fériés. Les couleurs vous aident à identifier rapidement les périodes:"}),n("ul",{className:"mb-0",children:[n("li",{children:[e(L,{bg:"warning",children:"Jaune"})," = En attente manager"]}),n("li",{children:[e(L,{bg:"info",children:"Bleu"})," = Validé manager"]}),n("li",{children:[e(L,{bg:"success",children:"Vert"})," = Validé final"]}),n("li",{children:[e(L,{bg:"danger",children:"Rouge"})," = Refusé"]})]})]}),e(ye,{title:"Lecture efficace du planning",children:"Activez les filtres pour isoler un statut ou un utilisateur, puis naviguez mois par mois pour préparer les périodes sensibles."}),n(q,{title:"Poser un congé depuis le calendrier",children:[e("p",{className:"mb-2",children:"Cliquez une première date puis une seconde pour sélectionner votre période."}),n("ul",{className:"mb-0",children:[e("li",{children:"1er clic: date de début"}),e("li",{children:"2e clic: date de fin"}),e("li",{children:"Le bouton crée une demande préremplie"})]})]}),c&&n(we,{variant:"info",className:"d-flex justify-content-between align-items-center",children:[n("div",{children:["Période sélectionnée: ",e("strong",{children:W(c)}),f?n(ge,{children:[" ","au ",e("strong",{children:W(f)})]}):" (sélectionnez une date de fin)"]}),n("div",{className:"d-flex gap-2",children:[e(y,{variant:"outline-secondary",size:"sm",onClick:()=>{z(null),_(null)},children:"Réinitialiser"}),f&&e(y,{as:Y,to:`/conges/nouveau?date_debut=${H(c)}&date_fin=${H(f)}`,size:"sm",children:"Poser ce congé"})]})]}),j&&e(g,{className:"mb-4",children:e(g.Body,{children:n(G,{children:[e($,{md:4,children:n(v.Group,{children:[e(v.Label,{children:"Statut"}),n(v.Select,{name:"statut",value:M.statut,onChange:A,children:[e("option",{value:"all",children:"Tous les statuts"}),e("option",{value:"en_attente_manager",children:"En attente manager"}),e("option",{value:"valide_manager",children:"Validé manager"}),e("option",{value:"valide_final",children:"Validé final"}),e("option",{value:"refuse_manager",children:"Refusé manager"}),e("option",{value:"refuse_final",children:"Refusé final"})]})]})}),(["admin_entreprise","super_admin"].includes(a.role)||a.role==="manager")&&e($,{md:4,children:n(v.Group,{children:[e(v.Label,{children:"Utilisateur"}),n(v.Select,{name:"utilisateur",value:M.utilisateur,onChange:A,children:[e("option",{value:"all",children:"Tous les utilisateurs"}),e("option",{value:"me",children:"Mes congés uniquement"})]})]})})]})})}),n(g,{className:"mb-4",children:[n(g.Header,{className:"d-flex justify-content-between align-items-center",children:[e(y,{variant:"outline-secondary",onClick:()=>B(-1),children:e(be,{})}),e("h4",{className:"mb-0 text-capitalize",children:re(l)}),e(y,{variant:"outline-secondary",onClick:()=>B(1),children:e(xe,{})})]}),e(g.Body,{className:"p-0",children:n("div",{className:"calendar-grid",children:[ce.map(t=>e("div",{className:"calendar-header",children:t},t)),oe.map((t,r)=>{var d,C,J;const i=ee(t.date),s=ae(t.date),N=((d=o(t.date))==null?void 0:d.getTime())===((C=o(new Date))==null?void 0:C.getTime()),T=se(t.date),R=de(t.date),p=ne(t.date),D=E(t.date);return n("div",{className:`calendar-day ${t.isCurrentMonth?"":"calendar-day-other-month"} ${N?"calendar-day-today":""} ${s?"calendar-day-ferie":""} ${p?"calendar-day-weekend":""} ${D?"calendar-day-clickable":""} ${T?"calendar-day-selected":""} ${R?"calendar-day-selection-edge":""}`,onClick:()=>D&&le(t),style:{cursor:D?"pointer":"default"},children:[e("div",{className:"calendar-day-number","data-weekday":((J=o(t.date))==null?void 0:J.toLocaleDateString("fr-FR",{weekday:"short"}))||"",children:t.dayNumber}),s&&e("div",{className:"calendar-ferie",children:e("small",{className:"text-danger fw-bold",children:s.libelle||s.nom})}),n("div",{className:"calendar-events",children:[i.slice(0,3).map((S,ue)=>e("div",{className:`calendar-event bg-${te(S.statut)}`,title:`${K(S)} - ${O(S)}`,children:e("small",{className:"text-white",children:`${K(S)} - ${O(S)}`})},ue)),i.length>3&&e("div",{className:"calendar-event-more",children:n("small",{children:["+",i.length-3," autres"]})})]})]},r)})]})})]}),e(g,{children:n(g.Body,{children:[e("h6",{className:"mb-3",children:"Légende"}),n(G,{children:[n($,{md:6,children:[n("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-success me-2"}),e("small",{children:"Congé validé final"})]}),n("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-warning me-2"}),e("small",{children:"Congé en attente manager"})]}),n("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-danger me-2"}),e("small",{children:"Congé refusé"})]})]}),n($,{md:6,children:[n("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-info me-2"}),e("small",{children:"Congé validé manager"})]}),n("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color legend-color-holiday me-2"}),e("small",{children:"Jour férié"})]}),n("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color border border-primary me-2"}),e("small",{children:"Aujourd'hui"})]})]})]})]})}),e("style",{children:`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background-color: #d0d7de;
          border: 1px solid #d0d7de;
          border-radius: 16px;
          overflow: hidden;
        }

        .calendar-header {
          background: linear-gradient(180deg, #f8f9fa 0%, #eef2f6 100%);
          padding: 12px 10px;
          text-align: center;
          font-weight: bold;
          color: #495057;
          font-size: 0.9rem;
        }

        .calendar-day {
          background-color: white;
          min-height: 132px;
          padding: 8px;
          position: relative;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }

        .calendar-day-clickable:hover {
          background-color: #f4f9ff;
        }

        .calendar-day-other-month {
          background-color: #f8f9fa;
          color: #6c757d;
        }

        .calendar-day-today {
          background-color: #eef7ff;
        }

        .calendar-day-ferie {
          background-image: linear-gradient(180deg, #fff8e1 0%, #ffffff 42%);
        }

        .calendar-day-weekend {
          background-color: #fbfbfc;
        }

        .calendar-day-selected {
          background-color: #e7f1ff;
          box-shadow: inset 0 0 0 1px #b6d4fe;
        }

        .calendar-day-selection-edge {
          box-shadow: inset 0 0 0 2px #0d6efd;
        }

        .calendar-day-number {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          color: #1f2937;
        }

        .calendar-ferie {
          margin-bottom: 6px;
          padding: 3px 6px;
          border-radius: 999px;
          background-color: #fff3cd;
          display: inline-flex;
          max-width: 100%;
        }

        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .calendar-event {
          padding: 4px 6px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.18);
        }

        .calendar-event-more {
          padding: 3px 6px;
          background-color: #6c757d;
          border-radius: 8px;
          font-size: 10px;
          color: white;
          text-align: center;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 3px;
        }

        .legend-color-holiday {
          background: linear-gradient(180deg, #fff3cd 0%, #ffe69c 100%);
          border: 1px solid #f0ad4e;
        }

        @media (max-width: 991.98px) {
          .calendar-day {
            min-height: 116px;
            padding: 6px;
          }

          .calendar-event {
            font-size: 10px;
            padding: 3px 5px;
          }

          .calendar-ferie {
            font-size: 10px;
          }
        }

        @media (max-width: 767.98px) {
          .calendar-grid {
            display: block;
            border: none;
            background: transparent;
          }

          .calendar-header {
            display: none;
          }

          .calendar-day {
            min-height: auto;
            margin-bottom: 10px;
            border: 1px solid #d0d7de;
            border-radius: 14px;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
          }

          .calendar-day-other-month {
            opacity: 0.88;
          }

          .calendar-day-number::after {
            content: ' · ' attr(data-weekday);
            font-weight: 400;
            color: #6b7280;
          }

          .calendar-events {
            gap: 6px;
          }

          .calendar-event,
          .calendar-event-more {
            white-space: normal;
          }
        }

        .timeline-item {
          position: relative;
          padding-left: 30px;
        }

        .timeline-marker {
          position: absolute;
          left: 0;
          top: 5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .timeline-content {
          padding-bottom: 10px;
        }
      `})]})};export{$e as default};
