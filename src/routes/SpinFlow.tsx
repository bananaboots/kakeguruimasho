/**
 * SpinFlow route — mounts the Wave 3 3E flow.
 *
 * The entire flow (hand view, cash-in picker, gold button, spin button,
 * wheel canvas, reward picker, bonus wheel) is owned by <PostSpinFlow>.
 */

import { PostSpinFlow } from '../features/spin/index.ts';

export default function SpinFlow() {
  return (
    <section className="route route--spin" aria-labelledby="spin-title">
      <header className="route__header">
        <h1 id="spin-title" className="route__title">
          Spin
        </h1>
      </header>
      <PostSpinFlow />
    </section>
  );
}
