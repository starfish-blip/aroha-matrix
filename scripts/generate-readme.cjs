const fs = require('fs');
const path = require('path');

// 1. Read live schema parameters
const coreSchemaPath = path.join(__dirname, '../matrix-core.json');

let coreData;
try {
  coreData = JSON.parse(fs.readFileSync(coreSchemaPath, 'utf8'));
} catch (err) {
  console.error("Could not find matrix-core.json, generating default fallback.");
  coreData = {
    system_info: { name: "AROHA Matrix", version: "1.0.0", harmonic_target: 36.6, synergy_mechanic: "1+1=3", overage_threshold: 0.6 },
    learning_modules: []
  };
}

// 2. Build dynamic markdown template
const readmeContent = `# AROHA — System README & Architecture Manifest

**System Name:** ${coreData.system_info.name}  
**Version:** ${coreData.system_info.version}  
**Harmonic Target:** ${coreData.system_info.harmonic_target} Cycle  
**Synergy Mechanic:** ${coreData.system_info.synergy_mechanic}  
**Overage Threshold:** ${coreData.system_info.overage_threshold}

---

## 1. Core Modules & Cycle Manifest

${(coreData.learning_modules || []).map(mod => `
### ${mod.title} (Cycle ${mod.cycle_range})
* **Phase:** ${mod.phase}
* **Description:** ${mod.description}
* **Offset Vector:** \`${mod.offset}\` | **Phase Lag:** \`${mod.lag}\`
* **Diagnostic Hint:** *${mod.hint}*
`).join('\n')}

---

## 2. Dynamic Operational Mechanics

* **Zero-Point Reset ($3 - 1 = 1$):** Friction spikes or unverified hypotheses cleanly collapse back to baseline origin.
* **Auto-Remediation:** If system stability drops below 70%, automated vector corrections realign the environment back to 100%.

---
*Last automated sync timestamp: ${new Date().toISOString()}*
`;

// 3. Write output to README.md
fs.writeFileSync(path.join(__dirname, '../README.md'), readmeContent);
console.log('README.md successfully generated from live system schema.');
