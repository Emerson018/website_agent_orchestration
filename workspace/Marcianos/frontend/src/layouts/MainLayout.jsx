import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import config from '../../ai_config.json';
import logo from '../logo.png';

function MainLayout() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const headerStyle = {
    backgroundColor: config.primary_color ? `${config.primary_color}dd` : '#6366f1dd',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: isScrolled ? '0.6rem 2rem' : '1.2rem 2rem',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: isScrolled ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    transition: 'all 0.3s ease',
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

  return (
    <div>
      <header style={headerStyle}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt={config.app_name} 
            style={{ 
              height: isScrolled ? '2.4rem' : '3.2rem', 
              width: 'auto', 
              objectFit: 'contain',
              transition: 'all 0.3s ease' 
            }} 
          />
        </Link>
        <nav>
          <Link to="/" style={navLinkStyle} className="hover:opacity-100">Início</Link>
          <Link to="/agendar" style={navLinkStyle} className="hover:opacity-100">Agendar</Link>
          <Link to="/admin" style={navLinkStyle} className="hover:opacity-100">Painel</Link>
        </nav>
      </header>

      <main style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
