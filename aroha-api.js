export async function applyResonance(promptText, chladniMaterial) {
    const response = await fetch('https://bind-alberta-permalink-retailers.trycloudflare.com/api/generate-resonance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptText })
    });
    
    const data = await response.json();
    const resonanceData = JSON.parse(data.response);
    
    // Update the Three.js material uniforms live
    chladniMaterial.uniforms.u_modeN.value = resonanceData.n;
    chladniMaterial.uniforms.u_modeM.value = resonanceData.m;
    chladniMaterial.uniforms.u_amplitude.value = resonanceData.amplitude;
}
