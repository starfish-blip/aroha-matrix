import numpy as np
from scipy.special import j0

class TransitionEngine:
    def __init__(self, target_root: float = 8.6537279, tolerance: float = 1e-4):
        self.target_root = target_root
        self.tolerance = tolerance
        # State vector: [S3 (Terra), S2 (Bridge), S25 (Handshake Gate), S1 (Dome)]
        self.state = np.array([1.0, 0.0, 0.0, 0.0])
        
    def check_zero_crossing(self, x: float) -> bool:
        """Evaluates whether spatial coordinate x matches Bessel zero-point J0(alpha_3,0)."""
        val = abs(j0(x))
        return val <= self.tolerance or abs(x - self.target_root) <= 0.005

    def get_transition_matrix(self, x: float, handshake_confirmed: bool) -> np.ndarray:
        """Constructs dynamic state transition matrix T based on J0 zero-point crossing."""
        at_zero = self.check_zero_crossing(x)
        delta = 1.0 if at_zero else 0.0
        p2 = 0.8  # Flow rate from Zone 3 to Zone 2
        
        S_h = 1.0 if handshake_confirmed else 0.0
        
        # Matrix layout: [S3, S2, S25, S1]
        T = np.array([
            [1.0 - p2, 0.0,              (1.0 - S_h) * delta, 0.0],
            [p2,       1.0 - delta,      0.0,                 0.0],
            [0.0,      delta,            1.0 - delta,         0.0],
            [0.0,      0.0,              S_h * delta,         1.0]
        ])
        return T

    def step(self, x: float, handshake_confirmed: bool = False) -> dict:
        """Executes one state transition step."""
        T = self.get_transition_matrix(x, handshake_confirmed)
        self.state = T @ self.state
        
        return {
            "coordinate_x": x,
            "J0_value": float(j0(x)),
            "at_point_25": self.check_zero_crossing(x),
            "state_vector": {
                "S3_Terra": float(self.state[0]),
                "S2_Bridge": float(self.state[1]),
                "S25_Handshake": float(self.state[2]),
                "S1_Dome": float(self.state[3])
            }
        }

# --- Execution Simulation Example ---
if __name__ == "__main__":
    engine = TransitionEngine()
    
    print("--- 1. Zone 3 to Zone 2 Propagation (x = 5.0) ---")
    res1 = engine.step(x=5.0)
    print(res1["state_vector"])
    
    print("\n--- 2. Reaching Point 25 Zero-Point Node J0(8.6537) = 0 (Unconfirmed) ---")
    res2 = engine.step(x=8.6537279, handshake_confirmed=False)
    print(res2["state_vector"])
    
    print("\n--- 3. Reciprocal Handshake Confirmed (S_Handshake = True) ---")
    res3 = engine.step(x=8.6537279, handshake_confirmed=True)
    print(res3["state_vector"])
