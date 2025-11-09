"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: senha }),
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
      setMensagem("E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Acessar Painel</h1>
          <p className="text-gray-400 text-sm">Entre com suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Campo Email */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <Mail size={16} /> E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Campo Senha */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <Lock size={16} /> Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
              className="w-full p-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition ${
              loading
                ? "bg-yellow-700 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-400 text-black"
            }`}
          >
            <LogIn size={18} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {mensagem && (
          <div className="mt-4 text-center text-red-400 bg-red-500/10 border border-red-600 p-3 rounded-lg text-sm">
            {mensagem}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Ainda não tem uma conta?{" "}
            <a href="/cadastrar" className="text-yellow-400 hover:text-yellow-300 font-medium">
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
