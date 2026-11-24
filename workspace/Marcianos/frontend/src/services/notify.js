import aiConfig from '../../ai_config.json';

/** O endereço do webhook ainda é o de teste, rodando no computador de quem desenvolve. */
export function isWebhookDevUrl(url = aiConfig.n8n_webhook_url) {
  return /localhost|127\.0\.0\.1|webhook-test/i.test(String(url || ''));
}

// WAHA espera 55 + DDD + número + @c.us, sem o 9 extra para DDDs acima de 28
function toWahaChatId(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits.startsWith('55')) digits = `55${digits}`;
  if (digits.length === 13 && parseInt(digits.slice(2, 4), 10) > 28) {
    digits = digits.slice(0, 4) + digits.slice(5);
  }
  return `${digits}@c.us`;
}

/** Avisa o fluxo do n8n sobre a reserva nova. Não bloqueia nem quebra a reserva se falhar. */
export function notifyNewBooking({ booking, config }) {
  const url = aiConfig.n8n_webhook_url;
  if (!url) return;
  try {
    const payload = new URLSearchParams({
      name: booking.name,
      phone: booking.phone,
      chatId: toWahaChatId(booking.phone),
      date: booking.date,
      time: booking.time,
      guests: String(booking.guests),
      notes: booking.notes || '',
      status: booking.status,
      establishment_name: config.app_name || aiConfig.app_name || 'Marcianos',
      establishment_address: config.address || aiConfig.address || '',
      establishment_phone: config.phone || aiConfig.phone || '',
    });
    fetch(url, { method: 'POST', mode: 'no-cors', body: payload }).catch((err) =>
      console.error('[n8n] Falha ao avisar a reserva:', err)
    );
  } catch (err) {
    console.error('[n8n] Falha ao montar o aviso da reserva:', err);
  }
}
