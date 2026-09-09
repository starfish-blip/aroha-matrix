import math

class HermesFrequencyEngine:
    def __init__(self):
        self.base_frequency = 432.0 # Standard tuning anchor
        self.zodiac_divisions = 12

    def calculate_frequency(self, angle_degrees):
        normalized_angle = angle_degrees % 360
        zodiac_index = normalized_angle / (360 / self.zodiac_divisions)
        # Pythagorean ratio scaling approximation
        ratio = 2 ** (zodiac_index / self.zodiac_divisions)
        frequency = self.base_frequency * ratio
        return round(frequency, 2)

if __name__ == "__main__":
    engine = HermesFrequencyEngine()
    test_angles = [0, 30, 60, 90, 180, 270]
    print("--- Hermes Backend Frequency Calculation Matrix ---")
    for angle in test_angles:
        freq = engine.calculate_frequency(angle)
        print(f"Angle: {angle}° -> Frequency: {freq} Hz")
    print("--- Verification Complete ---")
