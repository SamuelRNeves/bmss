"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import {
  ChevronDown,
  Flame,
  GaugeCircle,
  Loader2,
  LogOut,
  Shield,
  User,
} from "lucide-react";

type InvestorProfile = "CONSERVADOR" | "MODERADO" | "AGRESSIVO";

const PROFILE_OPTIONS: {
  value: InvestorProfile;
  label: string;
  description: string;
  icon: JSX.Element;
}[] = [
  {
    value: "CONSERVADOR",
    label: "Conservador",
    description: "Prioriza proteção e estabilidade nas posições.",
    icon: <Shield size={14} className="text-emerald-300" />,
  },
  {
    value: "MODERADO",
    label: "Moderado",
    description: "Equilibra risco e retorno com ajustes constantes.",
    icon: <GaugeCircle size={14} className="text-sky-300" />,
  },
  {
    value: "AGRESSIVO",
    label: "Agressivo",
    description: "Busca oportunidades rápidas assumindo mais risco.",
    icon: <Flame size={14} className="text-red-300" />,
  },
];

export default function Header() {
  const { user, logout, updateInvestorProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const currentProfile = useMemo<InvestorProfile>(() => {
    const resolved = user?.investorProfile?.toUpperCase() as InvestorProfile | undefined;
    if (resolved === "CONSERVADOR" || resolved === "AGRESSIVO" || resolved === "MODERADO") {
      return resolved;
    }
    return "MODERADO";
  }, [user?.investorProfile]);

  const activeOption = PROFILE_OPTIONS.find((option) => option.value === currentProfile) ?? PROFILE_OPTIONS[1];

  const userInitials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) {
      return "";
    }
    const parts = name.split(/\s+/);
    if (parts.length === 1) {
      return parts[0][0]?.toUpperCase() ?? "";
    }
    const first = parts[0][0]?.toUpperCase() ?? "";
    const last = parts[parts.length - 1][0]?.toUpperCase() ?? "";
    return `${first}${last}`;
  }, [user?.name]);

  const hasProfileImage = Boolean(user?.profileImageUrl);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleSelectProfile = async (value: InvestorProfile) => {
    if (value === currentProfile) {
      setMenuOpen(false);
      return;
    }

    if (!user) {
      setMenuOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateInvestorProfile(value);
    } catch (error) {
      console.error("Falha ao alterar perfil diretamente no cabeçalho:", error);
      alert("Não foi possível atualizar o perfil. Tente novamente em instantes.");
    } finally {
      setIsUpdating(false);
      setMenuOpen(false);
    }
  };

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-neutral-900 border-b border-neutral-800">
      <h1 className="text-xl font-bold text-yellow-400">BMSS Dashboard</h1>

      {user ? (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Link
              href="/sessao"
              className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/40 bg-yellow-500/10 transition hover:border-yellow-300/80 hover:bg-yellow-500/20"
              title="Abrir sessão do usuário"
            >
              {hasProfileImage ? (
                <Image
                  src={user?.profileImageUrl ?? ""}
                  alt={user?.name ? `Foto de ${user.name}` : "Foto do usuário"}
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              ) : userInitials ? (
                <span className="text-xs font-bold tracking-wider text-yellow-200 group-hover:text-yellow-100">
                  {userInitials}
                </span>
              ) : (
                <User size={18} className="text-yellow-300" />
              )}
              <span className="pointer-events-none absolute inset-x-2 -bottom-2 rounded-full bg-neutral-900/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-yellow-400 opacity-0 shadow-lg transition group-hover:bottom-1 group-hover:opacity-100">
                sessão
              </span>
            </Link>
            <div className="text-right" ref={menuRef}>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  disabled={isUpdating}
                  className="flex items-center justify-end gap-1 text-xs text-gray-300 bg-neutral-800/60 hover:bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700 transition-colors w-full"
                >
                  {isUpdating ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <span>{activeOption.label.toUpperCase()}</span>
                  )}
                  <ChevronDown size={12} className="opacity-70" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-lg p-2 z-50">
                    <p className="text-[11px] text-gray-500 mb-2">Escolha o perfil para ajustar suas recomendações.</p>
                    <div className="space-y-1">
                      {PROFILE_OPTIONS.map((option) => {
                        const isActive = option.value === currentProfile;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelectProfile(option.value)}
                            disabled={isUpdating}
                            className={`w-full text-left text-xs rounded-lg px-3 py-2 border transition-colors flex items-start gap-2 ${
                              isActive
                                ? "border-yellow-400/80 bg-yellow-500/10 text-yellow-200"
                                : "border-transparent hover:bg-neutral-800 text-gray-300"
                            }`}
                          >
                            <span className="mt-0.5">{option.icon}</span>
                            <span>
                              <span className="block font-semibold tracking-wide">{option.label}</span>
                              <span className="block text-[10px] text-gray-400 leading-snug">
                                {option.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
