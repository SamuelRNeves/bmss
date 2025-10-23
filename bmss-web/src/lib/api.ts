import axios from "axios";

// 👉 base URL — ajusta conforme o endereço do teu backend Java
const api = axios.create({
  baseURL: "http://localhost:8080/api/v1", 
  timeout: 5000,
});

// ========== ENDPOINTS ==========

// 1️⃣  KPIs de sentimento (Java → /sentimento)
export async function getSentimentos() {
  const res = await api.get("/sentimento");
  return res.data; // { positive: 0.47, neutral: 0.33, negative: 0.20 }
}

// 2️⃣  Tendências semanais (Java → /tendencias)
export async function getTendencias() {
  const res = await api.get("/tendencias");
  return res.data; // [{ day:"2025-10-01", positive:45, neutral:30, negative:25 }, ...]
}

// 3️⃣  Últimas 5 notícias (Java → /noticias/top5)
export async function getUltimasNoticias() {
  const res = await api.get("/noticias/top5");
  return res.data; // [{id, titulo, fonte, resumo, sentimento}, ...]
}

export async function atualizarNoticias() {
  const res = await api.post("/noticias/atualizar");
  return res.data;
}

export async function reanalisarNoticias() {
  const res = await api.post("/noticias/reanalisar");
  return res.data;
}

// 4️⃣  Cadastrar notícia (Java → /noticias)
export async function cadastrarNoticia(payload: {
  titulo: string;
  conteudo: string;
  fonte: string;
}) {
  const res = await api.post("/noticias", payload);
  return res.data;
}

// 5️⃣  Cadastrar usuário (Java → /usuarios)
export async function cadastrarUsuario(payload: { nome: string; email: string }) {
  const res = await api.post("/usuarios", payload);
  return res.data;
}

export default api;
