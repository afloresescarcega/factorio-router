import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the converter heading', () => {
  render(<App />);
  const heading = screen.getByText(/helmod to blueprint converter/i);
  expect(heading).toBeInTheDocument();
});

test('renders the input form with a convert button', () => {
  render(<App />);
  expect(screen.getByPlaceholderText(/enter helmod string/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /convert/i })).toBeInTheDocument();
});
