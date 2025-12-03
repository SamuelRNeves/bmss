"use client";

import Link from "next/link";
import { ShieldAlert, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  state: "expired" | "unauthenticated";
}

export function AuthStateMessage({ state }: Props) {
  const router = useRouter();
  const isExpired = state === "expired";
  const title = isExpired ? "Sessão expirada" : "Você não está autenticado";
  const description = isExpired
    ? "Sua sessão foi encerrada por segurança. Faça login novamente para continuar acompanhando o mercado."
    : "Conecte-se para acessar as recomendações personalizadas e acompanhar o sentimento do mercado.";

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/5 bg-neutral-900/70 p-10 shadow-2xl">
      <div className="max-w-xl space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 text-yellow-300 shadow-inner">
          {isExpired ? <TimerReset /> : <ShieldAlert />}
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-300 sm:text-base">{description}</p>
        </div>
        <div className="flex justify-center gap-4 text-sm">
          <Link
            href="/login"
            onClick={(event) => {
              event.preventDefault();
              handleNavigate("/login");
            }}
            className="rounded-full bg-yellow-400 px-6 py-3 font-semibold text-neutral-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-yellow-300/40"
          >
            Ir para o login
          </Link>
          <Link
            href="/cadastrar"
            onClick={(event) => {
              event.preventDefault();
              handleNavigate("/cadastrar");
            }}
            className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:border-yellow-200/60 hover:text-yellow-200"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}