from __future__ import annotations

from dataclasses import dataclass, field
import json
import math
import struct
from typing import Literal
import numpy as np

try:
    from scipy.special import j0 as _bessel_j0, j1 as _bessel_j1
except ImportError:
    def _bessel_j0(x: float) -> float:
        half_x_sq = 0.25 * (x * x)
        term, total = 1.0, 1.0
        for m in range(1, 35):
            term *= -half_x_sq / (m * m)
            total += term
            if abs(term) < 1e-16:
                break
        return total

    def _bessel_j1(x: float) -> float:
        half_x = 0.5 * x
        half_x_sq = 0.25 * (x * x)
        term, total = half_x, half_x
        for m in range(1, 35):
            term *= -half_x_sq / (m * (m + 1))
            total += term
            if abs(term) < 1e-16:
                break
        return total

GateAction = Literal["hold", "confirm", "reject"]
STATE_LABELS = (
    "S3_Terra",
    "S2_Bridge",
    "S25_Handshake",
    "E26_Red",
    "E26_Green",
    "E26_Blue",
)

# 36-Point Telemetry Wheel Key Bessel Roots
WHEEL_BESSEL_ROOTS = {
    1:  ("Point 1 (Origin J0_1)",          2.4048256),
    9:  ("Point 9 (Terra Quadrant J3_1)",  6.3801619),
    13: ("Point 13 (Bridge Entry J0_2)",   5.5200781),
    18: ("Point 18 (Equator Ring J1_2)",   7.0155867),
    25: ("Point 25 (Handshake Gate J0_3)", 8.6537279),
    26: ("Point 26 (RGB Synthesis J1_3)",  10.1734681),
    33: ("Point 33 (Dome Core J3_3)",      13.0152007),
    36: ("Point 36 (Zenith Apex J6_1)",    14.7959517),
}


@dataclass
class ArohaState:
    step_index: int
    x_coord: float
    j0_value: float
    at_point_25: bool
    gate_action: GateAction
    vector: np.ndarray
    audit_metrics: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "step": self.step_index,
            "x": round(self.x_coord, 7),
            "j0": round(self.j0_value, 8),
            "at_point_25": self.at_point_25,
            "gate_action": self.gate_action,
            "states": {
                label: round(float(self.vector[i]), 6)
                for i, label in enumerate(STATE_LABELS)
            },
            "metrics": {k: round(v, 6) for k, v in self.audit_metrics.items()},
        }

    def pack_std140_bytes(
        self,
        time_sec: float = 0.0,
        width: float = 1920.0,
        height: float = 1080.0,
        ptr_x: float = 0.0,
        ptr_y: float = 0.0,
    ) -> bytes:
        return pack_std140_bytes(self, time_sec, width, height, ptr_x, ptr_y)


def pack_std140_bytes(
    state: ArohaState,
    time_sec: float = 0.0,
    width: float = 1920.0,
    height: float = 1080.0,
    ptr_x: float = 0.0,
    ptr_y: float = 0.0,
) -> bytes:
    gate_code = (
        1.0 if state.gate_action == "confirm"
        else (-1.0 if state.gate_action == "reject" else 0.0)
    )
    v = state.vector
    m = state.audit_metrics
    return struct.pack(
        "<16f",
        float(v[0]), float(v[1]), float(v[2]), float(state.x_coord),
        float(v[3]), float(v[4]), float(v[5]), float(m["r_zenith"]),
        float(m["coherence_c26"]), float(state.j0_value), time_sec, gate_code,
        width, height, ptr_x, ptr_y,
    )


class TransitionEngine6x6:
    """6x6 Markov + Gor'kov acoustic potential + Point 26 RGB synthesis engine."""

    def __init__(
        self,
        p2: float = 0.8,
        rgb_weights: tuple[float, float, float] = (0.60, 0.25, 0.15),
        kappa: float = 0.25,
        gamma_g: float = 0.0,
        target_root: float = 8.6537279,
        tolerance: float = 1e-4,
    ) -> None:
        self.p2 = p2
        self.weights = np.array(rgb_weights, dtype=float)
        self.kappa = kappa
        self.gamma_g = gamma_g
        self.target_root = target_root
        self.tolerance = tolerance
        self.last_x = 0.0

        self.step_count = 0
        self.state = np.array([1.0, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=float)
        self.history: list[ArohaState] = []
        self._validate_parameters()

    def _validate_parameters(self) -> None:
        if not (0.0 <= self.p2 <= 1.0):
            raise ValueError(f"p2 must be in [0, 1], got {self.p2}")
        if np.any(self.weights < 0.0) or not math.isclose(float(self.weights.sum()), 1.0, abs_tol=1e-9):
            raise ValueError(f"rgb_weights must sum to 1.0, got {self.weights}")
        if self.kappa < 0.0 or self.gamma_g < 0.0 or (2.0 * self.kappa + self.gamma_g) > 1.0 + 1e-12:
            raise ValueError(f"Invalid RGB parameters: kappa={self.kappa}, gamma_g={self.gamma_g}")

    def check_zero_crossing(self, x: float) -> bool:
        val = abs(float(_bessel_j0(x)))
        return val <= self.tolerance or abs(x - self.target_root) <= 0.005

    def observe(self, x: float) -> ArohaState:
        self.last_x = x
        j0_val = float(_bessel_j0(x))
        return ArohaState(
            step_index=self.step_count,
            x_coord=x,
            j0_value=j0_val,
            at_point_25=self.check_zero_crossing(x),
            gate_action="hold",
            vector=self.state.copy(),
            audit_metrics=self.compare(x),
        )

    def compare(self, x: float | None = None) -> dict[str, float]:
        coord = self.last_x if x is None else x
        e_r, e_g, e_b = float(self.state[3]), float(self.state[4]), float(self.state[5])
        dome_mass = e_r + e_g + e_b
        norm_sq = e_r * e_r + e_g * e_g + e_b * e_b

        coherence_c26 = 27.0 * e_r * e_g * e_b
        r_zenith = (dome_mass * dome_mass) / math.sqrt(3.0 * norm_sq) if norm_sq > 1e-15 else 0.0

        # Normalized radial Gor'kov potential U(x) and radiation restoring force F_rad(x)
        j0_v = float(_bessel_j0(coord))
        j1_v = float(_bessel_j1(coord))
        gorkov_u = (j0_v * j0_v) / 3.0 - (j1_v * j1_v) / 2.0
        f_rad = (5.0 / 3.0) * j0_v * j1_v

        return {
            "l1_total_mass": float(self.state.sum()),
            "dome_rgb_mass": dome_mass,
            "rg_contrast": e_r - e_g,
            "coherence_c26": coherence_c26,
            "r_zenith": r_zenith,
            "gorkov_potential_u": gorkov_u,
            "radiation_force_f": f_rad,
        }

    def tiki_tilt(self, kappa: float, gamma_g: float = 0.0, p2: float | None = None) -> None:
        self.kappa = kappa
        self.gamma_g = gamma_g
        if p2 is not None:
            self.p2 = max(0.0, min(1.0, p2))
        self._validate_parameters()

    def build_matrix(self, x: float, gate_action: GateAction = "hold") -> np.ndarray:
        delta = 1.0 if self.check_zero_crossing(x) else 0.0
        eta_plus = 1.0 if gate_action == "confirm" else 0.0
        eta_minus = 1.0 if gate_action == "reject" else 0.0

        w_r, w_g, w_b = self.weights
        k = self.kappa
        g_drain = self.gamma_g
        p2 = self.p2

        T = np.array([
            [1.0 - p2, 0.0,         eta_minus * delta,                  0.0,         g_drain,               0.0        ],
            [p2,       1.0 - delta, 0.0,                                0.0,         0.0,                   0.0        ],
            [0.0,      delta,       1.0 - (eta_plus + eta_minus)*delta, 0.0,         0.0,                   0.0        ],
            [0.0,      0.0,         w_r * eta_plus * delta,             1.0 - 2.0*k, k,                     k          ],
            [0.0,      0.0,         w_g * eta_plus * delta,             k,           1.0 - 2.0*k - g_drain, k          ],
            [0.0,      0.0,         w_b * eta_plus * delta,             k,           k,                     1.0 - 2.0*k],
        ], dtype=float)

        if not np.allclose(T.sum(axis=0), 1.0, atol=1e-9) or np.any(T < -1e-12):
            raise RuntimeError("Transition matrix violated column-stochastic conservation.")
        return T

    def step(self, x: float, gate_action: GateAction = "hold") -> ArohaState:
        self.last_x = x
        T = self.build_matrix(x=x, gate_action=gate_action)
        self.state = T @ self.state
        self.step_count += 1

        snapshot = ArohaState(
            step_index=self.step_count,
            x_coord=x,
            j0_value=float(_bessel_j0(x)),
            at_point_25=self.check_zero_crossing(x),
            gate_action=gate_action,
            vector=self.state.copy(),
            audit_metrics=self.compare(x),
        )
        self.history.append(snapshot)
        return snapshot
