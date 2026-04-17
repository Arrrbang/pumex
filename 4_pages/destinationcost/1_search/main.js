/* main.js */
'use strict';

const BASE = 'https://notion-api-hub.vercel.app';

const SHELL_STATES = Object.freeze({
  OPEN: 'OPEN',
  COLLAPSING: 'COLLAPSING',
  COLLAPSED: 'COLLAPSED',
  EXPANDING: 'EXPANDING',
});

let __shellState = SHELL_STATES.OPEN;
let __summaryClickLocked = false;
let __justCollapsedAt = 0;
let __allowExpand = false;

// ---------------------------- 지도(Leaflet) 관련 ----------------------------
const LCSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LJS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const GCSS = "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css";
const GJS  = "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js";

let map, markerLayer, geocoder, mapInited=false, mapData=null, tmpSearch=null;
let __countryPoints = [];
const pinReg    = '#2563eb';
const pinSearch = '#ef4444';
let currentRegionMarker = null;

function makeSvgPinIcon(color){
  const svg = `<svg class="pin-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="${color}" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5a2.5 2.5 0 0 1 0 5z"/></svg>`;
  return L.divIcon({ className:"", html:`<div class="pin-wrap">${svg}</div>`, iconSize:[26,26], iconAnchor:[13,26] });
}

function normalizeCountryKey(raw){ return String(raw||'').trim(); }

function haversineKm(aLat,aLng,bLat,bLng){
  const R=6371, dLat=(bLat-aLat)*Math.PI/180, dLng=(bLng-aLng)*Math.PI/180;
  const A=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(A));
}

function findNearest(lat,lng,pts){
  if(!pts?.length) return null;
  let best=null,bd=Infinity;
  for(const p of pts){
    const d=haversineKm(lat,lng,p.lat,p.lng);
    if(d<bd){best=p;bd=d;}
  }
  return {point:best,distanceKm:bd};
}

async function initAlwaysOnMap(){
  if (mapInited) return;
  await loadCssOnce(LCSS); await loadJsOnce(LJS);
  await loadCssOnce(GCSS); await loadJsOnce(GJS);

  const worldBounds = L.latLngBounds([[-85,-180],[85,180]]);
  map = L.map('mpkMap', { center:[20,0], zoom:2, worldCopyJump:false, maxBounds:worldBounds, maxBoundsViscosity:1.0 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'&copy; OSM', noWrap:true, bounds:worldBounds }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  const WORLD = L.latLngBounds([-85, -180], [85, 180]);
  function fitMinZoomToContainer({ cover = true } = {}) {
    map.invalidateSize();
    const z = map.getBoundsZoom(WORLD, cover);
    map.setMinZoom(z);
    map.setMaxBounds(WORLD);
    map.options.maxBoundsViscosity = 1.0;
    const center = map.getCenter();
    map.setView(center || [0, 0], z);
  }
  requestAnimationFrame(() => fitMinZoomToContainer({ cover: true }));
  window.addEventListener('resize', () => fitMinZoomToContainer({ cover: true }));

  geocoder = L.Control.geocoder({ 
    defaultMarkGeocode:false, 
    collapsed: false,
    position: 'topleft',
    placeholder: "국가 선택 후 지역 검색 가능",
    errorMessage: "결과를 찾을 수 없습니다."
  })
    .on('markgeocode', (e)=>{
      const c = e.geocode.center;
      if (tmpSearch) { map.removeLayer(tmpSearch); tmpSearch=null; }
      tmpSearch = L.marker(c, {icon: makeSvgPinIcon(pinSearch)}).addTo(map);
      map.setView(c, 9);
      const hit = findNearest(c.lat, c.lng, __countryPoints);
      if (hit?.point) setRegion(hit.point.name);
    }).addTo(map);

  try {
    const r = await fetch('./map.json', {cache:'no-store'});
    mapData = await r.json();
  } catch(e) {
    console.warn('map.json 로드 실패:', e);
    mapData = {};
  }
    mapInited = true;
    setTimeout(()=> {
      map.invalidateSize();
      updateGeocoderState(); 
    }, 100);
  }

function setMapCountry(country){
  if (!mapInited) return;
  markerLayer.clearLayers();
  __countryPoints = [];
  if (!mapData) return;
  const key = normalizeCountryKey(country);
  const pts = mapData[key];
  if (!pts || !pts.length){ return; }
  const bounds = [];
  pts.forEach(p=>{
    const m = L.marker([p.lat, p.lng], { icon: makeSvgPinIcon(pinReg) }).addTo(markerLayer);
    m.on('click', ()=>{ setRegion(p.name); });
    __countryPoints.push({ ...p, marker:m });
    bounds.push([p.lat, p.lng]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding:[20,20] });
}

function zoomToRegion(regionName, {fallbackZoom=11} = {}){
  if (!map || !regionName) return;
  const name = String(regionName).trim();
  if (!name) return;
  let hit = __countryPoints?.find(p => {
    const a = (p.name || '').replace(/,/g,'').trim().toLowerCase();
    const b = name.replace(/,/g,'').trim().toLowerCase();
    return a === b;
  });
  if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
    const target = [hit.lat, hit.lng];
    map.setView(target, fallbackZoom, { animate:true });
    if (currentRegionMarker){
      try { markerLayer.removeLayer(currentRegionMarker); } catch(_){}
    }
    currentRegionMarker = L.marker(target, { icon: makeSvgPinIcon(pinSearch) }).addTo(markerLayer);
  }
}

// ---------------------------- 유틸리티 ----------------------------
function loadCssOnce(href){
  return new Promise((res, rej)=>{
    if (document.querySelector(`link[href="${href}"]`)) return res();
    const l = document.createElement('link');
    l.rel='stylesheet'; l.href=href; l.onload=res; l.onerror=rej; document.head.appendChild(l);
  });
}
function loadJsOnce(src){
  return new Promise((res, rej)=>{
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
}
function sortKoAZ(arr){
  return (arr||[]).slice().filter(Boolean).sort((a,b)=> String(a).localeCompare(String(b),'ko',{sensitivity:'base'}));
}
function getCountry(){ return document.querySelector('#countryCombo input')?.value?.trim() || ''; }
function getRegion(){ return document.querySelector('#regionCombo input')?.value?.trim() || ''; }
function setRegion(v){
  const combo = document.querySelector('#regionCombo input');
  if (combo){
    combo.value = v;
    combo.dispatchEvent(new Event('input',{bubbles:true}));
    combo.dispatchEvent(new Event('change',{bubbles:true}));
  }
  zoomToRegion(v, { fallbackZoom: 12 });
}
function setComboLoadingFor(id, on){
  const root = document.getElementById(id);
  if (root) root.classList.toggle('is-loading', !!on);
}

function enhanceTypeAhead(id, baseItems){
  const root  = document.getElementById(id);
  const input = root?.querySelector('input');
  if (!root || !input) return;
  const list  = root.querySelector('.list');
  if (!list) return;

  const setItems = (arr)=>{
    list.innerHTML = (arr||[]).map(v=>`<div class="item hover-dim" data-v="${v}">${v}</div>`).join('');
    list.querySelectorAll('.item').forEach(it=>{
      it.addEventListener('click', ()=>{
        input.value = it.getAttribute('data-v') || '';
        list.style.display = 'none';
        input.dispatchEvent(new Event('change',{bubbles:true}));
      });
    });
  };

  const baseSorted = sortKoAZ(baseItems);
  setItems(baseSorted);
  input.addEventListener('focus', ()=>{ list.style.display='block'; });
  input.addEventListener('input', ()=>{
    list.style.display='block';
    const q = String(input.value||'').trim().toLowerCase();
    if (!q){ setItems(baseSorted); return; }
    const matched = baseSorted.filter(v => String(v).toLowerCase().includes(q));
    setItems(matched);
  });
  document.addEventListener('pointerdown',(e)=>{ if (!root.contains(e.target)) list.style.display='none'; });
}

// 검색창 활성화/비활성화 상태 업데이트 함수
function updateGeocoderState() {
  if (!geocoder) return;
  const container = geocoder.getContainer();
  if (!container) return;
  
  const country = getCountry();
  const input = container.querySelector('input');

  if (country) {
    container.classList.remove('is-disabled');
    if (input) input.disabled = false;
  } else {
    container.classList.add('is-disabled');
    if (input) input.disabled = true;
  }
}

// ---------------------------- 데이터 로딩 ----------------------------
let __mapData = null;
async function loadMapJson() {
  if (__mapData) return __mapData;
  try {
    const r = await fetch('./map.json', { cache: 'no-store' });
    __mapData = await r.json();
    return __mapData;
  } catch (e) {
    __mapData = {};
    return {};
  }
}

async function loadCountries(){
  const root = document.getElementById('countryCombo');
  const input = root?.querySelector('input');
  setComboLoadingFor('countryCombo', true);
  try{
    const data = await loadMapJson(); 
    const countries = sortKoAZ(Object.keys(data) || []);
    enhanceTypeAhead('countryCombo', countries);
    if (input) input.disabled = false;
  } finally{
    setComboLoadingFor('countryCombo', false);
  }
}

async function loadRegions(){
  const root = document.getElementById('regionCombo');
  const input = root?.querySelector('input');
  const country = getCountry();
  if (!country || !input) return;
  try{
    const data = await loadMapJson();
    const regions = sortKoAZ((data[country] || []).map(c => c.name));
    enhanceTypeAhead('regionCombo', regions);
    input.disabled = false;
  } finally {
    setComboLoadingFor('regionCombo', false);
  }
}

// ---------------------------- 셸 및 UI 제어 ----------------------------
function collapseShell(){
  return new Promise((resolve)=>{
    const shell = document.querySelector('.app-shell');
    if (!shell || __shellState === SHELL_STATES.COLLAPSED) return resolve();
    __shellState = SHELL_STATES.COLLAPSING;
    shell.style.maxHeight = shell.scrollHeight + 'px';
    requestAnimationFrame(()=>{
      shell.classList.add('is-collapsing');
      shell.style.maxHeight = '0px';
    });
    const onEnd = (e)=>{
      if (e.propertyName !== 'max-height') return;
      shell.removeEventListener('transitionend', onEnd);
      shell.classList.replace('is-collapsing', 'is-collapsed');
      shell.style.display = 'none';
      __shellState = SHELL_STATES.COLLAPSED;
      __justCollapsedAt = performance.now();
      resolve();
    };
    shell.addEventListener('transitionend', onEnd);
  });
}

function expandShell(){
  return new Promise((resolve)=>{
    const shell = document.querySelector('.app-shell');
    if (!shell || !__allowExpand || __shellState !== SHELL_STATES.COLLAPSED) return resolve();
    __shellState = SHELL_STATES.EXPANDING;
    shell.style.display = 'block';
    shell.style.maxHeight = '0px';
    requestAnimationFrame(()=>{
      shell.classList.add('is-expanding');
      shell.style.maxHeight = shell.scrollHeight + 'px';
    });
    const onEnd = (e)=>{
      if (e.propertyName !== 'max-height') return;
      shell.removeEventListener('transitionend', onEnd);
      shell.classList.remove('is-expanding', 'is-collapsed');
      shell.style.maxHeight = '';
      __shellState = SHELL_STATES.OPEN;
      __allowExpand = false;
      resolve();
    };
    shell.addEventListener('transitionend', onEnd);
  });
}

function initCbmCombos() {
  const cbmData = Array.from({length: 68}, (_, i) => (i + 1) + " CBM");
  const setupCbm = (wrapperId) => {
    const root = document.getElementById(wrapperId);
    const input = root?.querySelector('input');
    const list = root?.querySelector('.list');
    if (!input || !list) return;

    const render = (items) => {
      list.innerHTML = items.length ? items.map(v => `<div class="item" data-v="${v}">${v}</div>`).join('') : '<div class="item" style="color:#aaa;">결과 없음</div>';
      list.querySelectorAll('.item').forEach(it => {
        it.addEventListener('click', () => { input.value = it.getAttribute('data-v'); list.style.display = 'none'; });
      });
    };
    render(cbmData);
    input.addEventListener('focus', () => { list.style.display = 'block'; });
    input.addEventListener('input', () => { render(cbmData.filter(v => v.toLowerCase().includes(input.value.trim().toLowerCase()))); });
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) list.style.display = 'none'; });
  };
  setupCbm('cbmCombo_Wrapper'); setupCbm('cbmCombo2_Wrapper');
}

// ---------------------------- 이벤트 바인딩 ----------------------------
function wireEvents(){
  // ✨ 에러를 유발하던 btnCheck 로직 깔끔하게 삭제됨!

  // 국가/지역 변경
  document.querySelector('#countryCombo input')?.addEventListener('change', async ()=>{
    await loadRegions();
    const c = getCountry(); if (c) setMapCountry(c);
    updateGeocoderState(); 
  });
  
  document.querySelector('#regionCombo input')?.addEventListener('change', ()=>{
    const region = getRegion(); if (region) zoomToRegion(region, { fallbackZoom: 12 });
  });
}

// ---------------------------- 초기화 ----------------------------
window.collapseShell = collapseShell; 

// 플로팅 버튼(Floating_1_back.js)에서 사용할 수 있도록 지도 펼치기 기능을 전역 노출
window.expandShellUI = function() {
  __allowExpand = true;
  return expandShell();
};

async function loadSingleResultComponent() {
  try {
    const response = await fetch('../2_result/single/index.html'); 
    if (!response.ok) throw new Error('단일조회 컴포넌트 로드 실패');
    const html = await response.text();
    const placeholder = document.getElementById('single-result-placeholder');
    if (placeholder) placeholder.innerHTML = html;
  } catch (err) {
    console.error('단일조회 HTML 로드 에러:', err);
  }
}

async function loadCompareResultComponent() {
  try {
    const response = await fetch('../2_result/compare/index.html'); 
    if (!response.ok) throw new Error('비교조회 컴포넌트 로드 실패');
    
    const html = await response.text();
    const placeholder = document.getElementById('compare-result-placeholder');
    if (placeholder) placeholder.innerHTML = html;
  } catch (err) {
    console.error('비교조회 HTML 로드 에러:', err);
  }
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await loadSingleResultComponent();
  await loadCompareResultComponent();
  try { await initAlwaysOnMap(); } catch(e){}
  await loadCountries();
  initCbmCombos();
  wireEvents();
  
  window.CostUI?.one?.init();
  
  const initialCountry = getCountry();
  if (initialCountry) setMapCountry(initialCountry);

});