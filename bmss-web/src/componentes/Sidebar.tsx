"use client";

import { Home, UserPlus, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const menuItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/cadastrar", icon: UserPlus, label: "Cadastrar" },
  ];

  return (
    <>
      {/* Botão Hamburguer para Mobile */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-yellow-400 hover:bg-neutral-800 transition-colors"
        aria-label={isMobileOpen ? "Fechar menu" : "Abrir menu"}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Botão Toggle para Desktop */}
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex fixed top-4 left-4 z-30 p-2 bg-neutral-900 border border-neutral-700 rounded-lg text-yellow-400 hover:bg-neutral-800 transition-colors"
        aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Overlay para Mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 h-full bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between transition-all duration-300 z-40 ${
          isOpen ? "w-64" : "w-0 lg:w-20"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col p-6 overflow-hidden">
          {/* Logo e Botão Fechar */}
          <div className="flex items-center justify-between mb-10">
            <div className={`flex items-center gap-3 ${!isOpen && "lg:justify-center"}`}>
              <Image
                src="/bmss-logo.png"
                alt="BMSS Logo"
                width={38}
                height={38}
                className="drop-shadow-[0_0_10px_#facc15]"
              />
              <span className={`text-yellow-400 font-semibold text-xl tracking-wide transition-opacity duration-300 ${
                isOpen ? "opacity-100" : "opacity-0 lg:hidden"
              }`}>
                BMSS
              </span>
            </div>
            
            {/* Botão Fechar apenas no Mobile */}
            <button
              onClick={closeMobileSidebar}
              className="lg:hidden p-1 text-gray-400 hover:text-yellow-400 transition-colors"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileSidebar}
                  className={`flex items-center gap-3 text-gray-300 hover:text-yellow-400 hover:bg-neutral-800 p-3 rounded-lg transition-all duration-200 ${
                    !isOpen && "lg:justify-center"
                  }`}
                  title={!isOpen ? item.label : ""}
                >
                  <Icon size={18} />
                  <span className={`transition-opacity duration-300 ${
                    isOpen ? "opacity-100" : "opacity-0 lg:hidden"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé */}
        <div className={`p-4 text-xs text-gray-500 text-center border-t border-neutral-800 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 lg:hidden"
        }`}>
          Bitcoin Market Sentiment
        </div>
      </aside>

      {/* Espaço para conteúdo quando sidebar recolhida */}
      <div className={`transition-all duration-300 ${
        isOpen ? "lg:ml-0" : "lg:ml-20"
      }`} />
    </>
  );
}