import {
  getQuadraAluguelPhase,
  QUADRA_GRACE_MINUTES,
} from './quadraAluguelTiming';
import { isQuadraReservaRow } from './quadraReserva';
import type { WeatherSnapshot } from './weather';
import type { AluguelComItem, MultaComAluguel } from '../types/database';
import { calcularValorMulta } from './multaCalculo';
import { formatDate, formatTime } from '../utils/dates';

export type StudentAlertKind = 'multa' | 'reserva' | 'devolucao' | 'quadra' | 'rain' | 'info';

export type StudentAlertAction =
  | 'Fines'
  | 'Home'
  | 'Active'
  | 'TotemScan'
  | 'QuadraReserva';

export type StudentAlert = {
  id: string;
  kind: StudentAlertKind;
  title: string;
  body: string;
  tone: 'danger' | 'warning' | 'info';
  action?: StudentAlertAction;
  createdAt: string;
};

export function buildStudentAlerts(input: {
  aluguelAtivo: AluguelComItem | null;
  reservaQuadra: AluguelComItem | null;
  multasPendentes: MultaComAluguel[];
  weather: WeatherSnapshot | null;
}): StudentAlert[] {
  const { aluguelAtivo, reservaQuadra, multasPendentes, weather } = input;
  const alerts: StudentAlert[] = [];
  const now = Date.now();

  for (const multa of multasPendentes) {
    const dias = multa.dias_atraso ?? 0;
    const valorNum = calcularValorMulta(dias);
    const valor = valorNum.toFixed(2).replace('.', ',');
    const itemNome = multa.alugueis?.itens?.nome ?? 'item';
    alerts.push({
      id: `multa:${multa.id}`,
      kind: 'multa',
      title: 'Multa pendente',
      body: `R$ ${valor} (${dias} ${dias === 1 ? 'dia' : 'dias'} de atraso). ${itemNome}. Pague na tesouraria.`,
      tone: 'danger',
      action: 'Fines',
      createdAt: multa.gerada_em ?? new Date().toISOString(),
    });
  }

  if (weather?.isRainy) {
    alerts.push({
      id: `rain:${new Date().toISOString().slice(0, 13)}`,
      kind: 'rain',
      title: 'Chuva no campus',
      body: `Está chovendo (${weather.description}). Leve guarda-chuva ou adie a quadra.`,
      tone: 'info',
      action: 'Home',
      createdAt: new Date().toISOString(),
    });
  }

  if (reservaQuadra?.inicio && isQuadraReservaRow(reservaQuadra)) {
    const inicioMs = new Date(reservaQuadra.inicio).getTime();
    const diffMin = (inicioMs - now) / 60_000;
    const hora = formatTime(reservaQuadra.inicio);

    if (diffMin > 0 && diffMin <= 60) {
      alerts.push({
        id: `reserva-soon:${reservaQuadra.id}`,
        kind: 'reserva',
        title: diffMin <= 15 ? 'Quadra em 15 minutos' : 'Reserva da quadra em breve',
        body:
          diffMin <= 15
            ? `Horário ${hora}. Vá ao totem e escaneie o QR ou use a carteirinha.`
            : `Sua reserva começa às ${hora}. Prepare-se para o check-in no totem.`,
        tone: diffMin <= 15 ? 'warning' : 'info',
        action: 'TotemScan',
        createdAt: reservaQuadra.inicio ?? new Date().toISOString(),
      });
    } else if (diffMin > 60 && diffMin <= 24 * 60) {
      alerts.push({
        id: `reserva-today:${reservaQuadra.id}`,
        kind: 'reserva',
        title: 'Reserva de quadra agendada',
        body: `Check-in no totem a partir de 15 min antes das ${hora}.`,
        tone: 'info',
        action: 'Home',
        createdAt: reservaQuadra.inicio ?? new Date().toISOString(),
      });
    }
  }

  if (aluguelAtivo) {
    const tipo = aluguelAtivo.itens?.tipo;
    const nome = aluguelAtivo.itens?.nome ?? 'item';

    if (tipo === 'quadra') {
      const phase = getQuadraAluguelPhase(aluguelAtivo);
      const fimMs = new Date(aluguelAtivo.fim_previsto).getTime();

      if (phase === 'aguardando_nfc' || aluguelAtivo.status === 'aguardando_nfc') {
        alerts.push({
          id: `devolucao-quadra:${aluguelAtivo.id}`,
          kind: 'devolucao',
          title: 'Devolução da quadra pendente',
          body: `Confirme no totem em até ${QUADRA_GRACE_MINUTES} minutos para liberar a quadra.`,
          tone: 'danger',
          action: 'TotemScan',
          createdAt: aluguelAtivo.fim_previsto,
        });
      } else if (phase === 'em_uso' && fimMs > now) {
        const minRestantes = Math.ceil((fimMs - now) / 60_000);
        if (minRestantes <= 15) {
          alerts.push({
            id: `quadra-fim:${aluguelAtivo.id}`,
            kind: 'quadra',
            title: minRestantes <= 5 ? 'Quadra encerrando agora' : 'Quadra termina em breve',
            body: `Prepare-se para devolver ${nome} no totem ao fim do horário.`,
            tone: 'warning',
            action: 'Active',
            createdAt: aluguelAtivo.fim_previsto,
          });
        }
      }
    }

    if (tipo === 'guarda_chuva') {
      const fimMs = new Date(aluguelAtivo.fim_previsto).getTime();
      const devolucaoAte = formatDate(aluguelAtivo.fim_previsto);

      if (fimMs > now && fimMs - now < 24 * 60 * 60_000) {
        alerts.push({
          id: `devolucao-guarda:${aluguelAtivo.id}`,
          kind: 'devolucao',
          title: 'Devolver guarda-chuva',
          body: `Prazo até ${devolucaoAte}. Vá ao totem na aba Devolver.`,
          tone: 'warning',
          action: 'TotemScan',
          createdAt: aluguelAtivo.fim_previsto,
        });
      }
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
