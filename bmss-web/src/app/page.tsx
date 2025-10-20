"use client";

import { useState } from "react";
import axios from "axios";

export default function CadastrarPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    if (!nome || !email) {
      setMensagem({ tipo: "erro", texto: "Preencha todos os campos." });
      return;
    }

    try {
      setLoading(true);
      // 🔗 Substituir URL pelo endpoint real do seu backend
      const res = await axios.post("http://localhost:8080/api/v1/usuarios", {
        nome,
        email,
      });

      if (res.status === 201 || res.status === 200) {
        setMensagem({ tipo: "sucesso", texto: "Usuário cadastrado com sucesso!" });
        setNome("");
        setEmail("");
      } else {
        setMensagem({ tipo: "erro", texto: "Erro ao cadastrar usuário." });
      }
    } catch (error) {
      console.error(error);
      setMensagem({ tipo: "erro", texto: "Falha na conexão com o servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h2 className="text-2xl font-semibold text-yellow-400">Cadastrar Usuário</h2>
      <p className="text-gray-400 text-sm">
        O cadastro é opcional. Você pode acessar todas as funções sem criar conta.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col gap-4"
      >
        <input
          type="text"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="bg-neutral-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-neutral-800 text-white p-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          type="submit"
          disabled={loading}
          className={`${
            loading
              ? "bg-yellow-700 cursor-not-allowed"
              : "bg-yellow-500 hover:bg-yellow-400"
          } text-black font-semibold p-3 rounded-lg transition`}
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>

      {/* Mensagem de sucesso ou erro */}
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
    </div>
  );
}
