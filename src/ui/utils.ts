/**
 * ui/utils.ts — tiny helpers for the vendored shadcn primitives.
 *
 * We deliberately DO NOT pull in `clsx` + `tailwind-merge` yet (see
 * `WAVE1_3J_DEPS.txt`). The `cn()` helper below is a minimal className
 * joiner that covers the shell's needs. When those deps land, swap the
 * implementation here — the API stays stable.
 */

export type ClassValue = string | number | null | false | undefined | ClassValue[] | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      for (const v of value) walk(v);
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (v) out.push(k);
      }
    }
  };
  for (const i of inputs) walk(i);
  return out.join(' ');
}
