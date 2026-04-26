/**
 * navItems — single source of truth for primary nav.
 *
 * Both BottomNav (mobile) and LeftRail (desktop) consume this so
 * adding/renaming/reordering an item ripples to every surface.
 */
import {
  Home as HomeIcon,
  ListChecks,
  Dice5,
  Sparkles,
  Vault as VaultIcon,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export interface NavItem {
  to: string;
  label: string;
  icon: NavIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Salon', icon: HomeIcon as unknown as NavIcon },
  { to: '/habits', label: 'Rituals', icon: ListChecks as unknown as NavIcon },
  { to: '/spin', label: 'Spin', icon: Dice5 as unknown as NavIcon },
  { to: '/jar', label: 'Jar', icon: Sparkles as unknown as NavIcon },
  { to: '/rewards', label: 'Vault', icon: VaultIcon as unknown as NavIcon },
];
