"use client";

import { Filter, X } from "lucide-react";
import { useState } from "react";

interface SentimentFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  sentiment: string;
  source: string;
  dateRange: string;
  minScore: number;
}

export function SentimentFilters({ onFilterChange }: SentimentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sentiment: "all",
    source: "all",
    dateRange: "24h",
    minScore: 0,
  });

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      sentiment: "all",
      source: "all",
      dateRange: "24h",
      minScore: 0,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg px-4 py-2 text-gray-300 transition-colors"
      >
        <Filter size={16} />
        Filtros
        {filters.sentiment !== "all" && (
          <span className="bg-yellow-400 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
            1
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar clicando fora */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-12 left-0 bg-neutral-900 border border-neutral-700 rounded-lg p-4 w-64 shadow-xl z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Filtros</h3>
              <button
                onClick={clearFilters}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Sentimento</label>
                <select
                  value={filters.sentiment}
                  onChange={(e) => handleFilterChange("sentiment", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="all">Todos</option>
                  <option value="positive">Positivo</option>
                  <option value="negative">Negativo</option>
                  <option value="neutral">Neutro</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Período</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="1h">Última hora</option>
                  <option value="24h">Últimas 24h</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Confiança Mínima: {filters.minScore}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => handleFilterChange("minScore", parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <style jsx>{`
                  .slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #facc15;
                    cursor: pointer;
                  }
                  .slider::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #facc15;
                    cursor: pointer;
                    border: none;
                  }
                `}</style>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}