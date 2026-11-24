import React, { useEffect, useId, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../logo.png';

function LoginPage() {
  const uid = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const { user, loading, login, loginDev } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = location.state?.from || '/admin';

  useEffect(() => {
    document.title = 'Entrar no painel · Marcianos';
  }, []);

  if (!loading && user) return <Navigate to={target} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Digite o e-mail e a senha do painel.');
      return;
    }
    setSending(true);
    setError('');
    const message = await login(email.trim(), password);
    setSending(false);
    if (message) {
      setError(message);
      return;
    }
    navigate(target, { replace: true });
  };

  return (
    <div className="panel-root grid min-h-dvh place-items-center px-4 py-10">
      <main className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3">
          <img src={logo} alt="" width="48" height="48" className="size-12 rounded-2xl object-cover" />
          <div>
            <p className="font-display text-[15px] font-bold uppercase tracking-[0.06em]">Marcianos</p>
            <p className="text-sm text-panel-ink-soft">Painel de reservas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="rounded-[24px] border border-panel-line bg-panel-sheet p-6">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">Entrar no painel</h1>
          <p className="mt-1 text-[15px] text-panel-ink-soft">Entre com o e-mail e a senha do dono do Marcianos.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor={`${uid}-email`} className="mb-1.5 block text-sm font-semibold">
                E-mail
              </label>
              <input
                id={`${uid}-email`}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="panel-field"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${uid}-error` : undefined}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-password`} className="mb-1.5 block text-sm font-semibold">
                Senha
              </label>
              <input
                id={`${uid}-password`}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="panel-field"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${uid}-error` : undefined}
              />
            </div>
          </div>

          {error && (
            <p id={`${uid}-error`} role="alert" className="mt-4 rounded-xl bg-st-naoveio-bg px-3 py-2 text-sm font-medium text-st-naoveio-ink">
              {error}
            </p>
          )}

          <button type="submit" disabled={sending} className="panel-btn panel-btn-primary mt-6 h-12 w-full text-[15px]">
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {sending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-4 rounded-2xl border border-dashed border-panel-line-strong p-4 text-sm text-panel-ink-soft">
            <p>
              <strong className="text-panel-ink">Só no computador de desenvolvimento:</strong> entre sem senha para testar o painel. Este botão não
              existe no site publicado.
            </p>
            <button
              type="button"
              onClick={() => {
                loginDev();
                navigate(target, { replace: true });
              }}
              className="panel-btn panel-btn-ghost mt-3"
            >
              Entrar em modo de desenvolvimento
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default LoginPage;
