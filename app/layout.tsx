import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HoloHacking — Holoscope',
  description: 'Plataforma de Nutrição Holística Integrativa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
