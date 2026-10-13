"use strict";
const $ = s => document.querySelector(s);

/* Tabs */
function showTab(id){
  for (const t of ["hw1","hw2"]){ $("#"+t).hidden = t !== id; $("#tab-"+t).setAttribute("aria-selected", t === id); }
  try { history.replaceState(null, "", "#"+id); } catch(e){}
}
$("#tab-hw1").onclick = () => showTab("hw1");
$("#tab-hw2").onclick = () => showTab("hw2");

/* ---------- Toy curve y² = x³ + 7 (mod 17) ---------- */
const p = 17, G = [1,5];
const md = a => ((a % p) + p) % p;
const inv = a => { for (let i=1;i<p;i++) if (md(a*i) === 1) return i; };
const fmt = P => P ? `(${P[0]}, ${P[1]})` : "O";
const red = v => v === md(v) ? `${v}` : `${v} ≡ ${md(v)}`;     // show "raw ≡ reduced" when a reduction happened
const POINTS = []; for (let x=0;x<p;x++) for (let y=0;y<p;y++) if (md(y*y - x*x*x - 7) === 0) POINTS.push([x,y]);

// One addition or doubling, with the worked arithmetic for display.
function addStep(P, Q){
  if (!P) return { R:Q, lam:"–", lines:[`O + ${fmt(Q)} = ${fmt(Q)}  (O is the identity)`] };
  if (!Q) return { R:P, lam:"–", lines:[`${fmt(P)} + O = ${fmt(P)}`] };
  const dbl = P[0]===Q[0] && P[1]===Q[1];
  if (P[0]===Q[0] && md(P[1]+Q[1])===0)
    return { R:null, lam:"∞", lines:[`Same x, opposite y: the line is vertical.`, `Result: <b>O</b> (point at infinity)`] };
  const [x1,y1] = P, [x2,y2] = Q;
  let num, den, lines = [];
  if (dbl){ num = 3*x1*x1; den = 2*y1;
    lines.push(`λ = 3·x₁² / (2·y₁) = 3·${x1}² / (2·${y1}) = ${num}/${den}`); }
  else { num = y2 - y1; den = x2 - x1;
    lines.push(`λ = (y₂ − y₁)/(x₂ − x₁) = (${y2} − ${y1})/(${x2} − ${x1}) = ${num}/${den}`);
    if (den < 0){ num = -num; den = -den; lines.push(`&nbsp;&nbsp;= ${num}/${den}  (sign moved to the top)`); } }
  const n = md(num), d = md(den), di = inv(d);
  if (n !== num || d !== den) lines.push(`&nbsp;&nbsp;= ${n}/${d}  (mod 17)`);
  lines.push(`&nbsp;&nbsp;${d}⁻¹ = ${di}, since ${d}·${di} = ${d*di} = ${Math.floor(d*di/17)}·17 + 1`);
  const lam = md(n*di);
  lines.push(`&nbsp;&nbsp;λ = ${n}·${di} = ${red(n*di)}`);
  const xr = lam*lam - x1 - x2, x3 = md(xr);
  lines.push(`x₃ = λ² − x₁ − x₂ = ${lam*lam} − ${x1} − ${x2} = ${red(xr)}`);
  const yr = lam*(x1 - x3) - y1, y3 = md(yr);
  lines.push(`y₃ = λ(x₁ − x₃) − y₁ = ${lam}·(${x1} − ${x3}) − ${y1} = ${red(yr)}`);
  lines.push(`<span class="ok">check: ${y3}² = ${y3*y3} ≡ ${md(y3*y3)}, ${x3}³ + 7 = ${x3**3+7} ≡ ${md(x3**3+7)} ✓</span>`);
  return { R:[x3,y3], lam, third:[x3, md(-y3)], lines };
}

/* Build the double-and-add schedule for k */
const D = { k:6, steps:[], i:-1, timer:null };
function build(){
  stop();
  const k = Math.min(255, Math.max(1, Math.floor(+$("#k").value || 1)));
  $("#k").value = k; D.k = k;
  const bits = k.toString(2), steps = [];
  let R = G, s = 1;
  for (let b=1; b<bits.length; b++){
    const d = addStep(R, R); steps.push({ bit:b, op:"double", P:R, Q:R, from:s, s:2*s, ...d }); R = d.R; s *= 2;
    if (bits[b] === "1"){ const a = addStep(R, G); steps.push({ bit:b, op:"add G", P:R, Q:G, from:s, s:s+1, ...a }); R = a.R; s += 1; }
  }
  D.steps = steps; D.i = -1; D.bits = bits; D.Q = R;
  $("#steps").innerHTML = `<tr data-i="-1"><td class="n">0</td><td class="n">1</td><td>start: R = G</td><td class="n">–</td><td class="n">1G = ${fmt(G)}</td></tr>` +
    steps.map((st,i)=>`<tr data-i="${i}"><td class="n">${i+1}</td><td class="n">${bits[st.bit]}</td><td>${st.op}: ${st.op==="double"?`2·(${st.from}G)`:`${st.from}G + G`}</td><td class="n">${st.lam}</td><td class="n">${st.s}G = ${fmt(st.R)}</td></tr>`).join("");
  $("#result").innerHTML = `TOY PUBLIC KEY&nbsp; Q = ${k}·G = <b>${fmt(R)}</b> <span style="color:var(--muted);font-size:.85em">(${steps.length} operations; repeated addition would need ${k-1})</span>`;
  // Print G, 2G, …, kG to the console as the homework asks
  const out = []; let A = null; for (let j=1;j<=k;j++){ A = addStep(A, G).R; out.push(`${j}G = ${fmt(A)}`); }
  console.log(out.join("\n") + `\nTOY PUBLIC KEY = ${fmt(R)}`);
  render();
}
function render(){
  const st = D.steps[D.i];
  // binary strip: current bit highlighted
  const cur = st ? st.bit : 0;
  $("#bits").innerHTML = [...D.bits].map((b,j)=>`<span class="${j===cur?"now":j<cur?"done":""}">${b}</span>`).join("");
  // calculation card
  if (!st) $("#calc").innerHTML = `<div class="h">Start</div>The leading bit of k = ${D.k} (${D.bits}) is 1, so R = G = ${fmt(G)}.<br>${D.steps.length ? "Press Next step." : "Nothing more to do: Q = G."}`;
  else $("#calc").innerHTML = `<div class="h">Step ${D.i+1} of ${D.steps.length} · bit ${D.bits[st.bit]} → ${st.op==="double"?`double ${st.from}G`:`add G to ${st.from}G`}</div>` +
    `P = ${fmt(st.P)}${st.op==="double"?"":`, Q = ${fmt(st.Q)}`}<br>` + st.lines.join("<br>") + `<br>⇒ <b>${st.s}G = ${fmt(st.R)}</b>`;
  for (const tr of document.querySelectorAll("#steps tr")) tr.classList.toggle("cur", +tr.dataset.i === D.i);
  $("#b-step").disabled = D.i >= D.steps.length - 1;
  drawPlot(st);
}
function drawPlot(st){
  const L = 26, T = 6, c = 20, X = x => L + x*c + c/2, Y = y => T + (p-1-y)*c + c/2;
  const sub = new Set(); { let A = null; for (let j=1;j<=9;j++){ A = addStep(A,G).R; if (A) sub.add(A+""); } }
  let s = "";
  for (let i=0;i<=p;i++) s += `<line class="gl" x1="${L+i*c}" y1="${T}" x2="${L+i*c}" y2="${T+p*c}"/><line class="gl" x1="${L}" y1="${T+i*c}" x2="${L+p*c}" y2="${T+i*c}"/>`;
  s += `<rect class="frame" x="${L}" y="${T}" width="${p*c}" height="${p*c}"/>`;
  for (let v=0; v<p; v++) s += `<text x="${X(v)}" y="${T+p*c+15}" text-anchor="middle">${v}</text><text x="${L-6}" y="${Y(v)+3}" text-anchor="end">${v}</text>`;
  if (st && st.lam !== "–" && st.lam !== "∞"){
    for (let x=0;x<p;x++){ const y = md(st.P[1] + st.lam*(x - st.P[0])); s += `<rect class="ln" x="${X(x)-3}" y="${Y(y)-3}" width="6" height="6"/>`; }
  }
  for (const P of POINTS) s += `<circle class="${sub.has(P+"")?"sub":"pt"}" cx="${X(P[0])}" cy="${Y(P[1])}" r="${sub.has(P+"")?5:3.5}"/>`;
  // label the multiples reached so far
  const reached = new Map([[G+"","G"]]);
  for (let j=0;j<=D.i;j++){ const t = D.steps[j]; if (t.R) reached.set(t.R+"", t.s+"G"); }
  for (const [key, lab] of reached){ const [x,y] = key.split(",").map(Number); s += `<text class="lab" x="${X(x)+7}" y="${Y(y)-6}">${lab}</text>`; }
  if (!st) s += `<circle class="res" cx="${X(G[0])}" cy="${Y(G[1])}" r="8"/>`;
  else {
    s += `<circle class="op" cx="${X(st.P[0])}" cy="${Y(st.P[1])}" r="9"/>`;
    if (st.Q) s += `<circle class="op" cx="${X(st.Q[0])}" cy="${Y(st.Q[1])}" r="9"/>`;
    if (st.third){ s += `<circle class="third" cx="${X(st.third[0])}" cy="${Y(st.third[1])}" r="11"/>`;
      s += `<line class="refl" x1="${X(st.third[0])}" y1="${Y(st.third[1])}" x2="${X(st.R[0])}" y2="${Y(st.R[1])}"/>`; }
    if (st.R) s += `<circle class="res" cx="${X(st.R[0])}" cy="${Y(st.R[1])}" r="8"/>`;
  }
  $("#plot").innerHTML = s;
}
function next(){ if (D.i < D.steps.length-1){ D.i++; render(); return true; } return false; }
function stop(){ clearTimeout(D.timer); D.timer = null; $("#b-play").textContent = "Play"; }
function tick(){ if (next()) D.timer = setTimeout(tick, 1600); else stop(); }
$("#b-step").onclick = () => { stop(); next(); };
$("#b-play").onclick = () => { if (D.timer) return stop(); if (D.i >= D.steps.length-1){ D.i = -1; render(); } $("#b-play").textContent = "Pause"; D.timer = setTimeout(tick, 400); };
$("#b-reset").onclick = () => { stop(); D.i = -1; render(); };
$("#k").onchange = build;

/* ---------- Statistics on all outputs ---------- */
function mulG(k, B){ let R = null; for (const b of k.toString(2)){ R = addStep(R,R).R; if (b === "1") R = addStep(R,B).R; } return R; }
const pc = v => v.toString(2).split("").filter(c=>c==="1").length;
function stats(){
  const B = $("#base").value.split(",").map(Number);
  const out = []; let R = null, n = 0;
  do { R = addStep(R, B).R; n++; if (R) out.push(R); } while (R);
  const bin = (v,w) => v.toString(2).padStart(w,"0");
  $("#tbl").innerHTML = out.map((P,i)=>`<tr><td class="n">${i+1}</td><td class="n">${bin(i+1,5)}</td><td class="n">${fmt(P)}</td><td class="n">${bin(P[0],5)}</td><td class="n">${bin(P[1],5)}</td></tr>`).join("");
  const xs = out.map(P=>P[0]), ys = out.map(P=>P[1]);
  const dx = new Set(xs).size, dy = new Set(ys).size;
  let sym = 0; for (let k=1;k<n;k++) if (out[k-1][0] === out[n-k-1][0]) sym++;
  let hom = 0, tot = 0; for (let a=1;a<n;a++) for (let b=1;b<n;b++){ tot++; const L = mulG(a+b,B), Rr = addStep(mulG(a,B), mulG(b,B)).R; if (fmt(L) === fmt(Rr)) hom++; }
  // avalanche: flip each bit of k, count changed bits in x||y (10 bits)
  let flips = 0, changed = 0;
  for (let k=1;k<n;k++) for (let j=0;j<5;j++){ const k2 = k ^ (1<<j); if (k2<1 || k2>=n) continue; const P = mulG(k,B), Q = mulG(k2,B); const d = (P&&Q) ? pc(P[0]^Q[0]) + pc(P[1]^Q[1]) : 0; flips++; changed += d; }
  const ks = out.map((_,i)=>i+1), mean = a => a.reduce((s,v)=>s+v,0)/a.length;
  const mk = mean(ks), mx = mean(xs); let cov=0,vk=0,vx=0; ks.forEach((k,i)=>{ cov+=(k-mk)*(xs[i]-mx); vk+=(k-mk)**2; vx+=(xs[i]-mx)**2; });
  const r = cov/Math.sqrt(vk*vx);
  const ones = out.reduce((s,P)=>s+pc(P[0])+pc(P[1]),0) / (out.length*10);
  $("#obs").innerHTML = [
    `<b>${out.length} outputs</b> before the sequence returns to O (order n = ${n}). The private key only matters modulo ${n}, since kG = (k + ${n})G.`,
    `<b>x values:</b> only ${dx} different ones. Each appears twice, because kG and (n−k)G are mirror images with the same x (${sym}/${out.length} pairs).`,
    `<b>y values:</b> ${dy} different ones out of ${out.length}, so none repeats. For p = 17, every y has exactly one x on the curve.`,
    `<b>Bits:</b> ${(100*ones).toFixed(0)}% of the output bits are 1. The values stay below 17, so the top bit is rarely set.`,
    `<b>Correlation:</b> r(k, x) = ${r.toFixed(2)}. There is no linear trend, but the list is symmetric around k = n/2.`,
    `<b>Avalanche:</b> flipping one bit of k changes on average ${(changed/flips).toFixed(1)} of the 10 output bits (${(100*changed/flips/10).toFixed(0)}%), so it looks hash-like.`,
    `<b>Structure:</b> (a+b)G = aG + bG held in ${hom}/${tot} cases. A good hash would never have this, but signatures and key exchange rely on it.`
  ].map(t=>`<li>${t}</li>`).join("");
}
$("#base").onchange = stats;

/* ---------- HMWK 2: wallet pipeline ---------- */
const TEST = "test test test test test test test test test test test junk";
const toBits = h => [...h.replace(/^0x/,"")].map(c=>parseInt(c,16).toString(2).padStart(4,"0")).join("");
const chip = (c,t) => `<span class="chip ${c}">${t}</span>`;
const step = (n, title, chips, text, val) => `<div class="st"><div class="num">${n}</div><div class="b"><div class="t"><h3>${title}</h3>${chips}</div><p>${text}</p><div class="v">${val}</div></div></div>`;
function derive(){
  const st = $("#w-status");
  if (!window.ethers){ st.textContent = "ethers.js did not load, so this tab needs an internet connection."; return; }
  const phrase = $("#phrase").value.trim().toLowerCase().split(/\s+/).join(" ");
  const i = Math.max(0, Math.floor(+$("#idx").value || 0));
  let m; try { m = ethers.Mnemonic.fromPhrase(phrase); }
  catch(e){ st.textContent = "Invalid mnemonic: a word is not in the BIP-39 list, or the checksum in the last word does not match."; $("#pipe").innerHTML = ""; return; }
  const ent = m.entropy, ENT = (ent.length-2)*4, CS = ENT/32;
  const cs = toBits(ethers.sha256(ent)).slice(0, CS);
  const seed = m.computeSeed();
  const I = ethers.computeHmac("sha512", ethers.toUtf8Bytes("Bitcoin seed"), seed);
  const path = `m/44'/60'/0'/0/${i}`;
  const node = ethers.HDNodeWallet.fromSeed(seed).derivePath(path);
  const pub = node.signingKey.publicKey, h = ethers.keccak256(ethers.dataSlice(pub,1)), lower = h.slice(-40);
  const hh = ethers.keccak256(ethers.toUtf8Bytes(lower)).slice(2);
  let eip = "", html = "";
  for (let j=0;j<40;j++){ const ch = lower[j]; if (/[a-f]/.test(ch)){ const up = parseInt(hh[j],16) >= 8; eip += up?ch.toUpperCase():ch; html += `<span class="${up?"up":"lo"}">${up?ch.toUpperCase():ch}</span>`; } else { eip += ch; html += ch; } }
  st.textContent = `${path} · hand-computed EIP-55 ${"0x"+eip === node.address ? "matches" : "does NOT match"} ethers.js`;
  $("#pipe").innerHTML = [
    step(1,"Entropy",chip("c-gen","key generation"),`${ENT} random bits from a secure random generator.`, ent),
    step(2,"BIP-39 words",chip("c-sum","checksum")+chip("c-enc","encoding"),`The first ${CS} bits of SHA-256(entropy) are appended as a checksum. The bits are then split into 11-bit groups, and each group picks one of 2048 words.`, `checksum bits: <span class="cs">${cs}</span> → last word "${phrase.split(" ").pop()}"`),
    step(3,"BIP-39 seed",chip("c-der","key derivation"),`PBKDF2-HMAC-SHA512 (mnemonic, salt "mnemonic", 2048 rounds) gives 512 bits.`, seed),
    step(4,"BIP-32 master key",chip("c-der","key derivation"),`HMAC-SHA512("Bitcoin seed", seed): the left half is the master private key and the right half is the chain code.`, `${ethers.dataSlice(I,0,32)}`),
    step(5,"BIP-44 path",chip("c-der","key derivation"),`m / 44' (BIP-44) / 60' (Ethereum) / 0' (account) / 0 (external) / ${i} (index). The ' marks hardened levels.`, `${path} → private key ${node.privateKey}`),
    step(6,"secp256k1 public key",chip("c-pk","public-key crypto"),`Q = k·G with the same double-and-add as Lab 1, on a 256-bit curve. Encoded as 04 ‖ x ‖ y.`, pub),
    step(7,"Keccak-256 → address",chip("c-hash","hashing"),`Hash the 64 bytes x ‖ y and keep the last 20 bytes.`, `${h.slice(0,26)}<b>${h.slice(26)}</b> → 0x${lower}`),
    step(8,"EIP-55 checksum",chip("c-sum","checksum"),`Hash the lowercase hex text. Each letter becomes uppercase when its hash nibble is ≥ 8.`, `<span class="eip">0x${html}</span>`)
  ].join("");
}
$("#w-go").onclick = derive;
$("#idx").onchange = derive;
$("#w-test").onclick = () => { $("#phrase").value = TEST; $("#idx").value = 0; derive(); };
$("#w-rand").onclick = () => { if (!window.ethers) return; $("#phrase").value = ethers.Mnemonic.fromEntropy(ethers.randomBytes(16)).phrase; derive(); };

/* ---------- Boot ---------- */
build(); stats();
if (window.ethers){
  derive();
  $("#kk").textContent = ethers.keccak256("0x").slice(2);
  $("#sh").textContent = ethers.sha256("0x").slice(2);
  let tot = 0; const N = 500;
  for (let t=0;t<N;t++){ const a = ethers.randomBytes(32), b = new Uint8Array(a); const j = Math.floor(Math.random()*256); b[j>>3] ^= 1<<(j&7);
    const x = toBits(ethers.keccak256(a)), y = toBits(ethers.keccak256(b)); for (let q=0;q<256;q++) if (x[q] !== y[q]) tot++; }
  $("#aval").textContent = `Measured here: ${(tot/N).toFixed(1)} of 256 bits over ${N} trials.`;
} else $("#w-status").textContent = "ethers.js did not load, so this tab needs an internet connection.";
if (location.hash === "#hw2") showTab("hw2");