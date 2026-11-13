import { useAuth } from '../auth/AuthContext.jsx';

export function Account() {
  const { user } = useAuth();

  return (
    <section className="container">
      <h1>Mon compte</h1>
      <dl className="details">
        <dt>Nom</dt>
        <dd>
          {user.firstName} {user.lastName}
        </dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Téléphone</dt>
        <dd>{user.phone}</dd>
        <dt>Rôle</dt>
        <dd>{user.role === 'ADMIN' ? 'Naturopathe' : 'Patient'}</dd>
      </dl>
      <p className="muted">
        La modification et la suppression du compte arriveront au lot 3.
      </p>
    </section>
  );
}
