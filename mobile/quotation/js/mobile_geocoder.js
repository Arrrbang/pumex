/* ./js/mobile_geocoder.js */
'use strict';

// 💡 PC 버전(search.js)의 팝업 함수를 모바일 환경에서만 덮어쓰기(Override) 합니다.
// 원본 search.js 수정 없이, 모바일 전용 HTML 경로와 UI를 적용합니다.
window.openNearestMapModal = async function(typedValue, selectEl, inputEl) {
    
    // search.js에 있는 전역 변수(__currentCountryPoints)를 그대로 가져다 씁니다.
    if (!__currentCountryPoints || !__currentCountryPoints.length) {
        alert('선택된 국가의 지도 데이터가 없습니다.');
        return;
    }

    // search.js에 있는 라이브러리 로드 함수 재활용
    await loadLeafletAssets();

    // 이전에 열린 모달이 있다면 제거
    let existingModal = document.getElementById('nearestMapModalOverlay');
    if (existingModal) existingModal.remove();

    let modalOverlay = null;

    try {
        // 💡 [핵심] PC 경로가 아닌, '모바일 HTML이 있는 위치 기준'으로 팝업을 불러옵니다.
        const response = await fetch('/pumex/mobile/quotation/geocoder_popup/geocoder_popup.html');
        if (!response.ok) throw new Error('Network response was not ok');
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        modalOverlay = doc.getElementById('nearestMapModalOverlay');
        document.body.appendChild(modalOverlay);
    } catch (error) {
        console.error('팝업 HTML을 불러오는데 실패했습니다:', error);
        alert('지도 팝업을 열 수 없습니다. (폴더 위치 확인)');
        return;
    }

    const map = L.map('popupMapContainer', { zoomControl: false }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    
    // 모바일은 우측 하단이 줌 컨트롤 터치하기 편함
    L.control.zoom({ position: 'bottomright' }).addTo(map);

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

        // search.js에 있는 거리 계산 함수(findNearest) 재활용
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

            descTxt.innerHTML = `✅ 매칭 지역:<br><b style="color:#e74c3c; font-size:1.1rem;">${selectedTargetPoint.name}</b> <span style="font-size:0.85rem; color:#666;">(약 ${nearestResult.distanceKm.toFixed(1)}km)</span>`;
            confirmBtn.disabled = false;
        }
    };

    map.on('click', (e) => {
        handleMapSelect(e.latlng.lat, e.latlng.lng, '터치한 위치');
    });

    if (L.Control.Geocoder) {
        L.Control.geocoder({
            defaultMarkGeocode: false,
            position: 'topleft',
            collapsed: false, // 모바일에서는 검색창이 바로 보이는 것이 편합니다.
            placeholder: '영문 지역 검색'
        }).on('markgeocode', function(e) {
            const center = e.geocode.center;
            const name = e.geocode.name || '검색된 위치';
            map.setView(center, 10);
            handleMapSelect(center.lat, center.lng, name);
        }).addTo(map);
    }

    const closeModal = () => modalOverlay.remove();
    document.getElementById('closeMapModal').addEventListener('click', closeModal);
    // 모바일 풀스크린이라 빈 공간이 적지만, 혹시 모를 배경 터치 닫기 지원
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    confirmBtn.addEventListener('click', () => {
        if (selectedTargetPoint) {
            inputEl.value = selectedTargetPoint.name;
            selectEl.value = selectedTargetPoint.name;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            closeModal();
        }
    });

    setTimeout(() => { map.invalidateSize(); }, 300);
};