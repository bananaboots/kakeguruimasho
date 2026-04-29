/**
 * navItems — single source of truth for primary nav.
 *
 * Both BottomNav (mobile) and LeftRail (desktop) consume this so
 * adding/renaming/reordering an item ripples to every surface.
 */
import {
  Home as HomeIcon,
  Coins,
  Dice5,
  Vault as VaultIcon,
  Settings as SettingsIcon,
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
  { to: '/jar', label: 'Pot', icon: Coins as unknown as NavIcon },
  { to: '/spin', label: 'Play', icon: Dice5 as unknown as NavIcon },
  { to: '/rewards', label: 'Vault', icon: VaultIcon as unknown as NavIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon as unknown as NavIcon },
];
