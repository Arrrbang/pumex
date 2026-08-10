/* tablet_profit_margin.js */
'use strict';

const tabletTargetIds = ['q_origin_amount', 'q_freight_amount', 'q_destination_amount', 'q_destination_add_amount'];
let tabletMarginObserver;

function initTabletProfitMargin() {
    // 1. 톱니바퀴 클릭 이벤트 감지 (데스크탑/태블릿 헤더의 #m-header-gear-btn)
    document.addEventListener('click', (e) => {
        const gearBtn = e.target.closest('#m-header-gear-btn');
        if (gearBtn) {
            e.preventDefault();
            openTabletProfitMarginModal();
        }
    });

    // 2. 팝업 CSS 동적 추가
    if (!document.getElementById('pm-style-tag')) {
        const pmStyle = document.createElement('style');
        pmStyle.id = 'pm-style-tag';
        pmStyle.innerHTML = `
            .pm-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 10005; display: flex; justify-content: center; align-items: center; }
            .pm-box { background: #fff; width: 90%; max-width: 320px; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: 'Noto Sans KR', sans-serif; }
            .pm-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #159b64; padding-bottom: 12px; margin-bottom: 15px; }
            .pm-header h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #113c5f; }
            .pm-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888; }
            .pm-desc { font-size: 0.8rem; color: #555; margin-bottom: 15px; line-height: 1.4; text-align: center; }
            .pm-input-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; background: #f4f6f9; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px;}
            .pm-input-wrap input { width: 60px; border: none; background: transparent; font-size: 1.5rem; font-weight: 800; text-align: center; outline: none; color: #113c5f; }
            .pm-input-wrap input[type="number"]::-webkit-inner-spin-button, .pm-input-wrap input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            .pm-actions { display: flex; justify-content: stretch; gap: 10px; }
            .pm-btn { flex: 1; padding: 12px 0; border-radius: 6px; font-weight: 700; cursor: pointer; border: none; font-size: 0.95rem; }
            .pm-btn-cancel { background: #e2e8f0; color: #333; }
            .pm-btn-apply { background: #159b64; color: #fff; }
            .pm-highlight { color: #e74c3c !important; transition: color 0.3s; }
        `;
        document.head.appendChild(pmStyle);
    }

    // 3. 페이지 로드 시 세션 마진 적용
    setTimeout(async () => {
        let currentMargin = parseFloat(sessionStorage.getItem('profitMarginRate'));
        if (isNaN(currentMargin)) currentMargin = 0;
        applyTabletProfitMarginToAll(currentMargin);
    }, 200);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabletProfitMargin);
} else {
    initTabletProfitMargin();
}

// DB 저장 통신 함수
async function saveTabletProfitToDB(rate) {
    const userId = localStorage.getItem('username') || localStorage.getItem('userId');
    if (!userId) {
        alert('로그인 정보가 없어 기기에만 임시 저장됩니다.');
        return; 
    }
    
    try {
        const response = await fetch('https://notion-api-hub.vercel.app/api/sales-info/profit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pass_id: userId, profit: rate })
        });
        const result = await response.json();
        if (result.ok) {
            alert(`✅ 노션(직원DB)에 수익률 ${rate}%가 영구 저장되었습니다!`);
        } else {
            alert(`🚨 노션 저장 실패: ${result.error}`);
        }
    } catch(e) { 
        console.error('DB 저장 실패:', e);
    }
}

// 팝업 열기 (노션 최신값 동기화 포함)
async function openTabletProfitMarginModal() {
    let currentMargin = sessionStorage.getItem('profitMarginRate') || '0';

    const overlay = document.createElement('div');
    overlay.className = 'pm-overlay';
    overlay.innerHTML = `
        <div class="pm-box" onclick="event.stopPropagation()">
            <div class="pm-header">
                <h3>견적 수익 설정</h3>
                <button type="button" class="pm-close" id="pm-close-btn">&times;</button>
            </div>
            <div class="pm-desc">
                설정하신 마진(%)이 기본 비용에<br><b>자동으로 합산</b>되어 표시됩니다.
            </div>
            <div class="pm-input-wrap">
                <i class="fa-solid fa-arrow-trend-up" style="color: #159b64; font-size: 1.2rem;"></i>
                <input type="number" id="pm-rate-input" placeholder="0" value="${currentMargin}">
                <span style="font-weight: 800; color: #113c5f; font-size: 1.2rem;">%</span>
            </div>
            <div class="pm-actions">
                <button type="button" class="pm-btn pm-btn-cancel" id="pm-cancel-btn">0% 초기화</button>
                <button type="button" class="pm-btn pm-btn-apply" id="pm-apply-btn">수익 적용</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const closePopup = () => overlay.remove();
    document.getElementById('pm-close-btn').addEventListener('click', closePopup);
    overlay.addEventListener('click', closePopup);

    // 노션 최신값 다시 한 번 동기화
    const userId = localStorage.getItem('username') || localStorage.getItem('userId');
    if (userId) {
        try {
            const res = await fetch(`https://notion-api-hub.vercel.app/api/sales-info?pass_id=${userId}`);
            const json = await res.json();
            if (json.ok && json.data && json.data.profit !== undefined) {
                const latestProfit = json.data.profit;
                sessionStorage.setItem('profitMarginRate', latestProfit);
                const rateInput = document.getElementById('pm-rate-input');
                if (rateInput) rateInput.value = latestProfit;
            }
        } catch (e) {}
    }

    document.getElementById('pm-cancel-btn').addEventListener('click', () => {
        sessionStorage.setItem('profitMarginRate', 0);
        applyTabletProfitMarginToAll(0);
        saveTabletProfitToDB(0); 
        closePopup();
    });

    document.getElementById('pm-apply-btn').addEventListener('click', () => {
        const rate = parseFloat(document.getElementById('pm-rate-input').value) || 0;
        sessionStorage.setItem('profitMarginRate', rate);
        applyTabletProfitMarginToAll(rate);
        saveTabletProfitToDB(rate); 
        closePopup();
    });
}

// 자동 마진 적용 및 옵저버 로직
tabletMarginObserver = new MutationObserver((mutations) => {
    const currentRate = parseFloat(sessionStorage.getItem('profitMarginRate')) || 0;
    
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const el = mutation.target.nodeType === 3 ? mutation.target.parentNode : mutation.target;
            
            if (el && tabletTargetIds.includes(el.id)) {
                tabletMarginObserver.disconnect();
                
                const rawVal = parseFloat(el.textContent.replace(/[^0-9.-]+/g, '')) || 0;
                el.setAttribute('data-raw-original', rawVal);
                
                const multiplier = 1 + (currentRate / 100);
                if (rawVal > 0) {
                    el.textContent = Math.round(rawVal * multiplier).toLocaleString('en-US');
                    if (currentRate > 0) el.classList.add('pm-highlight');
                    else el.classList.remove('pm-highlight');
                } else {
                    el.classList.remove('pm-highlight');
                }
                
                observeTabletTargets();
                if (typeof window.calculateAllTotals === 'function') window.calculateAllTotals();
            }
        }
    });
});

function observeTabletTargets() {
    tabletTargetIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) tabletMarginObserver.observe(el, { childList: true, characterData: true, subtree: true });
    });
}

function applyTabletProfitMarginToAll(marginRate) {
    const multiplier = 1 + (marginRate / 100);
    if (tabletMarginObserver) tabletMarginObserver.disconnect();

    tabletTargetIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        if (!el.hasAttribute('data-raw-original')) {
            const rawVal = parseFloat(el.textContent.replace(/[^0-9.-]+/g, '')) || 0;
            el.setAttribute('data-raw-original', rawVal);
        }

        const originalVal = parseFloat(el.getAttribute('data-raw-original')) || 0;
        
        if (originalVal > 0) {
            const newVal = Math.round(originalVal * multiplier);
            el.textContent = newVal.toLocaleString('en-US');
            
            if (marginRate > 0) el.classList.add('pm-highlight');
            else el.classList.remove('pm-highlight');
        } else {
            el.classList.remove('pm-highlight');
        }
    });

    observeTabletTargets();
    if (typeof window.calculateAllTotals === 'function') window.calculateAllTotals();
}