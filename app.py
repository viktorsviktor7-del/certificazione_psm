# src/app.py
from flask import Flask, jsonify
import json

app = Flask(__name__)

with open('../data/quiz.json', encoding='utf-8') as f:
    all_quiz = json.load(f)

@app.route('/quiz')
def quiz_api():
    # random 80 domande e basta (simula estrazione random per ogni tentativo come l’esame ufficiale)
    import random
    quiz = random.sample(all_quiz, k=80)
    return jsonify(quiz)

if __name__ == '__main__':
    app.run(debug=True)
