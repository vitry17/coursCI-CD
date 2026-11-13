import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDay(dateStr) {
  return dayFormat.format(new Date(`${dateStr}T12:00:00.000Z`));
}

export function Booking() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.slots();
      setDays(data.days);
    } catch (err) {
      setError(err.message || 'Chargement des créneaux impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBook(startAt) {
    setError(null);
    setMessage(null);
    setPending(startAt);
    try {
      await api.book({ startAt, reason: reason.trim() || undefined });
      setMessage('Rendez-vous réservé. Retrouvez-le dans « Mes rendez-vous ».');
      setReason('');
      await load();
    } catch (err) {
      setError(err.message || 'Réservation impossible.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="container">
      <h1>Réserver un rendez-vous</h1>
      <p className="muted">Consultations le mercredi, créneaux d’une heure.</p>

      <div className="field">
        <label htmlFor="reason">Motif (facultatif)</label>
        <input
          id="reason"
          type="text"
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex. fatigue, suivi…"
        />
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}

      {loading ? (
        <p>Chargement des créneaux…</p>
      ) : days.length === 0 ? (
        <p>Aucun créneau disponible pour le moment.</p>
      ) : (
        <ul className="day-list">
          {days.map((day) => (
            <li key={day.date} className="day">
              <h2>{formatDay(day.date)}</h2>
              {day.closed ? (
                <p className="muted">Fermé{day.reason ? ` — ${day.reason}` : ''}.</p>
              ) : (
                <div className="slot-grid">
                  {day.slots.map((slot) => (
                    <button
                      key={slot.startAt}
                      type="button"
                      className="slot"
                      disabled={!slot.available || pending === slot.startAt}
                      onClick={() => handleBook(slot.startAt)}
                    >
                      {timeFormat.format(new Date(slot.startAt))}
                      {!slot.available && <span className="slot-taken"> (pris)</span>}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
