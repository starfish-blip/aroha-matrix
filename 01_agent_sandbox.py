import marimo

__generated_with = "0.25.1"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import requests
    import json

    return mo, requests


@app.cell
def _(mo):
    model_dropdown = mo.ui.dropdown(
        options=["qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen3:4b"],
        value="qwen2.5-coder:1.5b",
        label="Select Local Ollama Model"
    )
    prompt_input = mo.ui.text_area(value="Write a Python function for v35...", label="Prompt / Instruction", full_width=True)
    run_button = mo.ui.run_button(label="Execute Agent Safely")
    mo.vstack([model_dropdown, prompt_input, run_button])
    return model_dropdown, prompt_input, run_button


@app.cell
def _(mo, model_dropdown, prompt_input, requests, run_button):
    # Cell 2: Execution Handler
    if run_button.value:
        selected_model = model_dropdown.value
        user_prompt = prompt_input.value
    
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": selected_model,
            "prompt": user_prompt,
            "stream": False
        }
    
        mo.md(f"*Sending request to local model `{selected_model}`...*")
    
        try:
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            result = response.json().get("response", "No response returned.")
            mo.md(f"### Output:\n```python\n{result}\n```")
        except Exception as e:
            mo.md(f"**Error connecting to Ollama:** `{e}`")
    else:
        mo.md("*Configure your prompt above and click **Execute Agent Safely** to run.*")

    return


if __name__ == "__main__":
    app.run()
