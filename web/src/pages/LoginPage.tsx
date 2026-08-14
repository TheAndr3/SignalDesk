import { useState, FC, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

const SEED_USERS = [
  {
    email: 'alice@acme.com',
    name: 'Alice Smith',
    role: 'Agent',
    workspace: 'Acme Corp',
  },
  {
    email: 'bob@acme.com',
    name: 'Bob Jones',
    role: 'Agent',
    workspace: 'Acme Corp',
  },
  {
    email: 'carol@acme.com',
    name: 'Carol Manager',
    role: 'Manager',
    workspace: 'Acme Corp',
  },
  {
    email: 'david@stark.com',
    name: 'David Miller',
    role: 'Agent',
    workspace: 'Stark Industries',
  },
  {
    email: 'eva@stark.com',
    name: 'Eva Green',
    role: 'Agent',
    workspace: 'Stark Industries',
  },
  {
    email: 'frank@stark.com',
    name: 'Frank Manager',
    role: 'Manager',
    workspace: 'Stark Industries',
  },
];

export const LoginPage: FC = () => {
  const [email, setEmail] = useState('alice@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuickSelect = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setPassword('Password123!');
    setErrorMessage(null);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon-wrapper">
            <Shield className="logo-icon" size={28} />
          </div>
          <h1 className="login-title">SignalDesk</h1>
          <p className="login-subtitle">Multi-Tenant Operational Case Queue</p>
        </div>

        {/* Demo User Switcher */}
        <div className="demo-user-selector">
          <label className="demo-selector-label">
            <UserCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Quick Demo User Select
          </label>
          <select
            className="demo-select-dropdown"
            value={email}
            onChange={(e) => handleQuickSelect(e.target.value)}
          >
            {SEED_USERS.map((u) => (
              <option key={u.email} value={u.email}>
                {u.name} ({u.workspace} — {u.role})
              </option>
            ))}
          </select>
        </div>

        {errorMessage && (
          <div className="login-error-banner">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="name@company.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="login-submit-button"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Seeded accounts use password: <code>Password123!</code></p>
        </div>
      </div>
    </div>
  );
};
