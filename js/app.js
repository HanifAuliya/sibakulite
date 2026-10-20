// SIBAKU Lite: pencarian kode KBLI 2025 yang cepat, toleran bahasa sehari-hari, dan bisa offline.
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const qEl = $("#q"), resEl = $("#results"), metaEl = $("#meta"), clearEl = $("#clear"), toastEl = $("#toast");
  const LIMIT = 40;

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- tema ----------
  const store = {
    get(k) { try { return localStorage.getItem("sbl:" + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("sbl:" + k, v); } catch { /* abaikan */ } },
  };
  const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; };
  applyTheme(store.get("theme"));
  $("#themeBtn").onclick = () => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = document.documentElement.dataset.theme || (dark ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("theme", next);
  };

  // ---------- data ----------
  let ITEMS = [], BYCODE = {};
  const MULTI = Object.keys(SINONIM).filter((k) => k.includes(" ")).sort((a, b) => b.length - a.length);
  const popText = {}, popPos = {};
  POPULER.forEach((p) => p.c.forEach((c, i) => { popText[c] = (popText[c] || "") + " " + norm(p.k); popPos[c] = Math.min(popPos[c] ?? 9, i); }));
  const STOPSET = new Set(STOP);

  function build(data) {
    ITEMS = data.map(([kode, judul]) => {
      const n = norm(judul), gp = GOLPOK[kode.slice(0, 2)] || "";
      const it = { kode, judul, n, words: n.split(" "), gp, gpw: norm(gp).split(" "), popw: norm(popText[kode] || "").split(" ").filter(Boolean) };
      BYCODE[kode] = it;
      return it;
    });
  }

  // ---------- pencarian ----------
  function groups(q) {
    let s = " " + norm(q) + " ";
    const out = [];
    for (const m of MULTI) {
      if (s.includes(" " + m + " ")) { out.push({ t: m, alts: [m, ...SINONIM[m]] }); s = s.replace(" " + m + " ", " "); }
    }
    const toks = s.trim().split(" ").filter(Boolean);
    const kept = toks.filter((t) => !STOPSET.has(t));
    (kept.length ? kept : toks).forEach((t) => out.push({ t, alts: [t, ...(SINONIM[t] || [])] }));
    return out;
  }

  function matchAlt(it, a, original) {
    if (a.includes(" ")) {
      if (it.n.includes(a)) return 3;
      if (it.popw.join(" ").includes(a)) return 2.5;
      return 0;
    }
    let best = 0;
    for (const w of it.words) {
      if (w === a) { best = 3; break; }
      if (a.length >= 2 && w.startsWith(a)) best = Math.max(best, 2);
    }
    if (!best && it.popw.some((w) => w === a || (a.length >= 3 && w.startsWith(a)))) best = 2.5;
    if (!best && a.length >= 3 && it.gpw.some((w) => w.startsWith(a))) best = 1;
    return best && original ? best + 1 : best;
  }

  function search(q) {
    const gs = groups(q);
    if (!gs.length) return { res: [], gs };
    const res = [], partial = [];
    const rows = ITEMS.map((it) => gs.map((g) => {
      let s = 0;
      g.alts.forEach((a, i) => { s = Math.max(s, matchAlt(it, a, i === 0)); });
      return s;
    }));
    // Bobot kata: kata yang jarang muncul (misalnya "laundry") lebih menentukan daripada kata umum (misalnya nama orang).
    const idf = gs.map((g, j) => Math.log((ITEMS.length + 1) / (1 + rows.filter((r) => r[j]).length)));
    for (let k = 0; k < ITEMS.length; k++) {
      const it = ITEMS[k], r = rows[k];
      const hit = r.filter(Boolean).length;
      if (!hit) continue;
      const total = r.reduce((a, b) => a + b, 0);
      if (hit === gs.length) {
        const popHit = gs.every((g) => g.alts.some((a) => a.includes(" ") ? it.popw.join(" ").includes(a) : it.popw.some((w) => w.startsWith(a))));
        res.push({ it, score: total + (popHit ? 4 - (popPos[it.kode] || 0) * 0.3 : 0) - it.judul.length / 200, pop: popHit });
      } else if (gs.length > 1) {
        const w = r.reduce((a, s, j) => a + (s ? idf[j] * s : 0), 0);
        partial.push({ it, score: w - it.judul.length / 200, pop: false });
      }
    }
    const byScore = (a, b) => b.score - a.score || a.it.kode.localeCompare(b.it.kode);
    // Jika tidak ada yang cocok dengan semua kata, tampilkan yang cocok sebagian.
    if (!res.length) return { res: partial.sort(byScore), gs, partial: true };
    return { res: res.sort(byScore), gs, partial: false };
  }

  function highlight(text, gs) {
    let html = esc(text);
    const alts = gs.flatMap((g) => g.alts).filter((a) => a.length >= 2).sort((a, b) => b.length - a.length);
    if (!alts.length) return html;
    const pat = alts.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")).join("|");
    return html.replace(new RegExp(`(^|[^a-z0-9])(${pat})`, "gi"), "$1<mark>$2</mark>");
  }

  // ---------- tampilan ----------
  let current = [], activeIdx = -1, shown = LIMIT;

  function itemHTML(it, gs, pop, idx) {
    const note = CATATAN[it.kode];
    return `<button class="item${pop ? " pop" : ""}" data-kode="${it.kode}" data-idx="${idx}">
      <span class="code"><span class="d2">${it.kode.slice(0, 2)}</span>${it.kode.slice(2)}</span>
      <span><div class="title">${gs ? highlight(it.judul, gs) : esc(it.judul)}</div>
        <div class="sub">${it.kode.slice(0, 2)} · ${esc(it.gp)}</div>
        ${note ? `<div class="note">${esc(note)}</div>` : ""}</span>
      <span class="copy">salin</span>
    </button>`;
  }

  function renderHome() {
    current = []; activeIdx = -1;
    metaEl.textContent = `${ITEMS.length.toLocaleString("id-ID")} kode KBLI 2025 siap dicari${navigator.onLine ? "" : " (offline)"}`;
    const pops = [...new Set(POPULER.flatMap((p) => p.c))].slice(0, 14).map((c) => BYCODE[c]).filter(Boolean);
    current = pops;
    resEl.innerHTML = `
      <div class="tips"><b>Tips:</b> ketik usaha dengan bahasa sehari-hari, misalnya <i>bengkel motor</i>, <i>warung soto</i>, <i>laundry</i>, atau <i>ternak ayam</i>.
      Ketik angka (misalnya <b>56</b> atau <b>561</b>) untuk menelusuri kode. Ketuk hasil untuk <b>menyalin kode</b>. Di keyboard: <b>/</b> untuk mencari, <b>↑↓</b> untuk memilih, <b>Enter</b> untuk menyalin.</div>
      <div class="sec">Usaha yang sering ditemui</div>
      <div class="list">${pops.map((it, i) => itemHTML(it, null, true, i)).join("")}</div>
      <div class="sec">Telusuri per golongan pokok (2 digit)</div>
      <div class="chips">${Object.entries(GOLPOK).map(([k, v]) => `<button class="chip" data-q="${k}"><b>${k}</b>${esc(v)}</button>`).join("")}</div>`;
  }

  function render() {
    const q = qEl.value;
    clearEl.hidden = !q;
    activeIdx = -1;
    const nq = norm(q);
    if (!nq) return renderHome();

    if (/^\d{1,5}$/.test(nq.replace(/ /g, ""))) {
      const p = nq.replace(/ /g, "");
      current = ITEMS.filter((it) => it.kode.startsWith(p));
      const gp = GOLPOK[p.slice(0, 2)];
      metaEl.innerHTML = `${current.length} kode diawali <b>${esc(p)}</b>${gp && p.length >= 2 ? ` · ${esc(gp)}` : ""}`;
      resEl.innerHTML = current.length
        ? `<div class="list">${current.slice(0, shown).map((it, i) => itemHTML(it, null, false, i)).join("")}</div>${current.length > shown ? `<button class="more" id="more">Tampilkan ${current.length - shown} lagi</button>` : ""}`
        : `<div class="empty">Tidak ada kode yang diawali ${esc(p)}. Golongan pokok 45 dan 34 tidak ada di KBLI 2025.</div>`;
      return;
    }

    const { res, gs, partial } = search(q);
    current = res.map((r) => r.it);
    const syn = gs.filter((g) => g.alts.length > 1).map((g) => `${esc(g.t)} → ${esc(g.alts.slice(1).join(", "))}`);
    metaEl.innerHTML = `${res.length} hasil${partial && res.length ? " (cocok sebagian kata)" : ""}${syn.length ? ` · <span class="syn">dibaca juga: ${syn.join(" · ")}</span>` : ""}`;
    if (!res.length) {
      resEl.innerHTML = `<div class="empty">Tidak ditemukan. Coba kata lain yang lebih umum (misalnya <i>industri</i>, <i>perdagangan eceran</i>, <i>reparasi</i>), kurangi jumlah kata, atau telusuri lewat angka 2 digit.</div>`;
      return;
    }
    resEl.innerHTML = `<div class="list">${res.slice(0, shown).map((r, i) => itemHTML(r.it, gs, r.pop, i)).join("")}</div>
      ${res.length > shown ? `<button class="more" id="more">Tampilkan ${res.length - shown} lagi</button>` : ""}`;
  }

  // ---------- interaksi ----------
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }
  async function copy(kode) {
    try { await navigator.clipboard.writeText(kode); }
    catch {
      const t = document.createElement("textarea"); t.value = kode; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch { /* abaikan */ } t.remove();
    }
    toast(`${kode} disalin`);
  }

  resEl.addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (item) return copy(item.dataset.kode);
    const chip = e.target.closest(".chip");
    if (chip) { qEl.value = chip.dataset.q; shown = LIMIT; render(); qEl.focus(); window.scrollTo(0, 0); return; }
    if (e.target.id === "more") { shown += LIMIT * 2; render(); }
  });

  let deb;
  qEl.addEventListener("input", () => { clearTimeout(deb); shown = LIMIT; deb = setTimeout(() => { render(); syncHash(); }, 60); });
  clearEl.onclick = () => { qEl.value = ""; render(); syncHash(); qEl.focus(); };

  function setActive(i) {
    const els = resEl.querySelectorAll(".item");
    if (!els.length) return;
    activeIdx = Math.max(0, Math.min(els.length - 1, i));
    els.forEach((el, j) => el.classList.toggle("active", j === activeIdx));
    els[activeIdx].scrollIntoView({ block: "nearest" });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== qEl) { e.preventDefault(); qEl.focus(); qEl.select(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIdx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === "Enter" && document.activeElement === qEl) {
      e.preventDefault();
      const els = resEl.querySelectorAll(".item");
      const el = els[activeIdx >= 0 ? activeIdx : 0];
      if (el) copy(el.dataset.kode);
    } else if (e.key === "Escape") { qEl.value = ""; render(); syncHash(); qEl.focus(); }
  });

  function syncHash() {
    const v = qEl.value.trim();
    history.replaceState(null, "", v ? "#q=" + encodeURIComponent(v) : location.pathname);
  }

  // ---------- mulai ----------
  fetch("data/kbli.json").then((r) => r.json()).then((d) => {
    build(d);
    const h = decodeURIComponent((location.hash.match(/q=([^&]*)/) || [])[1] || "");
    if (h) qEl.value = h;
    render();
    qEl.focus();
  }).catch(() => { resEl.innerHTML = `<div class="empty">Gagal memuat data KBLI. Periksa koneksi lalu muat ulang.</div>`; });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").then(() => { $("#offline").textContent = " · Bisa dipakai offline setelah dibuka sekali."; }).catch(() => {});
  }
  window.addEventListener("online", render);
  window.addEventListener("offline", render);
})();
