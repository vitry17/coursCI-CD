import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        Naturo RDV
      </Link>
      <nav aria-label="Navigation principale">
        {user ? (
          <>
            <Link to="/compte">Mon compte</Link>
            <button type="button" className="link-button" onClick={handleLogout}>
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
    </header>
  );
}
