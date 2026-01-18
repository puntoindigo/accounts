import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentación | Accounts',
  description: 'Documentación técnica del sistema Accounts',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function DocumentacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
