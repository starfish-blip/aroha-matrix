import marimo

__generated_with = "0.25.1"
app = marimo.App(width="medium")


@app.cell
def _(mo):
    mo.md("""
    # ?? AROHA Local Agent Sandbox v35
    *Defensive execution loop for local Ollama models.*
    """)
    return


@app.cell
def _():
    import marimo as mo
    import requests
    import json

    return mo, requests


app._unparsable_cell(
    r"""
        options=["qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen3:4b"],
        value="qwen2.5-coder:1.5b",
        label="Select Local Ollama Model"
    )
    prompt_input = mo.ui.text_area(value="Write a Python function for v35...", label="Prompt / Instruction", full_width=True)
    run_button = mo.ui.run_button(label="Execute Agent Safely")
    mo.vstack([model_dropdown, prompt_input, run_button])
    """,
    name="_"
)


@app.cell
def _(requests):
    def query_ollama_safe(prompt: str, model: str = "qwen2.5-coder:1.5b"):
        url = "http://localhost:11434/api/generate"
        payload = {"model": model, "prompt": prompt, "stream": False}
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            return {"success": True, "response": response.json().get("response", "")}
        except Exception as e:
            return {"success": False, "error": str(e)}

    return (query_ollama_safe,)


@app.cell
def _(model_dropdown, prompt_input, query_ollama_safe, run_button):
    result = query_ollama_safe(prompt=prompt_input.value, model=model_dropdown.value) if run_button.value else None
    return (result,)


@app.cell
def _(mo, result):
    if result and result.get("success"):
        mo.md(f"### ? Success\n`python\n{result['response']}\n`")
    elif result:
        mo.md(f"### ?? Handled Error\n> {result['error']}")
    return


if __name__ == "__main__":
    app.run()
