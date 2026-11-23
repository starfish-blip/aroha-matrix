import sys
import os
import numpy as np
import scipy.io.wavfile as wavfile
import pretty_midi

if len(sys.argv) < 3:
    print("Usage: python wav_to_midi.py <input.wav> <output_dir>")
    sys.exit(1)

in_path = sys.argv[1]
out_dir = sys.argv[2]
os.makedirs(out_dir, exist_ok=True)

sr, data = wavfile.read(in_path)
if data.ndim > 1:
    data = data.mean(axis=1)
data = data.astype(np.float32)
if np.max(np.abs(data)) > 0:
    data = data / np.max(np.abs(data))

hop_ms = 25
hop = max(1, int(sr * hop_ms / 1000.0))
win = max(hop * 2, 2048)

midi_notes = np.arange(36, 97)  # C2..C7
freqs = 440.0 * (2.0 ** ((midi_notes - 69) / 12.0))

pm = pretty_midi.PrettyMIDI(initial_tempo=110.0)
inst = pretty_midi.Instrument(program=0)  # Acoustic Grand Piano

active = {}  # midi -> start_time
dt = hop / sr

for i in range(0, len(data) - win, hop):
    t = i / sr
    frame = data[i:i+win] * np.hanning(win)
    spec = np.abs(np.fft.rfft(frame))
    bins = np.fft.rfftfreq(win, 1.0 / sr)

    # Energy around each MIDI note frequency
    energies = []
    for f in freqs:
        idx = int(np.argmin(np.abs(bins - f)))
        lo = max(0, idx - 1)
        hi = min(len(spec), idx + 2)
        energies.append(float(np.max(spec[lo:hi])))
    energies = np.array(energies)
    thresh = np.max(energies) * 0.45 if np.max(energies) > 0 else 1e9

    detected = set(int(midi_notes[k]) for k in np.where(energies >= thresh)[0])

    # Stop notes that ended
    for m in list(active.keys()):
        if m not in detected:
            start_t = active.pop(m)
            if t - start_t >= 0.08:
                inst.notes.append(pretty_midi.Note(velocity=85, pitch=m, start=start_t, end=t))

    # Start newly detected notes
    for m in detected:
        if m not in active:
            active[m] = t

end_t = len(data) / sr
for m, start_t in active.items():
    if end_t - start_t >= 0.08:
        inst.notes.append(pretty_midi.Note(velocity=85, pitch=m, start=start_t, end=end_t))

pm.instruments.append(inst)
base_name = os.path.splitext(os.path.basename(in_path))[0] + ".mid"
out_path = os.path.join(out_dir, base_name)
pm.write(out_path)
print(f"Wrote {len(inst.notes)} MIDI notes -> {out_path}")