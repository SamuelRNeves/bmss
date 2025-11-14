"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Lock, Mail, Eye, EyeOff, Sparkles } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setLoading(true);

    try {
      const sanitizedEmail = email.trim().toLowerCase();

      if (!sanitizedEmail || !sanitizedEmail.includes("@")) {
        throw new Error("Informe um e-mail válido");
      }

      const response = await fetch(buildApiUrl("auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sanitizedEmail, password: senha }),
      });

      if (!response.ok) {
        throw new Error("Credenciais inválidas");
      }

      const data = await response.json();
      const token = data.token;

      if (!token) {
        throw new Error("Token não recebido");
      }

      // Salva o token no localStorage
      localStorage.setItem("jwtToken", token);

      // Redireciona ao dashboard
      router.push("/");
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message === "Informe um e-mail válido"
        ? err.message
        : "E-mail ou senha incorretos. Tente novamente.";
      setMensagem(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-black">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-yellow-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_55%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(250,204,21,0.15),transparent_45%)]" />
            <div className="absolute -top-12 right-6 h-32 w-32 rounded-full border border-yellow-400/40" />
            <div className="absolute bottom-10 left-14 h-16 w-16 rounded-full border border-white/10" />

            <div className="relative flex flex-col gap-6 text-white">
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-yellow-300">
                <Sparkles size={14} /> BMSS Insights
              </span>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                Entre em um painel pensado para decisões rápidas e inteligentes
              </h1>
              <p className="max-w-xl text-base text-gray-300 sm:text-lg">
                Acompanhe métricas em tempo real, descubra tendências relevantes e mantenha sua equipe alinhada com as notícias que mais importam para o seu negócio.
              </p>

              <dl className="grid gap-4 text-sm text-gray-300 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                  <dt className="font-semibold text-white">Painéis Inteligentes</dt>
                  <dd className="mt-2 text-sm text-gray-300">
                    Visualizações dinâmicas, alertas instantâneos e curadoria automática das notícias mais relevantes.
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                  <dt className="font-semibold text-white">Segurança em Primeiro Lugar</dt>
                  <dd className="mt-2 text-sm text-gray-300">
                    Login protegido, dados criptografados e monitoramento constante para garantir a sua tranquilidade.
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Uptime garantido 99,9%
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> Notificações em tempo real
                </div>
              </div>
            </div>
          </section>

          <div className="relative rounded-3xl border border-white/10 bg-neutral-900/80 p-10 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white">Acessar Painel</h2>
              <p className="mt-2 text-sm text-gray-400">Entre com suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Campo Email */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  <Mail size={16} /> E-mail
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-3 text-white transition focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  <Lock size={16} /> Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-white transition focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition hover:text-white"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
                  loading
                    ? "bg-yellow-700/80 text-black/70"
                    : "bg-yellow-400 text-black shadow-lg shadow-yellow-400/30 hover:bg-yellow-300"
                }`}
              >
                <LogIn size={18} />
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {mensagem && (
              <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-300">
                {mensagem}
              </div>
            )}

            <div className="mt-8 text-center text-sm text-gray-400">
              <p>
                Ainda não tem uma conta?{" "}
                <a href="/cadastrar" className="font-medium text-yellow-300 transition hover:text-yellow-200">
                  Cadastre-se
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
