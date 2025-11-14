"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle,
  Loader2,
  MessageCircle,
  Newspaper,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getNotifications,
  type NotificationPayload,
  type NotificationSentiment,
} from "@/lib/api";

const SENTIMENT_LABELS: Record<NotificationSentiment, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
};

const SENTIMENT_BADGES: Record<NotificationSentiment, string> = {
  positive: "bg-emerald-500/10 text-emerald-300",
  neutral: "bg-slate-500/10 text-slate-200",
  negative: "bg-rose-500/10 text-rose-300",
};

function getNotificationIcon(notification: NotificationPayload) {
  if (notification.category === "summary") {
    return <Activity size={16} className="text-sky-300" />;
  }

  if (notification.category === "tweet") {
    if (notification.sentiment === "positive") {
      return <TrendingUp size={16} className="text-emerald-300" />;
    }
    if (notification.sentiment === "negative") {
      return <TrendingDown size={16} className="text-rose-400" />;
    }
    return <MessageCircle size={16} className="text-slate-300" />;
  }

  if (notification.sentiment === "positive") {
    return <TrendingUp size={16} className="text-emerald-300" />;
  }
  if (notification.sentiment === "negative") {
    return <AlertTriangle size={16} className="text-rose-400" />;
  }
  return <Newspaper size={16} className="text-slate-300" />;
}

function getCategoryLabel(notification: NotificationPayload): string {
  switch (notification.category) {
    case "tweet":
      return "Tweet analisado";
    case "summary":
      return "Resumo de sentimento";
    default:
      return "Notícia analisada";
  }
}

export function StatusBar() {
  const [summary, setSummary] = useState<NotificationPayload | null>(null);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  const seenIdsRef = useRef<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);

  const formatTimestamp = useCallback((value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const now = new Date();
    const sameDay = parsed.toDateString() === now.toDateString();
    const timePart = parsed.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (sameDay) {
      return timePart;
    }

    return `${parsed.toLocaleDateString("pt-BR")} ${timePart}`;
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getNotifications(8);

      const summaryEntry = response.data.find((item) => item.category === "summary") ?? null;
      const others = response.data.filter((item) => item.category !== "summary");

      setSummary(summaryEntry);
      setNotifications(others);
      setInfoMessage(response.message ?? null);
      setError(response.error ?? null);

      const sourceTime =
        response.meta.generatedAt || summaryEntry?.publishedAt || others[0]?.publishedAt;
      const computedLastUpdate = formatTimestamp(sourceTime ?? new Date().toISOString());
      setLastUpdate(computedLastUpdate);

      const visibleIds = new Set(others.map((item) => item.id));
      const preservedSeen = new Set<string>();
      visibleIds.forEach((id) => {
        if (seenIdsRef.current.has(id)) {
          preservedSeen.add(id);
        }
      });
      seenIdsRef.current = preservedSeen;

    const newUnread = new Set<string>();
    others.forEach((item) => {
      if (!seenIdsRef.current.has(item.id)) {
        newUnread.add(item.id);
      }
    });
    setUnreadIds(newUnread);
    } finally {
      setIsLoading(false);
    }
  }, [formatTimestamp]);

  useEffect(() => {
    fetchNotifications().catch((reason) => {
      console.error("Falha ao carregar notificações:", reason);
    });
  }, [fetchNotifications]);

  useEffect(() => {
    if (!notificationsEnabled) {
      return;
    }

    const interval = setInterval(() => {
      fetchNotifications().catch((reason) => {
        console.error("Falha ao atualizar notificações:", reason);
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [notificationsEnabled, fetchNotifications]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !bellButtonRef.current?.contains(target)
      ) {
        setPanelOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const nextSeen = new Set(seenIdsRef.current);
    notifications.forEach((item) => {
      nextSeen.add(item.id);
    });
    seenIdsRef.current = nextSeen;
    setUnreadIds(new Set<string>());
  }, [panelOpen, notifications]);

  const unreadCount = unreadIds.size;

  const statusTone: NotificationSentiment = summary?.sentiment ?? "neutral";
  const statusConfig = useMemo(() => {
    switch (statusTone) {
      case "positive":
        return {
          icon: CheckCircle,
          color: "text-emerald-300",
          bg: "bg-emerald-500/10",
          label: summary?.title ?? "Mercado otimista",
        };
      case "negative":
        return {
          icon: AlertTriangle,
          color: "text-rose-300",
          bg: "bg-rose-500/10",
          label: summary?.title ?? "Alerta de pressão vendedora",
        };
      default:
        return {
          icon: Activity,
          color: "text-sky-300",
          bg: "bg-sky-500/10",
          label: summary?.title ?? "Sentimento equilibrado",
        };
    }
  }, [statusTone, summary?.title]);

  const StatusIcon = statusConfig.icon;

  const handleToggleNotifications = useCallback(() => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      if (next) {
        fetchNotifications().catch((reason) => {
          console.error("Falha ao reativar notificações:", reason);
        });
      }
      return next;
    });
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    fetchNotifications().catch((reason) => {
      console.error("Falha ao atualizar notificações manualmente:", reason);
    });
  }, [fetchNotifications]);

  const handleMarkAllAsRead = useCallback(() => {
    const nextSeen = new Set(seenIdsRef.current);
    notifications.forEach((item) => {
      nextSeen.add(item.id);
    });
    seenIdsRef.current = nextSeen;
    setUnreadIds(new Set<string>());
  }, [notifications]);

  const renderNotification = useCallback(
    (notification: NotificationPayload) => {
      const icon = getNotificationIcon(notification);
      const sentimentLabel = SENTIMENT_LABELS[notification.sentiment];
      const sentimentBadge = SENTIMENT_BADGES[notification.sentiment];
      const timestamp = formatTimestamp(notification.publishedAt);
      const categoryLabel = getCategoryLabel(notification);
      const showDescription =
        notification.description && notification.description !== notification.title;

      return (
        <div
          key={notification.id}
          className="group flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/70 p-3 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
        >
          <div className="mt-1 text-sm">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                {categoryLabel}
              </span>
              {timestamp && (
                <span className="text-[10px] text-gray-500 whitespace-nowrap">{timestamp}</span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-white leading-snug line-clamp-2">
              {notification.title}
            </p>
            {showDescription && (
              <p className="mt-1 text-xs text-gray-400 leading-snug line-clamp-3">
                {notification.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${sentimentBadge}`}
              >
                {sentimentLabel}
              </span>
              {notification.source && <span>{notification.source}</span>}
              {typeof notification.score === "number" && Number.isFinite(notification.score) && (
                <span>Conf. {Math.round(Math.abs(notification.score) * 100)}%</span>
              )}
              {notification.url && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(notification.url, "_blank", "noopener");
                  }}
                  className="ml-auto text-[11px] text-yellow-300 underline decoration-dotted transition-colors hover:text-yellow-200"
                >
                  Ver fonte
                </button>
              )}
            </div>
          </div>
        </div>
      );
    },
    [formatTimestamp]
  );

  return (
    <div className="relative z-30 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 py-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${statusConfig.bg} ${statusConfig.color}`}
            >
              <StatusIcon size={14} />
              <span className="font-medium tracking-wide">
                {statusConfig.label}
              </span>
              {lastUpdate && (
                <span className="text-xs text-gray-400">• {lastUpdate}</span>
              )}
            </div>
            {summary?.description && (
              <p className="text-xs text-gray-400 md:max-w-xl">
                {summary.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="relative">
              <button
                ref={bellButtonRef}
                type="button"
                onClick={() => setPanelOpen((prev) => !prev)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-gray-300 transition-colors hover:border-neutral-700 hover:text-white"
              >
                <BellRing size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {panelOpen && (
                <div
                  ref={panelRef}
                  className="absolute right-0 z-50 mt-3 w-96 max-w-[90vw] rounded-2xl border border-neutral-800 bg-neutral-950/95 p-4 shadow-2xl backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">Notificações</p>
                      <p className="text-xs text-gray-500">
                        {notificationsEnabled
                          ? "Atualizações automáticas a cada minuto."
                          : "Atualizações pausadas."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-100"
                    >
                      Marcar como lidas
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {isLoading && (
                      <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-gray-400">
                        <Loader2 size={14} className="animate-spin" />
                        Atualizando notificações...
                      </div>
                    )}

                    {error && (
                      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {error}
                      </div>
                    )}

                    {summary && (
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-sm">{getNotificationIcon(summary)}</div>
                          <div className="flex-1">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">
                              {getCategoryLabel(summary)}
                            </p>
                            <p className="text-sm font-semibold text-white leading-snug">
                              {summary.title}
                            </p>
                            {summary.description && (
                              <p className="mt-1 text-xs text-gray-400 leading-snug">
                                {summary.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                              <span
                                className={`px-2 py-0.5 rounded-full font-medium ${SENTIMENT_BADGES[summary.sentiment]}`}
                              >
                                {SENTIMENT_LABELS[summary.sentiment]}
                              </span>
                              {summary.source && <span>{summary.source}</span>}
                              {summary.publishedAt && (
                                <span>{formatTimestamp(summary.publishedAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 && !isLoading && !error ? (
                        <p className="py-6 text-center text-xs text-gray-500">
                          Nenhuma notificação disponível no momento.
                        </p>
                      ) : (
                        notifications.map((notification) => renderNotification(notification))
                      )}
                    </div>

                    {infoMessage && (
                      <p className="text-[10px] text-gray-500">{infoMessage}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleNotifications}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-gray-300 transition-colors hover:border-neutral-700 hover:text-white"
              title={
                notificationsEnabled
                  ? "Pausar atualizações automáticas"
                  : "Reativar atualizações"
              }
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-gray-300 transition-colors hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}