import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOpeningHours } from './opening_hours.js';

// Formato real do Google em pt-BR, com espaços finos em volta do travessão
const google = (hours) =>
  ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'].map(
    (day, i) => `${day}: ${hours[i]}`,
  );
const H = '11:00 – 23:00';

test('groups Monday to Friday and the weekend when the hours are equal', () => {
  assert.deepEqual(summarizeOpeningHours(google([H, H, H, H, H, '10:00 – 14:00', '10:00 – 14:00'])), [
    'Segunda a sexta: 11:00 até 23:00',
    'Sábado e domingo: 10:00 até 14:00',
  ]);
});

test('keeps Saturday and Sunday apart when they differ', () => {
  assert.deepEqual(summarizeOpeningHours(google([H, H, H, H, H, '10:00 – 14:00', 'Fechado'])), [
    'Segunda a sexta: 11:00 até 23:00',
    'Sábado: 10:00 até 14:00',
    'Domingo: Fechado',
  ]);
});

test('groups any run of consecutive equal days', () => {
  assert.deepEqual(summarizeOpeningHours(google(['Fechado', H, H, H, H, H, H])), [
    'Segunda: Fechado',
    'Terça a domingo: 11:00 até 23:00',
  ]);
});

test('equal days that are not consecutive stay on separate lines', () => {
  const other = '08:00 – 12:00';
  assert.deepEqual(summarizeOpeningHours(google([H, other, H, other, H, other, H])), [
    'Segunda: 11:00 até 23:00',
    'Terça: 08:00 até 12:00',
    'Quarta: 11:00 até 23:00',
    'Quinta: 08:00 até 12:00',
    'Sexta: 11:00 até 23:00',
    'Sábado: 08:00 até 12:00',
    'Domingo: 11:00 até 23:00',
  ]);
});

test('writes split shifts and 24-hour days', () => {
  const split = '12:00 – 15:00, 18:00 – 23:00';
  const open = 'Atendimento 24 horas';
  assert.deepEqual(summarizeOpeningHours(google([split, split, split, split, split, open, open])), [
    'Segunda a sexta: 12:00 até 15:00 e 18:00 até 23:00',
    'Sábado e domingo: Aberto 24 horas',
  ]);
});

test('leaves text it cannot read exactly as it came, and handles empty input', () => {
  const unknown = ['Ter-Dom: 12h às 23h'];
  assert.deepEqual(summarizeOpeningHours(unknown), unknown);
  assert.deepEqual(summarizeOpeningHours(['segunda-feira: 11:00 AM – 11:00 PM']), ['segunda-feira: 11:00 AM – 11:00 PM']);
  assert.deepEqual(summarizeOpeningHours([]), []);
  assert.deepEqual(summarizeOpeningHours(undefined), []);
});
