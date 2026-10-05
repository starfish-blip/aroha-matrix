/**
 * feed-engine.js
 * Intent-Driven Signal Curation Engine
 */

class ArohaFeedEngine {
  constructor() {
    // Sample content nodes mapped by 3D topic vectors [X, Y, Z]
    this.signalNodes = [
      {
        id: "NODE-01",
        title: "Acoustic Frequency Resonance & Phase Locks",
        category: "Acoustics",
        vector: [-0.2000, 0.9500, 0.0000],
        summary: "Empirical breakdown of 276.81 Hz baseline oscillations and multi-harmonic scaling."
      },
      {
        id: "NODE-02",
        title: "Intent-Based Collaborative Network Protocols",
        category: "Architecture",
        vector: [-0.5000, 0.5000, 0.0000],
        summary: "Replacing outrage algorithms with multi-vector topic alignment and client-side filtering."
      },
      {
        id: "NODE-03",
        title: "Spatial Matrix Geometry & Coordinate Frames",
        category: "Geometry",
        vector: [0.1000, 0.9000, 0.0000],
        summary: "Visualizing directional trajectory vectors without cardinal direction framing."
      },
      {
        id: "NODE-04",
        title: "Broad-Spectrum Noise & Outrage Dynamics",
        category: "Legacy Media",
        vector: [0.9000, -0.8000, 0.0000],
        summary: "High-arousal algorithmic priming designed for passive engagement loops."
      }
    ];
  }

  /**
   * Calculates Euclidean vector distance between current spatial matrix and node
   */
  calculateDistance(vecA, vecB) {
    const dx = vecA[0] - vecB[0];
    const dy = vecA[1] - vecB[1];
    const dz = vecA[2] - vecB[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Ranks feed nodes by proximity to active telemetry vector coordinates
   */
  getRankedFeed(activeVector) {
    return this.signalNodes
      .map(node => {
        const distance = this.calculateDistance(activeVector, node.vector);
        // Conversion from distance to percentage match
        const relevance = Math.max(0, (100 - distance * 50)).toFixed(1);
        return { ...node, distance, relevance };
      })
      .sort((a, b) => a.distance - b.distance);
  }
}

// Global instance allocation
window.arohaFeed = new ArohaFeedEngine();
