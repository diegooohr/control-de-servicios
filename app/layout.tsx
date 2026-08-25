import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Control de Servicios",
  description: "Gestión de lecturas de agua, luz y gas",
};

// ¡NUEVO! Configuración para la barra del navegador y bloqueo de zoom
export const metadata = {
  title: "Control de Servicios",
  description: "Gestión de lecturas de agua, luz y gas",
  icons: {
    icon: '/logo-ios.png',       /* Logo para la pestaña del navegador */
    apple: '/logo-ios.png',      /* Logo para la pantalla de inicio en celulares */
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}