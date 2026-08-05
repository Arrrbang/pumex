/* search.js */
'use strict';

let __mapData = null;
let __currentCountryPoints = []; // 현재 선택된 국가의 위경도 데이터 보관용

// ---------------------------- 위경도 계산 유틸 (main.js 참고) ----------------------------
function haversineKm(aLat, aLng, bLat, bLng) {
    const R = 6371, dLat = (bLat - aLat) * Math.PI / 180, dLng = (bLng - aLng) * Math.PI / 180;
    const A = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(A));
}

function findNearest(lat, lng, pts) {
    if (!pts?.length) return null;
    let best = null, bd = Infinity;
    for (const p of pts) {
        const d = haversineKm(lat, lng, p.lat, p.lng);
        if (d < bd) { best = p; bd = d; }
    }
    return { point: best, distanceKm: bd };
}

// 1. map.json 데이터 비동기 로드 (국가/지역용)
async function loadMapJson() {
    if (__mapData) return __mapData;
    try {
        const r = await fetch('/pumex/4_pages/destinationcost/1_search/map.json', { cache: 'no-store' }).catch(() => {
            return fetch('../../1_assets/map.json', { cache: 'no-store' });
        });
        __mapData = await r.json();
        return __mapData;
    } catch (e) {
        console.warn('map.json 로드 실패:', e);
        __mapData = {};
        return {};
    }
}

// 2. 검색 가능한 콤보박스 구현 (모바일 연필 아이콘 적용 버전)
function makeSelectSearchable(selectId, items, onSelect) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    selectEl.style.display = 'none';
    const parent = selectEl.parentNode;

    let wrapper = parent.querySelector(`[data-searchable-for="${selectId}"]`);
    if (wrapper) wrapper.remove();

    wrapper = document.createElement('div');
    wrapper.className = 'searchable-select-wrapper';
    wrapper.setAttribute('data-searchable-for', selectId);
    wrapper.style.position = 'relative';

    // 💡 [추가] 텍스트 입력창 왼쪽 연필 아이콘 생성
    const editIcon = document.createElement('i');
    editIcon.className = 'fa-solid fa-pen';
    editIcon.style.cssText = 'position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#159b64; font-size:0.9rem; cursor:pointer; z-index:10; padding:5px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `${selectId}_search_input`;
    input.placeholder = ''; // 기본 문구 삭제
    input.className = selectEl.className;
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.paddingLeft = '35px'; // 💡 연필 아이콘과 글자가 겹치지 않게 여백 추가

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('readonly', 'true'); // 기본적으로 터치 시 자판 안 올라오게 막기

    const listDiv = document.createElement('div');
    listDiv.className = 'searchable-list';
    listDiv.style.cssText = 'position:absolute; top:100%; left:0; right:0; max-height:220px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; z-index:1000; display:none; box-shadow:0 4px 6px rgba(0,0,0,0.1);';

    wrapper.appendChild(editIcon);
    wrapper.appendChild(input);
    wrapper.appendChild(listDiv);
    parent.appendChild(wrapper);

    // 💡 [핵심] 연필 아이콘 클릭 시에만 잠금을 풀고 키보드 올리기
    editIcon.addEventListener('click', (e) => {
        e.stopPropagation(); 
        input.removeAttribute('readonly'); // 잠금 해제
        input.focus(); // 커서를 활성화하여 자판 띄우기
    });

    const renderList = (filterText = '') => {
        listDiv.innerHTML = '';
        
        const query = filterText.toLowerCase();
        const sortedItems = [...items].sort((a, b) => {
            const textA = (typeof a === 'object' ? (a.text || a.name) : a).toLowerCase();
            const textB = (typeof b === 'object' ? (b.text || b.name) : b).toLowerCase();
            const matchA = textA.includes(query) ? 0 : 1;
            const matchB = textB.includes(query) ? 0 : 1;
            return matchA - matchB;
        });

        // 💡 [최종 방어막] '선택'이라는 단어가 들어가거나 값이 비어있으면 목록에 절대 추가하지 않음
        const filtered = sortedItems.filter(item => {
            const text = (typeof item === 'object' ? (item.text || item.name) : item).toLowerCase();
            const val = typeof item === 'object' ? (item.value || item.name) : item;
            
            if (!val) return false;
            if (text.includes('선택') || text.includes('먼저')) return false; // '선택하세요', '먼저 선택하세요' 완벽 차단
            
            if (!query) return true;
            return text.includes(query);
        });

        filtered.forEach(item => {
            const val = typeof item === 'object' ? (item.value || item.name) : item;
            const text = typeof item === 'object' ? (item.text || item.name) : item;

            const div = document.createElement('div');
            div.className = 'searchable-item';
            div.textContent = text;
            div.style.cssText = 'padding:10px; cursor:pointer; font-size:14px; border-bottom:1px solid #f1f1f1; color:#333; background:#fff;';

            div.addEventListener('mouseenter', () => div.style.backgroundColor = '#f8f9fa');
            div.addEventListener('mouseleave', () => div.style.backgroundColor = '#fff');

            div.addEventListener('click', () => {
                input.value = text;
                selectEl.value = val;
                listDiv.style.display = 'none';
                input.setAttribute('readonly', 'true');
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof onSelect === 'function') onSelect(val);
            });
            listDiv.appendChild(div);
        });


        if (selectId === 'region' && __currentCountryPoints.length > 0) {
            const nearBtn = document.createElement('div');
            nearBtn.className = 'searchable-item-nearest';
            nearBtn.textContent = '🗺️ [가까운 지역으로 설정]';
            nearBtn.style.cssText = 'padding:12px; cursor:pointer; font-size:14px; font-weight:bold; color:#2980b9; background:#ebf5fb; border-top:2px solid #3498db; text-align:center; position:sticky; bottom:0;';
            
            nearBtn.addEventListener('mouseenter', () => nearBtn.style.backgroundColor = '#d4e6f1');
            nearBtn.addEventListener('mouseleave', () => nearBtn.style.backgroundColor = '#ebf5fb');

            nearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                listDiv.style.display = 'none';
                openNearestMapModal(input.value, selectEl, input);
            });
            listDiv.appendChild(nearBtn);
        }

        listDiv.style.display = 'block';
    };

    input.addEventListener('focus', () => renderList(''));
    input.addEventListener('input', () => renderList(input.value));
    
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            listDiv.style.display = 'none';
            input.setAttribute('readonly', 'true'); // 💡 바깥을 클릭해서 닫힐 때도 다시 잠금
        }
    });
}

// ---------------------------- 3. Leaflet 지도 팝업 모달 구현 ----------------------------
async function loadLeafletAssets() {
    if (window.L) return;
    const cssUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    const jsUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    const geoCss = "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css";
    const geoJs = "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js";

    const loadCss = (href) => new Promise(res => {
        if (document.querySelector(`link[href="${href}"]`)) return res();
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; document.head.appendChild(l);
    });
    const loadJs = (src) => new Promise(res => {
        if (document.querySelector(`script[src="${src}"]`)) return res();
        const s = document.createElement('script'); s.src = src; s.onload = res; document.head.appendChild(s);
    });

    await loadCss(cssUrl);
    await loadJs(jsUrl);
    await loadCss(geoCss);
    await loadJs(geoJs);
}

async function openNearestMapModal(typedValue, selectEl, inputEl) {
    if (!__currentCountryPoints.length) {
        alert('선택된 국가의 지도 데이터가 없습니다.');
        return;
    }

    await loadLeafletAssets();

    // 이전에 열린 모달이 있다면 제거
    let existingModal = document.getElementById('nearestMapModalOverlay');
    if (existingModal) existingModal.remove();

    let modalOverlay = null;

    // 💡 분리된 HTML 파일을 비동기로 불러와서 주입
    try {
        const response = await fetch('./geocoder_popup/geocoder_popup.html');
        if (!response.ok) throw new Error('Network response was not ok');
        const htmlText = await response.text();
        
        // 텍스트를 DOM 객체로 변환
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        modalOverlay = doc.getElementById('nearestMapModalOverlay');
        document.body.appendChild(modalOverlay);
    } catch (error) {
        console.error('팝업 HTML을 불러오는데 실패했습니다:', error);
        alert('지도 팝업을 열 수 없습니다. (HTML 파일 누락)');
        return;
    }

    const map = L.map('popupMapContainer', { zoomControl: false }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    let selectedTargetPoint = null;
    let searchMarker = null; 
    let nearestMarker = null; 
    const markerGroup = L.layerGroup().addTo(map);

    const confirmBtn = document.getElementById('confirmNearestBtn');
    const descTxt = document.getElementById('mapModalDescTxt');

    __currentCountryPoints.forEach(p => {
        L.circleMarker([p.lat, p.lng], { radius: 5, color: '#34495e', fillOpacity: 0.6 })
          .bindPopup(`<b>${p.name}</b>`)
          .addTo(markerGroup);
    });

    let baseLat = __currentCountryPoints[0].lat;
    let baseLng = __currentCountryPoints[0].lng;
    
    const query = typedValue.trim().toLowerCase();
    if (query) {
        const matched = __currentCountryPoints.find(p => p.name.toLowerCase().includes(query));
        if (matched) {
            baseLat = matched.lat;
            baseLng = matched.lng;
        }
    }
    map.setView([baseLat, baseLng], 8);

    const handleMapSelect = (lat, lng, labelName = '선택한 위치') => {
        markerGroup.clearLayers();

        searchMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-pin',
                html: '<div style="background:#3498db; width:16px; height:16px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(map).bindPopup(labelName).openPopup();

        const nearestResult = findNearest(lat, lng, __currentCountryPoints);
        if (nearestResult && nearestResult.point) {
            selectedTargetPoint = nearestResult.point;

            nearestMarker = L.marker([selectedTargetPoint.lat, selectedTargetPoint.lng], {
                icon: L.divIcon({
                    className: 'custom-pin',
                    html: '<div style="background:#e74c3c; width:22px; height:22px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                })
            }).addTo(map).bindPopup(`<b>가장 가까운 추천 지역: ${selectedTargetPoint.name}</b><br>직선거리: ${nearestResult.distanceKm.toFixed(1)}km`).openPopup();

            descTxt.innerHTML = `✅ 선택 위치와 가장 가까운 지역: <b style="color:#e74c3c;">${selectedTargetPoint.name}</b> (직선거리: ${nearestResult.distanceKm.toFixed(1)}km)`;
            confirmBtn.disabled = false;
        }
    };

    map.on('click', (e) => {
        handleMapSelect(e.latlng.lat, e.latlng.lng, '클릭한 위치');
    });

    if (L.Control.Geocoder) {
        L.Control.geocoder({
            defaultMarkGeocode: false,
            position: 'topleft',
            collapsed: false,
            placeholder: '도착 지역 검색'
        }).on('markgeocode', function(e) {
            const center = e.geocode.center;
            const name = e.geocode.name || '검색된 위치';
            map.setView(center, 10);
            handleMapSelect(center.lat, center.lng, name);
        }).addTo(map);
    }

    const closeModal = () => modalOverlay.remove();
    document.getElementById('closeMapModal').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    confirmBtn.addEventListener('click', () => {
        if (selectedTargetPoint) {
            inputEl.value = selectedTargetPoint.name;
            selectEl.value = selectedTargetPoint.name;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`[지도 팝업 선택 완료] ${selectedTargetPoint.name} (위도: ${selectedTargetPoint.lat}, 경도: ${selectedTargetPoint.lng})`);
            closeModal();
        }
    });

    setTimeout(() => { map.invalidateSize(); }, 200);
}

// 4. 국가 목록 채우기
async function loadCountries() {
    try {
        const data = await loadMapJson();
        const countries = Object.keys(data || {}).sort((a, b) => a.localeCompare(b, 'ko'));
        
        const selectEl = document.getElementById('country');
        if (selectEl) {
            selectEl.innerHTML = '<option value=""></option>';
            countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                selectEl.appendChild(opt);
            });
        }

        makeSelectSearchable('country', countries, async (selectedCountry) => {
            await loadRegions(selectedCountry);
        });
    } catch (e) {
        console.warn('국가 목록 로드 오류:', e);
    }
}

// 5. 지역 목록 채우기
async function loadRegions(selectedCountry) {
    const regionSelect = document.getElementById('region');
    if (!regionSelect) return;

    regionSelect.innerHTML = '<option value="">지역을 먼저 선택하세요</option>';
    const regionWrapper = document.querySelector('[data-searchable-for="region"]');
    if (regionWrapper) regionWrapper.remove();
    regionSelect.style.display = 'block';

    if (!selectedCountry) return;

    try {
        const data = await loadMapJson();
        __currentCountryPoints = data[selectedCountry] || [];

        const regions = __currentCountryPoints
            .map(r => r.name)
            .sort((a, b) => a.localeCompare(b, 'ko'));

        regionSelect.innerHTML = '<option value=""></option>';
        __currentCountryPoints.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.name;
            opt.textContent = r.name;
            regionSelect.appendChild(opt);
        });

        makeSelectSearchable('region', regions);
    } catch (e) {
        console.warn('지역 목록 로드 오류:', e);
    }
}

// 6. 백엔드 연동 함수들 (파트너, 화물타입, POE, 컨테이너)
async function loadCompanies(country, region) {
    const partnerSelect = document.getElementById('partner');
    if (!partnerSelect) return;
    partnerSelect.innerHTML = '<option value=""></option>';
    partnerSelect.disabled = true;
    if (!country || !region) return;

    try {
        if (window.CostAPI && typeof window.CostAPI.fetchCompanies === 'function') {
            const companies = await window.CostAPI.fetchCompanies(country, region);
            populateSelectOptions('partner', companies);
            partnerSelect.disabled = !(Array.isArray(companies) && companies.length > 0);
        }
    } catch (e) {
        console.warn('파트너 목록 조회 실패:', e);
    }
}

async function loadCargoTypes(country, region, partner) {
    const cargoSelect = document.getElementById('cargoType');
    if (!cargoSelect) return;
    cargoSelect.innerHTML = '<option value=""></option>';
    cargoSelect.disabled = true;
    if (!country || !partner) return;

    try {
        if (window.CostAPI && typeof window.CostAPI.fetchCargoTypes === 'function') {
            const cargoTypes = await window.CostAPI.fetchCargoTypes(country, region, partner);
            populateSelectOptions('cargoType', cargoTypes);
            cargoSelect.disabled = !(Array.isArray(cargoTypes) && cargoTypes.length > 0);
        }
    } catch (e) {
        console.warn('화물 타입 조회 실패:', e);
    }
}

async function loadPOEs(country, region, partner, cargo) {
    const poeSelect = document.getElementById('poe');
    if (!poeSelect) return;
    poeSelect.innerHTML = '<option value=""></option>';
    poeSelect.disabled = true;
    if (!country || !region || !partner || !cargo) return;

    try {
        if (window.CostAPI && typeof window.CostAPI.fetchPOEs === 'function') {
            const poes = await window.CostAPI.fetchPOEs(country, region, partner, cargo);
            populateSelectOptions('poe', poes);
            poeSelect.disabled = !(Array.isArray(poes) && poes.length > 0);
        }
    } catch (e) {
        console.warn('POE 조회 실패:', e);
    }
}

async function loadContainerTypes(country, region, partner, poe, cargo) {
    const containerSelect = document.getElementById('containerType');
    if (!containerSelect) return;
    containerSelect.innerHTML = '<option value=""></option>';
    containerSelect.disabled = true;
    if (!country || !partner || !poe || !cargo) return;

    try {
        if (window.CostAPI && typeof window.CostAPI.fetchContainerTypes === 'function') {
            const containers = await window.CostAPI.fetchContainerTypes(country, region, partner, poe, cargo);
            populateSelectOptions('containerType', containers);
            containerSelect.disabled = !(Array.isArray(containers) && containers.length > 0);
        }
    } catch (e) {
        console.warn('컨테이너 타입 조회 실패:', e);
    }
}

function populateSelectOptions(elementId, items) {
    const selectEl = document.getElementById(elementId);
    if (!selectEl || !Array.isArray(items)) return;

    const defaultOptionHTML = selectEl.options[0] ? selectEl.options[0].outerHTML : '<option value="">선택하세요</option>';
    selectEl.innerHTML = defaultOptionHTML;

    items.forEach(item => {
        const opt = document.createElement('option');
        const val = typeof item === 'object' ? (item.value || item.name) : item;
        const text = typeof item === 'object' ? (item.text || item.name) : item;
        
        opt.value = val;
        opt.textContent = text;
        selectEl.appendChild(opt);
    });
}

// 7. CBM 선택 박스 초기화 (1 ~ 68 CBM)
function initCbmCombos() {
    const cbmSelect = document.getElementById('cbm');
    if (!cbmSelect) return;

    cbmSelect.innerHTML = '<option value="">CBM 선택</option>';
    for (let i = 1; i <= 68; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i + " CBM";
        cbmSelect.appendChild(opt);
    }
}

// 8. 이벤트 바인딩 및 체이닝 로직
function wireEvents() {
    const countrySelect = document.getElementById('country');
    const regionSelect = document.getElementById('region');
    const partnerSelect = document.getElementById('partner');
    const cargoSelect = document.getElementById('cargoType');
    const poeSelect = document.getElementById('poe');

    const resetFields = (level) => {
        if (level <= 1) { 
            regionSelect.innerHTML = '<option value="">지역을 먼저 선택하세요</option>'; 
            regionSelect.value = ''; 
            const rw = document.querySelector('[data-searchable-for="region"]');
            if(rw) rw.remove();
            regionSelect.style.display = 'block';
            __currentCountryPoints = [];
        }
        if (level <= 2) { partnerSelect.innerHTML = '<option value="">파트너를 먼저 선택하세요</option>'; partnerSelect.value = ''; partnerSelect.disabled = true; }
        if (level <= 3) { cargoSelect.innerHTML = '<option value="">화물 타입을 먼저 선택하세요</option>'; cargoSelect.value = ''; cargoSelect.disabled = true; }
        if (level <= 4) { poeSelect.innerHTML = '<option value="">POE를 먼저 선택하세요</option>'; poeSelect.value = ''; poeSelect.disabled = true; }
        if (level <= 5) { 
            const contSelect = document.getElementById('containerType');
            if(contSelect) { contSelect.innerHTML = '<option value="">컨테이너 타입을 선택하세요</option>'; contSelect.value = ''; contSelect.disabled = true; }
        }
    };

    countrySelect?.addEventListener('change', async (e) => {
        resetFields(1);
        await loadRegions(e.target.value);
    });

    regionSelect?.addEventListener('change', async (e) => {
        resetFields(2);
        const country = countrySelect.value;
        const region = e.target.value;
        if (country && region) {
            await loadCompanies(country, region);
        }
    });

    partnerSelect?.addEventListener('change', async (e) => {
        resetFields(3);
        const country = countrySelect.value;
        const region = regionSelect.value;
        const partner = e.target.value;
        if (country && partner) {
            await loadCargoTypes(country, region, partner);
        }
    });

    cargoSelect?.addEventListener('change', async (e) => {
        resetFields(4);
        const country = countrySelect.value;
        const region = regionSelect.value;
        const partner = partnerSelect.value;
        const cargo = e.target.value;
        if (country && partner && cargo) {
            await loadPOEs(country, region, partner, cargo);
        }
    });

    poeSelect?.addEventListener('change', async (e) => {
        resetFields(5);
        const country = countrySelect.value;
        const region = regionSelect.value;
        const partner = partnerSelect.value;
        const cargo = cargoSelect.value;
        const poe = e.target.value;
        if (country && partner && poe && cargo) {
            await loadContainerTypes(country, region, partner, poe, cargo);
        }
    });

    // 조회 버튼 클릭 시 (search.js 하단부 수정)
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const country = countrySelect?.value || '';
            const region = regionSelect?.value || '';
            const partner = partnerSelect?.value || '';
            const cargoType = cargoSelect?.value || '';
            const poe = poeSelect?.value || '';
            const containerType = document.getElementById('containerType')?.value || '20FT';
            const cbmVal = document.getElementById('cbm')?.value;
            const cbm = cbmVal ? parseFloat(cbmVal) : undefined;

            if (!country) { alert('나라를 선택해 주세요.'); return; }
            if (!partner) { alert('파트너를 선택해 주세요.'); return; }

            try {
                if (window.CostAPI && typeof window.CostAPI.fetchCosts === 'function') {
                    console.log('%c[Backend API Requesting...] 데이터 조회 중...', 'color: #3498db;');
                    
                    // API 데이터 요청
                    const responseData = await window.CostAPI.fetchCosts(country, region, partner, cargoType, containerType, cbm, poe);
                    
                    // 💡 새로 만든 페이지 이동 로직 함수 호출
                    if (typeof moveToQuotation === 'function') {
                        moveToQuotation(
                            { country, region, partner, cargoType, poe, containerType, cbm }, 
                            responseData
                        );
                    } else {
                        console.warn('moveToQuotation 함수가 정의되지 않았습니다.');
                    }
                } else {
                    console.warn('window.CostAPI.fetchCosts를 찾을 수 없습니다.');
                }
            } catch (e) {
                console.error('백엔드 데이터 요청 에러:', e);
                alert('데이터 조회 중 오류가 발생했습니다.');
            }
        });
    }
}

// 9. 초기화 실행
window.addEventListener('DOMContentLoaded', async () => {
    await loadCountries();
    initCbmCombos();
    wireEvents();
});