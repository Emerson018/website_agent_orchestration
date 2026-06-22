import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function BookingPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    guests: '2',
    type: 'local', // local or pickup
    date: '',
    time: '',
    notes: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const timeSlots = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectTime = (time) => {
    setFormData(prev => ({ ...prev, time }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.date || !formData.time) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 font-sans bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-primary/10 rounded-full filter blur-2xl pointer-events-none"></div>
        
        {!isSubmitted ? (
          <>
            <div className="text-center mb-8">
              <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                Agendamento 🛸
              </span>
              <h2 className="text-3xl font-black mt-4">Garanta seu Horário</h2>
              <p className="text-sm opacity-75 mt-2">Escolha se prefere reservar uma mesa ou apenas programar a sua retirada de forma rápida e prática.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome Completo *</label>
                  <input 
                    type="text" 
                    name="name"
                    required
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Telefone de Contato *</label>
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    placeholder="(51) 99999-9999"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipo de Agendamento</label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                  >
                    <option value="local">Comer na Lanchonete</option>
                    <option value="pickup">Retirar no Balcão</option>
                  </select>
                </div>
                {formData.type === 'local' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Número de Pessoas</label>
                    <select 
                      name="guests"
                      value={formData.guests}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                    >
                      <option value="1">1 Pessoa</option>
                      <option value="2">2 Pessoas</option>
                      <option value="3">3 Pessoas</option>
                      <option value="4">4 Pessoas</option>
                      <option value="5+">5 ou mais Pessoas</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Selecione o Dia *</label>
                <input 
                  type="date" 
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Selecione o Horário *</label>
                <div className="grid grid-cols-4 gap-3">
                  {timeSlots.map((time) => (
                    <button
                      type="button"
                      key={time}
                      onClick={() => selectTime(time)}
                      className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                        formData.time === time 
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                          : 'bg-slate-950 border-slate-800 text-slate-350 hover:border-primary/50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Observações Especiais (Ex: Alergias, Mesa de Preferência)</label>
                <textarea 
                  name="notes"
                  rows="3"
                  placeholder="Algum pedido especial para nós?"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-slate-100 resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:brightness-110 transition-all cursor-pointer text-center"
              >
                Confirmar Agendamento
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-black text-slate-100">Agendamento Confirmado!</h3>
            <p className="text-sm opacity-85 mt-4 max-w-md">
              Obrigado, <strong className="text-primary">{formData.name}</strong>! Seu horário para o dia <strong>{formData.date}</strong> às <strong>{formData.time}</strong> foi agendado com sucesso para a modalidade <strong>{formData.type === 'local' ? `Mesa para ${formData.guests} pessoas` : 'Retirada no Balcão'}</strong>.
            </p>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setIsSubmitted(false)}
                className="px-6 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold hover:border-primary/50 transition-all cursor-pointer"
              >
                Novo Agendamento
              </button>
              <Link 
                to="/"
                className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer flex items-center"
              >
                Voltar ao Menu Principal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;
