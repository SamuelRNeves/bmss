"use client";

import { useState } from "react";
import { cadastrarUsuario } from "@/lib/api";
import { Bell, Mail, User, Check, AlertCircle, Bitcoin, BarChart3 } from "lucide-react";

export default function CadastrarPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [preferencia, setPreferencia] = useState("diario");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensagem(null);

    // Validações
    if (!nome || !email) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos obrigatórios." });
      return;
    }

    if (!email.includes('@')) {
      setMensagem({ tipo: "erro", texto: "Digite um email válido." });
      return;
    }

    try {
      setLoading(true);
      const resultado = await cadastrarUsuario({ 
        name: nome, 
        email: email,
        notificationPreference: preferencia
      });
      
      if (resultado.success) {
        setMensagem({ 
          tipo: "sucesso", 
          texto: "✅ Cadastro realizado com sucesso! Verifique seu email para confirmar o recebimento dos alertas." 
        });
        
        // Limpar formulário
        setNome("");
        setEmail("");
        
      } else {
        setMensagem({ 
          tipo: "erro", 
          texto: resultado.error || "Erro ao realizar cadastro. Tente novamente." 
        });
      }
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setMensagem({ 
        tipo: "erro", 
        texto: "Erro de conexão com o servidor. Tente novamente." 
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
          {/* Card de Benefícios */}
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
                  <p className="text-gray-400 text-sm">Resumo completo do sentimento do mercado todos os dias às 18h</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full mt-1">
                  <Check className="text-blue-400" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">🚨 Alertas Inteligentes</h3>
                  <p className="text-gray-400 text-sm">Notificações sobre mudanças bruscas no sentimento do mercado</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-purple-500/20 p-2 rounded-full mt-1">
                  <Check className="text-purple-400" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">🎯 Dados em Tempo Real</h3>
                  <p className="text-gray-400 text-sm">Análises baseadas em notícias, redes sociais e fóruns especializados</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-orange-500/20 p-2 rounded-full mt-1">
                  <Check className="text-orange-400" size={16} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">💡 Insights Valiosos</h3>
                  <p className="text-gray-400 text-sm">Entenda o que o mercado está sentindo sobre o Bitcoin</p>
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

          {/* Formulário de Cadastro */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Cadastre-se para Alertas</h2>
            <p className="text-gray-400 mb-6">Preencha os dados abaixo para receber nossas análises</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Nome */}
              <div className="space-y-2">
                <label htmlFor="nome" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <User size={16} />
                  Nome completo *
                </label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>

              {/* Campo Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Mail size={16} />
                  E-mail para notificações *
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  disabled={loading}
                  required
                />
              </div>

              {/* Campo Preferência */}
              <div className="space-y-2">
                <label htmlFor="preferencia" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Bell size={16} />
                  Tipo de Notificação
                </label>
                <select
                  id="preferencia"
                  value={preferencia}
                  onChange={(event) => setPreferencia(event.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="diario">📊 Resumo Diário (Recomendado)</option>
                  <option value="imediato">🚨 Alertas Imediatos</option>
                  <option value="desativado">🔕 Sem Notificações</option>
                </select>
                <p className="text-xs text-gray-500">
                  💡 <strong>Resumo diário:</strong> Um email completo com análise detalhada todos os dias às 18h
                </p>
              </div>

              {/* Termos */}
              <div className="flex items-start gap-3 p-4 bg-neutral-800 rounded-xl">
                <div className="bg-blue-500/20 p-1 rounded-full mt-1">
                  <AlertCircle className="text-blue-400" size={14} />
                </div>
                <p className="text-gray-400 text-sm">
                  Ao se cadastrar, você concorda em receber comunicações sobre análise de sentimentos do Bitcoin. 
                  Pode cancelar a qualquer momento.
                </p>
              </div>

              {/* Botão Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full ${
                  loading 
                    ? "bg-yellow-700 cursor-not-allowed" 
                    : "bg-yellow-500 hover:bg-yellow-400 transform hover:scale-[1.02]"
                } text-black font-bold p-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <Mail size={20} />
                    Cadastrar e Receber Alertas
                  </>
                )}
              </button>
            </form>

            {/* Mensagem de Status */}
            {mensagem && (
              <div
                className={`mt-6 p-4 rounded-xl border ${
                  mensagem.tipo === "sucesso" 
                    ? "bg-green-500/20 border-green-500 text-green-400" 
                    : "bg-red-500/20 border-red-500 text-red-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {mensagem.tipo === "sucesso" ? (
                    <Check size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span>{mensagem.texto}</span>
                </div>
              </div>
            )}

            {/* Link Voltar */}
            <div className="mt-6 text-center">
              <a 
                href="/" 
                className="text-yellow-400 hover:text-yellow-300 underline transition-colors inline-flex items-center gap-2"
              >
                ← Voltar para o dashboard principal
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Bitcoin Sentiment Analysis • Monitoramento 24/7 do mercado • Análises baseadas em IA</p>
        </div>
      </div>
    </div>
  );
}