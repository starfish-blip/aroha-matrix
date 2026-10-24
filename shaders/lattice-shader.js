window.ArohaShaders = {
    vertex: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragment: `
        precision highp float;
        uniform float u_time;
        uniform float u_note;
        uniform vec3 u_color;
        uniform float u_velocity;
        uniform float u_mode;
        varying vec2 vUv;

        void main() {
            vec2 st = vUv * 2.0 - 1.0;
            float r = length(st);
            float theta = atan(st.y, st.x);

            vec3 col = vec3(0.0);
            if(u_mode > 1.5) {
                float slice = floor((theta + 3.14159) / (2.0 * 3.14159) * 12.0);
                col = 0.5 + 0.5 * cos(u_time * 0.1 + slice + vec3(0.0, 2.0, 4.0));
                col *= smoothstep(1.0, 0.2, r);
            } else if(u_mode > 0.5) {
                float a = theta + u_time * 0.2;
                float mandala = sin(a * 8.0) * cos(r * 10.0 - u_time);
                col = mix(u_color * 0.2, u_color * 2.0, abs(mandala));
            } else {
                float k = 6.0 + u_note;
                float angle = theta * k + u_time * 0.5;
                vec2 pt = vec2(cos(angle), sin(angle)) * r;
                float w1 = sin(pt.x * 8.0 + u_time) * cos(pt.y * 8.0 - u_time);
                float w2 = sin(r * 12.0 - u_time * 2.0 + u_velocity * 4.0);
                float pattern = abs(w1 * w2 + cos(theta * 18.0 + u_time * 0.5) * 0.5);
                float lattice = smoothstep(0.02, 0.12, pattern);
                col = mix(u_color * 0.15, u_color * 2.2, lattice);
                col += vec3(0.0, 0.6, 1.0) * (1.0 - smoothstep(0.0, 1.2, r)) * 0.6;
            }
            gl_FragColor = vec4(col, 0.95);
        }
    `
};
