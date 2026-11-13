import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function Account() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  });
  const [status, setStatus] = useState(null); // 'saved' | null
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user.role === 'ADMIN';

  function update(name) {
    return (event) => {
      setStatus(null);
      setForm((current) => ({ ...current, [name]: event.target.value }));
    };
  }

  async function handleSave(event) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      await updateProfile(form);
      setStatus('saved');
    } catch (err) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Suppression impossible.');
      setDeleting(false);
    }
  }

  return (
    <section className="container">
      <h1>Mon compte</h1>

      <form onSubmit={handleSave} noValidate>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {status === 'saved' && (
          <p role="status" className="success">
            Profil mis à jour.
          </p>
        )}

        <div className="field">
          <label htmlFor="firstName">Prénom</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={update('firstName')}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nom</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={update('lastName')}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Téléphone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update('phone')}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={user.email} disabled />
          <span className="muted">L’email n’est pas modifiable.</span>
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {!isAdmin && (
        <div className="danger-zone">
          <h2>Supprimer mon compte</h2>
          <p className="muted">
            Cette action est définitive : vos données et vos rendez-vous seront
            supprimés.
          </p>
          {confirming ? (
            <div className="confirm">
              <p>Confirmer la suppression de votre compte ?</p>
              <button
                type="button"
                className="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="danger"
              onClick={() => setConfirming(true)}
            >
              Supprimer mon compte
            </button>
          )}
        </div>
      )}
    </section>
  );
}
