from flask import Flask, request, jsonify
from transformers import pipeline
import torch

app = Flask(__name__)

# ============================
# 🔹 MODELOS
# ============================
device = 0 if torch.cuda.is_available() else -1

news_analyzer = pipeline(
    "sentiment-analysis",
    model="Adilmar/caramelo-smile-2",
    tokenizer="Adilmar/caramelo-smile-2",
    device=device
)

tweet_analyzer = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    tokenizer="cardiffnlp/twitter-roberta-base-sentiment-latest",
    device=device
)


# ============================
# 🔹 NOTÍCIAS
# ============================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    textos = request.get_json()
    if not textos:
        return jsonify({"error": "Nenhum texto recebido"}), 400

    results = news_analyzer(textos)
    return jsonify(results)

# ============================
# 🔹 TWEETS
# ============================
@app.route("/analyze-tweets", methods=["POST"])
def analyze_tweets():
    textos = request.get_json()
    if not textos:
        return jsonify({"error": "Nenhum tweet recebido"}), 400

    results = tweet_analyzer(textos)

    # Mapeia as labels numéricas para palavras legíveis
    label_map = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive"
    }

    converted = []
    for r in results:
        label = label_map.get(r["label"], "neutral")
        converted.append({"label": label, "score": round(r["score"], 3)})

    return jsonify(converted)


if __name__ == "__main__":
    print("✅ Modelos carregados (Caramelo e Twitter-RoBERTa).")
    app.run(host="0.0.0.0", port=5000)
