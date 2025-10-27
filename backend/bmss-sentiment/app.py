from flask import Flask, request, jsonify
from transformers import pipeline
from deep_translator import GoogleTranslator
import torch
import re

app = Flask(__name__)

# ======================================================
# 🔹 MODELOS
# ======================================================
device = 0 if torch.cuda.is_available() else -1

# Modelo financeiro (FinBERT)
finbert = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert",
    tokenizer="ProsusAI/finbert",
    device=device
)

# Modelo social (RoBERTa)
roberta = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    tokenizer="cardiffnlp/twitter-roberta-base-sentiment-latest",
    device=device
)

# ======================================================
# 🔹 Funções auxiliares
# ======================================================
def preprocess_text(text):
    """Limpa e traduz o texto se necessário."""
    if not text:
        return ""
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#\w+", "", text)
    text = text.strip()

    try:
        # Traduz apenas se o texto estiver em PT/ES
        if any(p in text.lower() for p in ["bitcoin", "mercado", "cripto", "alta", "queda", "preço"]):
            text = GoogleTranslator(source='auto', target='en').translate(text)
    except Exception:
        pass

    return text


def normalize_label(label):
    """Normaliza diferentes formatos de labels."""
    mapping = {
        "LABEL_0": "negative",
        "LABEL_1": "neutral",
        "LABEL_2": "positive",
        "Negative": "negative",
        "Neutral": "neutral",
        "Positive": "positive"
    }
    return mapping.get(label, label.lower())


def adjust_financial_sentiment(text, label):
    """Ajusta neutros com base em palavras de contexto financeiro."""
    t = text.lower()
    neg_words = ["queda", "cai", "ban", "proibição", "crise", "perda", "bear", "drop", "derrete"]
    pos_words = ["alta", "subida", "recorde", "aprovação", "cresce", "bull", "pump", "valorização"]

    if label == "neutral":
        if any(w in t for w in pos_words):
            return "positive"
        if any(w in t for w in neg_words):
            return "negative"
    return label


def boost_confidence(label, score):
    """Aumenta ligeiramente scores baixos para reduzir excesso de neutros."""
    if label == "neutral" and score < 0.55:
        return label, score
    if label == "positive" and score < 0.7:
        score += 0.15
    if label == "negative" and score < 0.7:
        score += 0.15
    return label, min(score, 1.0)


def ensemble_vote(text):
    """Combina FinBERT + RoBERTa (média ponderada 60/40)."""
    cleaned = preprocess_text(text)

    finbert_res = finbert(cleaned[:512])[0]
    roberta_res = roberta(cleaned[:512])[0]

    fin_label = normalize_label(finbert_res["label"])
    rob_label = normalize_label(roberta_res["label"])

    fin_score = finbert_res["score"]
    rob_score = roberta_res["score"]

    if fin_label == rob_label:
        final_label = fin_label
        final_score = (fin_score + rob_score) / 2
    else:
        weights = {"positive": 1, "neutral": 0, "negative": -1}
        avg = 0.6 * weights.get(fin_label, 0) + 0.4 * weights.get(rob_label, 0)
        if avg > 0.2:
            final_label = "positive"
        elif avg < -0.2:
            final_label = "negative"
        else:
            final_label = "neutral"
        final_score = (fin_score + rob_score) / 2

    final_label = adjust_financial_sentiment(text, final_label)

    return {
        "label": final_label,
        "score": round(final_score, 3),
        "finbert_label": fin_label,
        "roberta_label": rob_label,
        "finbert_score": round(fin_score, 3),
        "roberta_score": round(rob_score, 3)
    }


# ======================================================
# 🔹 Rota: Análise de Notícias (Ensemble FinBERT + RoBERTa)
# ======================================================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    textos = request.get_json()
    if not textos:
        return jsonify({"error": "Nenhum texto recebido"}), 400

    resultados = []
    for texto in textos:
        res = ensemble_vote(texto)
        resultados.append({
            "label": res["label"],
            "score": res["score"]
        })
        print(
            f"[NEWS] 🧩 {texto[:60]}... → {res['label'].upper()} ({res['score']:.3f}) "
            f"[FinBERT={res['finbert_label']} {res['finbert_score']} | RoBERTa={res['roberta_label']} {res['roberta_score']}]"
        )

    return jsonify(resultados)


# ======================================================
# 🔹 Rota: Análise de Tweets (RoBERTa + tradução + boost)
# ======================================================
@app.route("/analyze-tweets", methods=["POST"])
def analyze_tweets():
    textos = request.get_json()
    if not textos:
        return jsonify({"error": "Nenhum tweet recebido"}), 400

    resultados = []
    for texto in textos:
        cleaned = preprocess_text(texto)

        try:
            cleaned_en = GoogleTranslator(source='auto', target='en').translate(cleaned)
        except Exception:
            cleaned_en = cleaned

        result = roberta(cleaned_en[:512])[0]
        label = normalize_label(result["label"])
        score = result["score"]
        label = adjust_financial_sentiment(texto, label)
        label, score = boost_confidence(label, score)

        resultados.append({"label": label, "score": round(score, 3)})
        print(f"[TWEET] 🐦 {texto[:60]}... → {label.upper()} ({score:.3f}) [Traduzido: {cleaned_en[:50]}]")

    return jsonify(resultados)


# ======================================================
# 🔹 Inicialização
# ======================================================
if __name__ == "__main__":
    print("✅ Modelos carregados com sucesso:")
    print("   • FinBERT (ProsusAI) → análise financeira")
    print("   • RoBERTa (CardiffNLP) → análise social")
    print("   • Ensemble ativo para notícias (60/40)")
    app.run(host="0.0.0.0", port=5000)
