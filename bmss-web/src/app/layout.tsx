import "@/lib/globals.css";
import Sidebar from "@/componentes/Sidebar";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BMSS - Bitcoin Market Sentiment System",
  description: "Dashboard de Sentimento do Mercado Bitcoin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-neutral-100 flex min-h-screen`}>
        <Providers>
          <Sidebar />
          <main className="flex-1 p-6 md:p-10 overflow-x-hidden">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
