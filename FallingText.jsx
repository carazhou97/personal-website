const { useRef, useState, useEffect, useLayoutEffect } = React;

// ---- impact audio for the falling headline (shared, lazy Web Audio) ----
let _fallAC = null;
function _fallCtx(){
  try{
    if(window.__caraMuted) return null;
    if(!window.__caraAC){ const C = window.AudioContext || window.webkitAudioContext; if(!C) return null; window.__caraAC = new C(); }
    if(window.__caraAC.state === 'suspended') window.__caraAC.resume();
    return window.__caraAC;
  }catch(e){ return null; }
}
let _hitWin = 0, _hitCount = 0; const _lastKind = {};
function fallHit(kind, vel){
  const ctx = _fallCtx(); if(!ctx) return;
  const now = performance.now();
  if(now - _hitWin > 55){ _hitWin = now; _hitCount = 0; }   // density cap per ~55ms window
  if(_hitCount >= 5) return;
  if(_lastKind[kind] && now - _lastKind[kind] < 20) return;
  const V = Math.max(0, Math.min(1, (vel - 2.5) / 11));       // 0..1 above threshold
  if(V <= 0) return;
  _hitCount++; _lastKind[kind] = now;
  const t = ctx.currentTime;
  const master = ctx.createGain();
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5000; tone.Q.value = 0.5;
  master.connect(tone); tone.connect(ctx.destination);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const p = rnd(0.955, 1.06);   // per-hit detune so repeated hits never sound mechanical
  // one struck resonant mode = a decaying sine partial (physical-model percussion)
  const mode = (f, a, dec) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * p;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(a, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dec + 0.03);
  };
  // contact transient = short filtered noise, squared envelope so it's soft, not spiky
  const click = (freq, q, a, dec, type) => {
    const dur = dec + 0.012;
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const k = i / d.length; d[i] = (Math.random() * 2 - 1) * (1 - k) * (1 - k); }
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
  };
  if (kind === 'shelf') {
    // hardcover set on a wooden shelf: low inharmonic modes + a soft lowpassed contact
    master.gain.value = 0.5 + 0.5 * V;
    mode(94,  0.15 * V + 0.03,  0.17);
    mode(171, 0.09 * V + 0.02,  0.13);
    mode(292, 0.045 * V + 0.01, 0.085);
    click(300, 0.9, 0.09 * V + 0.02, 0.028, 'lowpass');
  } else if (kind === 'clack') {
    // two book edges / type blocks tapping: dry mid modes, very short
    master.gain.value = 0.4 + 0.42 * V;
    mode(415,  0.09 * V + 0.02,  0.075);
    mode(668,  0.06 * V + 0.014, 0.05);
    mode(1140, 0.03 * V + 0.007, 0.034);
    click(1500, 1.4, 0.045 * V + 0.01, 0.013, 'bandpass');
  } else {
    // glancing edge contact: soft, muted
    master.gain.value = 0.32 + 0.3 * V;
    mode(150, 0.055 * V + 0.01, 0.06);
    click(950, 0.8, 0.028 * V + 0.006, 0.02, 'highpass');
  }
}

function FallingText({
  text = '',
  highlightWords = [],
  italicFrom = -1,
  trigger = 'hover',
  backgroundColor = 'transparent',
  wireframes = false,
  gravity = 0.9,
  mouseConstraintStiffness = 0.2,
  fontSize = '2rem',
  fontFamily = "'Newsreader', serif",
  color = '#221d14',
  highlightColor = '#a44a24',
  wordSpacing = '10px',
  valign = 'center',
  padTop = '0',
  reformDelay = '3400',
  breakBefore = '-1',
  cue = '',
  cueColor = '#a44a24',
  clickReform = '1',
  intro = '0'
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [effectStarted, setEffectStarted] = useState(false);

  const homesRef = useRef([]);      // resting {el,x,y} home positions (container-relative)
  const rafRef = useRef(0);
  const teardownRef = useRef(null); // idempotent physics teardown
  const autoTimerRef = useRef(null);
  const reformingRef = useRef(false);

  const italicIdx = Number(italicFrom);
  const g = Number(gravity);
  const rDelay = Number(reformDelay);
  const bBefore = Number(breakBefore);
  const hi = Array.isArray(highlightWords)
    ? highlightWords
    : String(highlightWords || '').split(',').map(s => s.trim()).filter(Boolean);

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // build per-character spans, grouped by word so the text still wraps cleanly
  const buildSpans = () => {
    if (!textRef.current) return;
    const words = text.split(' ');
    const spanHtml = (word, i) => {
      const clean = word.replace(/[.,;:!?]/g, '').toLowerCase();
      const isHi = hi.some(w => w.replace(/[.,;:!?]/g, '').toLowerCase() === clean);
      const isItalic = italicIdx >= 0 && i >= italicIdx;
      let cst = 'display:inline-block;user-select:none;will-change:transform;';
      if (isItalic) cst += 'font-style:italic;';
      if (isHi) cst += 'color:' + highlightColor + ';';
      const chars = [...word].map(ch => '<span class="char" style="' + cst + '">' + escapeHtml(ch) + '</span>').join('');
      return '<span class="fword" style="display:inline-block;white-space:nowrap;margin:0 ' + wordSpacing + '">' + chars + '</span>';
    };
    let html = '';
    words.forEach((word, i) => {
      if (i > 0) html += (i === bBefore ? '<br>' : ' ');
      html += spanHtml(word, i);
    });
    textRef.current.innerHTML = html;
  };

  useEffect(() => { if (trigger === 'auto') { setEffectStarted(true); } }, [trigger]);

  // ---- reverse-fall intro: letters start scattered on the shelf, then fly up and set into the headline ----
  const introEnabled = String(intro) !== '0' && String(intro) !== 'false' && intro != null && intro !== '';
  const [introDone, setIntroDone] = useState(!introEnabled);
  const introRanRef = useRef(false);

  useLayoutEffect(() => {
    buildSpans();
    if (introRanRef.current) return;
    introRanRef.current = true;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cont = containerRef.current, root = textRef.current;
    if (!introEnabled || reduce || !cont || !root) { setIntroDone(true); return; }
    root.style.visibility = 'hidden'; // keep layout for measuring, hide until scattered (no flash)
    const doIntro = () => {
      const contRect = cont.getBoundingClientRect();
      const chars = [...root.querySelectorAll('.char')];
      if (!chars.length || contRect.height <= 0) { root.style.visibility = 'visible'; setIntroDone(true); return; }
      const homes = chars.map(el => { const r = el.getBoundingClientRect(); return { el, x: r.left - contRect.left + r.width / 2, y: r.top - contRect.top + r.height / 2 }; });
      const H = contRect.height, W = contRect.width;
      chars.forEach(el => {
        el.style.position = 'absolute'; el.style.margin = '0';
        const sx = W * (0.1 + Math.random() * 0.8);
        const sy = H * (0.88 + Math.random() * 0.1);
        const rot = (Math.random() * 2 - 1) * 46;
        el.style.transition = 'none';
        el.style.left = sx + 'px'; el.style.top = sy + 'px';
        el.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
        el.style.opacity = '0';
      });
      void root.offsetWidth;
      root.style.visibility = 'visible';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        homes.forEach(({ el, x, y }, i) => {
          const d = i * 13;
          el.style.transition = 'left .95s cubic-bezier(.2,.72,.22,1) ' + d + 'ms, top 1.05s cubic-bezier(.16,.82,.26,1) ' + d + 'ms, transform .95s cubic-bezier(.2,.72,.22,1) ' + d + 'ms, opacity .5s ease ' + d + 'ms';
          el.style.left = x + 'px'; el.style.top = y + 'px';
          el.style.transform = 'translate(-50%,-50%) rotate(0deg)'; el.style.opacity = '1';
        });
        const wait = 1200 + chars.length * 13;
        setTimeout(() => { buildSpans(); setIntroDone(true); }, wait);
      }));
    };
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(() => doIntro()); } else { doIntro(); }
  }, [text]);

  // graceful re-form: freeze physics, glide every letter back to its home, then re-arm
  const reform = () => {
    if (!effectStarted || reformingRef.current) return;
    reformingRef.current = true;
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (teardownRef.current) teardownRef.current();
    const homes = homesRef.current || [];
    homes.forEach(({ el, x, y }, i) => {
      el.style.transition = 'left .82s cubic-bezier(.22,.68,.24,1) ' + (i * 6) + 'ms, top .82s cubic-bezier(.34,.9,.3,1) ' + (i * 6) + 'ms, transform .82s cubic-bezier(.22,.68,.24,1) ' + (i * 6) + 'ms';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = 'translate(-50%,-50%) rotate(0deg)';
    });
    const wait = 900 + homes.length * 6;
    setTimeout(() => {
      buildSpans();
      reformingRef.current = false;
      setEffectStarted(false);
    }, wait);
  };

  // ---- stage-exit: clear the hero. every letter leaves toward its nearest edge
  //      (fallen to the shelf -> slides out the bottom; still up in the headline -> slides out the top) ----
  const exitApiRef = useRef({});
  exitApiRef.current.exit = () => {
    const cont = containerRef.current, root = textRef.current;
    if (!cont || !root) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (teardownRef.current) teardownRef.current();   // freeze physics where the letters are
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    reformingRef.current = false;
    const contRect = cont.getBoundingClientRect();
    const scale = root.offsetWidth ? (root.getBoundingClientRect().width / root.offsetWidth) : 1;
    const H = contRect.height / (scale || 1);
    const chars = [...root.querySelectorAll('.char')];
    if (!chars.length) return;
    const measured = chars.map(el => {
      const r = el.getBoundingClientRect();
      return { el,
        cx: (r.left - contRect.left + r.width / 2) / (scale || 1),
        cy: (r.top - contRect.top + r.height / 2) / (scale || 1) };
    });
    // pin each letter absolutely at its current spot (covers both the intact-flow and fallen-physics cases)
    measured.forEach(({ el, cx, cy }) => {
      el.style.position = 'absolute'; el.style.margin = '0';
      el.style.left = cx + 'px'; el.style.top = cy + 'px';
      el.style.transform = 'translate(-50%,-50%)';
      el.style.transition = 'none';
    });
    cont.style.overflow = 'visible';                    // let letters fly clear across the page, not clip at the text box
    void root.offsetWidth;
    const thresh = H * 0.46;                            // above -> exit up, below (on the shelf) -> exit down
    if (reduce) { measured.forEach(({ el }) => { el.style.opacity = '0'; }); return; }
    const vh = window.innerHeight || 800;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      measured.forEach(({ el, cy }) => {
        const goUp = cy < thresh;
        const dist = goUp ? (cy + vh * 0.72 + 150) : ((vh - cy) + vh * 0.45 + 190);
        const rot = (Math.random() * 2 - 1) * 52;
        const dx = (Math.random() * 2 - 1) * 55;
        const d = Math.random() * 110;
        el.style.transition = 'transform .74s cubic-bezier(.52,0,.7,0) ' + d + 'ms, opacity .3s ease ' + (d + 320) + 'ms';
        el.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + (goUp ? -dist : dist) + 'px) rotate(' + rot + 'deg)';
        el.style.opacity = '0';
      });
    }));
  };
  exitApiRef.current.return = () => {
    const root = textRef.current;
    if (!root) return;
    const contReset = containerRef.current;
    if (contReset) contReset.style.overflow = 'hidden';
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    reformingRef.current = false;
    setEffectStarted(false);
    buildSpans();                                       // fresh, intact headline back in home positions
    root.style.transition = 'none';
    root.style.opacity = '0';
    void root.offsetWidth;
    requestAnimationFrame(() => {
      root.style.transition = 'opacity .55s ease .1s';
      root.style.opacity = '1';
    });
  };
  useEffect(() => {
    const onExit = () => { try { exitApiRef.current.exit(); } catch (e) {} };
    const onReturn = () => { try { exitApiRef.current.return(); } catch (e) {} };
    window.addEventListener('falltext:exit', onExit);
    window.addEventListener('falltext:return', onReturn);
    return () => {
      window.removeEventListener('falltext:exit', onExit);
      window.removeEventListener('falltext:return', onReturn);
    };
  }, []);

  useEffect(() => {
    if (!effectStarted) return;
    const Matter = window.Matter;
    if (!Matter) return;
    const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;

    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    if (width <= 0 || height <= 0) return;

    const engine = Engine.create();
    engine.world.gravity.y = g;

    const render = Render.create({
      element: canvasContainerRef.current,
      engine,
      options: { width, height, background: backgroundColor, wireframes }
    });

    const bOpt = { isStatic: true, render: { fillStyle: 'transparent' } };
    const floor = Bodies.rectangle(width / 2, height + 25, width, 50, bOpt);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, bOpt);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, bOpt);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, bOpt);

    const charSpans = textRef.current.querySelectorAll('.char');
    const homes = [];
    const wordBodies = [...charSpans].map(elem => {
      const rect = elem.getBoundingClientRect();
      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;
      homes.push({ el: elem, x, y });
      const body = Bodies.rectangle(x, y, rect.width, rect.height, {
        render: { fillStyle: 'transparent' },
        restitution: 0.82, frictionAir: 0.01, friction: 0.25
      });
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 5, y: 0 });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      return { elem, body };
    });
    homesRef.current = homes;

    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = 'absolute';
      elem.style.left = body.position.x + 'px';
      elem.style.top = body.position.y + 'px';
      elem.style.transform = 'translate(-50%,-50%)';
      elem.style.margin = '0';
    });

    const mouse = Mouse.create(containerRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse, constraint: { stiffness: mouseConstraintStiffness, render: { visible: false } }
    });
    render.mouse = mouse;

    World.add(engine.world, [floor, leftWall, rightWall, ceiling, mouseConstraint, ...wordBodies.map(wb => wb.body)]);

    // impact sounds: floor = shelf tok, char-char = clack, wall/ceiling = tick; volume scales with approach speed
    const charIds = new Set(wordBodies.map(wb => wb.body.id));
    const isWall = (x) => x === leftWall || x === rightWall || x === ceiling;
    const onCol = (ev) => {
      const ps = ev.pairs || [];
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i].bodyA, b = ps[i].bodyB;
        const vel = Math.max(a.speed || 0, b.speed || 0);
        if (vel < 2.5) continue;
        let kind;
        if (a === floor || b === floor) kind = 'shelf';
        else if (charIds.has(a.id) && charIds.has(b.id)) kind = 'clack';
        else if (isWall(a) || isWall(b)) kind = 'wall';
        else continue;
        fallHit(kind, vel);
      }
    };
    Matter.Events.on(engine, 'collisionStart', onCol);

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    const updateLoop = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        elem.style.left = x + 'px';
        elem.style.top = y + 'px';
        elem.style.transform = 'translate(-50%,-50%) rotate(' + body.angle + 'rad)';
      });
      rafRef.current = requestAnimationFrame(updateLoop);
    };
    updateLoop();

    if (rDelay > 0) {
      autoTimerRef.current = setTimeout(() => reform(), rDelay);
    }

    let cleaned = false;
    const teardown = () => {
      if (cleaned) return; cleaned = true;
      cancelAnimationFrame(rafRef.current);
      if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
      try { Render.stop(render); } catch (e) {}
      try { Runner.stop(runner); } catch (e) {}
      if (render.canvas && canvasContainerRef.current) {
        try { canvasContainerRef.current.removeChild(render.canvas); } catch (e) {}
      }
      try { Matter.Events.off(engine, 'collisionStart', onCol); } catch (e) {}
      try { World.clear(engine.world); } catch (e) {}
      try { Engine.clear(engine); } catch (e) {}
    };
    teardownRef.current = teardown;
    return teardown;
  }, [effectStarted]);

  const handleTrigger = () => {
    if (!introDone) return;
    if (!effectStarted && (trigger === 'click' || trigger === 'hover')) setEffectStarted(true);
  };
  const handleContainerClick = () => {
    if (clickReform !== '0' && effectStarted && !reformingRef.current) reform();
  };

  return React.createElement('div', {
    ref: containerRef,
    onClick: handleContainerClick,
    style: {
      position: 'relative', overflow: 'hidden', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: valign === 'top' ? 'flex-start' : 'center',
      textAlign: 'center', paddingTop: padTop, boxSizing: 'border-box'
    }
  },
    React.createElement('div', {
      ref: textRef,
      onClick: trigger === 'click' ? handleTrigger : undefined,
      onMouseEnter: trigger === 'hover' ? handleTrigger : undefined,
      style: {
        maxWidth: '100%', fontSize, fontFamily, color, fontWeight: 400,
        lineHeight: 1.06, letterSpacing: '-.018em', textWrap: 'balance', cursor: 'pointer'
      }
    }),
    cue ? React.createElement('div', {
      className: (introDone && !effectStarted) ? 'fallCue' : '',
      style: {
        marginTop: 'clamp(14px,2.2vh,26px)', fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 'clamp(9px,.72vw,11px)', letterSpacing: '.32em', textTransform: 'uppercase',
        color: cueColor, pointerEvents: 'none', opacity: (introDone && !effectStarted) ? undefined : 0,
        transition: 'opacity .45s ease'
      }
    }, cue) : null,
    React.createElement('div', {
      ref: canvasContainerRef,
      style: { position: 'absolute', top: 0, left: 0, zIndex: 0 }
    })
  );
}

if (typeof window !== 'undefined') window.FallingText = FallingText;
if (typeof module !== 'undefined') module.exports = { FallingText };
