'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');

  // Recupera a cor primária de forma assíncrona/segura
  useEffect(() => {
    async function loadColors() {
      try {
        const res = await fetch('/ai_config.json');
        const config = await res.json();
        if (config?.primary_color) {
          setPrimaryColor(config.primary_color);
        }
      } catch (err) {
        // Fallback para indigo
      }
    }
    loadColors();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) {
        setError(signInError.message || 'Credenciais inválidas.');
      } else {
        router.push('/admin/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-150 p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-2" style={{ color: primaryColor, backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}20` }}>
            <Lock className="size-5" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Área Administrativa
          </h2>
          <p className="text-xs text-gray-500">
            Acesse o painel do seu PWA de agendamento.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail className="size-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                className="w-full pl-9 pr-4 py-2 border border-gray-250 rounded-2xl text-sm bg-gray-50 text-gray-800 placeholder-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor } as any}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock className="size-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 border border-gray-250 rounded-2xl text-sm bg-gray-50 text-gray-800 placeholder-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                style={{ '--tw-ring-color': `${primaryColor}30`, focusBorderColor: primaryColor } as any}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm text-white font-bold rounded-2xl shadow-md transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Entrar no Painel'
            )}
          </button>
        </form>

        {/* Footer link */}
        <div className="text-center pt-2">
          <a href="/" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
            ← Voltar para a loja
          </a>
        </div>

      </div>
    </div>
  );
}
