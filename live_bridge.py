import math
import time

class HermesFrequencyEngine:
    def __init__(self):
        self.base_frequency = 432.0
        self.zodiac_divisions = 12

    def calculate_frequency(self, angle_degrees):
        normalized_angle = angle_degrees % 360
        zodiac_index = normalized_angle / (360 / self.zodiac_divisions)
        ratio = 2 ** (zodiac_index / self.zodiac_divisions)
        return round(self.base_frequency * ratio, 2)

if __name__ == "__main__":
    engine = HermesFrequencyEngine()
    print("--- Hermes Live Transmission Pipeline Active ---")
    angle = 0.0
    try:
        while True:
            freq = engine.calculate_frequency(angle)
            print(f"Emitting Angle: {round(angle, 1)}° | Frequency: {freq} Hz")
            angle = (angle + 15.0) % 360
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nTransmission halted.")
