precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_modeN;     // Frequency mode N (e.g., base state)
uniform float u_modeM;     // Frequency mode M (e.g., harmonic overtone)
uniform float u_amplitude; // Intensity of the resonance

const float PI = 3.14159265359;

void main() {
    // Normalize pixel coordinates to a -1.0 to 1.0 range
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 pos = st * 2.0 - 1.0;

    // Calculate Chladni wave interference
    float wave1 = sin(u_modeN * PI * pos.x) * sin(u_modeM * PI * pos.y);
    float wave2 = sin(u_modeM * PI * pos.x) * sin(u_modeN * PI * pos.y);
    float chladni = wave1 - wave2;

    // Nodal lines form where the amplitude is 0 (sand gathers here)
    float thickness = 0.05 / max(u_amplitude, 0.1);
    float node = 1.0 - smoothstep(0.0, thickness, abs(chladni));

    // Simulate physical plate vibration outside the nodes
    float vibration = sin(u_time * 20.0) * 0.15 * (1.0 - node);

    // Color mapping: Dark granular sand on a metallic brass plate
    vec3 plateColor = vec3(0.85, 0.65, 0.2) + vibration;
    vec3 sandColor = vec3(0.08, 0.08, 0.08);

    // Blend based on nodal line density
    vec3 finalColor = mix(plateColor, sandColor, node);

    gl_FragColor = vec4(finalColor, 1.0);
}
