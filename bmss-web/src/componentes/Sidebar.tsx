"use client";

import { Home, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800 p-6">
        <h1 className="text-xl font-bold text-yellow-400 mb-8">BMSS</h1>

        <nav className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400">
            <Home size={20} />
            Home
          </Link>

          <Link href="/cadastrar" className="flex items-center gap-2 text-gray-300 hover:text-yellow-400">
            <UserPlus size={20} />
            Cadastrar
          </Link>
        </nav>

        <footer className="mt-auto text-sm text-gray-500">
          Bitcoin Market Sentiment
        </footer>
      </aside>

      {/* Botão mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-neutral-900 border border-neutral-700 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar mobile */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/70 z-40" onClick={() => setIsOpen(false)}>
          <aside
            className="absolute left-0 top-0 w-64 h-full bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="text-xl font-bold text-yellow-400 mb-8">BMSS</h1>
            <nav className="flex flex-col gap-4">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-gray-300 hover:text-yellow-400"
              >
                <Home size={20} />
                Home
              </Link>

              <Link
                href="/cadastrar"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-gray-300 hover:text-yellow-400"
              >
                <UserPlus size={20} />
                Cadastrar
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
