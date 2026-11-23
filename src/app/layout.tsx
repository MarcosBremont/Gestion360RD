import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ConnectionBanner from "@/components/ConnectionBanner";
import RegisterSW from "@/components/RegisterSW";
import { AuthProvider } from "@/lib/firebase/auth";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jarabacoa Conecta",
  description: "Reporta incidencias y descubre Jarabacoa. Funciona sin señal.",
  appleWebApp: { capable: true, title: "Jarabacoa", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#e8f0fb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-DO" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ConnectionBanner />
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
