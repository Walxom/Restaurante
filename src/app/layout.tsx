import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import NavigationProgress from "@/components/NavigationProgress";
import { getCompanyName } from "@/lib/system-config-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Generar metadatos dinámicos basados en la configuración del sistema
export async function generateMetadata(): Promise<Metadata> {
  const companyName = await getCompanyName();
  
  return {
    title: `${companyName} - Sistema de Gestión`,
    description: `Sistema de gestión integral para ${companyName}`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <NavigationProgress />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
