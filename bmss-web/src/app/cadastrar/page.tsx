"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cadastrarUsuario } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
  User,
  Bell,
  LineChart,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ShieldCheck,
  Activity,
} from "lucide-react";

type Strength = "weak" | "medium" | "strong";

type FormState = {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  preferencia: string;
  mostrarSenha: boolean;
};

type Feedback = {
  label: string;
  description: string;
  tone: string;
};

export default function CadastrarPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    nome: "",
    email: "",
    senha: "",
    perfil: "MODERADO",
    preferencia: "diario",
    mostrarSenha: false,
  });
  const [forcaSenha, setForcaSenha] = useState<Strength>("weak");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<
    { tipo: "sucesso" | "erro"; texto: string } | null
  >(null);

  useEffect(() => {
    const senha = form.senha;
    if (senha.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(senha)) {
      setForcaSenha("weak");
      return;
    }
    if (senha.length >= 12 && /[@$!%*?&]/.test(senha)) {
      setForcaSenha("strong");
      return;
    }
    setForcaSenha("medium");
  }, [form.senha]);

  const feedback = useMemo<Record<Strength, Feedback>>(
    () => ({
      weak: {
        label: "Senha fraca",
        description:
          "Use ao menos 8 caracteres com letras maiúsculas, minúsculas e números.",
        tone: "text-red-300",
      },
      medium: {
        label: "Boa para começar",
        description: "Um símbolo extra deixa sua conta ainda mais segura.",
        tone: "text-yellow-300",
      },
      strong: {
        label: "Senha poderosa",
        description: "Proteção máxima para acessar o painel sem preocupações.",
        tone: "text-emerald-300",
      },
    }),
    []
  );

  const insights = [
    {
      title: "Fluxo guiado",
      description:
        "Receba recomendações automáticas assim que o sentimento mudar.",
    },
    {
      title: "Monitoramento móvel",
      description: "Acompanhe métricas em cards otimizados para smartphones.",
    },
    {
      title: "Alertas certeiros",
      description:
        "Configure notificações com um clique conforme seu perfil de risco.",
    },
  ];

  const compactHighlights = [
    {
      icon: ShieldCheck,
      label: "Segurança em primeiro lugar",
    },
    {
      icon: Activity,
      label: "Insights em tempo real",
    },
  ];

  const toggleMostrarSenha = () =>
    setForm((prev) => ({ ...prev, mostrarSenha: !prev.mostrarSenha }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMensagem(null);

    const nomeLimpo = form.nome.trim();
    const emailLimpo = form.email.trim().toLowerCase();

    if (nomeLimpo.length < 3) {
      setMensagem({ tipo: "erro", texto: "Informe seu nome completo." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setMensagem({ tipo: "erro", texto: "Digite um e-mail válido." });
      return;
    }

    if (forcaSenha === "weak") {
      setMensagem({ tipo: "erro", texto: "Fortaleça sua senha antes de continuar." });
      return;
    }

    try {
      setLoading(true);
      const resultado = await cadastrarUsuario({
        name: nomeLimpo,
        email: emailLimpo,
        password: form.senha,
        notificationPreference: form.preferencia,
        investorProfile: form.perfil,
      });

      if (resultado.success && resultado.data?.token) {
        localStorage.setItem("jwtToken", resultado.data.token);
        setMensagem({
          tipo: "sucesso",
          texto: "Cadastro concluído! Redirecionando para o painel...",
        });
        setTimeout(() => router.push("/"), 1600);
      } else {
        setMensagem({
          tipo: "erro",
          texto: resultado.error || "Não foi possível concluir o cadastro.",
        });
      }
    } catch (error: any) {
      setMensagem({
        tipo: "erro",
        texto: error?.message || "Não foi possível conectar ao servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950">
      <div className="pointer-events-none absolute inset-0 opacity-90" aria-hidden>
        <div
          className="absolute -top-36 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(245,158,11,0.45)_0%,_rgba(245,158,11,0)_70%)]"
          style={{ animation: "float 18s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-20 right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.4)_0%,_rgba(56,189,248,0)_70%)]"
          style={{ animation: "float 22s ease-in-out infinite", animationDelay: "-6s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.08),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.2)_0%,rgba(15,23,42,0)_40%,rgba(250,204,21,0.1)_70%,rgba(15,23,42,0)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-12 lg:py-24">
        <section className="relative mb-16 max-w-xl space-y-10 text-white lg:mb-0 lg:w-[50%]">
          <div className="absolute -inset-8 hidden rounded-[3rem] border border-white/5 bg-white/[0.03] blur-3xl lg:block" aria-hidden />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-yellow-200">
              <Sparkles size={14} /> BMSS Insights
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Cadastre-se em segundos e acompanhe o mercado em tempo real
            </h1>
            <p className="max-w-lg text-base text-gray-300 sm:text-lg">
              Um fluxo minimalista, pensado para dispositivos móveis, que entrega apenas o essencial: dados prontos para decisões rápidas.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {insights.map((item) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-transform duration-500 hover:-translate-y-1 hover:border-yellow-300/40 hover:bg-white/10"
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-yellow-400/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative space-y-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-gray-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2 text-xs text-gray-300">
              {compactHighlights.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                >
                  <Icon size={14} className="text-yellow-200" /> {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="relative w-full max-w-md">
          <div
            className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-r from-yellow-500/70 via-yellow-300/50 to-sky-400/60 opacity-80 blur"
            aria-hidden
          />
          <div className="relative rounded-[28px] border border-white/10 bg-neutral-900/80 p-8 shadow-[0_40px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="mb-8 space-y-3 text-center">
              <h2 className="text-3xl font-bold">Criar acesso</h2>
              <p className="text-sm text-gray-400">
                Personalize alertas e métricas desde o primeiro login.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <User size={14} /> Nome completo
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Como devemos te chamar?"
                  required
                  autoComplete="name"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <Mail size={14} /> E-mail corporativo
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="voce@empresa.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  <Lock size={14} /> Crie uma senha
                </label>
                <div className="relative">
                  <input
                    type={form.mostrarSenha ? "text" : "password"}
                    value={form.senha}
                    onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
                    placeholder="Mínimo 8 caracteres, letras e números"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pr-12 pl-4 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                  />
                  <button
                    type="button"
                    onClick={toggleMostrarSenha}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 transition hover:text-white"
                    aria-label={form.mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {form.mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((index) => (
                      <div
                        // eslint-disable-next-line react/no-array-index-key
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          forcaSenha === "strong"
                            ? "bg-emerald-400"
                            : forcaSenha === "medium"
                            ? index < 2
                              ? "bg-yellow-300"
                              : "bg-gray-700"
                            : index === 0
                            ? "bg-red-400"
                            : "bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <div className={`text-xs font-medium ${feedback[forcaSenha].tone}`}>
                    {feedback[forcaSenha].label}
                  </div>
                  <p className="text-[11px] text-gray-300">
                    {feedback[forcaSenha].description}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                    <LineChart size={14} /> Perfil
                  </label>
                  <select
                    value={form.perfil}
                    onChange={(e) => setForm((prev) => ({ ...prev, perfil: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                  >
                    <option value="CONSERVADOR">Conservador</option>
                    <option value="MODERADO">Moderado</option>
                    <option value="AGRESSIVO">Agressivo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                    <Bell size={14} /> Alertas
                  </label>
                  <select
                    value={form.preferencia}
                    onChange={(e) => setForm((prev) => ({ ...prev, preferencia: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm text-white transition-all duration-300 focus:border-yellow-300 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-300/40"
                  >
                    <option value="diario">Resumo diário</option>
                    <option value="imediato">Alertas imediatos</option>
                    <option value="desativado">Sem notificações</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3 text-sm font-semibold uppercase tracking-[0.35em] transition focus:outline-none focus:ring-2 focus:ring-yellow-200/60 focus:ring-offset-2 focus:ring-offset-neutral-950 ${
                  loading
                    ? "bg-yellow-500/30 text-yellow-200"
                    : "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 text-black shadow-lg shadow-yellow-500/40"
                }`}
              >
                {!loading && (
                  <span
                    className="absolute inset-0 translate-x-[-120%] bg-white/40 transition duration-700 ease-out group-hover:translate-x-[120%]"
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center gap-3">
                  {loading ? <Activity size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  {loading ? "Processando" : "Cadastrar e acessar"}
                </span>
              </button>
            </form>

            {mensagem && (
              <div
                className={`mt-6 rounded-2xl border p-4 text-center text-xs ${
                  mensagem.tipo === "sucesso"
                    ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                    : "border-red-400/50 bg-red-500/10 text-red-200"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {mensagem.tipo === "sucesso" ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{mensagem.texto}</span>
                </div>
              </div>
            )}

            <div className="mt-8 text-center text-xs text-gray-400">
              <p>
                Já possui uma conta?{" "}
                <a href="/login" className="font-medium text-yellow-200 transition hover:text-yellow-100">
                  Faça login
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
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
