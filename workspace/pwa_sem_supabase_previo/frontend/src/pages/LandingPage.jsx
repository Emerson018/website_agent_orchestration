import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="bg-[#6366F1] text-[#1A1A1A]">
      {/* Hero Section */}
      <section className="h-screen flex items-center justify-around">
        <div>
          <h1 className="text-4xl font-bold mb-4">Agende seu horário com PWA Sem Supabase Previo</h1>
          <p className="text-lg opacity-80">Simplifique sua vida com agendamentos online, sem filas e com a conveniência de um aplicativo PWA.</p>
        </div>
        {/* Add an image or icon here */}
      </section>

      {/* Services Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-8">Nossos Serviços</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Service Card 1 */}
            <div className="bg-[#fff] rounded-lg shadow-md p-6 hover:shadow-xl transition duration-300">
              <h3 className="text-xl font-semibold mb-2">Consultoria Inicial</h3>
              <p className="text-gray-700 opacity-70">R$ 200 - 60 min. Avaliação completa das suas necessidades.</p>
            </div>

            {/* Service Card 2 */}
            <div className="bg-[#fff] rounded-lg shadow-md p-6 hover:shadow-xl transition duration-300">
              <h3 className="text-xl font-semibold mb-2">Atendimento Especializado</h3>
              <p className="text-gray-700 opacity-70">R$ 150 - 45 min. Solução personalizada para seus desafios.</p>
            </div>

            {/* Service Card 3 */}
            <div className="bg-[#fff] rounded-lg shadow-md p-6 hover:shadow-xl transition duration-300">
              <h3 className="text-xl font-semibold mb-2">Suporte Técnico</h3>
              <p className="text-gray-700 opacity-70">R$ 100 - 30 min. Assistência rápida e eficiente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-[#212121] py-16">
        <div className="container mx-auto px-4 flex items-center justify-around">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Agende agora mesmo!</h3>
            <p className="text-gray-300 opacity-70">Não perca tempo, garanta seu horário!</p>
          </div>
          {/* Button */}
          <Link to="/agendar" className="bg-[#6366F1] text-white font-bold py-2 px-6 rounded-lg hover:shadow-xl transition duration-300">Agendar</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 bg-[#1A1A1A]">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <p className="text-gray-300">&copy; 2024 PWA Sem Supabase Previo. Todos os direitos reservados.</p>
          {/* Contact Info */}
          <div>
            <p>E-mail: <a href="mailto:testesupabase@gmail.com" className="text-[#6366F1]">testesupabase@gmail.com</a></p>
            <p>Telefone: 51999999999</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;