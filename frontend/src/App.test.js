import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { HelmodFactory } from './helmodFactory';

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

test('shows an error message when the input cannot be converted', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<App />);

  userEvent.type(screen.getByPlaceholderText(/enter helmod string/i), 'not a valid helmod string');
  userEvent.click(screen.getByRole('button', { name: /convert/i }));

  expect(await screen.findByText(/error:/i)).toBeInTheDocument();
  console.error.mockRestore();
});

test('shows the resulting blueprint string on a successful conversion', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  const helmodString = HelmodFactory.encodeHelmod({
    root: {
      type: 'recipe',
      name: 'iron-gear-wheel',
      factory: { name: 'assembling-machine-1', count: 1 },
    },
  });

  render(<App />);
  const textarea = screen.getByPlaceholderText(/enter helmod string/i);
  userEvent.type(textarea, helmodString);
  userEvent.click(screen.getByRole('button', { name: /convert/i }));

  expect(await screen.findByText(/blueprint string:/i)).toBeInTheDocument();
  expect(screen.getByDisplayValue(/^0/)).toBeInTheDocument();

  console.log.mockRestore();
  console.warn.mockRestore();
});
