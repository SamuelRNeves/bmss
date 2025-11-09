"use client";

import { useAuth } from "@/lib/useAuth";
import { LogOut, User } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-neutral-900 border-b border-neutral-800">
      <h1 className="text-xl font-bold text-yellow-400">BMSS Dashboard</h1>

      {user ? (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-full">
              <User size={18} className="text-yellow-400" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-gray-400">{user.investorProfile}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Carregando...</p>
      )}
    </header>
  );
}
