/* ==========================================================================
   one-click-quo/one_click_quo_ofc.js
   해상 운임(OFC) 비용 조회 및 랜더링 로직 (콘솔 분기처리 및 전역 상태 관리 추가)
   ========================================================================== */

// 🌟 전역 상태 관리
let ofcGlobalState = {
    poe: null,
    cbm: 1,
    containerType: '',
    isConsole: false,
    consoleBase: '40HC',
    ofcDataList: [],     // 🚨 추가: 백엔드에서 받은 배열(부산, 인천 등) 모두 저장
    extraCostsList: [],  // 🚨 추가: 추가비용 모두 저장
    ofcData: null,
    extraCosts: [],
    currentPrefix: '',   // 🚨 추가: 현재 선택된 항구 접두사 (BUS) 또는 (INC)
    krwToUsdRate: 0.00075,
    validityDate: ''
};

/**
 * 1. [핵심 모듈] OFC 비용 및 추가 비용 API 호출 함수 
 */
async function fetchOceanFreightData(poe) {
    if (!poe) {
        console.error("❌ [OFC DEBUG] POE 값이 없습니다.");
        return null;
    }
    
    console.group("🚀 [OFC DEBUG] API 호출 시작");
    console.log("요청 POE (프론트 전달값):", poe);
    
    try {
        const response = await fetch(`https://notion-api-hub.vercel.app/api/ofc/ofc-costs?poe=${encodeURIComponent(poe)}`);
        const result = await response.json();
        
        console.log("백엔드 전체 응답 데이터:", result);
        
        if (!result.ok) {
            console.error("❌ [OFC DEBUG] 백엔드 응답 ok 아님");
            console.groupEnd();
            return null;
        }

        const targetPoeArray = result.input?.targetPoe || [];
        console.log("✨ 백엔드에서 추출한 매핑 리스트(targetPoe):", targetPoeArray);
        console.groupEnd();

        return {
            ofcData: result.ofcData || [], // 🚨 수정: [0]번째가 아닌 배열 전체를 반환
            extraCosts: result.extraCosts || [],
            targetPoe: targetPoeArray 
        };
    } catch (error) {
        console.error("❌ [OFC DEBUG] API 통신 에러:", error);
        console.groupEnd();
        return null;
    }
}

/**
 * 2. [UI 로직] 초기 데이터 세팅 및 렌더링 호출
 */
async function applyOfcCostToQuote() {
    // 🌟 대표님 원본 키값인 'oneClickQuoteData'
    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) return;
    
    const data = JSON.parse(rawData);
    const cargo = (data.cargo || '').toUpperCase();
    
    ofcGlobalState.containerType = cargo;
    ofcGlobalState.isConsole = cargo.includes('CON') || cargo.includes('LCL');
    
    const cbmMatch = cargo.match(/([\d.]+)\s*CBM/i);
    ofcGlobalState.cbm = cbmMatch ? parseFloat(cbmMatch[1]) : (parseFloat(cargo) || 1);

    let poe = data.destPort || data.poe || data.location || '';
    if (poe.includes(' / ')) {
        poe = poe.split(' / ')[1].trim();
    }
    
    ofcGlobalState.poe = poe;

    console.log("🔍 [OFC DEBUG] 최종 정제된 POE 명칭:", poe);

    const [result, exRes] = await Promise.all([
        fetchOceanFreightData(poe),
        fetch('https://api.exchangerate-api.com/v4/latest/KRW').catch(() => null)
    ]);

    if (exRes && exRes.ok) {
        try {
            const exData = await exRes.json();
            if (exData?.rates?.USD) ofcGlobalState.krwToUsdRate = exData.rates.USD;
        } catch(e) { console.warn("환율 파싱 실패"); }
    }

    if (result) {
            ofcGlobalState.ofcDataList = result.ofcData;
            ofcGlobalState.extraCostsList = result.extraCosts;

            if (typeof window.setupPolDropdown === 'function') {
                window.setupPolDropdown(result.targetPoe); 
            }
        } else {
            if (typeof window.setupPolDropdown === 'function') {
                window.setupPolDropdown([]);
            }
        }
        // 🚨 수정: 여기서 renderOceanFreight()를 바로 호출하지 않습니다.
        // setupPolDropdown 내부에서 항목 선택(change) 이벤트를 통해 자동으로 필터링 및 렌더링되게 합니다.
    }

/**
 * 3. [렌더링 모듈] 계산 및 화면/이벤트 업데이트
 */
function renderOceanFreight() {
    const { isConsole, consoleBase, cbm, containerType, ofcData, extraCosts, krwToUsdRate, validityDate } = ofcGlobalState;
    
    const oceanTotalEl = document.getElementById('q_ocean_total');
    const btnOpenOfc = document.getElementById('btnOpenOfc'); // ★ 새롭게 추가된 돋보기 버튼

    let surchargeKrw = 0;
    let baseCost = 0;
    let extraTotal = 0;
    let finalCost = null;
    let ofcPageId = ofcData ? ofcData.id : null;

    if (isConsole) {
        if (consoleBase === '20FT') {
            surchargeKrw = Math.round((250000 / 20) * cbm);
            if (ofcData) baseCost = Math.round(((ofcData.cost20DR || 0) / 20) * cbm);
        } else { 
            surchargeKrw = Math.round((300000 / 50) * cbm);
            if (ofcData) baseCost = Math.round(((ofcData.cost40HC || 0) / 50) * cbm);
        }
    } else {
        if (containerType.includes('20')) {
            surchargeKrw = 250000;
            if (ofcData) baseCost = ofcData.cost20DR || 0;
        } else if (containerType.includes('40')) {
            surchargeKrw = 300000;
            if (ofcData) baseCost = ofcData.cost40HC || 0;
        }
    }

    let filteredExtraCosts = [];
    if (extraCosts && extraCosts.length > 0) {
        filteredExtraCosts = extraCosts.map(item => {
            let currentAmt = 0;
            if (isConsole) {
                currentAmt = item.costCONSOLE || 0;
            } else if (containerType.includes('20')) {
                currentAmt = item.cost20 || 0;
            } else if (containerType.includes('40')) {
                currentAmt = item.cost40 || 0;
            }
            return { ...item, amount: currentAmt };
        }).filter(item => item.amount > 0);
        
        extraTotal = filteredExtraCosts.reduce((sum, item) => sum + item.amount, 0);
    }

    if (ofcData || filteredExtraCosts.length > 0) {
        finalCost = baseCost + extraTotal;
    }

    let ofcUsd = finalCost || 0;
    let surchargeUsd = surchargeKrw * krwToUsdRate;
    let totalOceanUsd = ofcUsd;

    // 화면 업데이트 및 버튼 클릭 이벤트 바인딩
    if (btnOpenOfc) {
        if (finalCost !== null && finalCost !== undefined) {
            btnOpenOfc.onclick = () => openOfcDetailModal(ofcPageId, filteredExtraCosts, baseCost, finalCost, validityDate, totalOceanUsd);
        } else {
            btnOpenOfc.onclick = () => alert("해상 운임 데이터가 없습니다. (별도 문의)");
        }
    }

    if (oceanTotalEl) {
        oceanTotalEl.innerHTML = `<span style="display:none;">USD</span>${totalOceanUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

/**
 * 4. [모달 로직] OFC 상세 운임 팝업창 생성 (디자인 통일)
 */
function openOfcDetailModal(pageId, extraCosts = [], baseCost = 0, ofcTotal = 0, validityDate = "", totalOceanUsd = 0) {
    const existingModal = document.getElementById('ofc-detail-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'ofc-detail-modal';
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
        z-index: 9999; backdrop-filter: blur(2px);
    `;

    const notionLink = pageId ? `https://www.notion.so/${pageId.replace(/-/g, '')}` : '#';

    // 콘솔 토글 UI (디자인 통일)
    let consoleToggleHtml = '';
    if (ofcGlobalState.isConsole) {
        consoleToggleHtml = `
            <div style="margin-bottom: 20px; padding: 15px; background: #f4f6f8; border-radius: 8px; border: 1px solid #ddd; text-align: center;">
                <div style="font-weight: 800; margin-bottom: 12px; color: var(--invoice-blue, #1A365D); font-size: 0.95rem;">🚢 콘솔 컨테이너 요율 기준 선택</div>
                <div style="display: flex; justify-content: center; gap: 20px;">
                    <label style="cursor: pointer; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 5px; color: #333;">
                        <input type="radio" name="consoleBase" value="20FT" ${ofcGlobalState.consoleBase === '20FT' ? 'checked' : ''} style="width:16px; height:16px; accent-color: var(--invoice-blue, #1A365D);">
                        20DR 기준 (÷20)
                    </label>
                    <label style="cursor: pointer; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 5px; color: #333;">
                        <input type="radio" name="consoleBase" value="40HC" ${ofcGlobalState.consoleBase === '40HC' ? 'checked' : ''} style="width:16px; height:16px; accent-color: var(--invoice-blue, #1A365D);">
                        40HC 기준 (÷50)
                    </label>
                </div>
            </div>
        `;
    }

    // 추가 요금 리스트 UI
    let extraCostRows = extraCosts.map(c => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #555;">${c.name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">$${(c.amount || 0).toLocaleString('en-US')}</td>
        </tr>
    `).join('');

    if (extraCosts.length === 0) {
        extraCostRows = `<tr><td colspan="2" style="padding: 15px; text-align:center; color:#999; font-weight: 600;">해당 타입에 적용된 추가 운임이 없습니다.</td></tr>`;
    }

    let validityTextHtml = validityDate ? `<div style="text-align: center; color: var(--invoice-blue, #1A365D); font-size: 0.9rem; font-weight: 700; margin-bottom: 15px;">유효 기간 : ~${validityDate} 까지</div>` : '';

    // 메인 모달 UI 조립 (DES, IRC와 구조/색상 통일)
    const modalContent = `
        <div class="modal-content" style="background: #fff; border-radius: 8px; max-width: 450px; width: 90%; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column;">
            
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--invoice-blue, #1A365D); padding-bottom: 12px; margin-bottom: 20px; flex-shrink: 0;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--invoice-blue, #1A365D);">운임 상세 및 추가 비용</h3>
                <button id="closeOfcModalBtn" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #999; line-height: 1;">&times;</button>
            </div>

            <div class="modal-body" style="overflow-y: auto; flex-grow: 1;">
                ${validityTextHtml}
                ${consoleToggleHtml}

                <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 700; color: #333;">[운임 구성 내역]</h4>
                <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead style="background: #f4f6f8;">
                            <tr>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; color: #555; font-weight: 600;">항목명</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd; color: #555; font-weight: 600;">금액 (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 12px; border-bottom: 1px solid #ddd; color: #333;">OFC (기본 해상운임)</td>
                                <td style="padding: 12px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 700;">$${baseCost.toLocaleString('en-US')}</td>
                            </tr>
                            ${extraCostRows}
                        </tbody>
                        <tfoot style="background: #f8f9fa;">
                            <tr>
                                <td style="padding: 12px; border-top: 2px solid #ddd; font-weight: 800; color: var(--invoice-blue, #1A365D);">총 해상 운임 합계</td>
                                <td style="padding: 12px; border-top: 2px solid #ddd; text-align: right; font-weight: 800; color: var(--invoice-blue, #1A365D); font-size: 1.1rem;">$${totalOceanUsd.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="modal-footer" style="text-align: center; flex-shrink: 0;">
                <a href="${notionLink}" target="_blank" style="display: inline-block; background: var(--invoice-blue, #1A365D); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 700; font-size: 1rem; width: 100%; box-sizing: border-box; transition: opacity 0.2s;">
                    🔗 포워딩/선사별 운임 상세 확인
                </a>
            </div>
        </div>
    `;

    modalOverlay.innerHTML = modalContent;
    document.body.appendChild(modalOverlay);

    // 닫기 이벤트 연결
    document.getElementById('closeOfcModalBtn').onclick = () => modalOverlay.remove();
    modalOverlay.onclick = (e) => { if(e.target === modalOverlay) modalOverlay.remove(); }

    // 라디오 버튼(콘솔일 때) 이벤트 연결
    if (ofcGlobalState.isConsole) {
        const radios = modalOverlay.querySelectorAll('input[name="consoleBase"]');
        radios.forEach(r => {
            r.addEventListener('change', (e) => {
                ofcGlobalState.consoleBase = e.target.value;
                renderOceanFreight(); 
                modalOverlay.remove();
                
                const btn = document.getElementById('btnOpenOfc');
                if(btn) btn.click();
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', applyOfcCostToQuote);

/* ==========================================================================
   [POL 드롭다운 및 운임 필터링 모듈]
   ========================================================================== */
window.setupPolDropdown = function(mappedPoes) {
    const polSelect = document.getElementById('pol_select');
    if (!polSelect) return;

    const safePoes = Array.isArray(mappedPoes) ? mappedPoes : [];
    const hasBus = safePoes.some(v => typeof v === 'string' && v.includes('(BUS)'));
    const hasInc = safePoes.some(v => typeof v === 'string' && v.includes('(INC)'));

    let optionsHtml = '';
    // value는 TRC(내륙운송)를 위한 주소, data-prefix는 OFC(해상운임) 필터링용
    if (hasBus) {
        optionsHtml += '<option value="부산광역시 강서구 신항남로 330" data-prefix="(BUS)">부산신항 (미국, 유럽 등 장거리)</option>';
        optionsHtml += '<option value="부산광역시 남구 신선로 294" data-prefix="(BUS)">부산북항 (아시아, 인도네시아 등 단거리)</option>';
    }
    if (hasInc) {
        optionsHtml += '<option value="인천 연수구 인천신항대로 707" data-prefix="(INC)">인천항</option>';
    }
    
    if (!hasBus && !hasInc) {
        optionsHtml += '<option value="부산광역시 강서구 신항남로 330" data-prefix="">기본 항구(부산)</option>';
    }

    polSelect.innerHTML = optionsHtml;
    
    const handlePolChange = (e) => {
        // 1. 내륙운송료(TRC) 재계산 트리거 (ocq_trc.js)
        if (typeof autoCalculateTrc === 'function') {
            autoCalculateTrc();
        }
        
        // 2. 해상운임(OFC) 업데이트 트리거
        const selectedOption = e.target.options[e.target.selectedIndex];
        const prefix = selectedOption.getAttribute('data-prefix'); 
        window.updateOfcByPrefix(prefix);
    };

    // 중복 이벤트 방지 후 등록
    polSelect.removeEventListener('change', handlePolChange);
    polSelect.addEventListener('change', handlePolChange);

    // 데이터 로드 직후 첫 번째 항목을 기준으로 OFC 및 TRC 초기 세팅
    setTimeout(() => handlePolChange({ target: polSelect }), 100);
};

window.updateOfcByPrefix = function(prefix) {
    ofcGlobalState.currentPrefix = prefix;

    // 선택한 접두사 (BUS 또는 INC)가 poeList에 포함된 해상운임 데이터를 찾음
    if (prefix && ofcGlobalState.ofcDataList.length > 0) {
        ofcGlobalState.ofcData = ofcGlobalState.ofcDataList.find(data => 
            data.poeList && data.poeList.some(code => code.includes(prefix))
        ) || ofcGlobalState.ofcDataList[0];
    } else {
        ofcGlobalState.ofcData = ofcGlobalState.ofcDataList[0] || null;
    }

    // 추가 비용은 그대로 전달
    ofcGlobalState.extraCosts = ofcGlobalState.extraCostsList;

    // 유효기간 갱신
    if (ofcGlobalState.ofcData?.validity) {
        const rawDate = ofcGlobalState.ofcData.validity.end || ofcGlobalState.ofcData.validity.start;
        ofcGlobalState.validityDate = rawDate ? rawDate.replace(/-/g, '/') : '';
    }

    // 찾아낸 데이터를 바탕으로 화면에 다시 그림
    renderOceanFreight();
};