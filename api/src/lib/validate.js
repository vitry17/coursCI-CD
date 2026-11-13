// Validation des entrées sans dépendance (règles de SPEC.md).
import { Errors } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+().\s-]{6,20}$/;

const str = (value) => (typeof value === 'string' ? value.trim() : '');

export function validateRegister(body) {
  const details = [];
  const firstName = str(body?.firstName);
  const lastName = str(body?.lastName);
  const email = str(body?.email).toLowerCase();
  const phone = str(body?.phone);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!firstName || firstName.length > 100)
    details.push({ field: 'firstName', message: 'Prénom requis (100 caractères max).' });
  if (!lastName || lastName.length > 100)
    details.push({ field: 'lastName', message: 'Nom requis (100 caractères max).' });
  if (!EMAIL_RE.test(email) || email.length > 255)
    details.push({ field: 'email', message: 'Email invalide.' });
  if (!PHONE_RE.test(phone))
    details.push({ field: 'phone', message: 'Téléphone invalide.' });
  // R10 : 8 caractères minimum, au moins une lettre et un chiffre.
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    details.push({
      field: 'password',
      message: '8 caractères minimum, avec au moins une lettre et un chiffre.',
    });

  if (details.length) throw Errors.validation(details);
  return { firstName, lastName, email, phone, password };
}

export function validateLogin(body) {
  const details = [];
  const email = str(body?.email).toLowerCase();
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email) details.push({ field: 'email', message: 'Email requis.' });
  if (!password) details.push({ field: 'password', message: 'Mot de passe requis.' });
  if (details.length) throw Errors.validation(details);
  return { email, password };
}
