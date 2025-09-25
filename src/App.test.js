import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders home link', () => {
	render(<App />);
	expect(screen.getByText(/Welcome to OVS/i)).toBeInTheDocument();
});

