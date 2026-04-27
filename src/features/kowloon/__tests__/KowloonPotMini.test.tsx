import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KowloonPotMini } from '../KowloonPotMini.tsx';

describe('KowloonPotMini', () => {
  it('renders a token tray container', () => {
    const { container } = render(
      <MemoryRouter>
        <KowloonPotMini />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).not.toBeNull();
  });
});
