import React from 'react';
import { Container, Button } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const errorId = Date.now().toString(36);
    this.setState({ errorId });
    console.error(`[ErrorBoundary #${errorId}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Container className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center py-5">
        <h1 className="fs-2 fw-bold mb-2">Une erreur inattendue est survenue</h1>
        <p className="text-muted mb-4">
          Rechargez la page. Si le problème persiste, contactez le support.
          {this.state.errorId && (
            <span className="d-block mt-1" style={{ fontSize: '0.75rem' }}>
              Référence&nbsp;: <code>{this.state.errorId}</code>
            </span>
          )}
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </Container>
    );
  }
}

export default ErrorBoundary;
