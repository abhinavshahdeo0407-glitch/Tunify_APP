// Paste your free Jamendo client ID here (get one at devportal.jamendo.com) to unlock indie music
const JAMENDO_CLIENT_ID = "";

const SRC = n => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

const tracks = [
  { id: 1, title: "Midnight Drive",  artist: "Neon Harbor",  album: "After Hours",   hue: 265, tag: "chill" },
  { id: 2, title: "Golden Static",   artist: "Mira Vale",    album: "Daylight",      hue: 35,  tag: "energy" },
  { id: 3, title: "Paper Lanterns",  artist: "The Okafors",  album: "Small Rooms",   hue: 340, tag: "chill" },
  { id: 4, title: "Overclock",       artist: "Kilo Reyes",   album: "Voltage",       hue: 190, tag: "energy" },
  { id: 5, title: "Slow Tide",       artist: "Aoi Tanaka",   album: "Low Season",    hue: 210, tag: "focus" },
  { id: 6, title: "Concrete Garden", artist: "Neon Harbor",  album: "After Hours",   hue: 120, tag: "focus" },
  { id: 7, title: "Run It Back",     artist: "Mira Vale",    album: "Daylight",      hue: 5,   tag: "energy" },
  { id: 8, title: "Blue Hour",       artist: "The Okafors",  album: "Small Rooms",   hue: 240, tag: "chill" },
];

tracks.forEach(t => (t.src = SRC(t.id)));

const playlists = [
  { id: "all",    name: "All Songs",   hue: 145 },
  { id: "liked",  name: "Liked Songs", hue: 270 },
  { id: "chill",  name: "Chill Evenings", hue: 220 },
  { id: "energy", name: "Power Hour",  hue: 20 },
  { id: "focus",  name: "Deep Focus",  hue: 175 },
  { id: "indie",  name: "Indie Discoveries", hue: 300 },
];

const $ = s => document.querySelector(s);
const audio = $("#audio");
const grad = h => `linear-gradient(135deg,hsl(${h} 70% 50%),hsl(${(h + 50) % 360} 70% 25%))`;
const art = t => (t.img ? `url(${t.img}) center/cover` : grad(t.hue));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = s => (isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00");
const fill = el => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");

let view = "all", query = "", queue = [], current = null;
let shuffle = false, repeat = 0; // repeat: 0 off, 1 all, 2 one
let indie = [], indieMsg = "";
let liked = new Map();
try { liked = new Map(JSON.parse(localStorage.getItem("likedTracks") || "[]").map(t => [t.id, t])); } catch (e) {}
const saveLikes = () => { try { localStorage.setItem("likedTracks", JSON.stringify([...liked.values()])); } catch (e) {} };
const byId = id => [...tracks, ...indie, ...liked.values()].find(t => String(t.id) === String(id));

function visibleTracks() {
  let list = view === "all" ? tracks : view === "liked" ? [...liked.values()] : view === "indie" ? indie : tracks.filter(t => t.tag === view);
  const q = query.trim().toLowerCase();
  return q ? list.filter(t => [t.title, t.artist, t.album].some(v => v.toLowerCase().includes(q))) : list;
}

function renderSidebar() {
  $("#playlists").innerHTML = playlists.map(p => `
    <button class="pl ${p.id === view ? "active" : ""}" data-view="${p.id}">
      <div class="cover" style="background:${grad(p.hue)}"></div>
      <span>${p.name}<small>Playlist</small></span>
    </button>`).join("");
  document.querySelectorAll(".nav-btn[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
}

function renderTracks() {
  const list = visibleTracks(), pl = playlists.find(p => p.id === view);
  document.documentElement.style.setProperty("--hue", pl.hue);
  $("#heroCover").style.background = grad(pl.hue);
  $("#viewTitle").textContent = pl.name;
  $("#viewMeta").textContent = `${list.length} song${list.length === 1 ? "" : "s"}${view === "indie" ? ", Creative Commons music via Jamendo" : ""}`;
  $("#tracks").innerHTML = list.length ? list.map((t, i) => `
    <div class="row" data-id="${t.id}">
      <span class="n">${i + 1}</span>
      <div class="t"><div class="cover xs" style="background:${esc(art(t))}"></div><div><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div></div>
      <span class="al">${esc(t.album || "")}</span>
      <button class="icon like ${liked.has(t.id) ? "on" : ""}" data-like="${t.id}" aria-label="Like">${liked.has(t.id) ? "♥" : "♡"}</button>
      <span class="d">${fmt(durations[t.id])}</span>
    </div>`).join("") : `<p class="empty">${view === "indie" ? esc(indieMsg) : "Nothing here yet. Like a song or try a different search."}</p>`;
  markPlaying();
}

function markPlaying() {
  document.querySelectorAll(".row").forEach(r => r.classList.toggle("playing", current && r.dataset.id === String(current.id)));
  $("#play").textContent = audio.paused ? "▶" : "❚❚";
  $("#pLike").textContent = current && liked.has(current.id) ? "♥" : "♡";
  $("#pLike").classList.toggle("on", !!current && liked.has(current.id));
}

function playTrack(track, list = queue) {
  queue = list.length ? list : tracks;
  current = track;
  audio.src = track.src;
  audio.play().catch(() => { $("#pArtist").textContent = "Can't load audio. Check your internet connection."; });
  $("#pTitle").textContent = track.title;
  $("#pArtist").textContent = track.artist;
  $("#pCover").style.background = art(track);
  document.title = `${track.title} • ${track.artist}`;
  markPlaying();
}

function step(dir, auto = false) {
  if (!current) return;
  let i = queue.findIndex(t => t.id === current.id);
  if (shuffle && queue.length > 1) {
    do { i = Math.floor(Math.random() * queue.length); } while (queue[i].id === current.id);
  } else {
    i += dir;
    if (i >= queue.length || i < 0) {
      if (repeat === 1 || !auto) i = (i + queue.length) % queue.length;
      else { audio.pause(); audio.currentTime = 0; return; }
    }
  }
  playTrack(queue[i]);
}

function togglePlay() {
  if (!current) { const l = visibleTracks(); if (l.length) playTrack(l[0], l); return; }
  audio.paused ? audio.play() : audio.pause();
}

function toggleLike(t) {
  liked.has(t.id) ? liked.delete(t.id) : liked.set(t.id, t);
  saveLikes();
  renderTracks();
}

// durations (loaded quietly in the background)
const durations = {};
tracks.forEach(t => {
  const a = new Audio();
  a.preload = "metadata";
  a.src = t.src;
  a.onloadedmetadata = () => {
    durations[t.id] = a.duration;
    const el = document.querySelector(`.row[data-id="${t.id}"] .d`);
    if (el) el.textContent = fmt(a.duration);
  };
});

// indie discovery: free Creative Commons music from Jamendo (skips the most-streamed tracks)
async function loadIndie() {
  if (!JAMENDO_CLIENT_ID) { indieMsg = "Add your free Jamendo client ID at the top of script.js to load indie music."; return renderTracks(); }
  indie = [];
  indieMsg = "Finding indie tracks…";
  renderTracks();
  try {
    const p = new URLSearchParams({
      client_id: JAMENDO_CLIENT_ID, format: "json", limit: 40, tags: "indie",
      order: "popularity_total", offset: 100 + Math.floor(Math.random() * 300), audioformat: "mp32",
    });
    const data = await (await fetch("https://api.jamendo.com/v3.0/tracks/?" + p)).json();
    indie = (data.results || []).filter(r => r.audio).map(r => {
      durations["j" + r.id] = r.duration;
      return { id: "j" + r.id, title: r.name, artist: r.artist_name, album: r.album_name, hue: (r.id * 37) % 360, img: r.image, src: r.audio };
    });
    indieMsg = indie.length ? "" : "No tracks came back. Click the playlist again to try another batch.";
  } catch (e) {
    indieMsg = "Couldn't reach Jamendo. Check your connection and client ID.";
  }
  renderTracks();
}

// events
document.addEventListener("click", e => {
  const v = e.target.closest("[data-view]");
  if (v) { view = v.dataset.view; renderSidebar(); renderTracks(); if (view === "indie") loadIndie(); return; }
  const like = e.target.closest("[data-like]");
  if (like) { e.stopPropagation(); toggleLike(byId(like.dataset.like)); return; }
  const row = e.target.closest(".row");
  if (row) playTrack(byId(row.dataset.id), visibleTracks());
});

$("#searchNav").onclick = () => $("#search").focus();
$("#search").oninput = e => { query = e.target.value; renderTracks(); };
$("#playAll").onclick = () => {
  const l = visibleTracks();
  if (l.length) playTrack(shuffle ? l[Math.floor(Math.random() * l.length)] : l[0], l);
};
$("#play").onclick = togglePlay;
$("#next").onclick = () => step(1);
$("#prev").onclick = () => (audio.currentTime > 3 ? (audio.currentTime = 0) : step(-1));
$("#pLike").onclick = () => current && toggleLike(current);
$("#shuffle").onclick = e => { shuffle = !shuffle; e.currentTarget.classList.toggle("active", shuffle); };
$("#repeat").onclick = e => {
  repeat = (repeat + 1) % 3;
  e.currentTarget.classList.toggle("active", repeat > 0);
  e.currentTarget.textContent = repeat === 2 ? "↻¹" : "↻";
};

audio.onplay = audio.onpause = markPlaying;
audio.onended = () => (repeat === 2 ? audio.play() : step(1, true));
audio.ontimeupdate = () => {
  if (!audio.duration) return;
  $("#progress").value = (audio.currentTime / audio.duration) * 100;
  fill($("#progress"));
  $("#cur").textContent = fmt(audio.currentTime);
};
audio.onloadedmetadata = () => ($("#dur").textContent = fmt(audio.duration));
$("#progress").oninput = e => { if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration; fill(e.target); };

const vol = $("#volume");
vol.oninput = () => { audio.volume = vol.value; audio.muted = false; fill(vol); $("#mute").textContent = +vol.value === 0 ? "🔇" : "🔊"; };
$("#mute").onclick = () => { audio.muted = !audio.muted; $("#mute").textContent = audio.muted ? "🔇" : "🔊"; };

document.addEventListener("keydown", e => {
  if (["INPUT", "BUTTON"].includes(e.target.tagName)) return;
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
  if (e.code === "ArrowRight") audio.currentTime += 5;
  if (e.code === "ArrowLeft") audio.currentTime -= 5;
});

// init
audio.volume = 0.7;
fill(vol);
fill($("#progress"));
renderSidebar();
renderTracks();