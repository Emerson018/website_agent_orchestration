import './globals.css';
import React from 'react';
import { promises as fs } from 'fs';
import path from 'path';

export const metadata = {
  title: 'Agendador PWA',
  description: 'Sistema de agendamento online e painel administrativo.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

async function getConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {
      app_name: 'Agendador PWA',
      primary_color: '#4F46E5',
      secondary_color: '#10B981',
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getConfig();
  
  const isMarcianos = config.app_name?.toLowerCase().includes('marcianos');
  const bgColor = isMarcianos ? '#020617' : (config.secondary_color || '#f9fafb');
  const textColor = isMarcianos ? '#f1f5f9' : '#111827';

  return (
    <html lang="pt-BR" style={{ backgroundColor: bgColor }}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body 
        className="min-h-screen antialiased transition-colors duration-300"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('PWA ServiceWorker registrado com sucesso no escopo: ', registration.scope);
                    },
                    function(err) {
                      console.log('Falha ao registrar PWA ServiceWorker: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
