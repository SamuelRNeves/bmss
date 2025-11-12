"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  ImageOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserCog,
  Upload,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const NOTIFICATION_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "alertas_imediatos",
    label: "Alertas imediatos",
    description: "Receba uma notificação assim que detectarmos movimentos relevantes.",
  },
  {
    value: "resumo_diario",
    label: "Resumo diário",
    description: "Concentre todas as novidades do mercado em um único briefing enviado diariamente.",
  },
  {
    value: "sem_notificacoes",
    label: "Sem notificações",
    description: "Pausar os alertas por enquanto. Você pode reativá-los quando quiser.",
  },
];

const MAX_PROFILE_IMAGE_CHARS = 3_600_000;
const MAX_IMAGE_DIMENSION = 512;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Não foi possível interpretar o arquivo como imagem."));
      }
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsDataURL(file);
  });

const optimizeImageDataUrl = (dataUrl: string, mimeType: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Não foi possível preparar o processamento da imagem."));
          return;
        }

        const largestSide = Math.max(image.width, image.height);
        const ratio = largestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestSide : 1;
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        const preferPng = mimeType === "image/png";
        const targetType = preferPng ? "image/png" : "image/jpeg";
        const quality = preferPng ? undefined : 0.82;
        const optimized = canvas.toDataURL(targetType, quality);

        if (!optimized || optimized.length === 0) {
          resolve(dataUrl);
          return;
        }

        resolve(optimized.length < dataUrl.length ? optimized : dataUrl);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Erro ao processar a imagem."));
      }
    };
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem selecionada."));
    image.src = dataUrl;
  });

export default function UserSessionPage() {
  const { user, loading, updateUserSettings } = useAuth();
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsTone, setDetailsTone] = useState<"success" | "error" | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [notificationChoice, setNotificationChoice] = useState<string>("resumo_diario");
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const initials = useMemo(() => {
    if (!user?.name) {
      return "?";
    }
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 0) {
      return "?";
    }
    if (parts.length === 1) {
      return parts[0][0]?.toUpperCase() ?? "?";
    }
    return `${parts[0][0]?.toUpperCase() ?? ""}${parts[parts.length - 1][0]?.toUpperCase() ?? ""}`;
  }, [user?.name]);

  const handleChange = (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    setNotificationChoice(resolveNotificationValue(user.notificationPreference));
    setProfileImagePreview(user.profileImageUrl ?? "");
    setAvatarError(null);
  }, [user]);

  const handleNotificationSelect = (value: string) => {
    setNotificationChoice(value);
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarError("Envie um arquivo de imagem válido (PNG, JPG, GIF).");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setAvatarError("A imagem deve ter no máximo 2MB.");
      return;
    }

    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const optimized = await optimizeImageDataUrl(rawDataUrl, file.type);
      const sanitized = optimized.replace(/\s+/g, "");

      if (sanitized.length > MAX_PROFILE_IMAGE_CHARS) {
        setAvatarError("A imagem ficou muito grande após o processamento. Tente uma foto menor.");
        return;
      }

      setProfileImagePreview(sanitized);
      setAvatarError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível processar a imagem selecionada.";
      setAvatarError(message);
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setProfileImagePreview("");
    setAvatarError(null);
  };

  const handleSaveDetails = async () => {
    if (!user) {
      setDetailsMessage("Sua sessão expirou. Faça login novamente.");
      setDetailsTone("error");
      return;
    }

    setSavingDetails(true);
    setDetailsMessage(null);
    setDetailsTone(null);

    try {
      const payload = await updateUserSettings({
        notificationPreference: notificationChoice,
        profileImageUrl: profileImagePreview || "",
      });

      const resolvedPhoto =
        payload.profileImageUrl === undefined
          ? profileImagePreview
          : payload.profileImageUrl ?? "";

      setProfileImagePreview(resolvedPhoto ?? "");
      const updatedPreference = resolveNotificationValue(
        payload.notificationPreference ?? notificationChoice
      );
      setNotificationChoice(updatedPreference);
      const preferenceLabel = notificationLabel(updatedPreference);
      setDetailsMessage(`Preferências atualizadas (${preferenceLabel}).`);
      setDetailsTone("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível atualizar os dados.";
      setDetailsMessage(message);
      setDetailsTone("error");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      setStatusMessage("Não foi possível identificar o usuário autenticado.");
      setStatusTone("error");
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);
    setStatusTone(null);

    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "https://bmss-backend.onrender.com").replace(/\/+$/, "");
      const response = await fetch(`${apiBase}/users/${user.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Não foi possível atualizar a senha.");
      }

      setStatusMessage("Senha atualizada com sucesso!");
      setStatusTone("success");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Erro desconhecido ao atualizar a senha.";
      setStatusMessage(fallback);
      setStatusTone("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-black flex items-center justify-center">
        <p className="text-sm text-gray-300 animate-pulse">Carregando sua sessão...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl shadow-2xl p-10 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 via-orange-400 to-rose-500 flex items-center justify-center text-2xl font-bold text-black shadow-lg overflow-hidden">
                {profileImagePreview ? (
                  <NextImage
                    src={profileImagePreview}
                    alt={user.name ? `Foto de ${user.name}` : "Foto do usuário"}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  initials
                )}
                <span className="absolute -bottom-2 right-2 bg-neutral-900 text-xs font-semibold text-yellow-300 px-2 py-1 rounded-full border border-neutral-700 shadow">
                  Sessão
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white tracking-tight">Olá, {user.name}!</h1>
                <p className="text-sm text-gray-400 mt-2">
                  Aqui você gerencia seus dados pessoais, preferências de perfil e segurança.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-yellow-300 hover:text-yellow-200 transition-colors"
            >
              <span>Voltar para o dashboard</span>
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-8 shadow-xl space-y-6">
            <header className="flex items-center gap-3">
              <UserCog className="text-yellow-300" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-white">Sua identidade digital</h2>
                <p className="text-xs text-gray-400">
                  Atualize o que exibimos no dashboard e como você quer ser avisado sobre o mercado.
                </p>
              </div>
            </header>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500 tracking-wider">Email</p>
                  <p className="text-sm font-medium text-white mt-1 break-all">{user.email}</p>
                </div>

                <div>
                  <p className="text-xs uppercase text-gray-500 tracking-wider">Perfil de investidor</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/60 px-3 py-1 text-xs text-yellow-200 uppercase tracking-wider">
                    <ShieldCheck size={14} />
                    <span>{user.investorProfile}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wider">Foto de perfil</p>
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900/70 flex items-center justify-center text-yellow-300">
                    {profileImagePreview ? (
                      <NextImage
                        src={profileImagePreview}
                        alt={user.name ? `Foto de ${user.name}` : "Foto do usuário"}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Camera size={26} className="opacity-70" />
                    )}
                  </div>
                  <div className="space-y-3 text-xs text-gray-400">
                    <label className="inline-flex items-center gap-2 rounded-full border border-yellow-400/50 bg-yellow-500/10 px-4 py-2 font-semibold text-yellow-200 hover:bg-yellow-500/20 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Upload size={16} />
                      <span>Enviar nova foto</span>
                    </label>
                    {profileImagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 font-semibold text-gray-300 hover:border-red-400/60 hover:text-red-300 transition-colors"
                      >
                        <ImageOff size={16} />
                        Remover foto
                      </button>
                    )}
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      Utilize uma imagem quadrada para melhor resultado. Aceitamos arquivos de até 2MB nos formatos PNG, JPG ou GIF.
                    </p>
                    {avatarError && (
                      <p className="text-[11px] font-semibold text-red-400">{avatarError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 tracking-wider">Preferência de notificações</p>
                <div className="mt-3 space-y-2">
                  {NOTIFICATION_OPTIONS.map((option) => {
                    const isActive = option.value === notificationChoice;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleNotificationSelect(option.value)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          isActive
                            ? "border-yellow-400/70 bg-yellow-500/10 text-yellow-100"
                            : "border-neutral-800 bg-neutral-900/80 text-gray-300 hover:border-neutral-700 hover:bg-neutral-900"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Bell size={16} className={isActive ? "text-yellow-300" : "text-gray-500"} />
                          <span className="text-sm font-semibold uppercase tracking-wide">{option.label}</span>
                        </span>
                        <span className="mt-2 block text-[12px] text-gray-400 leading-relaxed">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {detailsMessage && (
                  <span
                    className={`text-xs font-medium ${
                      detailsTone === "success"
                        ? "text-emerald-400"
                        : detailsTone === "error"
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {detailsMessage}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingDetails ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                  <span>{savingDetails ? "Salvando..." : "Salvar preferências"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-8 shadow-xl space-y-6">
            <header className="flex items-center gap-3">
              <Mail className="text-yellow-300" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-white">Dicas rápidas</h2>
                <p className="text-xs text-gray-400">
                  Ajuste o perfil de investidor diretamente pelo cabeçalho e acompanhe como isso afeta as recomendações.
                </p>
              </div>
            </header>

            <p className="text-sm text-gray-400 leading-relaxed">
              Experimente alternar entre os perfis Conservador, Moderado e Agressivo no topo do dashboard para ver a diferença nas recomendações estratégicas. Combine com a preferência de notificações acima para receber insights do jeito que preferir.
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-yellow-300 hover:text-yellow-200 transition-colors"
            >
              <ShieldCheck size={14} />
              <span>Voltar ao dashboard</span>
            </Link>
          </div>
        </section>

        <section className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          <header className="flex items-center gap-3 mb-6">
            <Lock className="text-yellow-300" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-white">Atualizar senha</h2>
              <p className="text-xs text-gray-400">Reforce a segurança da sua conta definindo uma nova senha forte.</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-gray-400">
              Senha atual
              <input
                type="password"
                required
                value={form.currentPassword}
                onChange={handleChange("currentPassword")}
                className="w-full rounded-lg bg-neutral-950/70 border border-neutral-800 px-3 py-2 text-sm text-white focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-gray-400">
              Nova senha
              <input
                type="password"
                required
                value={form.newPassword}
                onChange={handleChange("newPassword")}
                className="w-full rounded-lg bg-neutral-950/70 border border-neutral-800 px-3 py-2 text-sm text-white focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-gray-400">
              Confirmar nova senha
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                className="w-full rounded-lg bg-neutral-950/70 border border-neutral-800 px-3 py-2 text-sm text-white focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
              />
            </label>

            <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
              {statusMessage && (
                <span
                  className={`text-xs font-medium ${
                    statusTone === "success"
                      ? "text-emerald-400"
                      : statusTone === "error"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {statusMessage}
                </span>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Atualizando..." : "Salvar nova senha"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function normalizePreferenceKey(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z\s_-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function resolveNotificationValue(value?: string | null): string {
  const normalized = normalizePreferenceKey(value);
  switch (normalized) {
    case "alertas_imediatos":
    case "alertas":
    case "imediato":
    case "imediatos":
      return "alertas_imediatos";
    case "sem_notificacoes":
    case "sem_notificacao":
    case "sem_notificacaoes":
    case "none":
    case "desativado":
      return "sem_notificacoes";
    case "resumo_diario":
    case "resumo":
    case "daily":
    default:
      return "resumo_diario";
  }
}

function notificationLabel(value: string): string {
  switch (resolveNotificationValue(value)) {
    case "alertas_imediatos":
      return "Alertas imediatos";
    case "sem_notificacoes":
      return "Sem notificações";
    case "resumo_diario":
    default:
      return "Resumo diário";
  }
}
