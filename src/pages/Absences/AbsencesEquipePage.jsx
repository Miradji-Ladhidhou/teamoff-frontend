import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Form, InputGroup, Spinner, Alert, Pagination } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { absencesService } from '../../services/api';
import { InfoCardInfo, SuccessCardInfo } from '../../components/InfoCard';
import { useAlert } from '../../hooks/useAlert';
import { FaSearch, FaFilter } from 'react-icons/fa';

const AbsencesEquipePage = () => {
  const { user } = useAuth();
  const alert = useAlert();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    dateDebut: '',
    dateFin: '',
    sortBy: 'date_debut',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadAbsences = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.type) params.type_absence = filters.type;
      if (filters.dateDebut) params.date_debut = filters.dateDebut;
      if (filters.dateFin) params.date_fin = filters.dateFin;
      if (user?.role === 'manager') params.equipe_manager = user.id;
      // Admin voit tout
      Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
      const response = await absencesService.getAll(params);
      setAbsences(response.data);
    } catch (err) {
      alert.error('Erreur lors du chargement des absences');
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.dateDebut, filters.dateFin, user?.id, user?.role]);

  useEffect(() => { loadAbsences(); }, [loadAbsences]);

  const filteredAbsences = useMemo(() => {
    return absences.filter((abs) => {
      const query = (filters.search || '').toLowerCase();
      const matchesSearch = !query
        || (abs.utilisateur?.prenom + ' ' + abs.utilisateur?.nom).toLowerCase().includes(query)
        || (abs.type_absence || '').toLowerCase().includes(query)
        || (abs.commentaire || '').toLowerCase().includes(query);
      const matchesType = !filters.type || abs.type_absence === filters.type;
      return matchesSearch && matchesType;
    });
  }, [absences, filters]);

  const sortedAbsences = useMemo(() => {
    const sorted = [...filteredAbsences];
    const direction = filters.sortOrder === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      if (filters.sortBy === 'date_debut') {
        return (new Date(a.date_debut) - new Date(b.date_debut)) * direction;
      }
      return 0;
    });
    return sorted;
  }, [filteredAbsences, filters.sortBy, filters.sortOrder]);

  const paginatedAbsences = useMemo(() => {
    const startIndex = (currentPage - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    return sortedAbsences.slice(startIndex, endIndex);
  }, [sortedAbsences, currentPage, filters.limit]);

  const totalPages = useMemo(() => {
    const computedPages = Math.ceil(sortedAbsences.length / filters.limit);
    return Math.max(computedPages || 0, 1);
  }, [sortedAbsences.length, filters.limit]);

  const handleFilterChange = (field, value) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  if (!['manager', 'admin_entreprise'].includes(user?.role)) {
    return (
      <Container fluid="sm">
        <div className="alert alert-danger text-center" role="alert">
          Accès non autorisé. Cette page est réservée aux managers et administrateurs.
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="sm">
      <div className="page-header">
        <div>
          <h1 className="h4 mb-1">Absences de l'équipe</h1>
          <p className="text-muted small mb-0">Consultez toutes les absences de votre équipe ou entreprise.</p>
        </div>
      </div>
      <SuccessCardInfo title="Vue équipe">
        <p>Vous visualisez ici toutes les absences déclarées par les membres de votre équipe.</p>
      </SuccessCardInfo>
      <Card className="mb-4">
        <Card.Header>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="d-flex align-items-center"
          >
            <FaFilter className="me-2" />
            Filtres
          </Button>
        </Card.Header>
        {showFilters && (
          <Card.Body>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Type d'absence</Form.Label>
                  <Form.Select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="maladie">Maladie</option>
                    <option value="absence_exceptionnelle">Exceptionnelle</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Recherche</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Rechercher par employé, type ou commentaire..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Date début</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.dateDebut}
                    onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Date fin</Form.Label>
                  <Form.Control
                    type="date"
                    value={filters.dateFin}
                    onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        )}
      </Card>
      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2">Chargement des absences...</p>
            </div>
          ) : paginatedAbsences.length === 0 ? (
            <div className="text-center py-5">
              <FaSearch size={48} className="text-muted mb-3" />
              <h5 className="text-muted">Aucune absence trouvée</h5>
              <p className="text-muted small">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employé</th>
                    <th>Type</th>
                    <th>Période</th>
                    <th>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAbsences.map((abs) => (
                    <tr key={abs.id}>
                      <td>{abs.utilisateur ? `${abs.utilisateur.prenom || ''} ${abs.utilisateur.nom || ''}`.trim() : 'Utilisateur inconnu'}</td>
                      <td>{abs.type_absence === 'maladie' ? 'Maladie' : 'Exceptionnelle'}</td>
                      <td>{abs.date_debut} - {abs.date_fin}</td>
                      <td>{abs.commentaire || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center p-3 border-top">
              <Pagination>
                <Pagination.First disabled={currentPage === 1} onClick={() => setCurrentPage(1)} />
                <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} />
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNumber = Math.max(1, currentPage - 2) + index;
                  if (pageNumber > totalPages) return null;
                  return (
                    <Pagination.Item
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} />
                <Pagination.Last disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AbsencesEquipePage;
