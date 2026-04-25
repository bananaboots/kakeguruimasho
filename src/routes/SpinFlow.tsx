/**
 * SpinFlow route — mounts the Wave 3 3E flow inside the parlour chassis.
 *
 * The spin sequence (hand view, cash-in picker, gold button, spin button,
 * wheel canvas, reward picker, bonus wheel) is owned by <PostSpinFlow>;
 * this route adds the masthead and paper-grain backdrop.
 */

import { PostSpinFlow } from '../features/spin/index.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function SpinFlow() {
  const { themeMeta } = useTheme();
  return (
    <section
      className="route route--spin parlour-grain parlour-halftone"
      aria-labelledby="spin-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">The Pull · Cash-In</div>
        <h1 id="spin-title" className="parlour-masthead__title">
          {themeMeta.copy.spinCta}
        </h1>
        <p className="parlour-masthead__tagline">{themeMeta.tagline}</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <PostSpinFlow />
    </section>
  );
}
