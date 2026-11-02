#version 300 es
precision highp float;

layout(std140) uniform ArohaTelemetryBlock {
    vec4 u_zone_lower;    // .x = S3_Terra, .y = S2_Bridge, .z = S25_Handshake, .w = bessel_x
    vec4 u_point26_rgb;   // .x = E26_Red,  .y = E26_Green, .z = E26_Blue,      .w = r_zenith
    vec4 u_dome_metrics;  // .x = C26,      .y = J0(x),     .z = time_sec,      .w = gate_code
    vec4 u_viewport;      // .xy = resolution_px,           .zw = pointer_ndc
};

in vec2 v_uv;
out vec4 fragColor;

const float PI       = 3.14159265359;
const float HALF_PI  = 1.57079632679;
const float ALPHA_10 = 2.4048256;
const float ALPHA_13 = 6.3801619;
const float ALPHA_30 = 8.6537279;
const float ALPHA_33 = 13.0152007;
const float R_MAX    = 14.7959517;

float besselJ0(float x) {
    float acc = 0.0;
    const int N = 16;
    const float invN = 1.0 / float(N);
    for (int j = 0; j < N; ++j) {
        float theta = (float(j) + 0.5) * invN * HALF_PI;
        acc += cos(x * sin(theta));
    }
    return acc * invN;
}

float besselJ3(float x) {
    float acc = 0.0;
    const int M = 20;
    const float invM = 1.0 / float(M);
    for (int j = 0; j < M; ++j) {
        float theta = (float(j) + 0.5) * invM * PI;
        acc += cos(3.0 * theta - x * sin(theta));
    }
    return acc * invM;
}

void main() {
    vec2 res = max(u_viewport.xy, vec2(1.0));
    vec2 p = (2.0 * gl_FragCoord.xy - res) / min(res.x, res.y);
    float radiusNorm = length(p);
    float rBessel = radiusNorm * R_MAX;
    float theta = atan(p.y, p.x);

    float s3  = u_zone_lower.x;
    float s2  = u_zone_lower.y;
    float s25 = u_zone_lower.z;

    float eR      = u_point26_rgb.x;
    float eG      = u_point26_rgb.y;
    float eB      = u_point26_rgb.z;
    float rZenith = clamp(u_point26_rgb.w, 0.0, 1.0);

    float c26      = clamp(u_dome_metrics.x, 0.0, 1.0);
    float t        = u_dome_metrics.z;
    float gateCode = u_dome_metrics.w;

    float phaseFreeze = mix(1.0, 0.08, clamp(s25 * (1.0 - abs(gateCode)), 0.0, 1.0));
    float omegaT = t * 2.4 * phaseFreeze;

    float j0_r   = besselJ0(rBessel);
    float j3_b   = besselJ3(rBessel * (ALPHA_13 / R_MAX));
    float terra  = s3 * besselJ0(rBessel * (ALPHA_10 / R_MAX));
    float bridge = s2 * j3_b * cos(3.0 * theta) * cos(omegaT);

    float p25RingDist = abs(rBessel - ALPHA_30);
    float p25NodalLine = exp(-18.0 * abs(j0_r)) * smoothstep(0.45, 0.0, p25RingDist);
    float handshakeGlow = (0.25 + 0.75 * s25) * p25NodalLine;

    float j3_dome = besselJ3(rBessel * (ALPHA_33 / R_MAX));
    float waveR = eR * j3_dome * sin(3.0 * theta + omegaT);
    float waveG = eG * j3_dome * cos(3.0 * theta - omegaT);
    float waveB = eB * besselJ0(rBessel * 1.25) * cos(2.0 * omegaT);

    float compositeWave = terra + bridge + waveR + waveG + waveB;
    float chladniNodes  = exp(-14.0 * abs(compositeWave));
    float wheelRays     = pow(max(0.0, cos(18.0 * theta)), 48.0) * 0.12;

    vec3 rgbSeparated = vec3(
        abs(waveR) + 0.35 * s3 * abs(terra),
        abs(waveG) + 0.35 * s2 * abs(bridge),
        abs(waveB) + handshakeGlow
    ) + chladniNodes * vec3(eR, eG, eB + 0.25 * s2);

    float thirdNodeInterference = 2.0 * abs(waveR * waveG) + c26 * exp(-3.5 * radiusNorm * radiusNorm);
    vec3 zenithWhite = vec3(0.96, 0.98, 1.0) * (chladniNodes * 0.65 + thirdNodeInterference);

    vec3 color = mix(rgbSeparated, zenithWhite, rZenith * rZenith);
    color += vec3(0.35, 0.85, 1.0) * handshakeGlow + wheelRays;

    float diskMask = smoothstep(1.03, 0.99, radiusNorm);
    fragColor = vec4(color * diskMask, 1.0);
}
