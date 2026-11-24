import React from 'react';
import { GRUPO_GRANDE, STATUS } from '../../services/agenda';

const PILL = {
  [STATUS.CONFIRMADA]: 'bg-st-confirmada-bg text-st-confirmada-ink',
  [STATUS.PRE_RESERVA]: 'bg-st-pre-bg text-st-pre-ink',
  [STATUS.CHEGOU]: 'bg-st-chegou-bg text-st-chegou-ink',
  [STATUS.NAO_VEIO]: 'bg-st-naoveio-bg text-st-naoveio-ink',
  [STATUS.CANCELADA]: 'bg-st-cancelada-bg text-st-cancelada-ink',
};

/** Status sempre com cor e com a palavra: nunca só a cor. */
export function StatusPill({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none ${PILL[status] || PILL[STATUS.CONFIRMADA]} ${className}`}>
      {status}
    </span>
  );
}

/** O que o dono pode fazer a partir de cada status. A primeira ação é a principal. */
export function actionsFor(booking) {
  switch (booking.status) {
    case STATUS.PRE_RESERVA:
      return [
        { status: STATUS.CONFIRMADA, label: 'Confirmar', tone: 'primary' },
        { status: STATUS.CANCELADA, label: 'Cancelar', tone: 'danger' },
      ];
    case STATUS.CONFIRMADA:
      return [
        { status: STATUS.CHEGOU, label: 'Chegou', tone: 'primary' },
        { status: STATUS.NAO_VEIO, label: 'Não veio', tone: 'ghost' },
        { status: STATUS.CANCELADA, label: 'Cancelar', tone: 'danger' },
      ];
    case STATUS.CHEGOU:
    case STATUS.NAO_VEIO:
      return [{ status: STATUS.CONFIRMADA, label: 'Voltar para confirmada', tone: 'ghost' }];
    case STATUS.CANCELADA:
      return [
        {
          status: booking.pessoas >= GRUPO_GRANDE ? STATUS.PRE_RESERVA : STATUS.CONFIRMADA,
          label: 'Reativar reserva',
          tone: 'ghost',
        },
      ];
    default:
      return [];
  }
}

export const toneClass = {
  primary: 'panel-btn-primary',
  soft: 'panel-btn-soft',
  ghost: 'panel-btn-ghost',
  danger: 'panel-btn-danger',
};
