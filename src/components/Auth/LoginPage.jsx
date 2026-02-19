import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
        setSuccess('Account aangemaakt. Controleer je e-mail om te bevestigen, log daarna in.');
        setMode('login');
      }
    } catch (err) {
      const messages = {
        'Invalid login credentials': 'Onbekend e-mailadres of onjuist wachtwoord.',
        'Email not confirmed': 'Bevestig eerst je e-mailadres via de ontvangen mail.',
        'User already registered': 'Dit e-mailadres is al geregistreerd.',
      };
      setError(messages[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="20" cy="26" rx="14" ry="10" fill="currentColor" opacity="0.15" />
              <path d="M20 8 C14 8 8 14 10 22 C12 28 16 32 20 32 C24 32 28 28 30 22 C32 14 26 8 20 8Z" fill="currentColor" opacity="0.3" />
              <path d="M20 6 C17 6 10 10 12 18 C14 24 17 28 20 28" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="15" cy="14" r="1.5" fill="currentColor" />
              <path d="M20 6 L24 2 L22 8" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <h1>VRS Breedenbroek</h1>
          <p>Vogelringregistratie</p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
          >
            Inloggen
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
          >
            Registreren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">E-mailadres</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jouw@email.nl"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Wachtwoord</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Minimaal 6 tekens' : ''}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="login-error" role="alert">{error}</div>}
          {success && <div className="login-success" role="status">{success}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? 'Even wachten...'
              : mode === 'login' ? 'Inloggen' : 'Account aanmaken'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
