"""
NotebookLM Local Server
=======================
Serveur Flask qui expose NotebookLM via une API REST locale.
Utilisable depuis n'importe quel projet (JS, Python, etc.)

Usage:
    python server.py

Endpoints:
    GET  /status                  → état du serveur + notebook actif
    GET  /notebooks               → liste des notebooks
    POST /notebooks               → créer un notebook
    POST /notebooks/<id>/sources  → ajouter une source (URL ou texte)
    POST /ask                     → poser une question
    POST /generate-scenarios      → générer des scénarios de test QA
    POST /suggest-missing         → suggérer des items manquants
    POST /analyze-risks           → analyser les risques
"""

import asyncio
import json
import os
import sys
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS

# ── notebooklm-py ──
try:
    from notebooklm import NotebookLMClient
    from notebooklm.exceptions import AuthError, NotebookLMError
except ImportError:
    print("Erreur : notebooklm-py n'est pas installé.")
    print("Exécute : pip install notebooklm-py")
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Autorise les appels depuis n'importe quelle origine locale

# ── Notebook actif (en mémoire) ──
_active_notebook_id = os.environ.get("NOTEBOOKLM_NOTEBOOK_ID", None)


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def run_async(coro):
    """Exécute une coroutine depuis du code synchrone Flask."""
    return asyncio.run(coro)


def handle_errors(f):
    """Décorateur : capture les erreurs NotebookLM et retourne du JSON propre."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AuthError:
            return jsonify({
                "error": "Non authentifié",
                "help": "Lance 'notebooklm login' sur ta machine locale d'abord."
            }), 401
        except NotebookLMError as e:
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            return jsonify({"error": f"Erreur inattendue: {str(e)}"}), 500
    return wrapper


def get_notebook_id():
    """Retourne le notebook_id depuis le body JSON, query param, ou variable d'env."""
    data = request.get_json(silent=True) or {}
    return (
        data.get("notebook_id")
        or request.args.get("notebook_id")
        or _active_notebook_id
    )


# ──────────────────────────────────────────────────────────────
# Routes de base
# ──────────────────────────────────────────────────────────────

@app.route("/status")
@handle_errors
def status():
    """Vérifie que le serveur tourne et que l'auth est valide."""
    async def _check():
        async with NotebookLMClient.from_storage() as client:
            notebooks = await client.notebooks.list()
            return len(notebooks)

    count = run_async(_check())
    return jsonify({
        "status": "ok",
        "notebooks_count": count,
        "active_notebook_id": _active_notebook_id
    })


@app.route("/notebooks", methods=["GET"])
@handle_errors
def list_notebooks():
    """Liste tous les notebooks NotebookLM."""
    async def _list():
        async with NotebookLMClient.from_storage() as client:
            notebooks = await client.notebooks.list()
            return [
                {
                    "id": nb.notebook_id,
                    "title": nb.title,
                    "source_count": nb.source_count if hasattr(nb, "source_count") else None
                }
                for nb in notebooks
            ]

    return jsonify({"notebooks": run_async(_list())})


@app.route("/notebooks", methods=["POST"])
@handle_errors
def create_notebook():
    """Crée un nouveau notebook."""
    data = request.get_json() or {}
    title = data.get("title", "Nouveau Notebook")

    async def _create():
        async with NotebookLMClient.from_storage() as client:
            nb = await client.notebooks.create(title)
            return {"id": nb.notebook_id, "title": nb.title}

    return jsonify(run_async(_create())), 201


@app.route("/notebooks/<notebook_id>/sources", methods=["POST"])
@handle_errors
def add_source(notebook_id):
    """Ajoute une source (URL ou texte) à un notebook."""
    data = request.get_json() or {}
    url = data.get("url")
    text = data.get("text")
    title = data.get("title", "Source")

    if not url and not text:
        return jsonify({"error": "Fournir 'url' ou 'text'"}), 400

    async def _add():
        async with NotebookLMClient.from_storage() as client:
            if url:
                source = await client.sources.add_url(notebook_id, url)
            else:
                source = await client.sources.add_text(notebook_id, text, title=title)
            return {"source_id": source.source_id, "title": source.title}

    return jsonify(run_async(_add())), 201


# ──────────────────────────────────────────────────────────────
# Chat / Questions
# ──────────────────────────────────────────────────────────────

@app.route("/ask", methods=["POST"])
@handle_errors
def ask():
    """Pose une question à un notebook."""
    data = request.get_json() or {}
    question = data.get("question")
    notebook_id = get_notebook_id()

    if not question:
        return jsonify({"error": "Champ 'question' requis"}), 400
    if not notebook_id:
        return jsonify({"error": "Champ 'notebook_id' requis (ou set NOTEBOOKLM_NOTEBOOK_ID)"}), 400

    async def _ask():
        async with NotebookLMClient.from_storage() as client:
            result = await client.chat.ask(notebook_id, question)
            return {"answer": result.text if hasattr(result, "text") else str(result)}

    return jsonify(run_async(_ask()))


# ──────────────────────────────────────────────────────────────
# Endpoints QA spécifiques
# ──────────────────────────────────────────────────────────────

@app.route("/generate-scenarios", methods=["POST"])
@handle_errors
def generate_scenarios():
    """
    Génère des scénarios de test QA via NotebookLM.

    Body JSON:
        feature_description: str  (description de la feature)
        feature_type: str         (login | api | form | etc.)
        context: str              (contexte technique optionnel)
        notebook_id: str          (optionnel si NOTEBOOKLM_NOTEBOOK_ID défini)
    """
    data = request.get_json() or {}
    feature_description = data.get("feature_description", "")
    feature_type = data.get("feature_type", "generic")
    context = data.get("context", "")
    notebook_id = get_notebook_id()

    if not notebook_id:
        return jsonify({"error": "notebook_id requis"}), 400

    prompt = f"""Tu es un expert QA. Génère des scénarios de test complets pour cette feature.

Feature: {feature_description}
Type: {feature_type}
Contexte: {context}

Réponds en JSON avec ce format exact:
{{
  "reasoning": "explication courte de l'approche",
  "scenarios": [
    {{
      "label": "nom du scénario",
      "priority": "critical|high|medium|low",
      "category": "Fonctionnel|Sécurité|Performance|UX|Accessibilité|Edge Cases",
      "steps": ["étape 1", "étape 2"],
      "expectedResult": "résultat attendu",
      "aiGenerated": true
    }}
  ]
}}

Génère au moins 10 scénarios couvrant: fonctionnel, sécurité, edge cases, performance, UX."""

    async def _generate():
        async with NotebookLMClient.from_storage() as client:
            result = await client.chat.ask(notebook_id, prompt)
            text = result.text if hasattr(result, "text") else str(result)
            # Extraire le JSON de la réponse
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
            return {"reasoning": text, "scenarios": []}

    return jsonify(run_async(_generate()))


@app.route("/suggest-missing", methods=["POST"])
@handle_errors
def suggest_missing():
    """
    Suggère des items de test manquants.

    Body JSON:
        existing_items: list      (items existants [{label, priority, category}])
        feature_type: str
        feature_name: str
        notebook_id: str
    """
    data = request.get_json() or {}
    existing_items = data.get("existing_items", [])
    feature_type = data.get("feature_type", "generic")
    feature_name = data.get("feature_name", "")
    notebook_id = get_notebook_id()

    if not notebook_id:
        return jsonify({"error": "notebook_id requis"}), 400

    items_summary = "\n".join(
        f"- [{item.get('priority', '?')}] {item.get('label', '')} ({item.get('category', '')})"
        for item in existing_items[:20]
    )

    prompt = f"""Tu es un expert QA. Analyse cette checklist de tests et suggère les items manquants.

Feature: {feature_name} (type: {feature_type})

Items existants:
{items_summary}

Réponds en JSON:
{{
  "explanation": "analyse des lacunes",
  "suggestions": [
    {{
      "label": "test manquant",
      "priority": "critical|high|medium|low",
      "category": "Fonctionnel|Sécurité|Performance|UX|Accessibilité|Edge Cases",
      "rationale": "pourquoi ce test est important",
      "aiSuggested": true
    }}
  ]
}}"""

    async def _suggest():
        async with NotebookLMClient.from_storage() as client:
            result = await client.chat.ask(notebook_id, prompt)
            text = result.text if hasattr(result, "text") else str(result)
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
            return {"explanation": text, "suggestions": []}

    return jsonify(run_async(_suggest()))


@app.route("/analyze-risks", methods=["POST"])
@handle_errors
def analyze_risks():
    """
    Analyse les risques d'une checklist QA.

    Body JSON:
        checklist: list    (items avec champ 'checked')
        stats: object      (coverage, totals)
        notebook_id: str
    """
    data = request.get_json() or {}
    checklist = data.get("checklist", [])
    stats = data.get("stats", {})
    notebook_id = get_notebook_id()

    if not notebook_id:
        return jsonify({"error": "notebook_id requis"}), 400

    total = len(checklist)
    checked = sum(1 for item in checklist if item.get("checked"))
    critical_unchecked = [
        item.get("label", "")
        for item in checklist
        if not item.get("checked") and item.get("priority") == "critical"
    ]

    prompt = f"""Tu es un expert QA. Analyse les risques de cette checklist.

Stats: {checked}/{total} tests complétés
Tests critiques non complétés: {len(critical_unchecked)}
Détail: {', '.join(critical_unchecked[:5])}
Stats supplémentaires: {json.dumps(stats)}

Réponds en JSON:
{{
  "riskLevel": "low|medium|high|critical",
  "riskScore": 0-100,
  "summary": "résumé du risque",
  "insights": ["insight 1", "insight 2"],
  "recommendations": [
    {{
      "action": "action à faire",
      "priority": "immediate|short_term|long_term",
      "rationale": "pourquoi"
    }}
  ],
  "blockers": ["bloquant 1"]
}}"""

    async def _analyze():
        async with NotebookLMClient.from_storage() as client:
            result = await client.chat.ask(notebook_id, prompt)
            text = result.text if hasattr(result, "text") else str(result)
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
            return {"riskLevel": "unknown", "riskScore": 0, "summary": text}

    return jsonify(run_async(_analyze()))


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    print(f"""
╔══════════════════════════════════════════════╗
║     NotebookLM Local Server v1.0             ║
╠══════════════════════════════════════════════╣
║  URL : http://localhost:{port}                  ║
║  Test: curl http://localhost:{port}/status      ║
╚══════════════════════════════════════════════╝

Endpoints disponibles:
  GET  /status
  GET  /notebooks
  POST /notebooks
  POST /notebooks/<id>/sources
  POST /ask
  POST /generate-scenarios
  POST /suggest-missing
  POST /analyze-risks
    """)

    if not _active_notebook_id:
        print("⚠  NOTEBOOKLM_NOTEBOOK_ID non défini.")
        print("   Utilise: export NOTEBOOKLM_NOTEBOOK_ID=<id>")
        print("   Ou passe notebook_id dans chaque requête.\n")

    app.run(host="0.0.0.0", port=port, debug=False)
