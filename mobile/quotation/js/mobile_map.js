/* ./js/mobile_map.js */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const btnOpenMap = document.getElementById('btn-open-mobile-map');
    const mapOverlay = document.getElementById('m-map-overlay');
    const mapClose = document.getElementById('m-map-close');
    const mapConfirm = document.getElementById('m-map-confirm');
    const mapDesc = document.getElementById('m-map-desc');
    const regionSelect = document.getElementById('region');

    let map = null;
    let marker = null;
    let selectedRegionName = '';

    // 지도 팝업 열기
    if (btnOpenMap) {
        btnOpenMap.addEventListener('click', () => {
            mapOverlay.style.display = 'flex';
            
            // 지도가 처음 열릴 때 한 번만 초기화
            if (!map) {
                initMobileMap();
            } else {
                // 이미 지도가 있다면 사이즈 재조정 (안 하면 깨짐 방지)
                setTimeout(() => map.invalidateSize(), 200);
            }
        });
    }

    // 지도 팝업 닫기
    if (mapClose) {
        mapClose.addEventListener('click', () => {
            mapOverlay.style.display = 'none';
        });
    }

    // 지역 확정 버튼 클릭
    if (mapConfirm) {
        mapConfirm.addEventListener('click', () => {
            if (!selectedRegionName) return;

            let matched = false;
            
            // 1. 드롭다운의 옵션들과 선택된 지역명 비교
            Array.from(regionSelect.options).forEach(opt => {
                const optText = opt.text.toLowerCase();
                const optVal = opt.value.toLowerCase();
                const searched = selectedRegionName.toLowerCase();

                // 포함 여부로 매칭 (예: "New York" 이 포함되어 있는지)
                if (optVal && (searched.includes(optVal) || searched.includes(optText) || optVal.includes(searched))) {
                    regionSelect.value = opt.value;
                    matched = true;
                }
            });

            // 2. 매칭된 게 없으면 강제로 옵션 만들어서 추가 (API 유연성 대응)
            if (!matched) {
                const newOpt = document.createElement('option');
                newOpt.value = selectedRegionName;
                newOpt.text = selectedRegionName;
                regionSelect.appendChild(newOpt);
                regionSelect.value = selectedRegionName;
            }

            // 3. 값이 변했음을 다른 스크립트(search.js)에 알림
            regionSelect.dispatchEvent(new Event('change'));

            // 4. 모달 닫기
            mapOverlay.style.display = 'none';
        });
    }

    // Leaflet 지도 렌더링 함수
    function initMobileMap() {
        // 기본 좌표 (예: 북미 쪽 혹은 한국)
        map = L.map('m-map-container', { zoomControl: false }).setView([37.5665, 126.9780], 3);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 줌 컨트롤 위치 조정 (모바일은 우측 하단이 편함)
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 검색창 (Geocoder) 추가
        const geocoder = L.Control.geocoder({
            defaultMarkGeocode: false,
            placeholder: "영문 도시명 검색 (예: New York)",
            position: 'topleft'
        }).addTo(map);

        // 검색 완료 이벤트
        geocoder.on('markgeocode', function(e) {
            const latlng = e.geocode.center;
            const placeName = e.geocode.name.split(',')[0].trim(); // 가장 앞의 도시명만 추출
            
            setMarkerAndData(latlng, placeName);
            map.fitBounds(e.geocode.bbox);
        });

        // 지도 터치/클릭 이벤트 (Reverse Geocoding)
        map.on('click', function(e) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=10&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.address) {
                        // 도시나 주(State) 이름 추출
                        const city = data.address.city || data.address.town || data.address.state || '알 수 없는 지역';
                        setMarkerAndData(e.latlng, city);
                    }
                })
                .catch(err => console.error(err));
        });
    }

    // 마커 찍고 하단 데이터 업데이트
    function setMarkerAndData(latlng, placeName) {
        if (marker) map.removeLayer(marker);
        marker = L.marker(latlng).addTo(map);
        
        selectedRegionName = placeName;
        mapDesc.innerHTML = `선택된 지역: <span style="color: #159b64; font-size: 1.1rem;">${placeName}</span>`;
        
        mapConfirm.disabled = false;
    }
});