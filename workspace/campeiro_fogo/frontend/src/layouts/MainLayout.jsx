import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import staticConfig from '../../ai_config.json';
import logo from '../logo.png';
import { getAgendaConfig } from '../services/api';

const formatWorkingHours = (dias, horarios) => {
  if (!dias || dias.length === 0) return 'Fechado';
  
  const weekdaysPT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const sortedDays = [...dias].map(d => d === 0 ? 7 : d).sort((a, b) => a - b);
  
  let isConsecutive = true;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] !== sortedDays[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }
  
  let daysText = '';
  if (isConsecutive && sortedDays.length > 1) {
    const firstDay = weekdaysPT[sortedDays[0] === 7 ? 0 : sortedDays[0]];
    const lastDay = weekdaysPT[sortedDays[sortedDays.length - 1] === 7 ? 0 : sortedDays[sortedDays.length - 1]];
    daysText = `${firstDay} a ${lastDay}`;
  } else {
    daysText = dias.map(d => weekdaysPT[d].slice(0, 3)).join(', ');
  }

  let hoursText = '';
  if (horarios && horarios.length > 0) {
    const sortedHours = [...horarios].sort();
    const minHour = sortedHours[0];
    const maxHour = sortedHours[sortedHours.length - 1];
    hoursText = ` das ${minHour} às ${maxHour}`;
  }
  
  return `${daysText}${hoursText}`;
};

function MainLayout() {
  const [config, setConfig] = useState(staticConfig);
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
  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await getAgendaConfig();
        setConfig(prev => ({
          ...prev,
          ...cfg,
          working_hours: formatWorkingHours(cfg.dias_funcionamento, cfg.horarios_disponiveis)
        }));
      } catch (err) {
        console.error("Erro ao carregar configurações dinâmicas no MainLayout:", err);
      }
    }
    loadConfig();
  }, []);

  const headerStyle = {
    backgroundColor: 'rgba(18, 16, 14, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid #2E2520',
    padding: '0.85rem 2rem',
    color: '#FAF7F2',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    transform: (isLockedHidden || !isVisible) ? 'translateY(-100%)' : 'translateY(0)',
    transition: 'transform 0.3s ease',
  };

  const navLinkStyle = {
    color: '#FAF7F2',
    textDecoration: 'none',
    marginLeft: '1.75rem',
    fontWeight: '600',
    fontSize: '0.88rem',
    letterSpacing: '0.02em',
    opacity: 0.85,
    transition: 'all 0.2s ease',
  };

  const containerStyle = {
    backgroundColor: '#12100E',
    color: '#FAF7F2',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const [logoSrc, setLogoSrc] = useState(logo);

  useEffect(() => {
    if (config.logo_url && config.logo_url !== '/logo.png') {
      setLogoSrc(config.logo_url);
    }
  }, [config.logo_url]);

  const footerStyle = {
    backgroundColor: '#0C0A09',
    borderTop: '1px solid #261F1A',
    padding: '3rem 2rem 2rem 2rem',
    color: '#9E928A',
    fontSize: '0.88rem',
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
            <h4 style={{ color: '#FAF7F2', fontWeight: '700', marginBottom: '0.75rem', fontSize: '1.05rem', fontFamily: 'Cinzel, serif' }}>
              {config.app_name}
            </h4>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem', color: '#A89F96' }}>
              {config.description || 'Gastronomia regional autêntica, churrasco ao fogo de chão e cortes nobres preparados com maestria e paixão.'}
            </p>
          </div>
          <div>
            <h4 style={{ color: '#FAF7F2', fontWeight: '700', marginBottom: '0.75rem', fontSize: '1.05rem', fontFamily: 'Cinzel, serif' }}>
              Endereço
            </h4>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem', color: '#A89F96' }}>
              {config.address || 'Av. Principal, 1000 - Centro - Porto Alegre/RS'}
            </p>
          </div>
          <div>
            <h4 style={{ color: '#FAF7F2', fontWeight: '700', marginBottom: '0.75rem', fontSize: '1.05rem', fontFamily: 'Cinzel, serif' }}>
              Contato & Atendimento
            </h4>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem', marginBottom: '0.35rem', color: '#A89F96' }}>
              <strong className="text-stone-300">Telefone:</strong> {config.phone || '(51) 99999-9999'}{config.phone2 ? ` / ${config.phone2}` : ''}
            </p>
            <p style={{ lineHeight: '1.6', fontSize: '0.85rem', color: '#A89F96' }}>
              <strong className="text-stone-300">Funcionamento:</strong> {config.working_hours || 'Terça a Domingo das 11h30 às 23h'}
            </p>
          </div>
        </div>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '2rem auto 0 auto', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid #231C18', 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          color: '#786F67' 
        }}>
          © {new Date().getFullYear()} {config.app_name}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
