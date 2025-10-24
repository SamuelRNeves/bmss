from flask import Flask, request, jsonify
from transformers import pipeline
import torch

app = Flask(__name__)

# ============================================================
# 🔹 Modelo otimizado para Português (sem precisar traduzir)
# ============================================================
# Esse modelo é nativo em português e gera resultados muito mais coerentes
# com textos da NewsAPI e GNews.
MODEL_NAME = "pysentimiento/robertuito-sentiment-analysis"

print("🔄 Carregando modelo de sentimento (pysentimiento)...")
device = 0 if torch.cuda.is_available() else -1
analyzer = pipeline("sentiment-analysis", model=MODEL_NAME, device=device)
print("✅ Modelo carregado com sucesso!")

# ============================================================
# 🔹 Função auxiliar de análise
# ============================================================
def analyze_text(text):
    if not text or len(text.strip()) == 0:
        return {"label": "neutral", "score": 0.0}

    try:
        result = analyzer(text[:512])[0]  # corta textos muito longos
        label = result["label"].lower()
        score = float(result["score"])

        # Mapeia o label do modelo para um formato padronizado
        label_map = {
            "positive": "positive",
            "negative": "negative",
            "neutral": "neutral"
        }
        sentiment = label_map.get(label, "neutral")

        return {"label": sentiment, "score": round(score, 3)}

    except Exception as e:
        print(f"❌ Erro na análise: {e}")
        return {"label": "neutral", "score": 0.0}

# ============================================================
# 🔹 Endpoint único (para debug/teste)
# ============================================================
@app.route("/analyze", methods=["POST"])
def analyze_single():
    data = request.get_json(force=True)
    text = data.get("text", "")
    result = analyze_text(text)
    return jsonify(result)

# ============================================================
# 🔹 Endpoint em lote (usado pelo backend Java)
# ============================================================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    data = request.get_json(force=True)
    if not isinstance(data, list):
        return jsonify({"error": "Esperada uma lista de textos"}), 400

    results = [analyze_text(text) for text in data]
    return jsonify(results)

# ============================================================
# 🔹 Inicializa o servidor Flask
# ============================================================
if __name__ == "__main__":
    print("🚀 Servidor Flask iniciado em http://localhost:5000")
    app.run(host="0.0.0.0", port=5000)
