"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  duration?: number;
}

export function ToastNotifier() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Escutar eventos globais de notificação
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const { type, title, message, duration = 5000 } = event.detail;
      
      const newToast: Toast = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        title,
        message,
        duration
      };

      setToasts(prev => [...prev, newToast]);

      // Auto-remover após duração
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
      }, duration);
    };

    // @ts-ignore
    window.addEventListener('showToast', handleNewNotification);

    return () => {
      // @ts-ignore
      window.removeEventListener('showToast', handleNewNotification);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastConfig = (type: Toast["type"]) => {
    const config = {
      info: { icon: Info, color: "bg-blue-500", iconColor: "text-blue-500" },
      success: { icon: CheckCircle, color: "bg-green-500", iconColor: "text-green-500" },
      warning: { icon: AlertTriangle, color: "bg-yellow-500", iconColor: "text-yellow-500" },
      error: { icon: AlertTriangle, color: "bg-red-500", iconColor: "text-red-500" },
    };
    return config[type];
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => {
        const { icon: Icon, color, iconColor } = getToastConfig(toast.type);
        
        return (
          <div
            key={toast.id}
            className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 shadow-lg animate-in slide-in-from-right duration-300"
          >
            <div className="flex items-start gap-3">
              <div className={`p-1 rounded-full ${color} bg-opacity-10`}>
                <Icon size={16} className={iconColor} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h4 className="text-white font-semibold text-sm">
                    {toast.title}
                  </h4>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-gray-400 hover:text-white transition-colors ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <p className="text-gray-300 text-sm mt-1">
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Função helper para disparar toasts
export function showToast(
  type: Toast["type"], 
  title: string, 
  message: string, 
  duration?: number
) {
  const event = new CustomEvent('showToast', {
    detail: { type, title, message, duration }
  });
  window.dispatchEvent(event);
}