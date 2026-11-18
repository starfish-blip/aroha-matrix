#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

layout(std140) uniform ArohaHarmonicBlock {
    vec4 u_harmonic;        // x: m, y: n, z: carrier_hz, w: binaural_offset_hz
    vec4 u_audio_telemetry; // x: rms, y: carrier_fft, z: beat_phase [0..1], w: unlocked
    vec4 u_gateway_state;   // x: focus_state, y: vertebrae_norm, z: u_time, w: sharpness
    vec4 u_reserved_pad;
};

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

vec3 focusPalette(float focusState, float unlocked) {
    if (unlocked < 0.5) {
        return vec3(0.95, 0.32, 0.32); // Locked dissonance crimson
    }
    if (focusState < 11.0) {
        return vec3(0.22, 0.82, 0.96); // Focus 10: Cyan-Theta
    }
    if (focusState < 14.0) {
        return vec3(0.37, 0.92, 0.83); // Focus 12: Teal-Emerald
    }
    if (focusState < 18.0) {
        return vec3(0.68, 0.52, 0.98); // Focus 15: Violet-Delta
    }
    return vec3(0.98, 0.78, 0.34);     // Focus 21: Solar-Epsilon Gold
}

void main() {
    float m = u_harmonic.x;
    float n = u_harmonic.y;
    float offsetHz = u_harmonic.w;

    float rms = u_audio_telemetry.x;
    float carrierEnergy = u_audio_telemetry.y;
    float beatPhase = u_audio_telemetry.z;
    float unlocked = u_audio_telemetry.w;

    float focusState = u_gateway_state.x;
    float vNorm = u_gateway_state.y;
    float t = u_gateway_state.z;
    float sharpness = u_gateway_state.w;

    // Dichotic entrainment pulse driven directly by binaural_offset_hz phase
    float beatWave = 0.5 + 0.5 * cos(TAU * beatPhase);
    float radial = length(v_uv - 0.5) * 2.0;

    // Subtle radial membrane breathing proportional to RMS energy and binaural beat
    vec2 p = v_uv + (v_uv - 0.5) * (0.025 * rms * sin(TAU * beatPhase - radial * 4.0));

    // Square Chladni eigenmode standing wave: cos(m*pi*x)cos(n*pi*y) - cos(n*pi*x)cos(m*pi*y)
    float modeA = cos(m * PI * p.x) * cos(n * PI * p.y);
    float modeB = cos(n * PI * p.x) * cos(m * PI * p.y);
    float z = (modeA - modeB) * vNorm;

    // Nodal lines appear where standing wave amplitude z approaches 0
    float nodalWidth = mix(0.065, 0.022, clamp(sharpness / 3.2, 0.0, 1.0));
    float nodalLine = 1.0 - smoothstep(0.0, nodalWidth + 0.03 * rms, abs(z));

    // Interference ripple scaled by carrier FFT bin energy and Focus beat rate
    float interference = 0.5 + 0.5 * cos(z * (14.0 + offsetHz * 1.5) - t * offsetHz * 2.0);
    vec3 baseTint = focusPalette(focusState, unlocked);

    vec3 bg = vec3(0.025, 0.04, 0.075) + baseTint * (0.04 * carrierEnergy * beatWave);
    vec3 glow = baseTint * nodalLine * (0.75 + 0.55 * beatWave + 0.65 * rms);
    vec3 harmonicHalo = baseTint * interference * (0.12 + 0.25 * rms) * (1.0 - radial * 0.45);

    vec3 color = bg + glow + harmonicHalo;
    fragColor = vec4(color, 1.0);
}