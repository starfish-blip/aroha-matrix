from pathlib import Path
from update_notebook import update_notebook

def inject_batch(batch_file_path):
    batch_path = Path(batch_file_path)
    if not batch_path.exists():
        print(f'[ERROR] Batch file not found: {batch_path}')
        return
    
    lines = batch_path.read_text(encoding='utf-8').splitlines()
    success_count = 0
    for line in lines:
        line = line.strip()
        if line and not line.startswith('#'):
            if update_notebook(line, 'aroha_acoustic_bridge.py'):
                success_count += 1
    print(f'[SUCCESS] Bulk injected {success_count} layers into aroha_acoustic_bridge.py')

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        inject_batch(sys.argv[1])
    else:
        print('Usage: python inject_batch.py <batch_file.txt>')
