import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setError(null);
    setSubmitting(true);
    try {
      await logout();
      navigate('/');
    } catch {
      setError('Déconnexion impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">Naturo RDV</Link>
      <nav aria-label="Navigation principale">
        {user ? (
          <>
            <Link to="/reserver">Réserver</Link>
            <Link to="/mes-rendez-vous">Mes rendez-vous</Link>
            <Link to="/compte">Mon compte</Link>
            <button type="button" className="link-button" onClick={handleLogout} disabled={submitting}>
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        )}
      </nav>
      {error && <p role="alert" className="error">{error}</p>}
    </header>
  );
}
