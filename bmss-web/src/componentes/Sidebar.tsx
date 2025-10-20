"use client";

import { Home, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`fixed lg:static top-0 left-0 h-full w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex flex-col p-6">
        {/* Logo no topo */}
        <div className="flex items-center gap-3 mb-10">
          <Image
            src="/bmss-logo.png"
            alt="BMSS Logo"
            width={38}
            height={38}
            className="drop-shadow-[0_0_10px_#facc15]"
          />
          <span className="text-yellow-400 font-semibold text-xl tracking-wide">
            BMSS
          </span>
        </div>

        <nav className="flex flex-col gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-300 hover:text-yellow-400 transition"
          >
            <Home size={18} /> Home
          </Link>

          <Link
            href="/cadastrar"
            className="flex items-center gap-3 text-gray-300 hover:text-yellow-400 transition"
          >
            <UserPlus size={18} /> Cadastrar
          </Link>
        </nav>
      </div>

      <div className="p-4 text-xs text-gray-500 text-center border-t border-neutral-800">
        Bitcoin Market Sentiment
      </div>
    </aside>
  );
}
