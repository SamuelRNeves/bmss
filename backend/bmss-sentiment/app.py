from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from deep_translator import GoogleTranslator
import torch
import re
import numpy as np
import time

app = Flask(__name__)

# ======================================================
# 🔹 Configuração
# ======================================================
device = 0 if torch.cuda.is_available() else -1

# Modelos e tokenizers
finbert = pipeline("sentiment-analysis",
                   model="ProsusAI/finbert",
                   tokenizer="ProsusAI/finbert",
                   device=device)

roberta_tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
roberta_model = AutoModelForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
roberta = pipeline("sentiment-analysis",
                   model=roberta_model,
                   tokenizer=roberta_tokenizer,
                   device=device)

label_map = {0: "negative", 1: "neutral", 2: "positive"}

# ======================================================
# 🔹 Funções auxiliares
# ======================================================
def clean_text(text):
    if not text:
        return ""
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#", "", text)
    return text.strip()


def translate_if_needed(text):
    """Traduz se detectar português/espanhol"""
    try:
        if any(w in text.lower() for w in ["bitcoin", "mercado", "cripto", "alta", "queda", "cotação", "preço"]):
            return GoogleTranslator(source='auto', target='en').translate(text)
        return text
    except Exception:
        return text


def adjust_neutral(label, text):
    """Converte neutros com base em palavras contextuais"""
    t = text.lower()
    pos = ["alta", "cresce", "recorde", "aprovação", "pump", "bull"]
    neg = ["queda", "cai", "ban", "crise", "derrete", "bear"]
    if label == "neutral":
        if any(w in t for w in pos):
            return "positive"
        if any(w in t for w in neg):
            return "negative"
    return label


def analyze_roberta(text):
    """Análise com modelo CardiffNLP"""
    text_proc = clean_text(text)
    text_en = translate_if_needed(text_proc)
    res = roberta(text_en[:512])[0]
    label = res["label"].lower()
    if "label_" in label:
        label = label_map[int(label.split("_")[-1])]
    return label, res["score"]


def analyze_finbert(text):
    """Análise financeira com FinBERT"""
    res = finbert(text[:512])[0]
    return res["label"].lower(), res["score"]


def ensemble(text):
    """Combina FinBERT + RoBERTa"""
    fin_label, fin_score = analyze_finbert(text)
    rob_label, rob_score = analyze_roberta(text)

    # ponderação: FinBERT domina notícias financeiras
    weights = {"positive": 1, "neutral": 0, "negative": -1}
    avg = 0.65 * weights.get(fin_label, 0) + 0.35 * weights.get(rob_label, 0)

    if avg > 0.25:
        final = "positive"
    elif avg < -0.25:
        final = "negative"
    else:
        final = "neutral"

    final = adjust_neutral(final, text)
    final_score = np.mean([fin_score, rob_score])
    return final, round(final_score, 3)


# ======================================================
# 🔹 Rotas
# ======================================================
@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    textos = request.get_json()
    if not textos:
        return jsonify({"error": "Nenhum texto recebido"}), 400

    resultados = []
    for texto in textos:
        start = time.time()
        label, score = ensemble(texto)
        resultados.append({"label": label, "score": score})
        print(f"[NEWS] {texto[:60]}... → {label.upper()} ({score}) ⏱ {round(time.time()-start,2)}s")

    return jsonify(resultados)


@app.route("/analyze-tweets", methods=["POST"])
def analyze_tweets():
    textos = request.get_json()
    if not textos:
        return jsonify({"error": "Nenhum tweet recebido"}), 400

    resultados = []
    for texto in textos:
        start = time.time()
        label, score = analyze_roberta(texto)
        label = adjust_neutral(label, texto)
        resultados.append({"label": label, "score": round(score, 3)})
        print(f"[TWEET] {texto[:60]}... → {label.upper()} ({score}) ⏱ {round(time.time()-start,2)}s")

    return jsonify(resultados)


# ======================================================
# 🔹 Inicialização
# ======================================================
if __name__ == "__main__":
    print("✅ Modelos carregados: FinBERT + RoBERTa (CardiffNLP)")
    app.run(host="0.0.0.0", port=5000)
