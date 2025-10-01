import pandas as pd
import json
import os

EXCEL_PATH = 'data/Quiz-Scrum-2000.xlsx'
JSON_PATH = 'data/quiz.json'


df = pd.read_excel(EXCEL_PATH)
quiz = []
for _, row in df.iterrows():
    qtext = str(row['Domande'])
    option_cols = ['Risposte', 'Unnamed: 3', 'Unnamed: 4', 'Unnamed: 5', 'Unnamed: 6']
    opt_raw = [row[c] for c in option_cols if pd.notnull(row[c])]
    options = [str(o).replace('*','').strip() for o in opt_raw]
    answer = [i for i, o in enumerate(opt_raw) if isinstance(o, str) and o.strip().startswith('*')]
    # fallback (domande a risposta singola)
    if not answer:
        for i, o in enumerate(opt_raw):
            if str(o).lower() in ['true','false','yes','no']:
                answer = [i]
    quiz.append({
        "question": qtext,
        "options": options,
        "answer": answer if len(answer) > 1 else answer[0] if answer else None
    })
with open(JSON_PATH,"w", encoding="utf-8") as f:
    json.dump(quiz, f, ensure_ascii=False, indent=2)
print(f"Quiz salvati in {os.path.abspath(JSON_PATH)}")
