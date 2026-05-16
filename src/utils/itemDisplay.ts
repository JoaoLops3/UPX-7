import { Ionicons } from '@expo/vector-icons';
import type { ExtraQuadra, ItemTipo } from '../types/database';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface ItemDisplay {
  label: string;
  shortLabel: string;
  icon: IoniconName;
  /** Aluguéis de longo prazo (dias) geram multa por atraso. */
  longTerm: boolean;
}

export const ITEM_DISPLAY: Record<ItemTipo, ItemDisplay> = {
  quadra: {
    label: 'Quadra A',
    shortLabel: 'Quadra',
    icon: 'football-outline',
    longTerm: false,
  },
  guarda_chuva: {
    label: 'Guarda-chuva',
    shortLabel: 'Guarda-chuva',
    icon: 'rainy-outline',
    longTerm: true,
  },
};

export function getItemDisplay(tipo: ItemTipo | string | null | undefined): ItemDisplay {
  if (tipo && tipo in ITEM_DISPLAY) {
    return ITEM_DISPLAY[tipo as ItemTipo];
  }
  return {
    label: 'Item',
    shortLabel: 'Item',
    icon: 'cube-outline',
    longTerm: false,
  };
}

export interface ExtraDisplay {
  label: string;
  icon: IoniconName;
  unidades: number;
}

export const EXTRA_DISPLAY: Record<ExtraQuadra, ExtraDisplay> = {
  futebol: { label: 'Bola de futebol', icon: 'football-outline', unidades: 3 },
  volei: { label: 'Bola de vôlei', icon: 'tennisball-outline', unidades: 3 },
  basquete: { label: 'Bola de basquete', icon: 'basketball-outline', unidades: 3 },
};

export const EXTRA_KEYS: ExtraQuadra[] = ['futebol', 'volei', 'basquete'];
