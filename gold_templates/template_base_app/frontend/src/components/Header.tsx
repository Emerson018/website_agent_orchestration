'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  appName: string;
  primaryColor: string;
  logoUrl?: string;
  theme?: 'dark' | 'light';
}

export default function Header({ appName, primaryColor, logoUrl = '/logo.png', theme = 'light' }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logoUrl || '/logo.png');
  const [fallbackLevel, setFallbackLevel] = useState(0); // 0 = custom/provided logo, 1 = default local logo, 2 = text fallback

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setCurrentLogo(logoUrl || '/logo.png');
    setFallbackLevel(0);
  }, [logoUrl]);

  const handleError = () => {
    if (fallbackLevel === 0 && logoUrl && logoUrl !== '/logo.png') {
      setCurrentLogo('/logo.png');
      setFallbackLevel(1);
    } else {
      setFallbackLevel(2);
    }
  };

  const isDark = theme === 'dark' || appName.toLowerCase().includes('marcianos');

  return (
    <header 
      className={`px-6 flex items-center justify-between border-b transition-all duration-300 sticky top-0 z-50 backdrop-blur-md ${
        isDark 
          ? 'border-slate-900 bg-slate-950/80 text-slate-100' 
          : 'border-gray-200/60 text-white'
      }`}
      style={!isDark ? { 
        backgroundColor: `${primaryColor}e6`,
        paddingTop: isScrolled ? '0.6rem' : '1.1rem',
        paddingBottom: isScrolled ? '0.6rem' : '1.1rem',
        boxShadow: isScrolled ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      } : {
        paddingTop: isScrolled ? '0.6rem' : '1.1rem',
        paddingBottom: isScrolled ? '0.6rem' : '1.1rem',
        boxShadow: isScrolled ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' : 'none'
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        {fallbackLevel < 2 ? (
          <img 
            src={currentLogo} 
            alt={appName} 
            className={`object-contain transition-all duration-300 ${isScrolled ? 'h-8' : 'h-11'}`} 
            onError={handleError}
          />
        ) : (
          <span className="text-xl font-bold tracking-tight">
            {appName}
          </span>
        )}
      </Link>
      <nav className="flex items-center gap-6">
        <Link 
          href="/" 
          className={`text-sm font-semibold transition-all hover:opacity-100 ${
            isDark ? 'text-slate-350 hover:text-white' : 'text-white/85 hover:text-white'
          }`}
        >
          Início
        </Link>
        <Link 
          href="/agendar" 
          className={`text-sm font-semibold transition-all hover:opacity-100 ${
            isDark ? 'text-slate-350 hover:text-white' : 'text-white/85 hover:text-white'
          }`}
        >
          Agendar
        </Link>
        <Link 
          href="/admin/dashboard" 
          className={`text-sm font-semibold transition-all hover:opacity-100 ${
            isDark ? 'text-slate-350 hover:text-white' : 'text-white/85 hover:text-white'
          }`}
        >
          Painel
        </Link>
      </nav>
    </header>
  );
}
