import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from celery.result import AsyncResult
from celery_worker import task_generate_chladni, task_generate_binaural, celery_app, OUTPUT_DIR

app = FastAPI(title='Aroha Asynchronous Audio API', version='2.0.0')

app.mount('/static', StaticFiles(directory='.'), name='static')

@app.get('/', response_class=HTMLResponse)
async def read_index():
    if os.path.exists('atlas_engine.html'):
        return FileResponse('atlas_engine.html')
    return '<h1>AROHA Engine Active</h1><p>atlas_engine.html not found.</p>'

@app.post('/batch/chladni')
def batch_chladni(start_freq: float = 100.0, end_freq: float = 2000.0, duration: float = 10.0):
    filename = f'chladni_{start_freq}_{end_freq}_dur{duration}.wav'.replace('.', '_')
    task = task_generate_chladni.delay(start_freq, end_freq, duration, filename)
    return {'task_id': task.id, 'status': 'queued', 'filename': filename}

@app.post('/batch/binaural')
def batch_binaural(carrier_freq: float = 200.0, beat_freq: float = 8.0, duration: float = 30.0):
    filename = f'binaural_c{carrier_freq}_b{beat_freq}_dur{duration}.wav'.replace('.', '_')
    task = task_generate_binaural.delay(carrier_freq, beat_freq, duration, filename)
    return {'task_id': task.id, 'status': 'queued', 'filename': filename}

@app.get('/tasks/{task_id}')
def get_task_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    if task_result.state == 'PENDING':
        response = {'state': task_result.state, 'status': 'Task is waiting for processing...'}
    elif task_result.state != 'FAILURE':
        response = {'state': task_result.state, 'result': task_result.get()}
    else:
        response = {'state': task_result.state, 'error': str(task_result.info)}
    return response

@app.get('/download/{filename}')
def download_file(filename: str):
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail='File not found or still processing.')
    return FileResponse(filepath, media_type='audio/wav', filename=filename)

