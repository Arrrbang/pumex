(() => {
  'use strict';
  let map, markers, current, searchMarker, geocoder, points = [], country = null;
  const status = document.getElementById('mapStatus');
  function pin(color) {
    const svg = `<svg class="pin-svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="${color}" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5a2.5 2.5 0 0 1 0 5z"/></svg>`;
    return L.divIcon({ className: '', html: `<div class="pin-wrap">${svg}</div>`, iconSize:[26,26], iconAnchor:[13,26] });
  }
  function select(id) { document.dispatchEvent(new CustomEvent('dest-rate:map-select', { detail: { id } })); }
  function searchState() {
    if (!geocoder) return;
    const root = geocoder.getContainer(), input = root.querySelector('input');
    root.classList.toggle('is-disabled', !country || !points.length);
    if (input) { input.disabled = !country || !points.length; input.placeholder = country ? '주소 또는 지역 검색' : '국가 선택 후 지역 검색 가능'; }
  }
  function clear() {
    markers?.clearLayers();
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = null; current = null; points = []; country = null; searchState();
    if (map) map.setView([20,0],map.getMinZoom());
  }
  function setRegions(selectedCountry, regions) {
    clear(); country = selectedCountry;
    points = regions.filter(r => r.hasCoordinates && Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (!map) return;
    const bounds = [];
    points.forEach(p => {
      const marker = L.marker([p.lat,p.lng], { icon: pin('#2563eb') }).addTo(markers);
      const label = document.createElement('span'); label.textContent = p.name;
      marker.bindTooltip(label); marker.on('click', () => select(p.id)); bounds.push([p.lat,p.lng]);
    });
    if (bounds.length) map.fitBounds(bounds,{ padding:[20,20], maxZoom:12 });
    searchState();
  }
  function focusRegion(region) {
    if (!map) return;
    if (current) markers.removeLayer(current);
    current = null;
    if (!region?.hasCoordinates) return;
    map.setView([region.lat,region.lng],12,{ animate:true });
    current = L.marker([region.lat,region.lng],{ icon:pin('#ef4444') }).addTo(markers);
    current.on('click', () => select(region.id));
  }
  window.DestRateMap = { clear, setRegions, focusRegion };
  try {
    if (!window.L) throw new Error('지도를 불러오지 못했습니다. 인터넷 연결 후 새로고침해 주세요.');
    const world = L.latLngBounds([[-85,-180],[85,180]]);
    map = L.map('mpkMap',{ center:[20,0],zoom:2,worldCopyJump:false,maxBounds:world,maxBoundsViscosity:1 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'&copy; OpenStreetMap contributors',noWrap:true,bounds:world }).addTo(map);
    markers = L.layerGroup().addTo(map);
    const resize = () => { map.invalidateSize(); map.setMinZoom(map.getBoundsZoom(world,true)); };
    requestAnimationFrame(resize); window.addEventListener('resize',resize);
    if (L.Control.geocoder) {
      geocoder = L.Control.geocoder({ defaultMarkGeocode:false,collapsed:false,position:'topleft',placeholder:'국가 선택 후 지역 검색 가능',errorMessage:'결과를 찾을 수 없습니다.' })
        .on('markgeocode',e => {
          if (!country || !points.length) return;
          const c = e.geocode.center;
          if (searchMarker) map.removeLayer(searchMarker);
          searchMarker = L.marker(c,{ icon:pin('#ef4444') }).addTo(map);
          const rad = n => n*Math.PI/180;
          const distance = p => {
            const a = Math.sin(rad(p.lat-c.lat)/2)**2 + Math.cos(rad(c.lat))*Math.cos(rad(p.lat))*Math.sin(rad(p.lng-c.lng)/2)**2;
            return 2*6371*Math.asin(Math.sqrt(Math.min(1,a)));
          };
          const nearest = points.reduce((best,p) => !best || distance(p)<distance(best) ? p : best,null);
          if (nearest) select(nearest.id);
        }).addTo(map);
    } else status.textContent = '주소 검색을 불러오지 못했습니다. 지도 핀과 지역 선택은 사용 가능합니다.';
    searchState();
  } catch(e) { status.textContent = e.message; }
})();
