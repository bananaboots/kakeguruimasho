/**
 * SpinFlow route — mounts the Wave 3 3E flow inside the parlour chassis.
 *
 * The spin sequence (hand view, cash-in picker, gold button, spin button,
 * wheel canvas, reveal screen, bonus wheel) is owned by <PostSpinFlow>;
 * this route adds the masthead and paper-grain backdrop. Step-specific copy
 * is rendered by `<PostSpinFlow>` itself via the in-flow step label.
 */

import { PostSpinFlow } from '../features/spin/index.ts';

export default function SpinFlow() {
  return (
    <section
      className="route route--spin parlour-grain parlour-halftone"
      aria-labelledby="spin-title"
    >
      <h1 id="spin-title" className="sr-only">
        The Pull
      </h1>

      <PostSpinFlow />
    </section>
  );
}
