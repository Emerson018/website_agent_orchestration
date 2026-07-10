import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import config from '../../ai_config.json';
import logo from '../logo.png';

function MainLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isLockedHidden, setIsLockedHidden] = useState(false);

  useEffect(() => {
    if (isLockedHidden) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);

      // Oculta a barra ao rolar para baixo e exibe ao rolar para cima
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isLockedHidden]);

  const headerStyle = {
    backgroundColor: config.primary_color ? `${config.primary_color}dd` : '#6366f1dd',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '0.6rem 2rem',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    transform: (isLockedHidden || !isVisible) ? 'translateY(-100%)' : 'translateY(0)',
    transition: 'transform 0.3s ease',
  };

  const navLinkStyle = {
    color: '#ffffff',
    textDecoration: 'none',
    marginLeft: '1.5rem',
    fontWeight: '600',
    fontSize: '0.95rem',
    opacity: 0.85,
    transition: 'opacity 0.2s',
  };

  const isMarcianos = config.app_name?.toLowerCase().includes('marcianos');
  const bgColor = isMarcianos ? '#020617' : (config.secondary_color || '#f9fafb');
  const textColor = isMarcianos ? '#f1f5f9' : '#111827';

  const containerStyle = {
    backgroundColor: bgColor,
    color: textColor,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'background-color 0.3s ease',
  };

  const [logoSrc, setLogoSrc] = useState(logo);

  useEffect(() => {
    if (config.logo_url && config.logo_url !== '/logo.png') {
      setLogoSrc(config.logo_url);
    }
  }, []);

  const footerStyle = {
    backgroundColor: isMarcianos ? '#090d16' : '#ffffff',
    borderTop: isMarcianos ? '1px solid #1e293b' : '1px solid #e2e8f0',
    padding: '2.5rem 2rem',
    color: isMarcianos ? '#94a3b8' : '#64748b',
    fontSize: '0.9rem',
    marginTop: 'auto',
  };

  return (
    <div style={containerStyle}>
      {isLockedHidden && (
        <button
          type="button"
          onClick={() => {
            setIsLockedHidden(false);
            setIsVisible(true);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: config.primary_color ? `${config.primary_color}dd` : '#6366f1dd',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: 'none',
            borderBottomLeftRadius: '1rem',
            borderBottomRightRadius: '1rem',
            padding: '0.5rem 1.5rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'all 0.2s ease',
          }}
          className="hover:brightness-110"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
          Expandir Menu
        </button>
      )}

      <header style={headerStyle}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoSrc} 
            alt={config.app_name} 
            onError={() => {
              if (logoSrc !== logo) {
                setLogoSrc(logo);
              }
            }}
            style={{ 
              height: '2.4rem', 
              width: 'auto', 
              objectFit: 'contain'
            }} 
          />
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={navLinkStyle} className="hover:opacity-100">Agendar</Link>
          <Link to="/admin" style={navLinkStyle} className="hover:opacity-100">Painel</Link>
          <button 
            type="button"
            onClick={() => setIsLockedHidden(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              opacity: 0.8,
              marginLeft: '1.5rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'opacity 0.2s',
              padding: 0
            }}
            className="hover:opacity-100"
            title="Recolher e fixar menu oculto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
            </svg>
            <span className="hidden sm:inline">Recolher</span>
          </button>
        </nav>
      </header>

      <main style={{ width: '100%', flex: '1 0 auto' }}>
        <Outlet />
      </main>

      <footer style={footerStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div>
            <h4 style={{ color: isMarcianos ? '#ffffff' : '#0f172a', fontWeight: '700', marginBottom: '1rem', fontSize: '1.1rem' }}>
              {config.app_name} {isMarcianos && '🛸'}
            </h4>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem' }}>
              {isMarcianos 
                ? 'O maior rodízio de mini burgers do universo, com boliche e diversão garantida para toda a família!'
                : 'Oferecemos uma experiência excepcional com agendamento online rápido, seguro e prático.'
              }
            </p>
          </div>
          <div>
            <h4 style={{ color: isMarcianos ? '#ffffff' : '#0f172a', fontWeight: '700', marginBottom: '1rem', fontSize: '1.1rem' }}>Endereço 📍</h4>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem' }}>
              {config.address || 'Av. Padre Cacique, 580 - Menino Deus - Porto Alegre/RS'}
            </p>
          </div>
          <div>
            <h4 style={{ color: isMarcianos ? '#ffffff' : '#0f172a', fontWeight: '700', marginBottom: '1rem', fontSize: '1.1rem' }}>Contato & Horários 📞</h4>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <strong>Telefone:</strong> {config.phone || '(51) 99523-9876'}
            </p>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem' }}>
              <strong>Funcionamento:</strong> {config.working_hours || 'Terça a Domingo das 17h às 23h'}
            </p>
          </div>
        </div>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '2rem auto 0 auto', 
          paddingTop: '1.5rem', 
          borderTop: isMarcianos ? '1px solid #1e293b' : '1px solid #e2e8f0', 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          opacity: 0.7 
        }}>
          © {new Date().getFullYear()} {config.app_name}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
