/**
 * LeftRail — desktop nav rail.
 *
 * House mark + nav (from NAV_ITEMS) + footer slot. Hidden at <1024px
 * via desktop.css; renders alongside RightRail in DesktopShell.
 */
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../lib/navItems.ts';
import { useTheme } from '../../styles/theme-context.ts';
import { cn } from '../utils.ts';

export function LeftRail() {
  const { themeMeta } = useTheme();
  return (
    <aside className="left-rail" aria-label="Primary navigation">
      <div className="left-rail__mark">
        <div className="left-rail__kanji">賭狂魔笙</div>
        <div className="left-rail__brand">
          {themeMeta.name}
          <span className="left-rail__brand-sub">Salon</span>
        </div>
      </div>
      <nav className="left-rail__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn('left-rail__item', isActive && 'left-rail__item--active')
            }
          >
            <item.icon size={18} aria-hidden="true" />
            <span className="left-rail__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="left-rail__footer" />
    </aside>
  );
}
