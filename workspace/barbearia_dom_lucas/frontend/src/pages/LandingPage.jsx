import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="bg-black text-white min-h-screen">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 w-full bg-black shadow-md z-50 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <a href="/" className="text-2xl font-bold">Barbearia Dom Lucas</a>
          <Link to="/agendar" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Agendar Horário
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero-section bg-cover bg-center bg-no-repeat h-screen" style={{backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80')`}}>
        <div className="container mx-auto text-center py-24">
          <h1 className="text-5xl font-bold leading-relaxed">
            Corte e Estilo para Homens que Valorizam a Qualidade.
          </h1>
          <p className="text-lg opacity-80">
            Nossa equipe experiente oferece serviços personalizados, com foco no seu conforto e satisfação.
          </p>
          <Link to="/agendar" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded">
            Agendar Horário
          </Link>
        </div>
      </section>

      {/* VITRINE DE SERVIÇOS */}
      <div className="container mx-auto py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Nossos Serviços</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-xl transition duration-300">
            <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80" alt="Corte de Cabelo Clássico" className="w-full h-36 object-cover rounded-t-lg" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Corte de Cabelo Clássico
            </h3>
            <p className="text-base opacity-80">
              Um corte impecável para o seu dia a dia.
            </p>
            <p className="text-blue-600 font-bold">R$ 60</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-xl transition duration-300">
            <img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80" alt="Barboterapia com Toalha Quente" className="w-full h-36 object-cover rounded-t-lg" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Barboterapia com Toalha Quente
            </h3>
            <p className="text-base opacity-80">
              Relaxe e revitalize seu corpo com uma barboterapia completa.
            </p>
            <p className="text-blue-600 font-bold">R$ 50</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-xl transition duration-300">
            <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80" alt="Combo Estilo Completo" className="w-full h-36 object-cover rounded-t-lg" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Combo Estilo Completo
            </h3>
            <p className="text-base opacity-80">
              Corte, modelagem e tratamento para um visual completo.
            </p>
            <p className="text-blue-600 font-bold">R$ 100</p>
          </div>
        </div>
      </div>

      {/* INFORMAÇÕES LOCAIS */}
      <div className="container mx-auto py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Visite-nos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p>Rua dos Andradas, 1200 - Centro Histórico - Porto Alegre/RS</p>
          </div>
          <div>
            <p>Horários:</p>
            <p>Terça a Sábado das 9h às 20h</p>
            <p>Contato:</p>
            <p>51988887777</p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4">
          <p>&copy; 2023 Barbearia Dom Lucas. Todos os direitos reservados.</p>
          <Link to="/agendar" className="text-blue-600 hover:bg-blue-700">Agendar Horário</Link>
        </div>
      </footer>
    </div>
  );
}