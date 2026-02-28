import './globals.css';

export const metadata = {
  title: 'Chore Tracker',
  description: 'Daily chore tracker for the house',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
