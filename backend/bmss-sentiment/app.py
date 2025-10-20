from flask import Flask, request, jsonify
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from datetime import datetime
import nltk

# baixar os dados do NLTK (somente na primeira execução)
nltk.download('vader_lexicon')

app = Flask(__name__)
analyzer = SentimentIntensityAnalyzer()

@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    data = request.get_json()
    text = data.get("text", "")

    if not text.strip():
        return jsonify({"error": "O campo 'text' é obrigatório"}), 400

    result = analyzer.polarity_scores(text)
    compound = result['compound']

    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    return jsonify({
        "label": label,
        "score": compound,
        "analyzed_at": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
