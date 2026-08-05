/* mobile_notionsave.js */
'use strict';

console.log('✅ 모바일 전용 노션 저장 스크립트 장착 완료!');

function updateSaveButtonState() {
    const btn = document.getElementById('btnSaveToNotion');
    const txt = document.getElementById('txtSaveToNotion');
    if (!btn) return;
    const sessionData = JSON.parse(sessionStorage.getItem('finalQuotationData') || '{}');
    
    if (sessionData._notionPageId) {
        btn.style.backgroundColor = '#0a233a'; // 덮어쓰기 느낌의 어두운 색상
        if(txt) txt.textContent = '덮어쓰기';
    } else {
        btn.style.backgroundColor = '#113c5f';
        if(txt) txt.textContent = '노션 저장';
    }
}

const initBtnInterval = setInterval(() => {
    if (document.getElementById('btnSaveToNotion')) {
        updateSaveButtonState();
        clearInterval(initBtnInterval);
    }
}, 100);

document.body.addEventListener('click', async (e) => {
    const btn = e.target.closest('#btnSaveToNotion');
    if (btn) {
        const sessionData = JSON.parse(sessionStorage.getItem('finalQuotationData') || '{}');
        const existingPageId = sessionData._notionPageId; 
        
        if (existingPageId) {
            const userChoice = confirm('이전에 불러온 견적서입니다.\n[확인]을 누르면 기존 문서를 덮어씁니다.\n[취소]를 누르면 새로운 견적서로 복사(신규) 저장합니다.');
            if (!userChoice) {
                // 신규 저장 모드로 전환
                delete sessionData._notionPageId;
                delete sessionData.quo_no; 
                const quoNoEl = document.getElementById('quo_no');
                if (quoNoEl) quoNoEl.textContent = ''; 
                sessionStorage.setItem('finalQuotationData', JSON.stringify(sessionData));
                updateSaveButtonState(); 
            }
        }

        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
        const txt = document.getElementById('txtSaveToNotion');
        if(txt) txt.textContent = '저장 중...';

        try {
            const currentData = {};
            
            // 💡 [핵심 포인트] 화면(.m-container)에 표시된 텍스트를 그대로 긁어옵니다.
            // 즉, 화면에 수익률 10%가 적용되어 있다면 그 금액 그대로 수집됩니다.
            document.querySelectorAll('.m-container [id]').forEach(el => {
                if (!el.id || el.id.startsWith('_') || el.id.includes('btn') || el.id.includes('txt')) return;
                const tag = el.tagName;
                if (['BUTTON', 'IMG', 'I', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'UL', 'LI', 'SCRIPT', 'STYLE'].includes(tag)) return;

                if (tag === 'SELECT') {
                    currentData[el.id] = el.options[el.selectedIndex]?.text || '';
                } else if (tag === 'INPUT' || tag === 'TEXTAREA') {
                    currentData[el.id] = el.value || '';
                } else {
                    currentData[el.id] = el.isContentEditable ? el.innerHTML : el.textContent.trim();
                }
            });

            // 견적일(quo_date) 자동 생성
            let finalQuoDate = document.getElementById('quo_date')?.textContent?.trim() || '';
            if (!finalQuoDate || finalQuoDate === '-') {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                finalQuoDate = `${yyyy}. ${mm}. ${dd}`;
                
                const quoDateEl = document.getElementById('quo_date');
                if(quoDateEl) quoDateEl.textContent = finalQuoDate;
                currentData['quo_date'] = finalQuoDate;
            }

            const quoNoText = document.getElementById('quo_no')?.textContent?.trim() || '';
            const pureData = { ...currentData };
            
            if (sessionData._notionPageId) {
                pureData._notionPageId = sessionData._notionPageId;
            }

            const customer = document.getElementById('q_customer_name')?.textContent?.trim() || '';
            const sales = document.getElementById('sales-name')?.textContent?.trim() || '';
            const totalText = document.getElementById('q_final_total_converted')?.textContent || '0';
            const totalAmount = Number(totalText.replace(/[^0-9.-]+/g, "")) || 0;

            // 💡 노션 API로 전송되는 데이터 꾸러미 (마진이 모두 적용된 최종 수치들)
            const requestBody = { 
                quoteNo: quoNoText, 
                customer: customer, 
                date: finalQuoDate, 
                totalAmount: totalAmount, 
                sales: sales, 
                rawData: pureData 
            };
            
            if (pureData._notionPageId) requestBody.pageId = pureData._notionPageId;

            const response = await fetch('https://notion-api-hub.vercel.app/api/quotation/save', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            
            if (result.ok) {
                alert(sessionData._notionPageId ? '기존 견적서에 성공적으로 덮어쓰기 되었습니다!' : '새로운 견적서로 저장되었습니다!');
                
                // 💡 [안전장치] 노션에는 덮어쓰되, 로컬 세션에는 이중 마진 버그를 막기 위해
                // 전체 데이터(pureData)를 덮어쓰지 않고, '견적번호'와 '페이지 ID'만 살짝 업데이트 합니다.
                if (!quoNoText && result.quoteNo) {
                    const quoNoEl = document.getElementById('quo_no');
                    if (quoNoEl) quoNoEl.textContent = result.quoteNo;
                    sessionData.quo_no = result.quoteNo;
                }
                
                sessionData.quo_date = finalQuoDate;
                if (result.pageId) sessionData._notionPageId = result.pageId;
                
                sessionStorage.setItem('finalQuotationData', JSON.stringify(sessionData));
            } else {
                alert(`🚨 저장 실패: ${result.error}`);
            }
        } catch (error) {
            console.error('저장 중 오류:', error); 
            alert('통신 오류가 발생했습니다.');
        } finally {
            updateSaveButtonState();
            btn.style.pointerEvents = 'auto'; 
            btn.style.opacity = '1';
        }
    }
});