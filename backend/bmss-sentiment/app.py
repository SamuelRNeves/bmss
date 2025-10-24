from flask import Flask, request, jsonify
from transformers import pipeline
import torch
import json

app = Flask(__name__)

# ============================================================
# 🔹 Modelo brasileiro otimizado para PT-BR
# ============================================================
MODEL_NAME = "Adilmar/caramelo-smile-2"

print("🔄 Carregando modelo de sentimento (Caramelo Smile 2 - PT-BR)...")
device = 0 if torch.cuda.is_available() else -1
analyzer = pipeline("sentiment-analysis", model=MODEL_NAME, device=device)
print("✅ Modelo carregado com sucesso e pronto para análise!")


# ============================================================
# 🔹 Função auxiliar de análise
# ============================================================
def analyze_text(text):
    if not text or len(text.strip()) == 0:
        return {"label": "neutral", "score": 0.0}

    try:
        result = analyzer(text[:512])[0]  # corta textos longos
        label = result["label"].lower()
        score = float(result["score"])
        return {"label": label, "score": round(score, 3)}

    except Exception as e:
        print(f"❌ Erro na análise: {e}")
        return {"label": "neutral", "score": 0.0}


# ============================================================
# 🔹 Endpoint em lote (para o backend Java)
# ============================================================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    try:
        raw_data = request.data.decode("utf-8", errors="ignore").strip()
        if not raw_data:
            print("⚠️ Nenhum corpo recebido!")
            return jsonify([]), 200

        data = json.loads(raw_data)
        if not isinstance(data, list):
            print(f"⚠️ Estrutura inesperada: {type(data)} → {data}")
            return jsonify([]), 200

        print(f"🧠 Recebido {len(data)} textos para análise do backend.")
        results = [analyze_text(text) for text in data]
        print(f"✅ {len(results)} análises concluídas e retornadas.")
        return jsonify(results), 200

    except Exception as e:
        print(f"❌ Erro inesperado no analyze-batch: {e}")
        return jsonify([]), 200


# ============================================================
# 🔹 Endpoint simples para teste manual
# ============================================================
@app.route("/analyze", methods=["POST"])
def analyze_single():
    try:
        data = request.get_json(force=True)
        text = data.get("text", "")
        result = analyze_text(text)
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Erro no /analyze: {e}")
        return jsonify({"error": str(e)}), 400


@app.route("/")
def index():
    return jsonify({
        "message": "🚀 API Flask de Sentimento (Caramelo Smile 2 - PT-BR)",
        "model": MODEL_NAME
    })


if __name__ == "__main__":
    print("🚀 Servidor Flask iniciado em http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000)
