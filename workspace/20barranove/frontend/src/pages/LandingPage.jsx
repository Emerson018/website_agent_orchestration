import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="bg-[#0F172A] text-[#FFFFFF]">
      {/* NAVBAR */}
      <nav className="bg-[#EC4899] p-6 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <a href="/" className="text-2xl font-bold tracking-wide text-[#FFFFFF]">
            20barranove
          </a>
          <Link to="/agendar" className="bg-[#F472B6] hover:bg-[#C38A9E] text-white px-4 py-2 rounded-full">
            Agendar Horário
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80')] object-cover object-center h-screen flex items-center justify-center text-white">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold tracking-wide mb-4">
            Gastronomia Autêntica e Experiências Memoráveis
          </h1>
          <p className="text-lg leading-relaxed text-[#FFFFFF]">
            Não buscamos fórmulas ou tendências. Acreditamos em pratos preparados com paixão, ingredientes frescos e um ambiente que celebra a união de amigos e família.
          </p>
          <Link to="/agendar" className="bg-[#EC4899] hover:bg-[#C38A9E] text-white px-6 py-3 rounded-full mx-2">
            Agendar Horário
          </Link>
        </div>
      </section>

      {/* VITRINE DE SERVIÇOS */}
      <div className="container mx-auto py-8 flex flex-wrap justify-center">
        <div className="w-full md:w-1/3 p-4">
          <Card serviceName="Pratos Típicos Tradicionais" value="R$ 48" image="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80" />
        </div>
        <div className="w-full md:w-1/3 p-4">
          <Card serviceName="Cortes Especiais na Brasa" value="R$ 85" image="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80" />
        </div>
        <div className="w-full md:w-1/3 p-4">
          <Card serviceName="Reserva de Mesas Online" value="Gratuito" image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80" />
        </div>
      </div>

      {/* INFORMAÇÕES LOCAIS */}
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 text-[#EC4899]">Localização</h2>
            <p>Av. Principal, 1000 - Centro - Porto Alegre/RS</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4 text-[#EC4899]">Horário de Funcionamento</h2>
            <p>Segunda a Sábado das 9h às 18h</p>
            <p className="text-sm">Contato: 121212121212</p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] p-6 shadow-md">
        <div className="container mx-auto flex justify-center">
          <Link to="/agendar" className="text-[#FFFFFF]">
            Agendar Horário
          </Link>
          <p className="mt-4 text-[#FFFFFF]">© 2023 20barranove - Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

function Card({ serviceName, value, image }) {
  return (
    <div className="bg-[#FFFFFF] rounded-lg shadow-md p-6 hover:shadow-xl">
      <img src={image} alt={serviceName} className="w-full h-48 object-cover rounded-t-lg" />
      <h3 className="text-xl font-semibold text-[#EC4899] mb-2">{serviceName}</h3>
      <p className="text-gray-light font-normal">{value}</p>
    </div>
  );
}