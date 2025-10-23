from flask import Flask, request, jsonify
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from deep_translator import GoogleTranslator
import torch

app = Flask(__name__)

# ============================================================
# 🔹 Carrega modelo multilíngue (funciona em PT/EN)
# ============================================================
MODEL_NAME = "nlptown/bert-base-multilingual-uncased-sentiment"

print("🔄 Carregando modelo de sentimento...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
analyzer = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)
print("✅ Modelo carregado com sucesso!")

# ============================================================
# 🔹 Função auxiliar para traduzir texto e analisar sentimento
# ============================================================
def analyze_text(text):
    if not text or len(text.strip()) == 0:
        return {"label": "neutral", "score": 0.0}

    try:
        # Tradução para inglês (melhora precisão do modelo)
        translated = GoogleTranslator(source='auto', target='en').translate(text)
        result = analyzer(translated[:512])[0]  # limita tamanho para segurança
        label = result['label']
        score = result['score']

        # Conversão do label (modelo usa 1 a 5 estrelas)
        label_map = {
            "1 star": "negative",
            "2 stars": "negative",
            "3 stars": "neutral",
            "4 stars": "positive",
            "5 stars": "positive"
        }

        sentiment = label_map.get(label.lower(), "neutral")

        return {"label": sentiment, "score": round(score, 3)}

    except Exception as e:
        print(f"❌ Erro na análise: {e}")
        return {"label": "neutral", "score": 0.0}

# ============================================================
# 🔹 Endpoint para 1 texto (debug/teste manual)
# ============================================================
@app.route("/analyze", methods=["POST"])
def analyze_single():
    data = request.get_json()
    text = data.get("text", "")
    result = analyze_text(text)
    return jsonify(result)

# ============================================================
# 🔹 Endpoint para múltiplos textos (usado pelo backend Java)
# ============================================================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    data = request.get_json()
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
