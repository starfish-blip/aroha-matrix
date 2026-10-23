// ==========================================
// FILE: src/components/ChladniCanvas.jsx
// ==========================================
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ChladniCanvas = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        // 1. Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        // Match the Cymatic Map container size
        renderer.setSize(250, 250); 
        mountRef.current.appendChild(renderer.domElement);

        // 2. Chladni Fragment Shader
        const fragmentShader = `
            precision mediump float;
            uniform vec2 u_resolution;
            uniform float u_time;
            uniform float u_modeN;
            uniform float u_modeM;
            uniform float u_amplitude;

            const float PI = 3.14159265359;

            void main() {
                vec2 st = gl_FragCoord.xy / u_resolution.xy;
                vec2 pos = st * 2.0 - 1.0;

                float wave1 = sin(u_modeN * PI * pos.x) * sin(u_modeM * PI * pos.y);
                float wave2 = sin(u_modeM * PI * pos.x) * sin(u_modeN * PI * pos.y);
                float chladni = wave1 - wave2;

                float thickness = 0.05 / max(u_amplitude, 0.1);
                float node = 1.0 - smoothstep(0.0, thickness, abs(chladni));

                float vibration = sin(u_time * 20.0) * 0.15 * (1.0 - node);

                vec3 plateColor = vec3(0.0, 0.4, 0.8) + vibration; // AROHA Blue
                vec3 sandColor = vec3(0.8, 0.9, 1.0); // Bright nodes

                vec3 finalColor = mix(plateColor, sandColor, node);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        const uniforms = {
            u_resolution: { value: new THREE.Vector2(250, 250) },
            u_time: { value: 0.0 },
            u_modeN: { value: 4.0 },
            u_modeM: { value: 4.0 },
            u_amplitude: { value: 1.0 }
        };

        const material = new THREE.ShaderMaterial({
            fragmentShader: fragmentShader,
            uniforms: uniforms
        });

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(plane);

        // 3. WebMIDI Integration for Oxygen 61
        let midiAccess = null;
        navigator.requestMIDIAccess().then(access => {
            midiAccess = access;
            for (let input of midiAccess.inputs.values()) {
                input.onmidimessage = (message) => {
                    const [command, control, value] = message.data;
                    if (command === 176) {
                        const norm = value / 127.0;
                        if (control === 73) uniforms.u_modeN.value = 1.0 + (norm * 14.0); // Slider 1
                        if (control === 74) uniforms.u_modeM.value = 1.0 + (norm * 14.0); // Slider 2
                        if (control === 1) uniforms.u_amplitude.value = Math.max(0.1, norm * 5.0); // Mod Wheel
                    }
                };
            }
        }).catch(err => console.error("MIDI access denied", err));

        // 4. Animation Loop
        let animationFrameId;
        const animate = (time) => {
            uniforms.u_time.value = time / 1000.0;
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate(0);

        // Cleanup on unmount
        return () => {
            cancelAnimationFrame(animationFrameId);
            mountRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return (
        <div 
            ref={mountRef} 
            style={{ width: '250px', height: '250px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #00aaff' }}
            title="AROHA CYMATICS MAP"
        />
    );
};

export default ChladniCanvas;
