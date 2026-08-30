import './dashboard.css';
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaChartLine, FaCog, FaBuilding, FaUsers, FaCalendarAlt, FaClock } from 'react-icons/fa';
import * as api from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

const normalizeStatus = (ok) => (ok ? 'healthy' : 'unhealthy');

const formatUptime = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return '-';
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const ROLE_LABELS = { employe: 'Employé', apprenti: 'Apprenti', manager: 'Manager', admin_entreprise: 'Admin', super_admin: 'Super Admin' };
const STATUT_LABELS = { actif: 'Actif', inactif: 'Inactif', en_attente: 'En attente' };
const STATUT_BADGE = { actif: 'approved', inactif: 'info', en_attente: 'pending' };
const CONGE_STATUT_LABELS = {
  reserve: 'Réservé', en_attente_manager: 'En attente', valide_manager: 'Validé manager',
  valide_final: 'Validé', refuse_manager: 'Refusé manager', refuse_final: 'Refusé',
};

const SuperAdminDashboard = () => {
  const alert = useAlert();

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [conges, setConges] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [uptime, setUptime] = useState('-');
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [usersRes, companiesRes, congesRes, healthRes, metricsRes] = await Promise.allSettled([
        api.usersService.getAll(),
        api.entreprisesService.getAll(),
        api.congesService.getAll({ limit: 500 }),
        api.systemService.health(),
        api.metricsService.getMetrics(),
      ]);

      const loadedUsers     = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
      const loadedCompanies = companiesRes.status === 'fulfilled' && Array.isArray(companiesRes.value.data) ? companiesRes.value.data : [];
      const congesData      = congesRes.status === 'fulfilled' ? congesRes.value.data : null;
      const loadedConges    = Array.isArray(congesData?.items) ? congesData.items : (Array.isArray(congesData) ? congesData : []);
      const healthData      = healthRes.status === 'fulfilled' ? healthRes.value.data : null;
      const metricsData     = metricsRes.status === 'fulfilled' ? metricsRes.value.data : null;

      setUsers(loadedUsers);
      setCompanies(loadedCompanies);
      setConges(loadedConges);
      setUptime(formatUptime(metricsData?.uptime));
      setSystemHealth({
        database: normalizeStatus(healthData?.db === 'connected'),
        api:      normalizeStatus(healthData?.status === 'ok'),
      });
    } catch (err) {
      console.error('Erreur dashboard:', err);
      alert.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ── Stats filtrées selon l'entreprise sélectionnée ──
  const filteredUsers  = useMemo(() => selectedCompanyId ? users.filter(u => u.entreprise_id === selectedCompanyId) : users, [users, selectedCompanyId]);
  const filteredConges = useMemo(() => selectedCompanyId ? conges.filter(c => c.entreprise_id === selectedCompanyId) : conges, [conges, selectedCompanyId]);

  const activeCompanies = useMemo(() => companies.filter(c => c.statut === 'active').length, [companies]);
  const pendingLeaves   = useMemo(() => filteredConges.filter(c => String(c.statut || '').startsWith('en_attente')).length, [filteredConges]);

  // Breakdown par entreprise (mode "toutes entreprises")
  const companiesById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const companyBreakdown = useMemo(() => {
    if (selectedCompanyId) return [];
    const map = new Map();
    for (const c of companies) map.set(c.id, { company: c, users: 0, actif: 0, en_attente: 0, leaves: 0, pending: 0 });
    for (const u of users) {
      const row = map.get(u.entreprise_id);
      if (row) { row.users++; if (u.statut === 'actif') row.actif++; if (u.statut === 'en_attente') row.en_attente++; }
    }
    for (const c of conges) {
      const row = map.get(c.entreprise_id);
      if (row) { row.leaves++; if (String(c.statut || '').startsWith('en_attente')) row.pending++; }
    }
    return [...map.values()].sort((a, b) => a.company.nom.localeCompare(b.company.nom));
  }, [companies, users, conges, selectedCompanyId]);

  // Breakdown utilisateurs par rôle (pour l'entreprise sélectionnée)
  const usersByRole = useMemo(() => {
    const map = {};
    for (const u of filteredUsers) { map[u.role] = (map[u.role] || 0) + 1; }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredUsers]);

  // Congés récents de l'entreprise sélectionnée (10 derniers)
  const recentConges = useMemo(() => [...filteredConges].slice(0, 10), [filteredConges]);

  const selectedCompany = selectedCompanyId ? companiesById[selectedCompanyId] : null;

  if (loading) {
    return (
      <Container fluid="sm">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Chargement…</span></div>
          <p className="mt-2">Chargement du dashboard…</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm" className="sa-dashboard">
      {/* En-tête */}
      <div className="page-title-bar">
        <span className="section-title-bar__text">Dashboard</span>
        <div className="d-flex gap-2 align-items-center">
          <Button as={Link} to="/superadmin/metrics" variant="outline-info" size="sm">
            <FaChartLine className="me-1" /><span className="d-none d-sm-inline">Métriques</span>
          </Button>
          <Button as={Link} to="/superadmin/settings" variant="outline-secondary" size="sm">
            <FaCog className="me-1" /><span className="d-none d-sm-inline">Paramètres</span>
          </Button>
        </div>
      </div>

      {/* Selector entreprise */}
      <div className="sa-company-bar mb-4">
        <FaBuilding className="sa-company-bar__icon" />
        <Form.Select
          className="sa-company-bar__select"
          value={selectedCompanyId}
          onChange={e => setSelectedCompanyId(e.target.value)}
        >
          <option value="">Toutes les entreprises</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </Form.Select>
        {selectedCompany && (
          <span className={`badge ${selectedCompany.statut === 'active' ? 'approved' : 'info'} sa-company-bar__badge`}>
            {selectedCompany.statut === 'active' ? 'Active' : selectedCompany.statut}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="stats-grid mb-4">
        <div className="stat-card blue">
          <div className="stat-value">{filteredUsers.length}</div>
          <div className="stat-label">Utilisateurs</div>
          <div className="stat-sub">{selectedCompanyId ? selectedCompany?.nom : `${activeCompanies} entreprises actives`}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{selectedCompanyId ? filteredUsers.filter(u => u.statut === 'actif').length : activeCompanies}</div>
          <div className="stat-label">{selectedCompanyId ? 'Actifs' : 'Entreprises actives'}</div>
          <div className="stat-sub">{selectedCompanyId ? `${filteredUsers.filter(u => u.statut === 'en_attente').length} en attente` : `${companies.length} total`}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{filteredConges.length}</div>
          <div className="stat-label">Congés</div>
          <div className="stat-sub">{pendingLeaves} en attente</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-value">{uptime}</div>
          <div className="stat-label">Uptime</div>
          <div className="stat-sub">
            <span className={`dot-status ${systemHealth.database === 'healthy' ? 'green' : 'red'}`} /> DB &nbsp;
            <span className={`dot-status ${systemHealth.api === 'healthy' ? 'green' : 'red'}`} /> API
          </div>
        </div>
      </div>

      {/* Vue "toutes entreprises" : breakdown */}
      {!selectedCompanyId && companyBreakdown.length > 0 && (
        <Card className="mb-4">
          <Card.Header><h5 className="mb-0 card-section-title"><FaBuilding className="me-2" />Entreprises</h5></Card.Header>
          <Card.Body className="p-0">
            {/* Mobile */}
            <div className="d-md-none">
              {companyBreakdown.map(({ company, users: uCount, actif, en_attente: enAtt, leaves, pending }) => (
                <div key={company.id} className="sa-breakdown-mobile-row">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-semibold">{company.nom}</div>
                      <small className="text-muted">{uCount} utilisateur{uCount > 1 ? 's' : ''} · {actif} actif{actif > 1 ? 's' : ''}</small>
                    </div>
                    <span className={`badge ${company.statut === 'active' ? 'approved' : 'info'}`}>{company.statut === 'active' ? 'Active' : company.statut}</span>
                  </div>
                  <div className="d-flex gap-2 mt-1 flex-wrap">
                    <span className="badge info">{leaves} congés</span>
                    {pending > 0 && <span className="badge pending">{pending} en attente</span>}
                    {enAtt > 0 && <span className="badge pending">{enAtt} utilisateur(s) en attente</span>}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="d-none d-md-block table-responsive">
              <Table hover className="mb-0">
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Statut</th>
                    <th>Utilisateurs</th>
                    <th>Actifs</th>
                    <th>En attente</th>
                    <th>Congés</th>
                    <th>Congés en attente</th>
                  </tr>
                </thead>
                <tbody>
                  {companyBreakdown.map(({ company, users: uCount, actif, en_attente: enAtt, leaves, pending }) => (
                    <tr key={company.id} className="cursor-pointer" onClick={() => setSelectedCompanyId(company.id)} style={{ cursor: 'pointer' }}>
                      <td><strong>{company.nom}</strong></td>
                      <td><span className={`badge ${company.statut === 'active' ? 'approved' : 'info'}`}>{company.statut === 'active' ? 'Active' : company.statut}</span></td>
                      <td>{uCount}</td>
                      <td>{actif}</td>
                      <td>{enAtt > 0 ? <span className="badge pending">{enAtt}</span> : <span className="text-muted">—</span>}</td>
                      <td>{leaves}</td>
                      <td>{pending > 0 ? <span className="badge pending">{pending}</span> : <span className="text-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Vue entreprise sélectionnée */}
      {selectedCompanyId && (
        <Row>
          {/* Répartition par rôle */}
          <Col xs={12} md={4} className="mb-4">
            <Card className="h-100">
              <Card.Header><h5 className="mb-0 card-section-title"><FaUsers className="me-2" />Répartition des rôles</h5></Card.Header>
              <Card.Body>
                {usersByRole.length === 0 ? (
                  <p className="text-muted mb-0">Aucun utilisateur</p>
                ) : (
                  <div className="sa-role-list">
                    {usersByRole.map(([role, count]) => (
                      <div key={role} className="sa-role-row">
                        <span className="sa-role-label">{ROLE_LABELS[role] || role}</span>
                        <span className="badge info">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Répartition par statut */}
          <Col xs={12} md={4} className="mb-4">
            <Card className="h-100">
              <Card.Header><h5 className="mb-0 card-section-title">Statuts utilisateurs</h5></Card.Header>
              <Card.Body>
                <div className="sa-role-list">
                  {['actif', 'inactif', 'en_attente'].map(st => {
                    const count = filteredUsers.filter(u => u.statut === st).length;
                    return count > 0 ? (
                      <div key={st} className="sa-role-row">
                        <span className="sa-role-label">{STATUT_LABELS[st]}</span>
                        <span className={`badge ${STATUT_BADGE[st]}`}>{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Congés par statut */}
          <Col xs={12} md={4} className="mb-4">
            <Card className="h-100">
              <Card.Header><h5 className="mb-0 card-section-title"><FaCalendarAlt className="me-2" />Congés par statut</h5></Card.Header>
              <Card.Body>
                {filteredConges.length === 0 ? (
                  <p className="text-muted mb-0">Aucun congé</p>
                ) : (
                  <div className="sa-role-list">
                    {Object.entries(
                      filteredConges.reduce((acc, c) => { acc[c.statut] = (acc[c.statut] || 0) + 1; return acc; }, {})
                    ).sort((a, b) => b[1] - a[1]).map(([st, count]) => (
                      <div key={st} className="sa-role-row">
                        <span className="sa-role-label">{CONGE_STATUT_LABELS[st] || st}</span>
                        <span className="badge info">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Congés récents */}
          <Col xs={12} className="mb-4">
            <Card>
              <Card.Header><h5 className="mb-0 card-section-title"><FaCalendarAlt className="me-2" />Derniers congés</h5></Card.Header>
              <Card.Body className="p-0">
                {recentConges.length === 0 ? (
                  <p className="text-muted m-3 mb-0">Aucun congé pour cette entreprise.</p>
                ) : (
                  <>
                    <div className="d-md-none">
                      {recentConges.map(c => (
                        <div key={c.id} className="sa-breakdown-mobile-row">
                          <div className="d-flex justify-content-between">
                            <span className="fw-semibold">{c.utilisateur ? `${c.utilisateur.prenom} ${c.utilisateur.nom}` : '—'}</span>
                            <span className={`badge ${c.statut?.startsWith('valide') ? 'approved' : c.statut?.startsWith('refuse') ? 'refused' : 'pending'}`}>{CONGE_STATUT_LABELS[c.statut] || c.statut}</span>
                          </div>
                          <small className="text-muted">{c.conge_type?.libelle || '—'} · {c.date_debut} → {c.date_fin}</small>
                        </div>
                      ))}
                    </div>
                    <div className="d-none d-md-block table-responsive">
                      <Table hover className="mb-0">
                        <thead><tr><th>Salarié</th><th>Type</th><th>Début</th><th>Fin</th><th>Jours</th><th>Statut</th></tr></thead>
                        <tbody>
                          {recentConges.map(c => (
                            <tr key={c.id}>
                              <td>{c.utilisateur ? `${c.utilisateur.prenom} ${c.utilisateur.nom}` : '—'}</td>
                              <td><small className="text-muted">{c.conge_type?.libelle || '—'}</small></td>
                              <td><small>{c.date_debut}</small></td>
                              <td><small>{c.date_fin}</small></td>
                              <td><span className="badge info">{c.jours_calcules ?? '—'}</span></td>
                              <td>
                                <span className={`badge ${c.statut?.startsWith('valide') ? 'approved' : c.statut?.startsWith('refuse') ? 'refused' : 'pending'}`}>
                                  {CONGE_STATUT_LABELS[c.statut] || c.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Santé système (toujours visible) */}
      <Card className="mb-4">
        <Card.Header><h5 className="mb-0 card-section-title"><FaClock className="me-2" />État du système</h5></Card.Header>
        <Card.Body>
          <div className="sa-health-grid">
            <div className="sa-health-item">
              <span>Base de données</span>
              <span className={`badge ${systemHealth.database === 'healthy' ? 'approved' : 'refused'}`}>
                {systemHealth.database === 'healthy' ? '✓ OK' : '✗ KO'}
              </span>
            </div>
            <div className="sa-health-item">
              <span>API REST</span>
              <span className={`badge ${systemHealth.api === 'healthy' ? 'approved' : 'refused'}`}>
                {systemHealth.api === 'healthy' ? '✓ OK' : '✗ KO'}
              </span>
            </div>
            <div className="sa-health-item">
              <span>Uptime</span>
              <span className="badge info">{uptime}</span>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3 flex-wrap">
            <Button as={Link} to="/superadmin/settings?tab=system" variant="outline-primary" size="sm">État système détaillé</Button>
            <Button as={Link} to="/superadmin/metrics" variant="outline-info" size="sm">Métriques</Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SuperAdminDashboard;
