/**
 * BottomNav — mobile-first 5-slot tab bar (3J).
 *
 * Salon · Rituals · Spin · Jar · Vault per the design source nav. Settings
 * is reachable via the cog in the Home masthead, not the bottom nav, so the
 * core "earn → pull → claim" loop is fully visible.
 *
 * All tap targets ≥ 44×44pt (SPEC §4).
 */

import { NavLink } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import {
  Home as HomeIcon,
  ListChecks,
  Dice5,
  Sparkles,
  Vault as VaultIcon,
} from 'lucide-react';
import { cn } from './ui/utils.ts';

type IconCmp = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

interface NavItem {
  to: string;
  label: string;
  icon: IconCmp;
  /** When the app nav should visually flag the Spin tab (Wave 2: hand has clips). */
  indicator?: boolean;
}

const items: NavItem[] = [
  { to: '/', label: 'Salon', icon: HomeIcon as unknown as IconCmp },
  { to: '/habits', label: 'Rituals', icon: ListChecks as unknown as IconCmp },
  { to: '/spin', label: 'Spin', icon: Dice5 as unknown as IconCmp },
  { to: '/jar', label: 'Jar', icon: Sparkles as unknown as IconCmp },
  { to: '/rewards', label: 'Vault', icon: VaultIcon as unknown as IconCmp },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav__inner">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn('bottom-nav__item', isActive && 'bottom-nav__item--active')}
            aria-label={item.label}
          >
            <item.icon size={22} aria-hidden="true" />
            <span className="bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
