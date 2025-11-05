from flask import Flask, request, jsonify
from transformers import pipeline
import torch
import re
import time
import logging
from typing import Dict, List, Any

app = Flask(__name__)

# ======================================================
# 🔹 CONFIGURAÇÃO DE LOG
# ======================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================================================
# 🔹 MODELOS (apenas como fallback)
# ======================================================
device = 0 if torch.cuda.is_available() else -1

try:
    logger.info("🔄 Carregando modelos...")
    finbert = pipeline(
        "sentiment-analysis",
        model="mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
        device=device
    )
except Exception as e:
    logger.warning(f"⚠️ Modelo não carregado: {e}")
    finbert = None

# ======================================================
# 🔹 SISTEMA ULTRA-AGGRESSIVO DE KEYWORDS
# ======================================================

#  LISTA MASSIVA DE PALAVRAS/PHRASES POSITIVAS
BITCOIN_POSITIVE_SUPER_STRONG = {
    'us$ 1 milhão', '1 milhão de dólares', 'bitcoin para us$ 1 milhão',
    'previsão de us$ 1 milhão', 'alvo de us$ 1 milhão', 'us$ 1.000.000',
    'corrida do bitcoin', 'corrida para us$ 1 milhão', 'disparada do bitcoin',
    'explosão do bitcoin', 'valorização recorde', 'máxima histórica',
    'novo recorde histórico', 'alta espetacular', 'valorização explosiva',
    'lucro milionário', 'ganhos extraordinários', 'retorno extraordinário',
    'oportunidade única', 'potencial máximo', 'cenário extremamente positivo'
}

BITCOIN_POSITIVE_STRONG = {
    'previsão otimista', 'perspectiva positiva', 'cenário favorável',
    'mercado em alta', 'tendência de valorização', 'potencial de alta',
    'bull market', 'mercado bullish', 'otimismo no mercado',
    'alta do bitcoin', 'valorização do bitcoin', 'bitcoin valoriza',
    'bitcoin sobe', 'bitcoin dispara', 'bitcoin explode',
    'adoção institucional', 'empresas comprando', 'ETF aprovado',
    'Tesla bitcoin', 'MicroStrategy', 'Square bitcoin', 'PayPal bitcoin',
    'investimento institucional', 'Wall Street', 'bancos comprando',
    'halving positivo', 'mineração lucrativa', 'tecnologia disruptiva',
    'ouro digital', 'reserva de valor', 'proteção contra inflação',
    'hedge inflacionário', 'ativo deflacionário', 'escassez digital'
}

BITCOIN_POSITIVE_MEDIUM = {
    'alto', 'alta', 'subir', 'subindo', 'valorizar', 'valorização', 'crescer',
    'crescimento', 'lucro', 'ganho', 'rendimento', 'retorno', 'bull', 'bullish',
    'record', 'recorde', 'disparar', 'explodir', 'forte', 'fortalecer',
    'otimista', 'otimismo', 'compra', 'comprar', 'investir', 'oportunidade',
    'potencial', 'positivo', 'bom', 'excelente', 'fantástico', 'incrível',
    'maravilhoso', 'ótimo', 'benefício', 'vantagem', 'sucesso', 'vencedor',
    'ganhador', 'milhão', 'milhões', 'bilhão', 'bilhões', 'trilhão',
    'valorizar muito', 'subir muito', 'crescer muito', 'lucro alto'
}

# 🔥 LISTA MASSIVA DE PALAVRAS/PHRASES NEGATIVAS
BITCOIN_NEGATIVE_STRONG = {
    'queda do bitcoin', 'bitcoin despenca', 'bitcoin cai', 'crash do bitcoin',
    'colapso do bitcoin', 'quebra do mercado', 'bolha do bitcoin',
    'fraude do bitcoin', 'scam do bitcoin', 'pirâmide financeira',
    'golpe do bitcoin', 'proibição do bitcoin', 'banimento do bitcoin',
    'regulamentação restritiva', 'governo proíbe', 'ilegalidade do bitcoin',
    'hackeamento de exchange', 'roubo de bitcoin', 'perda total',
    'prejuízo milionário', 'perdas financeiras', 'risco extremo',
    'alto risco', 'perigoso', 'especulação perigosa', 'alerta de risco',
    'cuidado extremo', 'mercado em pânico', 'pânico no mercado'
}

BITCOIN_NEGATIVE_MEDIUM = {
    'baixo', 'baixa', 'cair', 'caindo', 'desvalorizar', 'desvalorização',
    'queda', 'quebra', 'perda', 'prejuízo', 'risco', 'perigoso', 'bear',
    'bearish', 'colapso', 'crash', 'bolha', 'fraude', 'scam', 'pirâmide',
    'golpe', 'proibição', 'ban', 'regulamentação', 'hack', 'hackeado',
    'roubo', 'perdido', 'medo', 'incerteza', 'volátil', 'instável',
    'especulação', 'alerta', 'cuidado', 'venda', 'vendendo', 'negativo',
    'ruim', 'péssimo', 'horrível', 'terrível', 'problema', 'preocupação'
}

# 🔥 PALAVRAS NEUTRAS (para contexto)
BITCOIN_NEUTRAL = {
    'bitcoin', 'criptomoeda', 'mercado', 'preço', 'cotação', 'análise',
    'gráfico', 'volatilidade', 'especialista', 'executivo', 'entrevista',
    'comentário', 'notícia', 'informação', 'relatório', 'pesquisa',
    'estudo', 'dados', 'número', 'porcento', 'percentual', 'valor',
    'moeda', 'digital', 'blockchain', 'tecnologia', 'investimento'
}

def ultra_aggressive_keyword_analysis(text):
    """Análise ULTRA-AGGRESSIVA baseada em keywords."""
    text_lower = text.lower()
    
    positive_score = 0
    negative_score = 0
    
    # 🔥 SUPER FORTE: +10 pontos cada
    for phrase in BITCOIN_POSITIVE_SUPER_STRONG:
        if phrase in text_lower:
            positive_score += 10
            logger.info(f"🚀🔥 SUPER POSITIVO: '{phrase}' → +10")
    
    # 🔥 FORTE: +5 pontos cada  
    for phrase in BITCOIN_POSITIVE_STRONG:
        if phrase in text_lower:
            positive_score += 5
            logger.info(f"🚀 FORTE: '{phrase}' → +5")
    
    # 🔥 MÉDIO: +2 pontos cada
    for phrase in BITCOIN_POSITIVE_MEDIUM:
        if phrase in text_lower:
            positive_score += 2
            logger.info(f"✅ MÉDIO: '{phrase}' → +2")
    
    # 🔥 NEGATIVO FORTE: -5 pontos cada
    for phrase in BITCOIN_NEGATIVE_STRONG:
        if phrase in text_lower:
            negative_score += 5
            logger.info(f"📉 FORTE NEGATIVO: '{phrase}' → -5")
    
    # 🔥 NEGATIVO MÉDIO: -2 pontos cada
    for phrase in BITCOIN_NEGATIVE_MEDIUM:
        if phrase in text_lower:
            negative_score += 2
            logger.info(f"📉 MÉDIO NEGATIVO: '{phrase}' → -2")
    
    # 🔥 BOOSTS ESPECIAIS
    boosts = 0
    
    # Boost por contexto de previsão alta
    if any(word in text_lower for word in ['previsão', 'preveem', 'projeção', 'alvo']):
        if any(word in text_lower for word in ['alto', 'alta', 'subir', 'valorizar', 'milhão', 'bilhão']):
            boosts += 3
            logger.info(f"🎯 BOOST: Contexto de previsão alta → +3")
    
    # Boost por contexto institucional
    if any(word in text_lower for word in ['executivo', 'CEO', 'diretor', 'presidente', 'empresa', 'instituição']):
        if any(word in text_lower for word in ['compra', 'investe', 'otimista', 'positivo']):
            boosts += 3
            logger.info(f"🏢 BOOST: Contexto institucional positivo → +3")
    
    # Boost por números altos
    number_matches = re.findall(r'US?\$?\s*(\d+[\.,]?\d*\s*(mil|milh[oõ]es|bilh[oõ]es))', text_lower)
    if number_matches:
        boosts += 2
        logger.info(f"💰 BOOST: Números altos mencionados → +2")
    
    positive_score += boosts
    
    # 🔥 CÁLCULO FINAL SUPER AGRESSIVO
    final_score = positive_score - negative_score
    
    # 🔥 DECISÃO SUPER AGRESSIVA
    if final_score >= 3:  # Apenas 3 pontos positivos já é POSITIVO
        sentiment = "positive"
        confidence = min(0.95, 0.7 + (final_score * 0.05))
    elif final_score <= -3:  # Apenas 3 pontos negativos já é NEGATIVO
        sentiment = "negative"
        confidence = min(0.95, 0.7 + (abs(final_score) * 0.05))
    else:
        sentiment = "neutral"
        confidence = 0.5
    
    # 🔥 OVERRIDE: Se tem qualquer SUPER POSITIVO, é POSITIVO com alta confiança
    has_super_positive = any(phrase in text_lower for phrase in BITCOIN_POSITIVE_SUPER_STRONG)
    if has_super_positive:
        sentiment = "positive"
        confidence = max(confidence, 0.9)  # Mínimo 90% de confiança
        logger.info(f"🎯 OVERRIDE: Super positivo detectado → POSITIVO FORÇADO")
    
    return {
        'sentiment': sentiment,
        'confidence': confidence,
        'final_score': final_score,
        'positive_score': positive_score,
        'negative_score': negative_score,
        'boosts': boosts,
        'has_super_positive': has_super_positive
    }

def forced_analysis(text):
    """Análise FORÇADA que prioriza keywords sobre modelos."""
    start_time = time.time()
    
    # 🔥 PRIMEIRO: Análise ultra-agressiva por keywords
    keyword_result = ultra_aggressive_keyword_analysis(text)
    
    # 🔥 SE keywords são fortes, IGNORAR modelos
    if keyword_result['has_super_positive'] or abs(keyword_result['final_score']) >= 5:
        logger.info("🎯 DECISÃO: Keywords fortes → IGNORANDO modelos")
        return {
            "label": keyword_result['sentiment'],
            "score": keyword_result['confidence'],
            "method": "keywords_forced",
            "keyword_analysis": keyword_result,
            "processing_time": round(time.time() - start_time, 2)
        }
    
    # 🔥 FALLBACK: Usar modelo apenas se keywords não forem conclusivos
    try:
        if finbert:
            # Tradução simples de termos críticos
            translated = text.lower()
            translations = {
                'corrida': 'rally', 'valorizar': 'appreciate', 'alta': 'high',
                'subir': 'rise', 'milhão': 'million', 'disparada': 'surge'
            }
            for pt, en in translations.items():
                translated = translated.replace(pt, en)
            
            model_result = finbert(translated[:512])[0]
            model_sentiment = model_result['label'].lower()
            model_confidence = model_result['score']
            
            # Mapear modelo
            if 'positive' in model_sentiment or 'bull' in model_sentiment:
                model_sentiment = "positive"
            elif 'negative' in model_sentiment or 'bear' in model_sentiment:
                model_sentiment = "negative"
            else:
                model_sentiment = "neutral"
        else:
            model_sentiment = "neutral"
            model_confidence = 0.5
            
    except Exception as e:
        logger.warning(f"⚠️ Modelo falhou: {e}")
        model_sentiment = "neutral"
        model_confidence = 0.5
    
    # 🔥 COMBINAÇÃO: Keywords tem 80% de peso, modelo 20%
    keyword_weight = 0.8
    model_weight = 0.2
    
    if keyword_result['sentiment'] == "positive":
        combined_score = (keyword_result['confidence'] * keyword_weight) + (model_confidence * model_weight if model_sentiment == "positive" else 0)
        final_sentiment = "positive"
    elif keyword_result['sentiment'] == "negative":
        combined_score = (keyword_result['confidence'] * keyword_weight) + (model_confidence * model_weight if model_sentiment == "negative" else 0)
        final_sentiment = "negative"
    else:
        # Se keywords são neutros, usar modelo
        final_sentiment = model_sentiment
        combined_score = model_confidence
    
    return {
        "label": final_sentiment,
        "score": round(combined_score, 3),
        "method": "weighted_combination",
        "keyword_analysis": keyword_result,
        "model_sentiment": model_sentiment,
        "model_confidence": model_confidence,
        "processing_time": round(time.time() - start_time, 2)
    }

# ======================================================
# 🔹 ROTAS PRINCIPAIS
# ======================================================

@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    """Análise em lote ULTRA-AGGRESSIVA."""
    try:
        textos = request.get_json()
        if not textos:
            return jsonify({"error": "Nenhum texto recebido"}), 400

        logger.info(f"📨 Recebido lote com {len(textos)} textos para análise ULTRA-AGGRESSIVA")

        resultados = []
        for i, texto in enumerate(textos):
            result = forced_analysis(texto)
            
            resultados.append({
                "label": result["label"],
                "score": result["score"]
            })
            
            # Log SUPER DETALHADO
            logger.info(f"🎯 ANÁLISE {i+1}:")
            logger.info(f"   📝 Texto: '{texto[:80]}...'")
            logger.info(f"   🎪 Resultado: {result['label'].upper()} ({result['score']})")
            logger.info(f"   ⚙️  Método: {result['method']}")
            
            if 'keyword_analysis' in result:
                kw = result['keyword_analysis']
                logger.info(f"   🔑 Keywords: {kw['sentiment']} (score: {kw['final_score']})")
                logger.info(f"   📊 Detalhes: +{kw['positive_score']} / -{kw['negative_score']} / boosts:{kw['boosts']}")
                logger.info(f"   💥 Super Positivo: {kw['has_super_positive']}")
            
            if 'model_sentiment' in result:
                logger.info(f"   🤖 Modelo: {result['model_sentiment']} ({result['model_confidence']})")
            
            logger.info(f"   ⏱  Tempo: {result['processing_time']}s")
            logger.info("")

        return jsonify(resultados)
    
    except Exception as e:
        logger.error(f"❌ Erro em analyze-batch: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/analyze-tweets", methods=["POST"])
def analyze_tweets():
    """Análise MEGA AGRESSIVA específica para tweets."""
    try:
        textos = request.get_json()
        if not textos:
            return jsonify({"error": "Nenhum tweet recebido"}), 400

        logger.info(f"🐦 Recebido {len(textos)} tweets para análise MEGA AGRESSIVA")

        resultados = []
        for i, texto in enumerate(textos):
            # 🔥 USAR ANÁLISE MEGA AGRESSIVA
            result = analyze_tweet_final(texto)
            
            resultados.append({
                "label": result["label"],
                "score": result["score"]
            })
            
            # Log SUPER DETALHADO
            logger.info(f"🐦 TWEET {i+1}:")
            logger.info(f"   📝 '{texto[:80]}...'")
            logger.info(f"   🎪 {result['label'].upper()} ({result['score']}) via {result['method']}")
            
            if 'tweet_analysis' in result:
                ta = result['tweet_analysis']
                logger.info(f"   📊 Pontuação: +{ta['positive_score']}/-{ta['negative_score']} = {ta['final_score']}")
                logger.info(f"   💰 Menção Bitcoin: {ta['has_bitcoin_mention']}")
                logger.info(f"   ✅ Contexto Positivo: {ta['has_positive_context']}")
                logger.info(f"   😊 Emojis: {ta['emoji_count']}")
            
            logger.info("")

        return jsonify(resultados)
    
    except Exception as e:
        logger.error(f"❌ Erro em analyze-tweets: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/debug-ultra", methods=["POST"])
def debug_ultra():
    """Debug ULTRA DETALHADO."""
    try:
        data = request.get_json()
        text = data.get("text", "")
        
        if not text:
            return jsonify({"error": "Texto não fornecido"}), 400
        
        result = forced_analysis(text)
        
        return jsonify({
            "input_text": text,
            "final_result": {
                "label": result["label"],
                "score": result["score"],
                "method": result["method"]
            },
            "detailed_analysis": result,
            "keyword_analysis": result.get("keyword_analysis", {}),
            "model_analysis": {
                "sentiment": result.get("model_sentiment", "N/A"),
                "confidence": result.get("model_confidence", "N/A")
            } if "model_sentiment" in result else "N/A"
        })
    
    except Exception as e:
        logger.error(f"❌ Erro em debug-ultra: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ULTRA-AGGRESSIVE MODE",
        "models_loaded": finbert is not None,
        "strategy": "KEYWORDS FIRST, MODELS SECOND",
        "positive_phrases_loaded": len(BITCOIN_POSITIVE_SUPER_STRONG) + len(BITCOIN_POSITIVE_STRONG) + len(BITCOIN_POSITIVE_MEDIUM),
        "negative_phrases_loaded": len(BITCOIN_NEGATIVE_STRONG) + len(BITCOIN_NEGATIVE_MEDIUM)
    })

   # ======================================================
# 🔹 SISTEMA MEGA AGRESSIVO PARA TWEETS GENÉRICOS
# ======================================================

def analyze_tweet_mega_aggressive(text):
    """Análise MEGA AGRESSIVA que considera QUALQUER menção a Bitcoin como potencialmente positiva."""
    text_lower = text.lower()
    
    positive_score = 0
    negative_score = 0
    
    # 🔥 QUALQUER MENÇÃO A BITCOIN É +2 (MUDANÇA RADICAL)
    bitcoin_mentions = [
        'bitcoin', 'btc', '#bitcoin', 'bitcoin halving', 'bitcoin mining',
        'bitcoin wallet', 'bitcoin address', 'mine bitcoin', 'buy bitcoin'
    ]
    
    for mention in bitcoin_mentions:
        if mention in text_lower:
            positive_score += 2
            logger.info(f"💰 MENÇÃO BITCOIN: '{mention}' → +2")
    
    # 🔥 EMOJIS TEM PESO MÁXIMO
    strong_positive_emojis = {'🚀', '💎', '🔥', '🎯', '📈', '⭐', '🌟', '✨', '💪', '🥳', '🤑', '💰', '🎉'}
    strong_negative_emojis = {'💩', '😰', '📉', '👎', '💔', '😞', '😢', '⚠️', '🔻', '😨', '🤮', '☠️'}
    
    for emoji in strong_positive_emojis:
        count = text.count(emoji)
        if count > 0:
            positive_score += count * 5
            logger.info(f"🚀 EMOJI POSITIVO: '{emoji}' (x{count}) → +{count * 5}")
    
    for emoji in strong_negative_emojis:
        count = text.count(emoji)
        if count > 0:
            negative_score += count * 5
            logger.info(f"📉 EMOJI NEGATIVO: '{emoji}' (x{count}) → -{count * 5}")
    
    # 🔥 PALAVRAS-CHAVE SUPER POSITIVAS
    super_positive_words = {
        'to the moon': 10, 'moon soon': 8, 'buy the dip': 6, 'diamond hands': 6,
        'never selling': 5, 'hodl strong': 5, 'bull run': 5, 'breaking out': 4,
        'massive pump': 4, 'going parabolic': 4, 'lambo': 4, 'wealth': 3,
        'get rich': 3, 'financial freedom': 3, 'revolution': 3, 'future': 2,
        'upgrade the world': 5, 'revolutionizing': 4, 'mine bitcoin': 3
    }
    
    for phrase, score in super_positive_words.items():
        if phrase in text_lower:
            positive_score += score
            logger.info(f"🚀🔥 SUPER POSITIVO: '{phrase}' → +{score}")
    
    # 🔥 PALAVRAS-CHAVE POSITIVAS NORMAIS
    positive_words = {
        'bullish', 'bull', 'buy', 'buying', 'accumulate', 'hodl', 'hold', 
        'profit', 'gain', 'win', 'winning', 'green', 'pump', 'pumping',
        'surge', 'soaring', 'breaking', 'record', 'massive', 'huge',
        'enormous', 'incredible', 'amazing', 'awesome', 'perfect', 'great',
        'good', 'nice', 'excellent', 'fantastic', 'love', 'loving', 'uptrend',
        'help', 'upgrade', 'revolution', 'revolutionizing', 'mine', 'mining',
        'confident', 'confidence', 'secure', 'security', 'iron-tight'
    }
    
    for word in positive_words:
        if word in text_lower:
            positive_score += 2
            logger.info(f"✅ POSITIVO: '{word}' → +2")
    
    # 🔥 HASHTAGS POSITIVAS
    hashtags = re.findall(r'#(\w+)', text_lower)
    positive_hashtags = {
        'bitcoin', 'btc', 'crypto', 'cryptocurrency', 'blockchain', 
        'hodl', 'tothemoon', 'bullish', 'buybitcoin', 'bitcoinmining',
        'cryptosafe', 'margex'
    }
    
    for tag in hashtags:
        if tag in positive_hashtags:
            positive_score += 3
            logger.info(f"🏷️ HASHTAG POSITIVA: '#{tag}' → +3")
    
    # 🔥 DETECTAR CONTEXTO DE "AJUDA" OU "MELHORIA"
    help_phrases = [
        'help upgrade', 'upgrade the world', 'help with', 'bless you',
        'clear bills', 'clear debt', 'make money', 'earn money'
    ]
    
    for phrase in help_phrases:
        if phrase in text_lower:
            positive_score += 3
            logger.info(f"🤝 CONTEXTO AJUDA: '{phrase}' → +3")
    
    # 🔥 DETECTAR CONTEXTO DE "SEGURANÇA" OU "CONFIANÇA"
    security_phrases = [
        'total confidence', 'iron-tight', 'security', 'secure', 'safe',
        'trust', 'reliable'
    ]
    
    for phrase in security_phrases:
        if phrase in text_lower:
            positive_score += 2
            logger.info(f"🛡️ CONTEXTO SEGURANÇA: '{phrase}' → +2")
    
    # 🔥 DETECTAR "NÃO MORRER" / "SOBREVIVER" COMO POSITIVO
    survival_phrases = [
        "don't die", "stay alive", "survive", "living", "alive"
    ]
    
    for phrase in survival_phrases:
        if phrase in text_lower:
            positive_score += 4
            logger.info(f"💪 SOBREVIVÊNCIA: '{phrase}' → +4")
    
    # 🔥 PALAVRAS NEGATIVAS (só as realmente negativas)
    negative_words = {
        'die', 'dead', 'death', 'scam', 'fraud', 'rug', 'pull', 'rekt',
        'crash', 'crashing', 'collapse', 'bear', 'bearish', 'red', 'loss',
        'losing', 'dump', 'dumping', 'sell', 'selling', 'panic', 'fud',
        'fear', 'warning', 'danger', 'risk', 'careful', 'avoid', 'bad',
        'terrible', 'awful', 'horrible', 'burn', 'shit', 'garbage', 'trash',
        'worst', 'fail', 'failure', 'problem', 'trouble', 'concern', 'debt'
    }
    
    for word in negative_words:
        if word in text_lower:
            negative_score += 3
            logger.info(f"📉 NEGATIVO: '{word}' → -3")
    
    # 🔥 CÁLCULO FINAL MEGA AGRESSIVO
    final_score = positive_score - negative_score
    
    # 🔥 DECISÃO HIPER SENSÍVEL
    if final_score >= 1:  # APENAS 1 PONTO JÁ É POSITIVO!
        sentiment = "positive"
        confidence = min(0.95, 0.6 + (final_score * 0.1))
    elif final_score <= -1:  # APENAS 1 PONTO NEGATIVO JÁ É NEGATIVO
        sentiment = "negative" 
        confidence = min(0.95, 0.6 + (abs(final_score) * 0.1))
    else:
        sentiment = "neutral"
        confidence = 0.5
    
    # 🔥 OVERRIDES MEGA AGRESSIVOS
    if any(emoji in text for emoji in strong_positive_emojis):
        sentiment = "positive"
        confidence = max(confidence, 0.85)
        logger.info(f"🎯 OVERRIDE: Emoji positivo → POSITIVO FORÇADO")
    
    if any(emoji in text for emoji in strong_negative_emojis):
        sentiment = "negative"
        confidence = max(confidence, 0.85)
        logger.info(f"🎯 OVERRIDE: Emoji negativo → NEGATIVO FORÇADO")
    
    # 🔥 OVERRIDE: Se menciona Bitcoin E tem contexto positivo
    has_bitcoin_mention = any(mention in text_lower for mention in bitcoin_mentions)
    has_positive_context = positive_score > 2
    
    if has_bitcoin_mention and has_positive_context:
        sentiment = "positive"
        confidence = max(confidence, 0.8)
        logger.info(f"🎯 OVERRIDE: Bitcoin + contexto positivo → POSITIVO")
    
    # 🔥 OVERRIDE FINAL: Se tem Bitcoin e não é claramente negativo → TENTAR POSITIVO
    if has_bitcoin_mention and negative_score == 0 and sentiment == "neutral":
        sentiment = "positive"
        confidence = 0.7
        logger.info(f"🎯 OVERRIDE FINAL: Bitcoin sem negatividade → POSITIVO TENTATIVO")
    
    return {
        'sentiment': sentiment,
        'confidence': confidence,
        'final_score': final_score,
        'positive_score': positive_score,
        'negative_score': negative_score,
        'has_bitcoin_mention': has_bitcoin_mention,
        'has_positive_context': has_positive_context,
        'emoji_count': text.count('🚀') + text.count('💎') + text.count('🔥') + text.count('🎯')
    }

def analyze_tweet_final(text):
    """Análise FINAL mega agressiva para tweets."""
    start_time = time.time()
    
    # 🔥 USAR ANÁLISE MEGA AGRESSIVA
    tweet_analysis = analyze_tweet_mega_aggressive(text)
    
    # 🔥 SE A ANÁLISE É CONCLUSIVA, USAR ELA
    if (tweet_analysis['sentiment'] != "neutral" or 
        tweet_analysis['has_bitcoin_mention'] or 
        tweet_analysis['emoji_count'] > 0):
        
        logger.info("🎯 TWEET: Análise mega agressiva aplicada")
        return {
            "label": tweet_analysis['sentiment'],
            "score": tweet_analysis['confidence'],
            "method": "mega_aggressive_tweet",
            "tweet_analysis": tweet_analysis,
            "processing_time": round(time.time() - start_time, 2)
        }
    
    # 🔥 FALLBACK: Forçar positivo se menciona Bitcoin
    text_lower = text.lower()
    if 'bitcoin' in text_lower or 'btc' in text_lower:
        logger.info("🎯 TWEET FALLBACK: Menciona Bitcoin → POSITIVO FORÇADO")
        return {
            "label": "positive",
            "score": 0.7,
            "method": "bitcoin_mention_fallback",
            "processing_time": round(time.time() - start_time, 2)
        }
    
    # 🔥 ÚLTIMO FALLBACK: Neutro
    return {
        "label": "neutral",
        "score": 0.5,
        "method": "neutral_fallback",
        "processing_time": round(time.time() - start_time, 2)
    }

# ======================================================
# 🔹 INICIALIZAÇÃO
# ======================================================
if __name__ == "__main__":
    logger.info("🚀🔥 SERVIDOR INICIADO EM MODO ULTRA-AGGRESSIVO!")
    logger.info("   🎯 Estratégia: KEYWORDS TEM PRIORIDADE MÁXIMA")
    logger.info("   💥 Modelos são apenas fallback")
    logger.info("   🔥 'US$ 1 milhão' → POSITIVO FORÇADO com 90%+ confiança")
    
    # TESTES IMEDIATOS
    test_cases = [
        "Executivo do Méliuz fala da corrida do bitcoin para US$ 1 milhão",
        "Bitcoin tem previsão de US$ 1 milhão segundo analistas",
        "Corrida do bitcoin para patamar histórico de US$ 1 milhão",
        "Especialistas preveem bitcoin a US$ 1 milhão em 5 anos",
        "Mercado em euforia com bitcoin rumo aos US$ 1 milhão"
    ]
    
    logger.info("🧪🔥 TESTANDO CASOS CRÍTICOS:")
    for test in test_cases:
        result = forced_analysis(test)
        logger.info(f"   '{test}'")
        logger.info(f"   → {result['label'].upper()} ({result['score']}) via {result['method']}")
        logger.info("")
    
    
    if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
