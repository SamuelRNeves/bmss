"use client";

import { useState } from "react";
import { cadastrarUsuario } from "@/lib/api";
import { Bell, Mail, User, Lock, Check, AlertCircle, Bitcoin, BarChart3, LineChart } from "lucide-react";

export default function CadastrarPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("MODERADO");
  const [preferencia, setPreferencia] = useState("diario");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensagem(null);

    if (!nome || !email || !senha) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos obrigatórios." });
      return;
    }

    if (!email.includes("@")) {
      setMensagem({ tipo: "erro", texto: "Digite um email válido." });
      return;
    }

    try {
      setLoading(true);
      const resultado = await cadastrarUsuario({
        name: nome,
        email: email,
        password: senha,
        notificationPreference: preferencia,
        investorProfile: perfil,
      });

      if (resultado.success) {
        setMensagem({
          tipo: "sucesso",
          texto: "Cadastro realizado com sucesso! Você pode fazer login agora.",
        });
        setNome("");
        setEmail("");
        setSenha("");
        setPerfil("MODERADO");
      } else {
        setMensagem({
          tipo: "erro",
          texto: resultado.error || "Erro ao realizar cadastro. Tente novamente.",
        });
      }
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setMensagem({
        tipo: "erro",
        texto: "Erro de conexão com o servidor. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-yellow-500 p-3 rounded-full">
              <Bitcoin className="text-black" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-white">Bitcoin Sentiment Analysis</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Cadastre-se para receber análises inteligentes do mercado Bitcoin baseadas em sentimentos
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Card lateral de informações */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-yellow-400 mb-6 flex items-center gap-3">
              <BarChart3 size={28} />
              Por que se cadastrar?
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500/20 p-2 rounded-full mt-1">
                  <Check className="text-green-400" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">📊 Análises Diárias</h3>
                  <p className="text-gray-400 text-sm">
                    Resumo completo do sentimento do mercado todos os dias às 18h
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full mt-1">
                  <Check className="text-blue-400" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">🚨 Alertas Inteligentes</h3>
                  <p className="text-gray-400 text-sm">
                    Notificações sobre mudanças bruscas no sentimento do mercado
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 p-2 rounded-full mt-1">
                  <Check className="text-purple-400" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">🎯 Dados em Tempo Real</h3>
                  <p className="text-gray-400 text-sm">
                    Análises baseadas em notícias, redes sociais e fóruns especializados
                  </p>
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="mt-8 p-4 bg-neutral-800 rounded-xl">
              <h4 className="text-white font-semibold mb-3">📈 Nosso Alcance</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">500+</div>
                  <div className="text-gray-400 text-sm">Fontes analisadas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">24/7</div>
                  <div className="text-gray-400 text-sm">Monitoramento</div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Criar Conta</h2>
            <p className="text-gray-400 mb-6">Preencha seus dados para acessar o sistema</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <User size={16} /> Nome completo *
                </label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Mail size={16} /> E-mail *
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
                  required
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Lock size={16} /> Senha *
                </label>
                <input
                  type="password"
                  placeholder="Crie uma senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
                  required
                />
              </div>

              {/* Perfil de Investidor */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <LineChart size={16} /> Perfil de Investidor
                </label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
                >
                  <option value="CONSERVADOR">Conservador</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="AGRESSIVO">Agressivo</option>
                </select>
              </div>

              {/* Preferência de Notificação */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Bell size={16} /> Tipo de Notificação
                </label>
                <select
                  value={preferencia}
                  onChange={(e) => setPreferencia(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
                >
                  <option value="diario">Resumo Diário</option>
                  <option value="imediato">Alertas Imediatos</option>
                  <option value="desativado">Sem Notificações</option>
                </select>
              </div>

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${
                  loading
                    ? "bg-yellow-700 cursor-not-allowed"
                    : "bg-yellow-500 hover:bg-yellow-400"
                } text-black font-bold p-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3`}
              >
                {loading ? "Processando..." : "Cadastrar e Acessar"}
              </button>
            </form>

            {mensagem && (
              <div
                className={`mt-6 p-4 rounded-xl border ${
                  mensagem.tipo === "sucesso"
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : "bg-red-500/20 border-red-500 text-red-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {mensagem.tipo === "sucesso" ? <Check size={20} /> : <AlertCircle size={20} />}
                  <span>{mensagem.texto}</span>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-yellow-400 hover:text-yellow-300 underline transition-colors inline-flex items-center gap-2"
              >
                Já tem uma conta? Faça login →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
