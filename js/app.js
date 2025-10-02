const CLANS_JSON = "clans.json";
const MAP_JSON   = "map-data.json";

const ALIAS = { stuart: "stewart", mcdonald: "macdonald", mckenzie: "mackenzie", mcleod: "macleod", mcpherson: "macpherson", mcgregor: "macgregor" };
const slugifyClan = (name) => { const raw = String(name||"").toLowerCase().replace(/[^a-z]/g,""); return ALIAS[raw] || raw; };
const emblemPath = (clan)=> clan.emblem || `assets/images/emblems/${slugifyClan(clan.name)}-emblem.jpg`;
const tartanPath = (clan)=> clan.tartan || `assets/images/tartans/jpg/${slugifyClan(clan.name)}-tartan.jpg`;
const EMBLEM_FALLBACK = "assets/images/hearth-crest.png";
const TARTAN_FALLBACK = "assets/images/hearth-crest.png";

const searchEl = document.getElementById("clanSearch");
const gridEl   = document.getElementById("clanGrid");

const modal = document.getElementById("clanModal");
const modalClose = document.getElementById("modalClose");
const modalMapBtn = document.getElementById("modalMapBtn");
const elMod = {
  emblem: document.getElementById("modalEmblem"),
  tartan: document.getElementById("modalTartan"),
  name:   document.getElementById("modalName"),
  region: document.getElementById("modalRegion"),
  motto:  document.getElementById("modalMotto"),
  septs:  document.getElementById("modalSepts"),
  seats:  document.getElementById("modalSeats"),
};

let ALL_CLANS = [];
let MAP_DATA  = { territories: [], markers: [] };
let __currentClan = null;

function clanCardHTML(clan) {
  const e = emblemPath(clan);
  const t = tartanPath(clan);
  const motto  = clan.motto || clan.war_cry || "";
  const region = clan.region || "";
  return `
  <button class="group text-left rounded-2xl border bg-white overflow-hidden shadow hover:shadow-lg transition"
          data-clan="${clan.name}">
    <div class="relative h-28">
      <img src="${t}" loading="lazy" alt="${clan.name} tartan"
           onerror="this.onerror=null;this.src='${TARTAN_FALLBACK}'"
           class="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100">
      <img src="${e}" loading="lazy" alt="${clan.name} emblem"
           onerror="this.onerror=null;this.src='${EMBLEM_FALLBACK}'"
           class="absolute left-3 bottom-3 h-14 w-14 rounded-full ring-2 ring-white object-cover shadow">
    </div>
    <div class="p-4">
      <div class="font-semibold truncate">${clan.name}</div>
      <div class="text-xs text-stone-600 truncate">${region}</div>
      ${motto ? `<div class="mt-2 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
        <span>“${motto}”</span>
      </div>` : ""}
    </div>
  </button>`;
}
function renderClanGrid(list) {
  if (!gridEl) return;
  gridEl.innerHTML = (list||[]).map(clanCardHTML).join("") || `<div class="col-span-full text-stone-600">No results.</div>`;
  gridEl.querySelectorAll("button[data-clan]").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-clan");
      const clan = (ALL_CLANS||[]).find(c => c.name === name);
      if (clan) openClanModal(clan);
    });
  });
}
function matchesClan(q, clan) {
  const s = (q||"").toLowerCase().trim();
  if (!s) return true;
  const hay = [
    clan.name, clan.gaelic_name, clan.region, clan.motto, clan.war_cry,
    ...(clan.surnames||[]), ...(clan.septs||[])
  ].filter(Boolean).join("|").toLowerCase();
  return hay.includes(s);
}
function applySearch() {
  const q = searchEl?.value || "";
  const results = (ALL_CLANS||[]).filter(c => matchesClan(q,c));
  renderClanGrid(results);
}
searchEl?.addEventListener("input", applySearch);

function openClanModal(clan){
  __currentClan = clan;
  elMod.name.textContent = clan.name || "";
  elMod.region.textContent = clan.region || "";
  elMod.motto.textContent = clan.motto || clan.war_cry || "—";
  elMod.emblem.src = emblemPath(clan); elMod.emblem.onerror = () => elMod.emblem.src = EMBLEM_FALLBACK;
  elMod.tartan.src = tartanPath(clan); elMod.tartan.onerror = () => elMod.tartan.src = TARTAN_FALLBACK;
  const chips = (clan.septs && clan.septs.length ? clan.septs : clan.surnames || []).slice(0,24);
  elMod.septs.innerHTML = chips.map(s=>`<span class="rounded-full bg-stone-100 px-2 py-1 text-xs">${s}</span>`).join("") || `<span class="text-stone-500 text-sm">—</span>`;
  elMod.seats.innerHTML = (clan.seats||[]).map(s=>{
    const [lat,lon] = s.coords || []; return `<li><button class="text-amber-700 hover:underline" data-lat="${lat}" data-lon="${lon}">${s.name}</button></li>`;
  }).join("") || `<li class="text-stone-500">—</li>`;
  elMod.seats.querySelectorAll("button[data-lat]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const lat = parseFloat(b.getAttribute("data-lat"));
      const lon = parseFloat(b.getAttribute("data-lon"));
      if(!Number.isNaN(lat) && !Number.isNaN(lon)) focusMapLatLng(lat,lon);
    });
  });
  modal.classList.remove("hidden");
}
function closeClanModal(){ modal.classList.add("hidden"); __currentClan=null; }
modalClose?.addEventListener("click", closeClanModal);
modal?.addEventListener("click", (e)=>{ if(e.target===modal) closeClanModal(); });
modalMapBtn?.addEventListener("click", ()=>{ if(__currentClan){ focusClanByName(__currentClan.name); closeClanModal(); }});

let MAP, POLY_LAYERS={}, MARKERS=[];
function initMap(){
  MAP = L.map("leaflet", { scrollWheelZoom:true, zoomControl:true }).setView([56.8,-4.2],6);
  window.__LEAFLET_MAP__ = MAP;
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:18, attribution:'&copy; OpenStreetMap'}).addTo(MAP);
  (MAP_DATA.territories||[]).forEach(t=>{
    const latlngs = (t.coords||[]).map(([lat,lon])=>[lat,lon]);
    const layer = L.polygon(latlngs, { color: t.color||"#444", weight:2, fillOpacity:0.15 });
    layer.addTo(MAP); POLY_LAYERS[t.id]=layer;
  });
  (MAP_DATA.markers||[]).forEach(m=>{
    const [lat,lon] = m.coords||[]; if(typeof lat!=="number"||typeof lon!=="number") return;
    const marker = L.marker([lat,lon]).addTo(MAP);
    marker.bindPopup(`<div class="font-semibold">${m.name}</div><div class="text-xs text-stone-600">${(m.clans||[]).join(", ")}</div>`);
    MARKERS.push(marker);
  });
}
function focusByTerritories(ids=[]){
  const layers = ids.map(id=>POLY_LAYERS[id]).filter(Boolean);
  if(!layers.length) return; const group = L.featureGroup(layers); MAP.fitBounds(group.getBounds().pad(0.2));
}
window.focusByTerritories = focusByTerritories;
function focusClanByName(name){
  const c = (ALL_CLANS||[]).find(x=>x.name===name); if(!c) return;
  if(c.territories&&c.territories.length){ focusByTerritories(c.territories); }
  else if(c.seats&&c.seats.length){ const s=c.seats[0].coords; if(s&&s.length===2) focusMapLatLng(s[0],s[1]); }
}
window.focusClanByName = focusClanByName;
function focusMapLatLng(lat,lon){ if(!MAP) return; MAP.setView([lat,lon],9,{animate:true}); }
window.focusMapLatLng = focusMapLatLng;

async function boot(){
  try{
    const [cRes, mRes] = await Promise.all([fetch(CLANS_JSON), fetch(MAP_JSON)]);
    const [clans, map] = await Promise.all([cRes.json(), mRes.json()]);
    ALL_CLANS = clans; MAP_DATA = map;
    console.log("[Clan Finder] Loaded", ALL_CLANS.length, "clans.");
  }catch(e){ console.error("Failed to load datasets", e); }
  renderClanGrid(ALL_CLANS); initMap();
}
document.addEventListener("DOMContentLoaded", boot);
