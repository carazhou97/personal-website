// <bloom-canvas> — ports the real source bloom: createFlowerScene() engine +
// the SourceBloomCanvas wrapper (palettes, Speed/Open/Wave/Wind, click-to-replay).
import { createFlowerScene } from "./flowerScene.js";

const PALETTES = [
  { id: "iris",  label: "Warm iris",  stops: [[0.92,0.16,0.12],[1.0,0.44,0.22],[1.0,0.82,0.22],[0.98,0.62,0.78],[0.55,0.24,0.78]] },
  { id: "lily",  label: "White lily", stops: [[0.58,0.78,0.78],[0.8,0.93,0.94],[0.98,0.98,0.95],[1.0,0.68,0.8],[0.48,0.72,0.58]] },
  { id: "calla", label: "Calla",      stops: [[0.5,0.66,0.48],[0.76,0.84,0.66],[0.98,0.96,0.84],[1.0,0.86,0.28],[0.76,0.58,0.16]] }
];
const DEFAULTS = { speed: 4.2, open: 0.78, wave: 0.035, wind: 0.07 };
const CTRLS = [
  { k: "speed", label: "Speed", min: 1.4, max: 7,    step: 0.1 },
  { k: "open",  label: "Open",  min: 0.52, max: 0.98, step: 0.01 },
  { k: "wave",  label: "Wave",  min: 0,   max: 0.1,  step: 0.002 },
  { k: "wind",  label: "Wind",  min: 0,   max: 0.22, step: 0.005 }
];

const CSS = `
.source-bloom{position:absolute;inset:0;background:#fff;overflow:hidden}
.source-bloom .source-bloom-canvas{position:absolute;inset:0;cursor:pointer}
.source-bloom .source-bloom-canvas canvas{display:block;width:100%!important;height:100%!important;outline:none}
.source-bloom .source-bloom-controls{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:3;display:grid;gap:14px;width:min(236px,calc(100vw - 36px));padding:14px;border:1px solid rgba(30,30,30,.08);border-radius:8px;background:rgba(255,255,255,.72);box-shadow:0 18px 48px rgba(25,20,18,.12),inset 0 1px 0 rgba(255,255,255,.72);backdrop-filter:blur(18px) saturate(126%);-webkit-backdrop-filter:blur(18px) saturate(126%)}
.source-bloom .palette-options{display:flex;gap:10px}
.source-bloom .palette-dot{width:34px;height:34px;border:1px solid rgba(0,0,0,.08);border-radius:50%;cursor:pointer;box-shadow:0 8px 18px rgba(30,20,14,.13),inset 0 0 0 1px rgba(255,255,255,.44);transition:transform 160ms ease,box-shadow 160ms ease,border-color 160ms ease}
.source-bloom .palette-dot.active,.source-bloom .palette-dot:hover{transform:translateY(-2px) scale(1.06);border-color:rgba(0,0,0,.18);box-shadow:0 10px 24px rgba(30,20,14,.16),0 0 0 4px rgba(0,0,0,.05),inset 0 0 0 1px rgba(255,255,255,.5)}
.source-bloom .palette-dot.iris{background:radial-gradient(circle at 50% 35%,#ffe03d 0 18%,transparent 19%),conic-gradient(from 30deg,#b30e16,#ff7034,#ffd03c,#e98aac,#7b42b3,#b30e16)}
.source-bloom .palette-dot.lily{background:radial-gradient(circle at 54% 42%,#ffffff 0 36%,transparent 37%),conic-gradient(from 20deg,#b6d2d4,#f8fbf8,#f7a7ba,#79b692,#b6d2d4)}
.source-bloom .palette-dot.calla{background:radial-gradient(circle at 52% 40%,#ffd742 0 18%,transparent 19%),conic-gradient(from 45deg,#799f75,#f7f2d2,#fff8a8,#9caf72,#799f75)}
.source-bloom .bloom-tweaks{display:grid;gap:10px}
.source-bloom .bloom-tweaks label{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:10px;color:rgba(18,18,18,.72);font:500 12px/1 Arial,Helvetica,sans-serif}
.source-bloom .bloom-tweaks span{white-space:nowrap}
.source-bloom .bloom-tweaks input{width:100%;accent-color:#c95b43;cursor:pointer}
.source-bloom .source-bloom-hidden-gui{display:none}
@media (max-width:720px){.source-bloom .source-bloom-controls{left:50%;right:auto;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%)}}
`;

if (!document.getElementById("source-bloom-css")) {
  const st = document.createElement("style");
  st.id = "source-bloom-css";
  st.textContent = CSS;
  document.head.appendChild(st);
}

class BloomCanvas extends HTMLElement {
  connectedCallback() {
    if (this._init) return; this._init = true;
    this.classList.add("source-bloom");
    this.innerHTML =
      '<div class="source-bloom-canvas"></div>' +
      '<div class="source-bloom-controls">' +
        '<div class="palette-options" aria-label="Flower color palettes"></div>' +
        '<div class="bloom-tweaks" aria-label="Bloom animation tweaks"></div>' +
      '</div>' +
      '<div class="source-bloom-hidden-gui" aria-hidden="true"></div>';
    this.tweaks = Object.assign({}, DEFAULTS);
    this._buildPalettes();
    this._buildTweaks();

    var canvasEl = this.querySelector(".source-bloom-canvas");
    var guiEl = this.querySelector(".source-bloom-hidden-gui");
    // keep the page from scrolling the bloom away on canvas clicks
    this.querySelector(".source-bloom-controls").addEventListener("click", function (e) { e.stopPropagation(); });

    var mount = () => {
      if (!canvasEl.clientWidth || !canvasEl.clientHeight) { requestAnimationFrame(mount); return; }
      try {
        var scene = createFlowerScene(canvasEl, guiEl);
        this.scene = scene;
        scene.setPalette(PALETTES[0].stops);
        scene.setFlat(false);
        scene.setBloom(0.04);
        this._apply();
        canvasEl.addEventListener("click", function () { scene.playBloom(); });
        this._timer = window.setTimeout(function () { scene.playBloom(); }, 450);
      } catch (err) {
        console.error("bloom init failed", err);
        canvasEl.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Arial;color:#999;font-size:13px">Could not start the bloom engine.</div>';
      }
    };
    requestAnimationFrame(mount.bind(this));
  }

  disconnectedCallback() {
    window.clearTimeout(this._timer);
    if (this.scene) { try { this.scene.dispose(); } catch (e) {} this.scene = null; }
  }

  _apply() {
    var s = this.scene; if (!s) return;
    s.setBloomDuration(this.tweaks.speed);
    s.setBloomMax(this.tweaks.open);
    s.setWaveAmp(this.tweaks.wave);
    s.setWindAmp(this.tweaks.wind);
  }

  _buildPalettes() {
    var wrap = this.querySelector(".palette-options");
    this._dots = [];
    PALETTES.forEach((p, i) => {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "palette-dot " + p.id + (i === 0 ? " active" : "");
      b.setAttribute("aria-label", p.label);
      b.addEventListener("click", () => {
        this._dots.forEach(function (d) { d.classList.remove("active"); });
        b.classList.add("active");
        if (this.scene) { this.scene.setPalette(p.stops); this.scene.setBloom(0.04); }
        window.setTimeout(() => { if (this.scene) this.scene.playBloom(); }, 120);
      });
      this._dots.push(b);
      wrap.appendChild(b);
    });
  }

  _buildTweaks() {
    var wrap = this.querySelector(".bloom-tweaks");
    CTRLS.forEach((c) => {
      var lab = document.createElement("label");
      var sp = document.createElement("span"); sp.textContent = c.label;
      var inp = document.createElement("input");
      inp.type = "range"; inp.min = c.min; inp.max = c.max; inp.step = c.step;
      inp.value = this.tweaks[c.k];
      inp.setAttribute("aria-label", c.label);
      inp.addEventListener("input", () => { this.tweaks[c.k] = Number(inp.value); this._apply(); });
      lab.appendChild(sp); lab.appendChild(inp); wrap.appendChild(lab);
    });
  }
}

if (!customElements.get("bloom-canvas")) customElements.define("bloom-canvas", BloomCanvas);
