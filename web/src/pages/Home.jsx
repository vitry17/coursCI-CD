import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function Home() {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState('…');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status ?? 'inconnu'))
      .catch(() => setApiStatus('injoignable'));
  }, []);

  return (
    <section className="container">
      <h1>Naturopathie — prise de rendez-vous</h1>
      <p>
        Réservez votre consultation du mercredi en quelques clics, et gérez vos
        rendez-vous en ligne.
      </p>

      {user ? (
        <p>
          Bonjour {user.firstName} !{' '}
          <Link to="/compte">Accéder à mon compte</Link>
        </p>
      ) : (
        <p>
          <Link to="/register">Créer un compte</Link> ou{' '}
          <Link to="/login">se connecter</Link> pour réserver.
        </p>
      )}

      <p className="muted">API&nbsp;: {apiStatus}</p>
    </section>
  );
}
