import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { Errors } from './errors.js';

const email = z.string().trim().toLowerCase().max(255).email('Email invalide.');
const password = z.string().min(1, 'Mot de passe requis.').refine(
  (value) => Buffer.byteLength(value, 'utf8') <= 72,
  'Le mot de passe ne doit pas dépasser 72 octets UTF-8.'
);
const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis.').max(100),
  lastName: z.string().trim().min(1, 'Nom requis.').max(100),
  email,
  phone: z.string().trim().regex(/^[0-9+().\s-]{6,20}$/, 'Téléphone invalide.'),
  password: password.refine(
    (value) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value),
    '8 caractères minimum, avec au moins une lettre et un chiffre.'
  ),
});
const loginSchema = z.object({ email, password });

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw Errors.validation(result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })));
  }
  return result.data;
}

export const validateRegister = (body) => validate(registerSchema, body);
export const validateLogin = (body) => validate(loginSchema, body);
