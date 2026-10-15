# aroha_midi_map.py
# M-Audio Oxygen 61 Controller Mapping for AROHA 3-Layer System
# Unified Fluidic Nomenclature ("Water" Matrix Theme)

MIDI_CC_MAPPINGS = {
    "layer_1_resonance": {
        "name": "Hydraulic Base",
        "controls": {
            "C1": {"cc": 74, "parameter": "flow_velocity", "default": 0.5, "unit": "m/s"},
            "C2": {"cc": 71, "parameter": "tide_frequency", "default": 432.0, "unit": "Hz"},
            "C3": {"cc": 81, "parameter": "viscosity_damping", "default": 0.2, "unit": "Pa·s"},
            "C4": {"cc": 91, "parameter": "pressure_head", "default": 1.0, "unit": "bar"}
        }
    },
    "layer_2_modulation": {
        "name": "Current Entrainment",
        "controls": {
            "C5": {"cc": 73, "parameter": "binaural_spread", "default": 7.83, "unit": "Hz"},
            "C6": {"cc": 72, "parameter": "focus_depth", "default": 10.0, "unit": "Focus Level"},
            "C7": {"cc": 93, "parameter": "harmonic_tributary", "default": 3.0, "unit": "Ratio"},
            "C8": {"cc": 94, "parameter": "phase_current", "default": 0.0, "unit": "Degrees"}
        }
    },
    "layer_3_matrix": {
        "name": "Abyssal Visualization",
        "controls": {
            "SLIDER_1": {"cc": 7, "parameter": "master_depth", "default": 0.8, "unit": "Gain"},
            "SLIDER_2": {"cc": 10, "parameter": "pan_current", "default": 0.5, "unit": "Stereo"},
            "MOD_WHEEL": {"cc": 1, "parameter": "surface_turbulence", "default": 0.1, "unit": "Modulation"}
        }
    }
}

if __name__ == "__main__":
    import json
    with open("aroha_midi_config.json", "w") as f:
        json.dump(MIDI_CC_MAPPINGS, f, indent=4)
    print("[AROHA] Unified fluid MIDI mapping config generated: aroha_midi_config.json")
