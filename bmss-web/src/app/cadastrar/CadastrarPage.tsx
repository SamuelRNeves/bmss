"use client";

import { useState } from "react";
import { cadastrarUsuario } from "@/lib/api";

export default function CadastrarPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensagem(null);

    // Validações simplificadas
    if (!nome || !email) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos." });
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
        email: email 
        // REMOVIDO: password
      });
      
      if (resultado.success) {
        setMensagem({ 
          tipo: "sucesso", 
          texto: "Cadastro realizado com sucesso! Você receberá alertas sobre o sentimento do mercado Bitcoin." 
        });
        
        // Limpar formulário
        setNome("");
        setEmail("");
        
      } else {
        setMensagem({ 
          tipo: "erro", 
          texto: resultado.error || "Erro ao realizar cadastro." 
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
    <div className="flex flex-col gap-6 max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-semibold text-yellow-400">Cadastrar para Alertas</h2>
      <p className="text-gray-400 text-sm">
        Cadastre seu email para receber notificações personalizadas sobre o sentimento do mercado Bitcoin.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="nome" className="text-sm text-gray-300">
            Nome completo
          </label>
          <input
            id="nome"
            type="text"
            placeholder="Seu nome completo"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="bg-neutral-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm text-gray-300">
            E-mail para notificações
          </label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-neutral-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`${
            loading 
              ? "bg-yellow-700 cursor-not-allowed" 
              : "bg-yellow-500 hover:bg-yellow-400"
          } text-black font-semibold p-3 rounded-lg transition mt-2`}
        >
          {loading ? "Cadastrando..." : "Receber Alertas"}
        </button>
      </form>

      {mensagem && (
        <div
          className={`p-3 rounded-lg text-center font-medium ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600 text-white" 
              : "bg-red-600 text-white"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        <a href="/" className="text-yellow-400 hover:text-yellow-300 underline">
          ← Voltar para o dashboard
        </a>
      </div>
    </div>
  );
}