"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck, UserCog } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserSessionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const initials = useMemo(() => {
    if (!user?.name) {
      return "?";
    }
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 0) {
      return "?";
    }
    if (parts.length === 1) {
      return parts[0][0]?.toUpperCase() ?? "?";
    }
    return `${parts[0][0]?.toUpperCase() ?? ""}${parts[parts.length - 1][0]?.toUpperCase() ?? ""}`;
  }, [user?.name]);

  const handleChange = (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      setStatusMessage("Não foi possível identificar o usuário autenticado.");
      setStatusTone("error");
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "https://bmss-backend.onrender.com").replace(/\/+$/, "");
      const response = await fetch(`${apiBase}/users/${user.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Não foi possível atualizar a senha.");
      }

      setStatusMessage("Senha atualizada com sucesso!");
      setStatusTone("success");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Erro desconhecido ao atualizar a senha.";
      setStatusMessage(fallback);
      setStatusTone("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-black flex items-center justify-center">
        <p className="text-sm text-gray-300 animate-pulse">Carregando sua sessão...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl shadow-2xl p-10 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 via-orange-400 to-rose-500 flex items-center justify-center text-2xl font-bold text-black shadow-lg">
                {initials}
                <span className="absolute -bottom-2 right-2 bg-neutral-900 text-xs font-semibold text-yellow-300 px-2 py-1 rounded-full border border-neutral-700 shadow">
                  Sessão
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white tracking-tight">Olá, {user.name}!</h1>
                <p className="text-sm text-gray-400 mt-2">
                  Aqui você gerencia seus dados pessoais, preferências de perfil e segurança.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-yellow-300 hover:text-yellow-200 transition-colors"
            >
              <span>Voltar para o dashboard</span>
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-8 shadow-xl space-y-6">
            <header className="flex items-center gap-3">
              <Mail className="text-yellow-300" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-white">Informações pessoais</h2>
                <p className="text-xs text-gray-400">Revise seus dados de contato e preferências principais.</p>
              </div>
            </header>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wider">Email</p>
                <p className="text-sm font-medium text-white mt-1 break-all">{user.email}</p>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wider">Perfil de investidor</p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs text-yellow-200 uppercase tracking-wider">
                  <ShieldCheck size={14} />
                  <span>{user.investorProfile}</span>
                </div>
              </div>

              {user.notificationPreference && (
                <div>
                  <p className="text-xs uppercase text-gray-500 tracking-wider">Notificações</p>
                  <p className="text-sm font-medium text-gray-300 mt-1">
                    {notificationLabel(user.notificationPreference)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-8 shadow-xl space-y-6">
            <header className="flex items-center gap-3">
              <UserCog className="text-yellow-300" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-white">Preferências rápidas</h2>
                <p className="text-xs text-gray-400">Atualize seu perfil a partir do cabeçalho do dashboard.</p>
              </div>
            </header>

            <p className="text-sm text-gray-400 leading-relaxed">
              Para ajustar seu perfil de investidor ou notificações, utilize o seletor disponível no topo do dashboard.
              As recomendações serão atualizadas automaticamente com base na sua escolha.
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-yellow-300 hover:text-yellow-200 transition-colors"
            >
              <ShieldCheck size={14} />
              <span>Ir para o seletor de perfil</span>
            </Link>
          </div>
        </section>

        <section className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <header className="flex items-center gap-3 mb-6">
            <Lock className="text-yellow-300" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-white">Atualizar senha</h2>
              <p className="text-xs text-gray-400">Reforce a segurança da sua conta definindo uma nova senha forte.</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-gray-400">
              Senha atual
              <input
                type="password"
                required
                value={form.currentPassword}
                onChange={handleChange("currentPassword")}
                className="w-full rounded-lg bg-neutral-950/70 border border-neutral-800 px-3 py-2 text-sm text-white focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-gray-400">
              Nova senha
              <input
                type="password"
                required
                value={form.newPassword}
                onChange={handleChange("newPassword")}
                className="w-full rounded-lg bg-neutral-950/70 border border-neutral-800 px-3 py-2 text-sm text-white focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-gray-400">
              Confirmar nova senha
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                className="w-full rounded-lg bg-neutral-950/70 border border-neutral-800 px-3 py-2 text-sm text-white focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </label>

            <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
              {statusMessage && (
                <span
                  className={`text-xs font-medium ${
                    statusTone === "success"
                      ? "text-emerald-400"
                      : statusTone === "error"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {statusMessage}
                </span>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Atualizando..." : "Salvar nova senha"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function notificationLabel(value: string): string {
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "resumo diario":
    case "resumo_diario":
    case "daily":
      return "Resumo diário";
    case "alertas imediatos":
    case "alertas_imediatos":
    case "imediato":
    case "alertas":
      return "Alertas imediatos";
    case "sem notificacoes":
    case "sem_notificacoes":
    case "none":
    case "desativado":
      return "Sem notificações";
    default:
      return value;
  }
}
