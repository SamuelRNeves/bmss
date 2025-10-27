from flask import Flask, request, jsonify
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import re
from flask_cors import CORS

# ==========================================================
# 🚀 Flask app
# ==========================================================
app = Flask(__name__)
CORS(app)

print("🔄 Carregando modelos...")

# ==========================================================
# 🧠 Carrega dois modelos em paralelo
# ==========================================================
# Modelo multilíngue geral (bom em português)
model_geral = "Adilmar/caramelo-smile-2"
# Modelo financeiro (ótimo para notícias econômicas)
model_financeiro = "ProsusAI/finbert"

analyzer_geral = pipeline("sentiment-analysis", model=model_geral, tokenizer=model_geral)
analyzer_financeiro = pipeline("sentiment-analysis", model=model_financeiro, tokenizer=model_financeiro)

print("✅ Modelos carregados com sucesso!")


# ==========================================================
# 🧹 Pré-processamento de texto
# ==========================================================
def limpar_texto(text):
    text = text.lower()
    text = re.sub(r"http\S+", "", text)       # Remove URLs
    text = re.sub(r"[^a-zA-ZÀ-ÿ0-9\s]", "", text)  # Remove símbolos
    text = re.sub(r"\s+", " ", text).strip()  # Espaços extras
    return text


# ==========================================================
# 🧩 Função ensemble de análise
# ==========================================================
def analisar_texto(texto):
    texto_limpo = limpar_texto(texto)

    # Modelo 1: Caramelo
    res1 = analyzer_geral(texto_limpo)[0]
    label1, score1 = res1["label"].lower(), res1["score"]

    # Modelo 2: FinBERT
    res2 = analyzer_financeiro(texto_limpo)[0]
    label2, score2 = res2["label"].lower(), res2["score"]

    # Normaliza os rótulos do FinBERT
    label_map = {"positive": "positive", "neutral": "neutral", "negative": "negative"}
    label2 = label_map.get(label2, "neutral")

    # Média ponderada (dá mais peso ao FinBERT)
    final_score = (score1 * 0.4 + score2 * 0.6)

    # Escolhe o rótulo mais confiante
    if final_score < 0.55:
        final_label = "neutral"
    elif label1 == label2:
        final_label = label1
    else:
        final_label = label2 if score2 >= score1 else label1

    return {"label": final_label, "score": round(final_score, 3)}


# ==========================================================
# 🔹 Rota principal: análise em lote
# ==========================================================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    try:
        textos = request.get_json(force=True)
        if not isinstance(textos, list) or not textos:
            return jsonify({"error": "Envie uma lista de textos para análise"}), 400

        print(f"📩 Recebidos {len(textos)} textos para análise")

        resultados = [analisar_texto(t) for t in textos]
        return jsonify(resultados), 200

    except Exception as e:
        print("❌ Erro durante análise:", str(e))
        return jsonify({"error": str(e)}), 500


# ==========================================================
# 🚀 Execução
# ==========================================================
if __name__ == "__main__":
    print("🔥 Flask v2 Inteligente iniciado em http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000)
