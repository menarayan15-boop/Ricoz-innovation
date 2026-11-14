import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Immigration & Work Visa Dossier Builder',
  description:
    'AI-powered preparation, validation, and dossier generation for H-1B, O-1, EB-2, and EB-2 NIW visa categories.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F8FA] text-[#202938] antialiased">
        {children}
      </body>
    </html>
  );
}

