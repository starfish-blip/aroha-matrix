/**
 * aroha-engine.js
 * Core Telemetry State Machine & Spatial Matrix Engine
 */

class ArohaEngine {
  constructor() {
    this.sequenceId = 173394;
    this.baseFundamentalHz = 276.8136;
    
    // Core Operational State
    this.state = {
      systemId: "AROHA-HERMES-01",
      stateShift: "NOMINAL_FLOW",
      trajectoryOffset: 0.2555,
      phaseLagFriction: 0.5000,
      spatialMatrix: [-0.2031, 0.9792, 0.0000]
    };
  }

  /**
   * Calculates state shifts based on friction and offset boundaries.
   */
  evaluateStateShift() {
    if (this.state.phaseLagFriction > 0.85 || this.state.trajectoryOffset > 0.85) {
      this.state.stateShift = "CRITICAL_PHASE_LAG";
    } else if (this.state.trajectoryOffset > 0.50) {
      this.state.stateShift = "TRAJECTORY_SHIFT";
    } else {
      this.state.stateShift = "NOMINAL_FLOW";
    }
  }

  /**
   * Updates spatial vector orientation based on trajectory offset.
   */
  updateSpatialVector(offset) {
    const angle = offset * Math.PI;
    const x = -Math.cos(angle) * 0.2031;
    const y = Math.sin(angle) * 0.9792;
    this.state.spatialMatrix = [+x.toFixed(4), +y.toFixed(4), 0];
  }

  /**
   * Generates a fully compliant Hermes Telemetry JSON payload frame.
   */
  generateTelemetryFrame(offsetValue, phaseValue) {
    this.sequenceId++;
    this.state.trajectoryOffset = parseFloat(offsetValue);
    this.state.phaseLagFriction = parseFloat(phaseValue);

    this.evaluateStateShift();
    this.updateSpatialVector(this.state.trajectoryOffset);

    const phaseOffsetRad = (this.state.phaseLagFriction * (2 * Math.PI)).toFixed(4);
    const fundamental = this.baseFundamentalHz;

    return {
      system_id: this.state.systemId,
      timestamp_ns: (Date.now() * 1000000).toString(),
      sequence_id: this.sequenceId,
      state_shift: this.state.stateShift,
      resonance: {
        fundamental_hz: fundamental,
        harmonics: [
          +(fundamental * 2).toFixed(4),
          +(fundamental * 3).toFixed(4),
          +(fundamental * 4).toFixed(4)
        ],
        amplitude: this.state.trajectoryOffset,
        phase_offset_rad: parseFloat(phaseOffsetRad)
      },
      geometry: {
        spatial_matrix: this.state.spatialMatrix
      }
    };
  }
}

// Assign to global window object
window.arohaEngine = new ArohaEngine();
