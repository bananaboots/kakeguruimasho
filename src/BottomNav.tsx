/**
 * BottomNav — mobile-first 5-slot tab bar (3J).
 *
 * Salon · Rituals · Spin · Jar · Vault per the design source nav. Settings
 * is reachable via the cog in the Home masthead, not the bottom nav, so the
 * core "earn → pull → claim" loop is fully visible.
 *
 * Hidden at ≥1024px via desktop.css — the LeftRail takes over.
 *
 * All tap targets ≥ 44×44pt (SPEC §4).
 */

import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './lib/navItems.ts';
import { cn } from './ui/utils.ts';

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav__inner">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn('bottom-nav__item', isActive && 'bottom-nav__item--active')
            }
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
