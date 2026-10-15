import os
import numpy as np
from scipy.io.wavfile import write
from celery import Celery

# Configure Celery to use local Redis
celery_app = Celery(
    "audio_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

OUTPUT_DIR = "generated_audio"
os.makedirs(OUTPUT_DIR, exist_ok=True)
SAMPLE_RATE = 44100

@celery_app.task(name="tasks.generate_chladni")
def task_generate_chladni(start_freq: float, end_freq: float, duration: float, filename: str):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    k = (end_freq / start_freq) ** (1.0 / duration)
    phase = 2 * np.pi * start_freq * ((k ** t - 1.0) / np.log(k))
    waveform = np.sin(phase)
    
    fade_len = int(SAMPLE_RATE * 0.05)
    envelope = np.ones_like(waveform)
    envelope[:fade_len] = np.linspace(0, 1, fade_len)
    envelope[-fade_len:] = np.linspace(1, 0, fade_len)
    waveform *= envelope
    
    audio_data = np.int16(waveform * 32767)
    filepath = os.path.join(OUTPUT_DIR, filename)
    write(filepath, SAMPLE_RATE, audio_data)
    return {"status": "completed", "filepath": filepath}

@celery_app.task(name="tasks.generate_binaural")
def task_generate_binaural(carrier_freq: float, beat_freq: float, duration: float, filename: str):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    left_channel = np.sin(2 * np.pi * carrier_freq * t)
    right_channel = np.sin(2 * np.pi * (carrier_freq + beat_freq) * t)
    
    fade_len = int(SAMPLE_RATE * 0.1)
    envelope = np.ones_like(t)
    envelope[:fade_len] = np.linspace(0, 1, fade_len)
    envelope[-fade_len:] = np.linspace(1, 0, fade_len)
    
    left_channel *= envelope
    right_channel *= envelope
    
    stereo_waveform = np.column_stack((left_channel, right_channel))
    audio_data = np.int16(stereo_waveform * 32767)
    filepath = os.path.join(OUTPUT_DIR, filename)
    write(filepath, SAMPLE_RATE, audio_data)
    return {"status": "completed", "filepath": filepath}
