import marimo

__generated_with = "0.25.1"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import json
    import math

    return json, math, mo


@app.cell
def _(mo):
    mo.md("""
    # AROHA v34 Acoustic Resonance & MIDI Engine
    Reactive backend calculations for frequency mapping, 12-octave fader bank, and configuration export.
    """)
    return


@app.cell
def _(mo):
    base_freq_slider = mo.ui.slider(100, 1000, value=432, step=1, label="Base Frequency (Hz)")
    waveform_dropdown = mo.ui.dropdown(["sine", "triangle", "sawtooth", "square"], value="sine", label="Waveform Type")

    mo.vstack([base_freq_slider, waveform_dropdown])
    return base_freq_slider, waveform_dropdown


@app.cell
def _(base_freq_slider, math):
    # Calculate 12-octave cosmological fader bank frequencies
    base = base_freq_slider.value
    fader_bank = []

    for i in range(12):
        # Scale each fader across octave multipliers / harmonic intervals
        mult = math.pow(2, (i - 6) / 12)
        freq = round(base * mult, 2)
        fader_bank.append({
            "fader_index": i + 1,
            "frequency": freq,
            "default_gain_db": 0.0
        })

    def midi_to_freq(note_number):
        return 440 * math.pow(2, (note_number - 69) / 12)

    midi_range_preview = {
        "C4_freq": round(midi_to_freq(60), 2),
        "A4_freq": round(midi_to_freq(69), 2),
        "fader_bank": fader_bank
    }
    return fader_bank, midi_range_preview


@app.cell
def _(
    base_freq_slider,
    fader_bank,
    json,
    midi_range_preview,
    mo,
    waveform_dropdown,
):
    config_payload = {
        "base_frequency": base_freq_slider.value,
        "waveform": waveform_dropdown.value,
        "fader_bank": fader_bank,
        "midi_references": midi_range_preview
    }

    # Automatically export config to static directory for the frontend
    try:
        import os
        os.makedirs("static/config", exist_ok=True)
        with open("static/config/acoustic_config.json", "w") as f:
            json.dump(config_payload, f, indent=2)
        export_status = "[OK] Successfully exported acoustic_config.json to static/config/"
    except Exception as e:
        export_status = f"[ERROR] Export failed: {str(e)}"

    mo.vstack([
        mo.md(f"**Export Status:** `{export_status}`"),
        mo.json(config_payload)
    ])
    return


if __name__ == "__main__":
    app.run()
