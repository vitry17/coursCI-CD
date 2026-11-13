import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function Appointments() {
  const [scope, setScope] = useState('upcoming');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);

  const load = useCallback(async (which) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.myAppointments(which);
      setItems(data.appointments);
    } catch (err) {
      setError(err.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(scope);
  }, [scope, load]);

  async function handleCancel(id) {
    setError(null);
    setPending(id);
    try {
      await api.cancelAppointment(id);
      await load(scope);
    } catch (err) {
      setError(err.message || 'Annulation impossible.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="container">
      <h1>Mes rendez-vous</h1>

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'upcoming'}
          className={scope === 'upcoming' ? 'tab active' : 'tab'}
          onClick={() => setScope('upcoming')}
        >
          À venir
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'past'}
          className={scope === 'past' ? 'tab active' : 'tab'}
          onClick={() => setScope('past')}
        >
          Passés
        </button>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : items.length === 0 ? (
        <p>Aucun rendez-vous {scope === 'upcoming' ? 'à venir' : 'passé'}.</p>
      ) : (
        <ul className="appointment-list">
          {items.map((appointment) => (
            <li key={appointment.id} className="appointment">
              <div>
                <strong>{dateTimeFormat.format(new Date(appointment.startAt))}</strong>
                {appointment.status === 'CANCELLED' && (
                  <span className="muted"> — annulé</span>
                )}
                {appointment.reason && <div className="muted">{appointment.reason}</div>}
              </div>
              {scope === 'upcoming' && appointment.status === 'BOOKED' && (
                <button
                  type="button"
                  className="link-button"
                  disabled={pending === appointment.id}
                  onClick={() => handleCancel(appointment.id)}
                >
                  Annuler
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
