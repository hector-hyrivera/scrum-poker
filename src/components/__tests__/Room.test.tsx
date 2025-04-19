import { render, screen } from '@testing-library/react';
import Room from '../Room';
import { MemoryRouter } from 'react-router-dom';

describe('Room', () => {
  it('renders the copy link button', () => {
    render(
      <MemoryRouter>
        <Room />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/copy room link/i)).toBeInTheDocument();
  });
});
