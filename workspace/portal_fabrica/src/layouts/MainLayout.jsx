import { Outlet } from 'react-router-dom';
import { WHATSAPP_URL, WHATSAPP_LABEL } from '../lib/contact';

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-void text-bone">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#topo" className="font-display text-[1.75rem] leading-none tracking-[0.02em] text-bone">
            Aether
          </a>
          <nav aria-label="Navegação principal" className="flex items-center gap-7 text-sm">
            <a href="#como-funciona" className="hidden text-bone-muted transition-colors hover:text-bone md:inline">
              Como funciona
            </a>
            <a href="#trabalhos" className="hidden text-bone-muted transition-colors hover:text-bone md:inline">
              Trabalhos
            </a>
            <a
              href="#formulario"
              className="rounded-full border border-line-strong px-4 py-2 font-medium text-bone transition-colors hover:border-signal hover:text-signal"
            >
              Pedir proposta
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children || <Outlet />}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
          <div className="space-y-2">
            <p className="font-display text-3xl leading-none">Aether</p>
            <p className="text-sm text-bone-muted">Sites feitos do zero para negócios locais.</p>
          </div>
          <div className="flex flex-col gap-1 text-sm md:items-end">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-bone transition-colors hover:text-signal">
              WhatsApp {WHATSAPP_LABEL}
            </a>
            <p className="text-bone-faint">© {new Date().getFullYear()} Aether</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
