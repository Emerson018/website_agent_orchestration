import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gray-50 p-6 rounded-2xl">
      <h2 className="text-4xl font-extrabold text-gray-950 text-center tracking-tight sm:text-5xl">
        Vitrine do Negócio
      </h2>
      <p className="max-w-md mt-4 text-lg text-gray-600 text-center">
        Bem-vindo à Barbearia Navalha de Ouro. Conheça nossos profissionais, serviços e agende o seu horário online com facilidade e conforto.
      </p>
      <Link 
        to="/agendar" 
        className="px-8 py-3 mt-6 text-white bg-primary rounded-lg shadow-lg hover:opacity-90 font-bold transition-all text-center"
      >
        Realizar reserva
      </Link>
    </div>
  );
}

export default LandingPage;
