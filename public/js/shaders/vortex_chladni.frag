precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_frequency;
uniform float u_vortex_depth;

#define PI 3.14159265359

float chladni(vec2 p, float m, float n) {
    float a = 1.0;
    float b = 1.0;
    return a * sin(n * PI * p.x / 2.0) * sin(m * PI * p.y / 2.0) +
           b * sin(m * PI * p.x / 2.0) * sin(n * PI * p.y / 2.0);
}

void main() {
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float r = length(st);
    float theta = atan(st.y, st.x);
    
    float m = 4.0;
    float n = 6.0;
    
    float wave = chladni(st * (2.0 + u_vortex_depth * 0.5), m, n);
    float spiral = sin(r * 12.0 - u_time * 1.5 + theta * 3.0);
    
    float pattern = smoothstep(-0.05, 0.05, abs(wave + spiral * 0.2) - 0.02);
    
    vec3 col1 = vec3(0.02, 0.15, 0.3);
    vec3 col2 = vec3(0.0, 0.84, 1.0);
    vec3 color = mix(col1, col2, 1.0 - pattern);
    
    float glow = 0.02 / max(abs(wave), 0.001);
    color += col2 * glow * (u_frequency / 432.0);

    gl_FragColor = vec4(color, 1.0);
}
