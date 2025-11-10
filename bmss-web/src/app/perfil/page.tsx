"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, LineChart, User, Save, ArrowLeft } from "lucide-react";

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [investorProfile, setInvestorProfile] = useState("MODERADO");
  const [notificationPreference, setNotificationPreference] = useState("diario");

 useEffect(() => {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    router.push("/login");
    return;
  }

  fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "https://bmss-backend.onrender.com"}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Sessão expirada");
      const data = await res.json();
      if (!data || !data.email) throw new Error("Resposta inválida do servidor");

      setUser(data);
      setInvestorProfile(data.investorProfile || "MODERADO");
      setNotificationPreference(data.notificationPreference || "diario");
    })
    .catch(() => {
      localStorage.removeItem("jwtToken");
      router.push("/login");
    })
    .finally(() => setLoading(false));
}, [router]);


  const handleSalvar = async () => {
    if (!user) return;
    const token = localStorage.getItem("jwtToken");
    setSaving(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "https://bmss-backend.onrender.com"}/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            investorProfile,
            notificationPreference,
          }),
        }
      );

      if (!response.ok) throw new Error("Erro ao salvar alterações");
      alert("✅ Perfil atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("❌ Erro ao salvar as alterações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="text-gray-400 p-8 text-center">Carregando perfil...</div>;

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
              <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                <LineChart size={18} /> Perfil de Investidor
              </label>
              <select
                value={investorProfile}
                onChange={(e) => setInvestorProfile(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-white p-4 rounded-xl"
              >
                <option value="CONSERVADOR">Conservador</option>
                <option value="MODERADO">Moderado</option>
                <option value="AGRESSIVO">Agressivo</option>
              </select>
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
