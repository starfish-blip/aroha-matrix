export class ArohaVertebraePhConnector {
  constructor(options = {}) {
    this.svgSelector = options.svgSelector || "#vertebrae-sidebar";
    this.baseFreq = 33.0;
    this.rotationDeg = 0;
    this.activeVertebra = 17;
    this.spineMap = this.build33SpineMap();
    this.audioCtx = null;
    this.onStateChange = options.onStateChange || null;
  }

  build33SpineMap() {
    const map = [];
    for (let v = 1; v <= 33; v++) {
      const triadHz = v <= 11 ? 11.0 : (v <= 22 ? 22.0 : 33.0);
      const zoneColor = v <= 11 ? "#f43f5e" : (v <= 22 ? "#10b981" : "#38bdf8");
      let nodeType = "TOC_BUFFER_DISC", phValue = (v - 3) / 2, stepIndex = null, phoneme = "TOC Intervertebral Buffer";
      if (v <= 2) { nodeType = "ANCHOR_L_GROUND"; phoneme = "L (90° Plumb/Level Ground)"; phValue = null; }
      else if (v >= 32) { nodeType = "ANCHOR_O_CROWN"; phoneme = "O (33Hz Crown Ring)"; phValue = null; }
      else if (v % 2 === 1) {
        nodeType = "TIK_PH_NODE";
        stepIndex = phValue + 1;
        phoneme = phValue < 5 ? "K (/k/ Plosive -> K-NOT)" : (phValue === 7 ? "H / ION (Exact Spine & pH 7 Mirror)" : (phValue <= 9 ? "WH = PH ([phi] Bilabial)" : "PH -> F (/f/ Fricative Wave)"));
      }
      const mirrorVertebra = 34 - v;
      const kIonRatio = Number((0.50 + ((v - 17) / 32.0) * 0.40).toFixed(3));
      map.push({ vertebra: v, mirrorVertebra, triadHz, zoneColor, nodeType, stepIndex, phValue, phoneme, kIonRatio });
    }
    return map;
  }
}