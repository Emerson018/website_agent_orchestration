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
    <div className="flex items-center justify-center min-h-[70vh] bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Acesso Restrito</h2>
          <p className="mt-2 text-sm text-gray-500">Insira suas credenciais para gerenciar a aplicação</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-700">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent text-gray-800 placeholder-gray-500 transition-all"
              placeholder="admin@navalhaouro.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent text-gray-800 placeholder-gray-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-3 text-white bg-primary rounded-lg font-bold shadow-lg hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
