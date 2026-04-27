import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer, DrawerContent, DrawerTitle } from '../Drawer.tsx';

afterEach(() => vi.restoreAllMocks());

function mockMatch(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(min-width: 1024px)',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList);
}

describe('Drawer', () => {
  it('renders bottom-sheet at narrow viewports', () => {
    mockMatch(false);
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Stake</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toMatch(/drawer__content--bottom/);
  });

  it('renders right-drawer at wide viewports', () => {
    mockMatch(true);
    render(
      <Drawer open onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerTitle>Stake</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const content = screen.getByRole('dialog');
    expect(content.className).toMatch(/drawer__content--right/);
  });

  it('closes on backdrop click', () => {
    mockMatch(false);
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>x</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    const overlay = document.querySelector('.dialog__overlay');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape', () => {
    mockMatch(false);
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerTitle>x</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
