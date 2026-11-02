#version 300 es
precision highp float;

out vec2 v_uv;

void main() {
    vec2 vertices[3] = vec2[3](
        vec2(-1.0, -1.0),
        vec2( 3.0, -1.0),
        vec2(-1.0,  3.0)
    );
    gl_Position = vec4(vertices[gl_VertexID], 0.0, 1.0);
    v_uv = 0.5 * (gl_Position.xy + 1.0);
}
