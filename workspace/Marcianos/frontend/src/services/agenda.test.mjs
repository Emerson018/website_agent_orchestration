// Regras de capacidade da agenda. Rode com: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, getReservationsTaken, getSlotAvailability } from './agenda.js';

const DAY = '2099-01-10';
const TIME = '20:00';
const config = { vagas_padrao: 5, limites_customizados: {} };
const now = new Date('2099-01-01T12:00:00');
const booking = (pessoas, status = STATUS.CONFIRMADA) => ({ data: DAY, horario: TIME, pessoas, status });
const availability = (bookings, guests) =>
  getSlotAvailability({ config, bookings, dateKey: DAY, time: TIME, guests, now });

test('a capacidade conta reservas, não pessoas', () => {
  assert.equal(getReservationsTaken([booking(4), booking(5)], DAY, TIME), 2);
});

test('reserva cancelada ou de quem não veio não ocupa vaga', () => {
  const bookings = [booking(3), booking(4, STATUS.CANCELADA), booking(2, STATUS.NAO_VEIO)];
  assert.equal(getReservationsTaken(bookings, DAY, TIME), 1);
});

test('um grupo de 5 num horário vazio está livre', () => {
  assert.deepEqual(availability([], 5), { state: 'livre', remaining: 5, limit: 5 });
});

test('o tamanho do grupo não muda a disponibilidade', () => {
  const bookings = [booking(4), booking(5)];
  assert.equal(availability(bookings, 1).state, availability(bookings, 5).state);
  assert.equal(availability(bookings, 5).remaining, 3);
});

test('última vaga aparece como últimos lugares', () => {
  const bookings = [booking(2), booking(2), booking(2), booking(2)];
  assert.equal(availability(bookings, 5).state, 'poucos');
});

test('com todas as vagas reservadas o horário esgota', () => {
  const bookings = Array.from({ length: 5 }, () => booking(1));
  assert.equal(availability(bookings, 2).state, 'cheio');
});

test('grupo grande segue podendo pedir pré-reserva com vaga livre', () => {
  assert.equal(availability([booking(4)], 8).state, 'livre');
});
