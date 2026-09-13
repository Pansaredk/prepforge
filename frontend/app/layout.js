import './globals.css';

export const metadata = {
  title: 'AI Interview Prep Kit',
  description: 'Full-stack AI Interview Preparation platform - Stage 1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
