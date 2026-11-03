/**
 * Helper de configuração dinâmica de rotas baseado no nicho e módulos do tenant.
 */

export function buildDynamicRouteSpecs(cfg = {}) {
  const nicho = (cfg?.nicho_detectado || '').toLowerCase();
  const modules = Array.isArray(cfg?.modules) ? cfg.modules : [];

  const routes = [
    { path: '/', component: 'LandingPage', index: true },
    { path: '/login', component: 'LoginPage' },
    { path: '/admin', component: 'AdminDashboard', protected: true },
  ];

  // Gastronomia: Cardápio Digital & Pedidos
  if (nicho === 'gastronomia' || modules.includes('cardapio') || modules.includes('gastronomia')) {
    routes.push({ path: '/cardapio', component: 'CardapioPage' });
    routes.push({ path: '/pedidos', component: 'PedidosPage' });
  }

  // Varejo: Catálogo de Produtos & Carrinho
  if (nicho === 'varejo' || modules.includes('produtos') || modules.includes('varejo')) {
    routes.push({ path: '/produtos', component: 'ProdutosPage' });
    routes.push({ path: '/carrinho', component: 'CarrinhoPage' });
  }

  // Serviços: Portfólio de Serviços & Agendamento
  if (
    nicho === 'servicos' ||
    modules.includes('servicos') ||
    modules.includes('agendar') ||
    (!nicho && !modules.length)
  ) {
    routes.push({ path: '/servicos', component: 'ServicosPage' });
    routes.push({ path: '/agendar', component: 'BookingPage' });
  }

  return routes;
}
