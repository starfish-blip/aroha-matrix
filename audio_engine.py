import math

def generate_oscillator_bank(root_freq, count=4):
    return [{'id': i, 'freq': root_freq * (2 ** (i / 12)), 'type': 'sine'} for i in range(count)]

def calculate_spectral_envelope(root_freq):
    return [root_freq * (n ** 1.2) for n in range(1, 8)]
