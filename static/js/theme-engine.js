class AROHAThemeEngine {
    constructor() {
        this.themes = {
            ocean: { primary: 0x00f0ff, secondary: 0x0044ff, ambient: 0x001122 },
            solar: { primary: 0xffaa00, secondary: 0xff5500, ambient: 0x221100 },
            nebula: { primary: 0x8b5cf6, secondary: 0xec4899, ambient: 0x220022 },
            matrix: { primary: 0x10b981, secondary: 0x059669, ambient: 0x002211 },
            cyan: { primary: 0x00ffff, secondary: 0x0080ff, ambient: 0x002222 },
            magenta: { primary: 0xff00ff, secondary: 0xff0080, ambient: 0x220022 },
            yellow: { primary: 0xffff00, secondary: 0xff8000, ambient: 0x222200 }
        };
        this.currentTheme = 'ocean';
    }

    applyTheme(themeName, layers) {
        const theme = this.themes[themeName];
        if (!theme) return;
        this.currentTheme = themeName;

        if (layers && layers.length >= 3) {
            layers[0].material.color.setHex(theme.primary);
            layers[1].material.color.setHex(theme.secondary);
            layers[2].material.color.setHex(theme.primary);
        }
        console.log(`[Theme] Applied color theme: ${themeName}`);
    }

    blendCustomColor(r, g, b, layers) {
        if (!layers || layers.length < 3) return;
        const color = new THREE.Color(r, g, b);
        layers[0].material.color.copy(color);
        layers[1].material.color.setHex(0xff00ff); // Magenta blend
        layers[2].material.color.setHex(0x00ffff); // Cyan blend
    }
}

window.themeEngine = new AROHAThemeEngine();