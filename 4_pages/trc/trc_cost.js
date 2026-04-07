/* ==========================================================================
   trc_cost.js
   카카오맵 주소 검색 및 라우팅, Notion API 연동 로직
   ========================================================================== */

const KAKAO_BACKEND_URL = "https://kakao-backend.vercel.app";    
const NOTION_BACKEND_URL = "https://notion-api-hub.vercel.app";  

// 카카오 맵 초기화
var mapContainer = document.getElementById('map');
var mapOption = { center: new kakao.maps.LatLng(36.5, 127.5), level: 13 };
var map = new kakao.maps.Map(mapContainer, mapOption);
var geocoder = new kakao.maps.services.Geocoder();

var polylines = [], flyingMarker = null, animationTimer = null, fixedMarkers = []; 

// 다음 우편번호 검색 API 실행 함수
function searchAddress(targetId) {
    new daum.Postcode({
        oncomplete: function(data) {
            var addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
            document.getElementById(targetId).value = addr;
        }
    }).open();
}

// 거리 계산 및 운임 조회 메인 로직
async function startProcess() {
    var startAddr = document.getElementById('startAddr').value;
    var endAddr = document.getElementById('endAddr').value;
    var resultDiv = document.querySelector('#result > div:first-child');
    var costArea = document.getElementById('costArea');

    costArea.style.display = 'none';

    if(!startAddr || !endAddr) return alert("주소를 모두 입력해주세요.");

    resultDiv.innerHTML = "데이터 조회 중...";

    try {
        // 1. 지도 관련 처리 (좌표 변환 및 애니메이션)
        var startCoords = await getCoords(startAddr);
        var endCoords = await getCoords(endAddr);
        
        var startLatLng = new kakao.maps.LatLng(startCoords.y, startCoords.x);
        var endLatLng = new kakao.maps.LatLng(endCoords.y, endCoords.x);

        displayMarkers(startLatLng, endLatLng, false); 
        animateMarker(startLatLng, endLatLng);

        // 2. [KAKAO 백엔드] 거리 계산 요청
        const routeData = await getRouteData(startCoords, endCoords);
        
        const distanceMeters = routeData.routes[0].summary.distance;
        const distanceKm = distanceMeters / 1000;
        const durationMin = (routeData.routes[0].summary.duration / 60).toFixed(0);

        // 3. 반올림 (Notion 검색용)
        const roundedDistance = Math.round(distanceKm);

        // 4. [NOTION 백엔드] 운임 조회 요청
        const costData = await getTruckingCost(roundedDistance);

        // 5. 결과 출력
        let costHtml = "";
        if (costData.found) {
            document.getElementById('cost20').innerText = Number(costData.data.cost20).toLocaleString() + "원";
            document.getElementById('cost40').innerText = Number(costData.data.cost40).toLocaleString() + "원";
            costArea.style.display = 'block';
        } else {
            costHtml = `<br><span style="color:var(--gray); font-size:0.85em; font-weight:normal;">(거리 ${roundedDistance}km에 해당하는 운임 정보가 DB에 없습니다)</span>`;
        }

        resultDiv.innerHTML = `
            총 거리: <span>${distanceKm.toFixed(1)}km</span> (약 ${durationMin}분)<br>
            적용 구간: <span>${roundedDistance}km</span> 기준
            ${costHtml}
        `;

    } catch (e) {
        console.error(e);
        resultDiv.innerHTML = "오류 발생: " + e.message;
    }
}

// 주소를 좌표로 변환
function getCoords(addr) {
    return new Promise((resolve, reject) => {
        geocoder.addressSearch(addr, (res, status) => {
            status === kakao.maps.services.Status.OK ? resolve(res[0]) : reject(new Error("주소 없음"));
        });
    });
}

// 거리 계산 백엔드 통신
async function getRouteData(start, end) {
    const startParam = `${start.x},${start.y}`;
    const endParam = `${end.x},${end.y}`;
    const url = `${KAKAO_BACKEND_URL}/api/distance?start=${startParam}&end=${endParam}`;

    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error("거리 계산 서버 오류");
    return await response.json();
}

// 운임 조회 백엔드 통신
async function getTruckingCost(distance) {
    const url = `${NOTION_BACKEND_URL}/api/trc/cal?distance=${distance}`;
    
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error("운임 조회 서버 오류");
    return await response.json();
}

// --- 지도 UI 및 애니메이션 ---
function displayMarkers(start, end, showEndMarker = true) {
    fixedMarkers.forEach(m => m.setMap(null)); fixedMarkers = [];
    var bounds = new kakao.maps.LatLngBounds();
    bounds.extend(start); bounds.extend(end);
    map.setBounds(bounds);
    var startMarker = new kakao.maps.Marker({ position: start, map: map, title: '출발' });
    fixedMarkers.push(startMarker);
    if (showEndMarker) {
        var endMarker = new kakao.maps.Marker({ position: end, map: map, title: '도착' });
        fixedMarkers.push(endMarker);
    }
}

function animateMarker(start, end) {
    if (animationTimer) clearInterval(animationTimer);
    polylines.forEach(p => p.setMap(null)); polylines = [];
    if (flyingMarker) flyingMarker.setMap(null);
    var frames = 60; 
    var pathData = calculateBezierPath(start, end, frames);
    var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png"; 
    var imageSize = new kakao.maps.Size(30, 40); 
    var imageOption = {offset: new kakao.maps.Point(15, 40)}; 
    var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
    flyingMarker = new kakao.maps.Marker({ position: start, map: map, image: markerImage, zIndex: 10 });
    var currentFrame = 0;
    animationTimer = setInterval(() => {
        if (currentFrame >= pathData.length - 1) { clearInterval(animationTimer); return; }
        var currPos = pathData[currentFrame];
        var nextPos = pathData[currentFrame + 1];
        var t = currentFrame / frames; 
        var currentWeight = 2 + (14 * Math.sin(t * Math.PI)); 
        var segment = new kakao.maps.Polyline({
            // 경로 색상은 테마와 어울리는 Forest Green 유지!
            path: [currPos, nextPos], strokeWeight: currentWeight, strokeColor: '#1F9461', strokeOpacity: 0.8, strokeStyle: 'solid'
        });
        segment.setMap(map); polylines.push(segment);
        flyingMarker.setPosition(nextPos);
        currentFrame++;
    }, 20);
}

function calculateBezierPath(start, end, count) {
    var path = [];
    var latDiff = Math.abs(start.getLat() - end.getLat());
    var lngDiff = Math.abs(start.getLng() - end.getLng());
    var offset = (latDiff + lngDiff) * 0.3;
    var control = new kakao.maps.LatLng((start.getLat() + end.getLat()) / 2 + offset, (start.getLng() + end.getLng()) / 2);
    for (var i = 0; i <= count; i++) {
        var t = i / count;
        var x = (1 - t) * (1 - t) * start.getLng() + 2 * (1 - t) * t * control.getLng() + t * t * end.getLng();
        var y = (1 - t) * (1 - t) * start.getLat() + 2 * (1 - t) * t * control.getLat() + t * t * end.getLat();
        path.push(new kakao.maps.LatLng(y, x));
    }
    return path;
}