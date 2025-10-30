"use client";

import { AlertTriangle, CheckCircle, RefreshCw, Bell, BellOff } from "lucide-react";
import { useState, useEffect } from "react";

export function StatusBar() {
  const [status, setStatus] = useState<"healthy" | "warning" | "error">("healthy");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Simular mudanças de status
    const interval = setInterval(() => {
      const statuses: Array<"healthy" | "warning" | "error"> = ["healthy", "warning", "error"];
      const randomStatus = statuses[Math.floor(Math.random() * 3)];
      setStatus(randomStatus);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
      
      if (randomStatus !== "healthy" && notificationsEnabled) {
        setUnreadCount(prev => prev + 1);
      }
    }, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  const getStatusConfig = () => {
    switch (status) {
      case "healthy":
        return { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", text: "Sistema Operacional" };
      case "warning":
        return { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", text: "Alerta: Alta Volatilidade" };
      case "error":
        return { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", text: "Erro: API Indisponível" };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const clearNotifications = () => {
    setUnreadCount(0);
  };

  return (
    <div className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          {/* Status do Sistema */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${config.bg} ${config.color}`}>
            <Icon size={14} />
            <span>{config.text}</span>
            {lastUpdate && (
              <span className="text-xs opacity-75">• {lastUpdate}</span>
            )}
          </div>

          {/* Controles de Notificação */}
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={clearNotifications}
                className="relative flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <Bell size={16} />
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              </button>
            )}
            
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className="text-gray-400 hover:text-white transition-colors"
              title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>

            <button className="text-gray-400 hover:text-yellow-400 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}