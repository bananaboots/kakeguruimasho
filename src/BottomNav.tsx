/**
 * BottomNav — mobile-first 5-slot tab bar (3J).
 *
 * Five icons per brief: Home, Habits, Spin, Jar, Settings.
 * All tap targets ≥ 44×44pt (SPEC §4). Labels render beneath the icon
 * for discoverability — at 375px wide, 5 slots fit comfortably.
 *
 * Icon-only would save a line of vertical space but hurts a11y per SPEC §11
 * ("one-handed, tap-first"). Keep labels.
 */

import { NavLink } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import {
  Home as HomeIcon,
  ListChecks,
  Dice5,
  Sparkles,
  Settings as SettingsIcon,
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
  { to: '/', label: 'Home', icon: HomeIcon as unknown as IconCmp },
  { to: '/habits', label: 'Habits', icon: ListChecks as unknown as IconCmp },
  { to: '/spin', label: 'Spin', icon: Dice5 as unknown as IconCmp },
  { to: '/jar', label: 'Jar', icon: Sparkles as unknown as IconCmp },
  { to: '/settings', label: 'Settings', icon: SettingsIcon as unknown as IconCmp },
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
