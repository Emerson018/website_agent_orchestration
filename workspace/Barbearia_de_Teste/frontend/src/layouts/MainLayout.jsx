import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import config from '../../ai_config.json';

function MainLayout() {
  const headerStyle = {
    backgroundColor: config.primary_color || '#4F46E5',
    padding: '1.5rem',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };

  const navLinkStyle = {
    color: '#ffffff',
    textDecoration: 'none',
    marginLeft: '1.5rem',
    fontWeight: '500',
  };

  return (
    <div>
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{config.app_name}</h1>
        <nav>
          <Link to="/" style={navLinkStyle}>Início</Link>
          <Link to="/agendar" style={navLinkStyle}>Agendar</Link>
          <Link to="/admin" style={navLinkStyle}>Admin</Link>
        </nav>
      </header>

      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
