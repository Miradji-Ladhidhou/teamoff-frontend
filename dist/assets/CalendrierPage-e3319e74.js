import{u as I,r as i,ak as S,j as e,C as M,b as a,S as U,B as p,a3 as W,L as K,i as Q,o as b,al as X,am as Z}from"./index-1fd84ea3.js";import{I as ee,T as ae}from"./InfoCard-626d5f01.js";import{A as re}from"./Alert-f0fd0f9a.js";import{C as d}from"./Card-b771f32c.js";import{R as k,C as f}from"./Row-d839547c.js";import{F as c}from"./Form-b893eefe.js";import"./ElementChildren-4a4cab65.js";const ce=()=>{const{user:u}=I(),[m,j]=i.useState(new Date),[L,_]=i.useState([]),[B,R]=i.useState([]),[z,y]=i.useState(!0),[x,A]=i.useState(""),[N,E]=i.useState(!1),[g,J]=i.useState({statut:"all",utilisateur:"all"});i.useEffect(()=>{$()},[m,g]);const $=async()=>{try{y(!0);const r=m.getFullYear(),n=m.getMonth()+1,t=await S.getCongesByMonth(r,n,g);_(t.data);const s=await S.getJoursFeriesByMonth(r,n);R(s.data)}catch(r){console.error("Erreur lors du chargement du calendrier:",r),A("Erreur lors du chargement du calendrier")}finally{y(!1)}},C=r=>{j(n=>{const t=new Date(n);return t.setMonth(t.getMonth()+r),t})},T=r=>{const n=r.getFullYear(),t=r.getMonth(),s=new Date(n,t,1),o=new Date(n,t+1,0).getDate(),v=s.getDay(),h=[];for(let l=0;l<v;l++){const F=new Date(n,t,-l);h.unshift({date:F,isCurrentMonth:!1,dayNumber:F.getDate()})}for(let l=1;l<=o;l++)h.push({date:new Date(n,t,l),isCurrentMonth:!0,dayNumber:l});const q=42-h.length;for(let l=1;l<=q;l++)h.push({date:new Date(n,t+1,l),isCurrentMonth:!1,dayNumber:l});return h},Y=r=>L.filter(n=>{const t=new Date(n.date_debut),s=new Date(n.date_fin);return r>=t&&r<=s}),G=r=>B.find(n=>new Date(n.date).toDateString()===r.toDateString()),H=r=>({en_attente:"warning",approuve:"success",refuse:"danger",annule:"secondary"})[r]||"secondary",O=r=>r.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),D=r=>{const{name:n,value:t}=r.target;J(s=>({...s,[n]:t}))},P=T(m),V=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];return z?e(M,{className:"d-flex justify-content-center align-items-center",style:{minHeight:"50vh"},children:a("div",{className:"text-center",children:[e(U,{animation:"border",variant:"primary",className:"mb-3"}),e("p",{className:"text-muted",children:"Chargement du calendrier..."})]})}):a(M,{children:[a("div",{className:"d-flex justify-content-between align-items-center mb-4",children:[e("h1",{className:"h3 mb-0",children:"Calendrier des congés"}),a("div",{className:"d-flex gap-2",children:[a(p,{variant:"outline-secondary",onClick:()=>E(!N),children:[e(W,{className:"me-1"}),"Filtres"]}),a(p,{as:K,to:"/conges/nouveau",variant:"primary",children:[e(Q,{className:"me-1"}),"Nouveau congé"]})]})]}),a(ee,{title:"Lisez le calendrier des congés",children:[e("p",{children:"Ce calendrier affiche tous les congés validés et les jours fériés. Les couleurs vous aident à identifier rapidement les périodes:"}),a("ul",{className:"mb-0",children:[a("li",{children:[e(b,{bg:"success",children:"Vert"})," = Congé validé"]}),a("li",{children:[e(b,{bg:"warning",children:"Orange"})," = Jour férié"]}),a("li",{children:[e(b,{bg:"danger",children:"Rouge"})," = Congé refusé"]})]})]}),e(ae,{title:"Lecture efficace du planning",children:"Activez les filtres pour isoler un statut ou un utilisateur, puis naviguez mois par mois pour préparer les périodes sensibles."}),x&&e(re,{variant:"danger",className:"mb-4",children:x}),N&&e(d,{className:"mb-4",children:e(d.Body,{children:a(k,{children:[e(f,{md:4,children:a(c.Group,{children:[e(c.Label,{children:"Statut"}),a(c.Select,{name:"statut",value:g.statut,onChange:D,children:[e("option",{value:"all",children:"Tous les statuts"}),e("option",{value:"en_attente",children:"En attente"}),e("option",{value:"approuve",children:"Approuvé"}),e("option",{value:"refuse",children:"Refusé"}),e("option",{value:"annule",children:"Annulé"})]})]})}),(["admin_entreprise","super_admin"].includes(u.role)||u.role==="manager")&&e(f,{md:4,children:a(c.Group,{children:[e(c.Label,{children:"Utilisateur"}),a(c.Select,{name:"utilisateur",value:g.utilisateur,onChange:D,children:[e("option",{value:"all",children:"Tous les utilisateurs"}),e("option",{value:"me",children:"Mes congés uniquement"})]})]})})]})})}),a(d,{className:"mb-4",children:[a(d.Header,{className:"d-flex justify-content-between align-items-center",children:[e(p,{variant:"outline-secondary",onClick:()=>C(-1),children:e(X,{})}),e("h4",{className:"mb-0 text-capitalize",children:O(m)}),e(p,{variant:"outline-secondary",onClick:()=>C(1),children:e(Z,{})})]}),e(d.Body,{className:"p-0",children:a("div",{className:"calendar-grid",children:[V.map(r=>e("div",{className:"calendar-header",children:r},r)),P.map((r,n)=>{const t=Y(r.date),s=G(r.date),w=r.date.toDateString()===new Date().toDateString();return a("div",{className:`calendar-day ${r.isCurrentMonth?"":"calendar-day-other-month"} ${w?"calendar-day-today":""} ${s?"calendar-day-ferie":""}`,children:[e("div",{className:"calendar-day-number",children:r.dayNumber}),s&&e("div",{className:"calendar-ferie",children:e("small",{className:"text-danger fw-bold",children:s.nom})}),a("div",{className:"calendar-events",children:[t.slice(0,3).map((o,v)=>e("div",{className:`calendar-event bg-${H(o.statut)}`,title:`${o.utilisateur_nom} - ${o.conge_type}`,children:e("small",{className:"text-white",children:["admin_entreprise","super_admin"].includes(u.role)||u.role==="manager"||o.utilisateur_id===u.id?o.utilisateur_nom:"Congé"})},v)),t.length>3&&e("div",{className:"calendar-event-more",children:a("small",{children:["+",t.length-3," autres"]})})]})]},n)})]})})]}),e(d,{children:a(d.Body,{children:[e("h6",{className:"mb-3",children:"Légende"}),a(k,{children:[a(f,{md:6,children:[a("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-success me-2"}),e("small",{children:"Congé approuvé"})]}),a("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-warning me-2"}),e("small",{children:"Congé en attente"})]}),a("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-danger me-2"}),e("small",{children:"Congé refusé"})]})]}),a(f,{md:6,children:[a("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-secondary me-2"}),e("small",{children:"Congé annulé"})]}),a("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color bg-light border me-2"}),e("small",{children:"Jour férié"})]}),a("div",{className:"d-flex align-items-center mb-2",children:[e("div",{className:"legend-color border border-primary me-2"}),e("small",{children:"Aujourd'hui"})]})]})]})]})}),e("style",{jsx:!0,children:`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background-color: #dee2e6;
        }

        .calendar-header {
          background-color: #f8f9fa;
          padding: 10px;
          text-align: center;
          font-weight: bold;
          color: #495057;
        }

        .calendar-day {
          background-color: white;
          min-height: 120px;
          padding: 5px;
          position: relative;
        }

        .calendar-day-other-month {
          background-color: #f8f9fa;
          color: #6c757d;
        }

        .calendar-day-today {
          background-color: #e3f2fd;
        }

        .calendar-day-ferie {
          background-color: #fff3cd;
        }

        .calendar-day-number {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .calendar-ferie {
          margin-bottom: 5px;
        }

        .calendar-events {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .calendar-event {
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 11px;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .calendar-event-more {
          padding: 2px 4px;
          background-color: #6c757d;
          border-radius: 3px;
          font-size: 10px;
          color: white;
          text-align: center;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 3px;
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
      `})]})};export{ce as default};
