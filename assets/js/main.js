/* ==========================================================================
   main.js — Portfolio v2 ("Aurora") interactions
   Vanilla JS, no build step. Loaded with `defer`.

   Every block is independent and feature-detects what it needs. All heavy
   motion is disabled when the user prefers reduced motion or is on a
   touch/coarse pointer, so the page stays calm and fast where it should.
   ========================================================================== */

(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ==============================================================
     SOUND EFFECTS — synthesized with the Web Audio API (no files).
     OFF by default; users opt in via the speaker toggle and the
     choice persists. Other interactions call playSound(name).
     ============================================================== */
  const SOUND_KEY = "portfolio-sound";
  const soundBtn = $("[data-sound-toggle]");
  let soundOn = localStorage.getItem(SOUND_KEY) === "on";
  let audioCtx = null;

  const reflectSoundUI = () => {
    if (!soundBtn) return;
    soundBtn.setAttribute("data-enabled", String(soundOn));
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.setAttribute("aria-label", soundOn ? "Disable sound effects" : "Enable sound effects");
    soundBtn.setAttribute("title", soundOn ? "Sound: on" : "Sound: off");
  };
  reflectSoundUI();

  // Lazily create / resume the context (must follow a user gesture).
  const audio = () => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };

  // One enveloped tone — gentle attack/decay so there are no clicks.
  const tone = (freq, opts = {}) => {
    const { type = "sine", dur = 0.12, gain = 0.05, delay = 0, glideTo = null } = opts;
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.014);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  };

  const SOUNDS = {
    boop: () => tone(523, { type: "triangle", dur: 0.11, gain: 0.045, glideTo: 740 }),
    click: () => tone(330, { type: "sine", dur: 0.09, gain: 0.05, glideTo: 220 }),
    on: () => { tone(523, { dur: 0.1, gain: 0.05 }); tone(784, { dur: 0.14, gain: 0.05, delay: 0.09 }); },
    off: () => tone(440, { dur: 0.16, gain: 0.05, glideTo: 220 }),
    success: () =>
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, { type: "triangle", dur: 0.2, gain: 0.05, delay: i * 0.085 })
      ),
  };

  const playSound = (name) => {
    if (!soundOn) return;
    const fn = SOUNDS[name];
    if (fn) fn();
  };

  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundOn = !soundOn;
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
      reflectSoundUI();
      if (soundOn) { audio(); SOUNDS.on(); } // confirm enabling with a chime
    });
  }

  // Wire sound into shared interactions (independent of motion prefs).
  $$("[data-boop]").forEach((el) => el.addEventListener("mouseenter", () => playSound("boop")));
  $$(".btn").forEach((el) => el.addEventListener("click", () => playSound("click")));

  /* --------------------------------------------------------------
     1. Theme toggle — persists choice; OS preference handled inline
        in <head> to avoid a flash before this script runs.
     -------------------------------------------------------------- */
  const THEME_KEY = "portfolio-theme";
  const themeBtn = $("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "dark" ? "#100e17" : "#fbfaff");
      playSound(next === "light" ? "on" : "off");
    });
  }

  /* --------------------------------------------------------------
     2. Mobile menu
     -------------------------------------------------------------- */
  const menuBtn = $("[data-menu-toggle]");
  const mobileNav = $("[data-mobile-nav]");
  if (menuBtn && mobileNav) {
    const setOpen = (open) => {
      mobileNav.setAttribute("data-open", String(open));
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", () =>
      setOpen(mobileNav.getAttribute("data-open") !== "true")
    );
    $$("a", mobileNav).forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* --------------------------------------------------------------
     3. Header shadow + scroll-progress bar (rAF-throttled)
     -------------------------------------------------------------- */
  const header = $("[data-header]");
  const progress = $("[data-progress]");
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.setAttribute("data-scrolled", String(y > 8));
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? y / max : 0;
      progress.style.transform = `scaleX(${pct})`;
    }
    const toTop = $("[data-to-top]");
    if (toTop) toTop.setAttribute("data-show", String(y > 600));
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  const toTopBtn = $("[data-to-top]");
  if (toTopBtn) {
    toTopBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
    );
  }

  /* --------------------------------------------------------------
     4. Scroll-reveal with stagger — fades sections in on entry.
     -------------------------------------------------------------- */
  const revealTargets = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const siblings = $$(".reveal", entry.target.parentElement).filter((s) =>
            entry.target.parentElement.contains(s)
          );
          const idx = siblings.indexOf(entry.target);
          entry.target.style.setProperty("--reveal-delay", `${Math.max(0, idx) * 70}ms`);
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  /* --------------------------------------------------------------
     5. Scroll-spy — highlight the nav link for the section in view.
     -------------------------------------------------------------- */
  const navLinks = $$("[data-nav-link]");
  const sections = navLinks
    .map((l) => $(l.getAttribute("href")))
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((l) =>
            l.classList.toggle("is-active", l.getAttribute("href") === `#${id}`)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* --------------------------------------------------------------
     6. Count-up stats — animate numbers when scrolled into view.
     -------------------------------------------------------------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const suffix = el.dataset.suffix || "";
      if (reduceMotion) {
        el.textContent = `${target}${suffix}`;
        return;
      }
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animate(entry.target);
            obs.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((c) => io.observe(c));
    } else {
      counters.forEach(animate);
    }
  }

  /* --------------------------------------------------------------
     7. Cursor spotlight — soft light trailing the pointer.
        Fine pointers only; skipped for touch + reduced motion.
     -------------------------------------------------------------- */
  const spotlight = $("[data-spotlight]");
  if (spotlight && finePointer && !reduceMotion) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const loop = () => {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      spotlight.style.transform = `translate(${cx}px, ${cy}px)`;
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    };
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!body.classList.contains("has-pointer")) body.classList.add("has-pointer");
      if (raf === null) raf = requestAnimationFrame(loop);
    });
    document.addEventListener("mouseleave", () => body.classList.remove("has-pointer"));
  }

  /* --------------------------------------------------------------
     8. 3D tilt + pointer-tracked glow on [data-tilt] cards.
        Fine pointers only.
     -------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach((card) => {
      const MAX = 7; // degrees
      let frame = null;
      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const rx = (0.5 - py) * MAX * 2;
          const ry = (px - 0.5) * MAX * 2;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
          frame = null;
        });
      };
      const reset = () => {
        if (frame) cancelAnimationFrame(frame), (frame = null);
        card.style.transform = "";
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
    });
  }

  /* --------------------------------------------------------------
     9. Magnetic buttons — pull gently toward the cursor.
     -------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      const STRENGTH = 0.32;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * STRENGTH}px, ${my * STRENGTH}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* --------------------------------------------------------------
     10. "Boop" — wiggle an icon on hover, then settle.
     -------------------------------------------------------------- */
  if (!reduceMotion) {
    $$("[data-boop]").forEach((el) => {
      let timer = null;
      el.addEventListener("mouseenter", () => {
        el.classList.add("is-booped");
        clearTimeout(timer);
        timer = setTimeout(() => el.classList.remove("is-booped"), 260);
      });
    });
  }

  /* --------------------------------------------------------------
     11. Sparkles — Josh-style twinkles around the hero highlight.
     -------------------------------------------------------------- */
  const sparkleHost = $("[data-sparkle]");
  if (sparkleHost && !reduceMotion) {
    const COLORS = ["#fb7185", "#c084fc", "#818cf8", "#38bdf8", "#fbbf24"];
    const svg = (color, size) =>
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" aria-hidden="true">` +
      `<path d="M12 0l2.4 8.1 7.6-3.4-3.4 7.6 8.1 2.4-8.1 2.4 3.4 7.6-7.6-3.4L12 24l-2.4-8.1-7.6 3.4 3.4-7.6L0 12l8.1-2.4-3.4-7.6 7.6 3.4z"/></svg>`;
    const spawn = () => {
      if (document.hidden) return;
      const s = document.createElement("span");
      s.className = "sparkle";
      const size = 10 + Math.random() * 12;
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.innerHTML = svg(COLORS[(Math.random() * COLORS.length) | 0], size);
      sparkleHost.appendChild(s);
      setTimeout(() => s.remove(), 760);
    };
    setInterval(spawn, 520);
    spawn();
  }

  /* --------------------------------------------------------------
     11b. Rainbow arc — a fan of rounded "soundbar" dashes generated
          from scratch in SVG and placed behind the hero avatar.
          Inner band is red, outer is violet; each bar gently pulses.
     -------------------------------------------------------------- */
  const arcHost = $("[data-arc]");
  if (arcHost) {
    const NS = "http://www.w3.org/2000/svg";
    const W = 1000, H = 560, cx = W / 2, cy = H - 24;
    const bands = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"]; // inner → outer
    const RAYS = 21, PER = 12;
    const spread = (142 * Math.PI) / 180;
    const start = -spread / 2;
    const rInner = 72, rStep = 33, dashLen = 26, dashW = 15;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("aria-hidden", "true");

    for (let i = 0; i < RAYS; i++) {
      const ang = start + (i / (RAYS - 1)) * spread;
      const dx = Math.sin(ang), dy = -Math.cos(ang);
      const rot = (Math.atan2(dy, dx) * 180) / Math.PI;
      for (let j = 0; j < PER; j++) {
        const r = rInner + j * rStep;
        const x = cx + dx * r, y = cy + dy * r;
        const rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", (x - dashLen / 2).toFixed(1));
        rect.setAttribute("y", (y - dashW / 2).toFixed(1));
        rect.setAttribute("width", dashLen);
        rect.setAttribute("height", dashW);
        rect.setAttribute("rx", (dashW / 2).toFixed(1));
        rect.setAttribute("transform", `rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
        rect.setAttribute("fill", bands[Math.min(bands.length - 1, Math.floor((j / PER) * bands.length))]);
        rect.setAttribute("class", "arc-bar");
        if (!reduceMotion) rect.style.animationDelay = `${(j * 110 + i * 26) % 2400}ms`;
        svg.appendChild(rect);
      }
    }
    arcHost.appendChild(svg);
  }

  /* --------------------------------------------------------------
     12. Contact form — sends real email via Web3Forms (no backend).

     >>> TO RECEIVE MESSAGES (one-time setup):
         1. Go to https://web3forms.com, enter gajjarmansi94@gmail.com
         2. Copy the free Access Key they email you
         3. Paste it into WEB3FORMS_KEY below, replacing the placeholder.
         Submissions then land in your inbox — no mail app required.

     Until a key is set, the form falls back to opening a mail client.
     -------------------------------------------------------------- */
  const form = $("[data-contact-form]");
  const status = $("[data-form-status]");
  const RECIPIENT = "gajjarmansi94@gmail.com";
  const WEB3FORMS_KEY = "YOUR_ACCESS_KEY_HERE"; // <-- paste your Web3Forms key

  const setStatus = (msg, state) => {
    if (!status) return;
    status.textContent = msg;
    if (state) status.setAttribute("data-state", state);
    else status.removeAttribute("data-state");
  };

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const message = String(data.get("message") || "").trim();

      // Honeypot — bots fill the hidden field; humans never do.
      if (data.get("botcheck")) return;

      if (!name || !email || !message) {
        setStatus("Please fill in every field.", "error");
        return;
      }

      const keyMissing = !WEB3FORMS_KEY || WEB3FORMS_KEY === "YOUR_ACCESS_KEY_HERE";
      if (keyMissing) {
        // No endpoint configured yet — fall back to the visitor's mail app.
        const subject = encodeURIComponent(`Portfolio enquiry — ${name}`);
        const bodyText = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
        window.location.href = `mailto:${RECIPIENT}?subject=${subject}&body=${bodyText}`;
        setStatus(`Opening your email app… if nothing happens, write to ${RECIPIENT}.`);
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      setStatus("Sending…");
      form.setAttribute("aria-busy", "true");
      if (submitBtn) submitBtn.disabled = true;

      try {
        data.append("access_key", WEB3FORMS_KEY);
        data.append("subject", `Portfolio enquiry — ${name}`);
        data.append("from_name", name);
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        const json = await res.json();
        if (json.success) {
          setStatus("Thank you! Your message is on its way.", "success");
          playSound("success");
          burstConfetti();
          form.reset();
        } else {
          setStatus(`Hmm, that didn't go through. Please email me at ${RECIPIENT}.`, "error");
        }
      } catch (err) {
        setStatus(`Network hiccup — please email me directly at ${RECIPIENT}.`, "error");
      } finally {
        form.removeAttribute("aria-busy");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function burstConfetti() {
    if (reduceMotion) return;
    const COLORS = ["#fb7185", "#c084fc", "#818cf8", "#38bdf8", "#fbbf24", "#34d399"];
    const N = 80;
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2;
    for (let i = 0; i < N; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      piece.style.background = COLORS[(Math.random() * COLORS.length) | 0];
      piece.style.borderRadius = Math.random() > 0.5 ? "2px" : "50%";
      document.body.appendChild(piece);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 6 + Math.random() * 9;
      let vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 6;
      let x = originX, y = originY;
      let rot = Math.random() * 360;
      const rotSpeed = (Math.random() - 0.5) * 24;
      let life = 0;
      const maxLife = 90 + Math.random() * 30;

      const tick = () => {
        life++;
        vy += 0.32; // gravity
        vx *= 0.99;
        x += vx;
        y += vy;
        rot += rotSpeed;
        piece.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        piece.style.opacity = String(Math.max(0, 1 - life / maxLife));
        if (life < maxLife) {
          requestAnimationFrame(tick);
        } else {
          piece.remove();
        }
      };
      requestAnimationFrame(tick);
    }
  }

  /* --------------------------------------------------------------
     13. Footer year stamp.
     -------------------------------------------------------------- */
  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
