from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch
import re
import numpy as np
import time
import logging
from logging.handlers import RotatingFileHandler

# ======================================================
# 🔹 Configuração de Logs
# ======================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('flask_app.log', maxBytes=10000000, backupCount=5),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ======================================================
# 🔹 Inicialização Segura dos Modelos
# ======================================================
def load_models():
    """Carrega modelos com tratamento de erro robusto"""
    global finbert, roberta, label_map
    
    try:
        device = 0 if torch.cuda.is_available() else -1
        logger.info(f"🔧 Usando dispositivo: {'CUDA' if device == 0 else 'CPU'}")
        
        # 🔹 Carregar FinBERT
        logger.info("🔄 Carregando FinBERT...")
        finbert = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert",
            tokenizer="ProsusAI/finbert",
            device=device
        )
        
        # 🔹 Carregar Twitter RoBERTa
        logger.info("🔄 Carregando Twitter RoBERTa...")
        roberta_tokenizer = AutoTokenizer.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
        roberta_model = AutoModelForSequenceClassification.from_pretrained("cardiffnlp/twitter-roberta-base-sentiment-latest")
        roberta = pipeline(
            "sentiment-analysis",
            model=roberta_model,
            tokenizer=roberta_tokenizer,
            device=device
        )
        
        label_map = {0: "negative", 1: "neutral", 2: "positive"}
        logger.info("✅ Todos os modelos carregados com sucesso!")
        
    except Exception as e:
        logger.error(f"❌ Erro crítico ao carregar modelos: {e}")
        # 🔹 Fallback: criar pipelines dummy para evitar crash
        finbert = None
        roberta = None
        label_map = {0: "negative", 1: "neutral", 2: "positive"}

# ======================================================
# 🔹 Carregar modelos na inicialização
# ======================================================
load_models()

# ======================================================
# 🔹 Funções Auxiliares Simplificadas
# ======================================================
def clean_text(text):
    """Limpa texto removendo URLs e menções"""
    if not text or not isinstance(text, str):
        return ""
    
    try:
        # Remover URLs
        text = re.sub(r"http\S+", "", text)
        # Remover menções @
        text = re.sub(r"@\w+", "", text)
        # Remover hashtags (mas manter o texto)
        text = re.sub(r"#", "", text)
        return text.strip()
    except Exception as e:
        logger.warning(f"⚠️ Erro ao limpar texto: {e}")
        return str(text)[:500] if text else ""

def analyze_roberta(text):
    """Análise com modelo CardiffNLP para tweets"""
    if roberta is None:
        logger.error("❌ Modelo RoBERTa não carregado")
        return "neutral", 0.5
    
    try:
        text_clean = clean_text(text)
        if not text_clean:
            return "neutral", 0.5
            
        # 🔹 Usar apenas os primeiros 512 caracteres
        text_input = text_clean[:512]
        
        result = roberta(text_input)[0]
        label = result["label"].lower()
        score = result["score"]
        
        # 🔹 Converter label se necessário
        if "label_" in label:
            try:
                label_num = int(label.split("_")[-1])
                label = label_map.get(label_num, "neutral")
            except (ValueError, IndexError):
                label = "neutral"
                
        return label, float(score)
        
    except Exception as e:
        logger.error(f"❌ Erro na análise RoBERTa: {e}")
        return "neutral", 0.5

def adjust_neutral(label, text):
    """Ajusta label neutral baseado em palavras-chave"""
    if label != "neutral":
        return label
        
    try:
        if not text or not isinstance(text, str):
            return label
            
        text_lower = text.lower()
        
        # 🔹 Palavras-chave para Bitcoin/mercado
        positive_words = ["alta", "recorde", "ganho", "valorização", "cresce", 
                         "pump", "bull", "otimismo", "moon", "compra", "green"]
        negative_words = ["queda", "cai", "ban", "crise", "derrete", "perda", 
                         "retração", "despenca", "bear", "venda", "red"]
        
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count > neg_count:
            return "positive"
        elif neg_count > pos_count:
            return "negative"
        else:
            return label
            
    except Exception as e:
        logger.warning(f"⚠️ Erro no adjust_neutral: {e}")
        return label

# ======================================================
# 🔹 Rotas do Flask
# ======================================================
@app.route("/healthz", methods=["GET"])
def health_check():
    """Rota de saúde para verificar se o serviço está online"""
    try:
        status = {
            "ok": True,
            "service": "sentiment-analysis",
            "timestamp": time.time(),
            "models_loaded": finbert is not None and roberta is not None,
            "finbert_loaded": finbert is not None,
            "roberta_loaded": roberta is not None
        }
        logger.info("🔍 Health check solicitado")
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"❌ Erro no health check: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    """Análise em lote para notícias (FinBERT + RoBERTa)"""
    try:
        data = request.get_json()
        if not data or not isinstance(data, list):
            logger.error("❌ Dados inválidos recebidos em /analyze-batch")
            return jsonify({"error": "Lista de textos obrigatória"}), 400
        
        logger.info(f"📦 /analyze-batch recebeu {len(data)} textos")
        
        resultados = []
        for i, texto in enumerate(data):
            start_time = time.time()
            
            if not texto or not isinstance(texto, str):
                resultados.append({"label": "neutral", "score": 0.5})
                continue
                
            try:
                # 🔹 Análise simplificada para notícias
                if roberta is not None:
                    label, score = analyze_roberta(texto)
                    label = adjust_neutral(label, texto)
                else:
                    label, score = "neutral", 0.5
                    
                resultados.append({
                    "label": label,
                    "score": round(score, 3)
                })
                
                logger.info(f"📰 [{i}] {label.upper()} ({score:.3f}) → {texto[:60]}...")
                
            except Exception as e:
                logger.error(f"❌ Erro processando texto {i}: {e}")
                resultados.append({"label": "neutral", "score": 0.5})
                
        logger.info(f"✅ /analyze-batch processou {len(resultados)} textos")
        return jsonify(resultados)
        
    except Exception as e:
        logger.error(f"💥 Erro crítico em /analyze-batch: {e}")
        return jsonify({"error": "Erro interno do servidor"}), 500

@app.route("/analyze-tweets", methods=["POST"])
def analyze_tweets():
    """Análise especializada para tweets (apenas RoBERTa)"""
    try:
        data = request.get_json()
        if not data or not isinstance(data, list):
            logger.error("❌ Dados inválidos recebidos em /analyze-tweets")
            return jsonify({"error": "Lista de tweets obrigatória"}), 400
        
        logger.info(f"🐦 /analyze-tweets recebeu {len(data)} tweets")
        
        if data:
            logger.info(f"   📝 Primeiro tweet: {data[0][:100]}...")
        
        resultados = []
        for i, texto in enumerate(data):
            start_time = time.time()
            
            # 🔹 Validação do texto
            if not texto or not isinstance(texto, str) or not texto.strip():
                resultados.append({"label": "neutral", "score": 0.5})
                continue
                
            try:
                # 🔹 Análise com RoBERTa (especializado em tweets)
                label, score = analyze_roberta(texto)
                
                # 🔹 Ajuste para contexto de tweets
                label = adjust_neutral(label, texto)
                
                resultados.append({
                    "label": label,
                    "score": round(score, 3)
                })
                
                processing_time = time.time() - start_time
                logger.info(f"🐦 [{i}] {label.upper()} ({score:.3f}) → {texto[:70]}... ⏱ {processing_time:.2f}s")
                
            except Exception as e:
                logger.error(f"❌ Erro processando tweet {i}: {e}")
                resultados.append({"label": "neutral", "score": 0.5})
                
        logger.info(f"✅ /analyze-tweets processou {len(resultados)} tweets com sucesso")
        return jsonify(resultados)
        
    except Exception as e:
        logger.error(f"💥 Erro crítico em /analyze-tweets: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def home():
    """Página inicial com informações do serviço"""
    return jsonify({
        "service": "BMSS Sentiment Analysis",
        "version": "1.0",
        "endpoints": {
            "health": "/healthz (GET)",
            "analyze_news": "/analyze-batch (POST)", 
            "analyze_tweets": "/analyze-tweets (POST)"
        },
        "models": {
            "finbert": "ProsusAI/finbert",
            "twitter_roberta": "cardiffnlp/twitter-roberta-base-sentiment-latest"
        }
    })

# ======================================================
# 🔹 Manipulador de Erros Global
# ======================================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint não encontrado"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Método não permitido"}), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"💥 Erro 500: {error}")
    return jsonify({"error": "Erro interno do servidor"}), 500

# ======================================================
# 🔹 Inicialização
# ======================================================
if __name__ == "__main__":
    logger.info("🚀 Iniciando Serviço de Análise de Sentimento...")
    logger.info("✅ Modelos carregados: FinBERT + RoBERTa (CardiffNLP)")
    logger.info("🌐 Servidor rodando em http://0.0.0.0:5000")
    
    app.run(host="0.0.0.0", port=5000, debug=False)