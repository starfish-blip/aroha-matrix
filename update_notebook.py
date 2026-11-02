import os
from pathlib import Path

def update_notebook(input_code, notebook_path):
    """Append Marimo cell to a notebook file."""
    try:
        notebook_path = Path(notebook_path)
        input_code = input_code.strip()
        
        if not input_code:
            print("[ERROR] No code to append!")
            return False
            
        if not notebook_path.exists():
            print(f"[ERROR] Notebook file not found: {notebook_path}")
            return False
            
        notebook_file = notebook_path.with_suffix(".py")
        if not notebook_file.exists():
            print(f"[ERROR] Notebook file not found: {notebook_file}")
            return False

        existing_content = notebook_file.read_text(encoding="utf-8")
        
        cell_template = f"""

@app.cell
def _():
    {input_code}
    return
"""

        notebook_file.write_text(existing_content + cell_template, encoding="utf-8")
        print(f"[SUCCESS] Code successfully appended to {notebook_file}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to write notebook: {e}")
        return False

if __name__ == "__main__":
    update_notebook("print('AROHA bridge fully operational')", "aroha_acoustic_bridge.py")