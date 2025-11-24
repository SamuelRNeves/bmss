"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";
import { AUTH_TOKEN_CHANGED_EVENT } from "@/lib/useAuth";

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
      window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));

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

  const suggestions = [
    {
      title: "Alertas inteligentes",
      description: "Automatize o envio de insights críticos assim que eles surgirem.",
    },
    {
      title: "Equipe em sintonia",
      description: "Convide analistas e tome decisões colaborativas em tempo real.",
    },
    {
      title: "Dashboard personalizado",
      description: "Escolha quais métricas entram em destaque no seu início de dia.",
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div
          className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(250,204,21,0.45)_0%,_rgba(250,204,21,0)_70%)]"
          style={{ animation: "float 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-14rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.4)_0%,_rgba(56,189,248,0)_70%)]"
          style={{ animation: "float 22s ease-in-out infinite", animationDelay: "-6s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,250,249,0.1),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.2)_0%,rgba(15,23,42,0)_40%,rgba(250,204,21,0.1)_70%,rgba(15,23,42,0)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-12 lg:py-24">
        <section className="relative mb-16 max-w-xl space-y-10 text-white lg:mb-0 lg:w-[50%]">
          <div className="absolute -inset-8 hidden rounded-[3rem] border border-white/5 bg-white/[0.03] blur-3xl lg:block" aria-hidden />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-yellow-200">
              <Sparkles size={14} /> BMSS 2.0
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Uma experiência de login digna da sua próxima decisão
            </h1>
            <p className="max-w-lg text-base text-gray-300 sm:text-lg">
              Envolvemos os dados certos em uma interface suave, com foco absoluto na ação. Entre em um ambiente minimalista, rápido e pronto para surpreender seus clientes.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map((item) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-transform duration-500 hover:-translate-y-1 hover:border-yellow-300/40 hover:bg-white/10"
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-yellow-400/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative space-y-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-gray-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/cadastrar"
              className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-yellow-200 transition hover:border-yellow-200/60 hover:bg-yellow-200/20"
            >
              Criar minha conta <ArrowRight size={14} />
            </a>
          </div>
        </section>

        <div className="relative w-full max-w-md">
          <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-r from-yellow-500/70 via-yellow-300/50 to-sky-400/60 opacity-80 blur" aria-hidden />
          <div className="relative rounded-[28px] border border-white/10 bg-neutral-900/80 p-8 shadow-[0_40px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="mb-8 space-y-3 text-center">
              <h2 className="text-3xl font-bold">Bem-vindo de volta</h2>
              <p className="text-sm text-gray-400">
                Use seu e-mail corporativo para destravar as análises em tempo real.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <Mail size={14} /> E-mail
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <Lock size={14} /> Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="********"
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-12 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 transition hover:text-white"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3 text-sm font-semibold uppercase tracking-[0.35em] transition focus:outline-none focus:ring-2 focus:ring-yellow-200/60 focus:ring-offset-2 focus:ring-offset-neutral-950 ${
                  loading ? "bg-yellow-500/30 text-yellow-200" : "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black shadow-lg shadow-yellow-500/40"
                }`}
              >
                {!loading && (
                  <span className="absolute inset-0 translate-x-[-120%] bg-white/40 transition duration-700 ease-out group-hover:translate-x-[120%]" aria-hidden />
                )}
                <span className="relative flex items-center gap-3">
                  <LogIn size={18} />
                  {loading ? "Entrando" : "Entrar"}
                </span>
              </button>
            </form>

            {mensagem && (
              <div className="mt-6 rounded-2xl border border-red-400/50 bg-red-500/10 p-4 text-center text-xs text-red-200">
                {mensagem}
              </div>
            )}

            <div className="mt-8 text-center text-xs text-gray-400">
              <p>
                Precisa de acesso?{" "}
                <a href="/cadastrar" className="font-medium text-yellow-200 transition hover:text-yellow-100">
                  Solicite credenciais
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -18px, 0) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}