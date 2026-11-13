import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const INITIAL = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
};

const FIELDS = [
  { name: 'firstName', label: 'Prénom', type: 'text', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Nom', type: 'text', autoComplete: 'family-name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Téléphone', type: 'tel', autoComplete: 'tel' },
  {
    name: 'password',
    label: 'Mot de passe (8 caractères min., une lettre et un chiffre)',
    type: 'password',
    autoComplete: 'new-password',
  },
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function update(name) {
    return (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form);
      navigate('/compte');
    } catch (err) {
      if (Array.isArray(err.details)) {
        const map = {};
        for (const detail of err.details) map[detail.field] = detail.message;
        setFieldErrors(map);
      }
      setError(err.message || 'Inscription impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container">
      <h1>Créer un compte</h1>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {FIELDS.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              value={form[field.name]}
              onChange={update(field.name)}
              aria-invalid={fieldErrors[field.name] ? 'true' : undefined}
              required
            />
            {fieldErrors[field.name] && (
              <span className="field-error">{fieldErrors[field.name]}</span>
            )}
          </div>
        ))}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : "S'inscrire"}
        </button>
      </form>
      <p>
        Déjà inscrit·e ? <Link to="/login">Se connecter</Link>
      </p>
    </section>
  );
}
