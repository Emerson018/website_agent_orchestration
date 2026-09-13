import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      login(email, password);
      navigate('/admin');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh] bg-[#12100E] px-4 py-12 relative overflow-hidden">
      {/* Warm Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#C85A17]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-[#1A1613] p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/80 border border-[#2D241D] relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241D18] border border-[#3E3228] text-xs font-semibold uppercase tracking-wider text-[#E5A93C] mb-3 font-serif-brand">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C85A17] animate-pulse" />
            Campeiro Fogão
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif-brand text-[#FAF7F2]">Acesso Administrativo</h2>
          <p className="mt-2 text-xs text-[#A89F96]">Credenciais de gestão de reservas e salão</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#D4A373] mb-1.5">E-mail Corporativo</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1F1915] border border-[#342921] text-[#FAF7F2] placeholder-[#6E6359] text-sm focus:outline-none focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17] transition-all"
              placeholder="admin@campeirofogao.com.br"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#D4A373] mb-1.5">Senha de Acesso</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#1F1915] border border-[#342921] text-[#FAF7F2] placeholder-[#6E6359] text-sm focus:outline-none focus:border-[#C85A17] focus:ring-1 focus:ring-[#C85A17] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3.5 text-[#FAF7F2] bg-gradient-to-r from-[#C85A17] via-[#D9651E] to-[#B34509] rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#C85A17]/25 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer border border-[#E5A93C]/40 mt-2"
          >
            Acessar Painel
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
