"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import HomeClient from "@/componentes/home/home-client";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-gray-300">
        Verificando autenticação...
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return <HomeClient />;
}
