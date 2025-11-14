"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  LineChart,
  User,
  Save,
  ArrowLeft,
  Shield,
  GaugeCircle,
  Flame,
} from "lucide-react";
import { buildApiUrl } from "@/lib/api";

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [investorProfile, setInvestorProfile] = useState("MODERADO");
  const [notificationPreference, setNotificationPreference] = useState("diario");

  // ✅ useEffect CORRIGIDO - sem loop
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      router.push("/login");
      return;
    }

    let mounted = true;

    const fetchUser = async () => {
      try {
        const response = await fetch(buildApiUrl("auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Sessão expirada");
        
        const data = await response.json();
        if (!data || !data.email) throw new Error("Resposta inválida do servidor");

        if (mounted) {
          setUser(data);
          setInvestorProfile(data.investorProfile || "MODERADO");
          setNotificationPreference(data.notificationPreference || "diario");
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        if (mounted) {
          localStorage.removeItem("jwtToken");
          // ✅ Navigate sem causar re-render
          setTimeout(() => router.push("/login"), 0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []); // ✅ Array VAZIO - executa apenas uma vez

  const handleSalvar = async () => {
    if (!user) return;
    const token = localStorage.getItem("jwtToken");
    setSaving(true);

    try {
      const response = await fetch(buildApiUrl(`users/${user.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          investorProfile,
          notificationPreference,
        }),
      });

      if (!response.ok) throw new Error("Erro ao salvar alterações");

      setUser((prev: any) =>
        prev
          ? {
              ...prev,
              investorProfile,
              notificationPreference,
            }
          : prev
      );

      window.dispatchEvent(
        new CustomEvent("bmss:profile-updated", {
          detail: { investorProfile, notificationPreference },
        })
      );

      alert("✅ Perfil atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao salvar as alterações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 p-8 text-center">Carregando perfil...</div>;
  }

  const profileOptions = [
    {
      value: "CONSERVADOR",
      label: "Conservador",
      description: "Foco em preservação de capital e movimentos calculados.",
      icon: <Shield size={18} className="text-emerald-300" />,
    },
    {
      value: "MODERADO",
      label: "Moderado",
      description: "Equilibra risco e retorno com rebalanceamentos frequentes.",
      icon: <GaugeCircle size={18} className="text-sky-300" />,
    },
    {
      value: "AGRESSIVO",
      label: "Agressivo",
      description: "Busca oportunidades rápidas, tolerando volatilidade maior.",
      icon: <Flame size={18} className="text-red-300" />,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 to-neutral-900 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-yellow-400 hover:text-yellow-300 flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Voltar ao Dashboard
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <User size={28} /> Meu Perfil
          </h1>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Nome</label>
              <input
                type="text"
                value={user?.name || ""}
                readOnly
                className="w-full bg-neutral-800 border border-neutral-700 text-gray-300 p-4 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">E-mail</label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full bg-neutral-800 border border-neutral-700 text-gray-300 p-4 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-3 flex items-center gap-2">
                <LineChart size={18} /> Perfil de Investidor
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {profileOptions.map((option) => {
                  const isActive = investorProfile === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setInvestorProfile(option.value)}
                      className={`text-left rounded-xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        isActive
                          ? "border-yellow-400 bg-neutral-800"
                          : "border-neutral-700 bg-neutral-900 hover:border-neutral-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        {option.icon}
                        {option.label}
                      </div>
                      <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                <Bell size={18} /> Preferência de Notificação
              </label>
              <select
                value={notificationPreference}
                onChange={(e) => setNotificationPreference(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
              >
                <option value="diario">Resumo Diário</option>
                <option value="imediato">Alertas Imediatos</option>
                <option value="desativado">Sem Notificações</option>
              </select>
            </div>

            <button
              onClick={handleSalvar}
              disabled={saving}
              className={`w-full mt-6 ${
                saving ? "bg-yellow-700" : "bg-yellow-500 hover:bg-yellow-400"
              } text-black font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition`}
            >
              <Save size={18} />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}