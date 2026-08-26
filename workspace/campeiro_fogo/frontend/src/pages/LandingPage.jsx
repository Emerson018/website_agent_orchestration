import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="bg-[#1C1917] h-screen flex items-center justify-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="md:flex md:items-end">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
            alt="Churrasco ao Ar Queimado"
            className="rounded-lg shadow-md w-full md:w-1/2 h-auto"
          />
          <div className="pl-6 mt-12 md:pl-0 md:ml-6 text-white">
            <h1 className="text-4xl sm:text-5xl font-montserrat font-bold tracking-tight mb-4">
              Sabor Autêntico do Campo
            </div>
            <p className="text-lg sm:text-xl font-inter text-gray-300 mb-6">
              Desfrute de churrascos ao ar queimado com ingredientes frescos e receitas tradicionais. Uma experiência gastronômica única em um ambiente acolhedor.
            </p>
            <button className="bg-[#EAB308] hover:bg-[#B9712C] text-white font-bold py-3 px-6 rounded-md shadow-lg transition-colors duration-300 w-48 mx-auto">
              Agendar Sua Mesa
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-12 p-4 bg-gray-900 rounded-md shadow-lg">
          <h2 className="text-3xl sm:text-4xl font-montserrat text-center mb-6">
            Sobre o Campeiro Fogão
          </h2>
          <p className="text-lg sm:text-xl font-inter text-gray-300 text-center mb-8">
            Somos uma churrascaria regional que valoriza a tradição da culinária do campo, oferecendo pratos preparados com ingredientes frescos e um ambiente acolhedor para você e sua família.
          </p>
        </div>

        {/* Call to Action Section */}
        <div className="mt-12 p-4 bg-gray-900 rounded-md shadow-lg">
          <h2 className="text-3xl sm:text-4xl font-montserrat text-center mb-6">
            Reserve Agora e Viva a Experiência!
          </h2>
          <p className="text-lg sm:text-xl font-inter text-gray-300 text-center mb-8">
            Não perca tempo, agende sua mesa hoje mesmo e garanta um lugar especial no Campeiro Fogão.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;