import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { api } from './api/client.js';
import App from './App.jsx';

vi.mock('./api/client.js', () => ({
  api: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

const user = { id: 'test', firstName: 'Léa', lastName: 'Martin', email: 'lea@example.com', phone: '0612345678', role: 'PATIENT' };

function renderApp(path = '/compte') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  api.me.mockRejectedValue({ status: 401 });
});
afterEach(cleanup);

describe('Parcours authentification', () => {
  it('redirige une route protégée et permet de se connecter puis se déconnecter', async () => {
    api.login.mockResolvedValue({ user });
    api.logout.mockResolvedValue(null);
    renderApp();
    await screen.findByRole('heading', { name: 'Connexion' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'motdepasse1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await screen.findByRole('heading', { name: 'Mon compte' });
    expect(api.login).toHaveBeenCalledWith({ email: user.email, password: 'motdepasse1' });
    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Déconnexion' })).toBeNull());
    expect(api.logout).toHaveBeenCalledOnce();
  });

  it('restaure la session et affiche une erreur si la déconnexion réseau échoue', async () => {
    api.me.mockResolvedValue({ user });
    api.logout.mockRejectedValue(new Error('network'));
    renderApp();
    await screen.findByRole('heading', { name: 'Mon compte' });
    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Déconnexion impossible');
    expect(screen.getByRole('heading', { name: 'Mon compte' })).toBeTruthy();
  });

  it('affiche les erreurs de validation de l’inscription sans ouvrir le compte', async () => {
    api.register.mockRejectedValue({
      message: 'Données invalides.',
      details: [{ field: 'password', message: 'Mot de passe trop faible.' }],
    });
    renderApp('/register');
    fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }));
    await screen.findByText('Mot de passe trop faible.');
    expect(screen.queryByRole('heading', { name: 'Mon compte' })).toBeNull();
    expect(screen.getByLabelText(/Mot de passe/).getAttribute('aria-invalid')).toBe('true');
  });
});
