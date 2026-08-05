/* btn_notionsave.js */
'use strict';

console.log('✅ 노션 저장 스크립트 장착 완료!');

function updateSaveButtonState() {
    const btn = document.getElementById('btnSaveToNotion');
    if (!btn) return;
    const sessionData = JSON.parse(sessionStorage.getItem('finalQuotationData') || '{}');
    
    if (sessionData._notionPageId) {
        btn.textContent = '노션 덮어쓰기';
        btn.style.backgroundColor = '#1A365D'; 
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#1A365D';
    } else {
        btn.textContent = '노션에 저장';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#3498db';
        btn.style.borderColor = '#3498db';
    }
}

const initBtnInterval = setInterval(() => {
    if (document.getElementById('btnSaveToNotion')) {
        updateSaveButtonState();
        clearInterval(initBtnInterval);
    }
}, 100);

document.body.addEventListener('click', async (e) => {
    if (e.target.id === 'btnSaveToNotion') {
        const btn = e.target;
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

        btn.textContent = '저장 중...';
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.7';

        try {
            const currentData = {};
            
            // 일반 텍스트 및 입력값 추출
            document.querySelectorAll('.quote-paper [id]').forEach(el => {
                if (!el.id || el.id.startsWith('_') || el.id.includes('btn')) return;
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

            // 추가 행 데이터 추출
            const dynamicRows = [];
            document.querySelectorAll('.quote-cost-table').forEach((table, tableIndex) => {
                table.querySelectorAll('tr').forEach(tr => {
                    if (tr.querySelector('.remove-row-btn')) {
                        const descEl = tr.querySelector('.section-content');
                        const curEl = tr.cells[1];
                        const amtEl = tr.querySelector('.amount-input');

                        dynamicRows.push({
                            tableIndex: tableIndex,
                            desc: descEl ? descEl.innerHTML : '',
                            cur: curEl ? curEl.textContent.trim() : 'KRW',
                            amt: amtEl ? amtEl.textContent.trim() : '0'
                        });
                    }
                });
            });

            currentData.dynamicRows = dynamicRows;

            const originAddEl = document.getElementById('q_origin_add');
            if (originAddEl) {
                const txt = originAddEl.textContent.trim();
                currentData['q_origin_add'] = (txt === '클릭하여 출발지 검색') ? '' : txt;
            }

            const pdateEl = document.getElementById('q_pdate');
            if (pdateEl && pdateEl.value) currentData['q_pdate'] = pdateEl.value;

            // 💡 [핵심] 견적일(quo_date)이 비어있다면 오늘 날짜로 자동 생성하여 세팅
            let finalQuoDate = document.getElementById('quo_date')?.textContent?.trim() || '';
            if (!finalQuoDate || finalQuoDate === '-') {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                finalQuoDate = `${yyyy}. ${mm}. ${dd}`;
                
                // 화면의 견적일 칸 업데이트
                const quoDateEl = document.getElementById('quo_date');
                if(quoDateEl) {
                    quoDateEl.textContent = finalQuoDate;
                    quoDateEl.classList.add('is-typed');
                }
                currentData['quo_date'] = finalQuoDate;
            }

            // 💡 [핵심] 약관의 quo_date_copy 강제 업데이트 및 수집
            const quoNoText = document.getElementById('quo_no')?.textContent?.trim() || '';
            const copyText = quoNoText ? `${quoNoText} / ${finalQuoDate}` : finalQuoDate;
            
            const copyEl = document.getElementById('quo_date_copy');
            if(copyEl) {
                copyEl.textContent = copyText;
                currentData['quo_date_copy'] = copyText;
            }

            const pureData = { ...currentData };
            
            if (sessionData._notionPageId) {
                pureData._notionPageId = sessionData._notionPageId;
            }

            const customer = document.getElementById('q_customer_name')?.textContent?.trim() || '';
            const sales = document.getElementById('sales-name')?.textContent?.trim() || '';
            const totalText = document.getElementById('q_final_total_converted')?.textContent || '0';
            const totalAmount = Number(totalText.replace(/[^0-9.-]+/g, "")) || 0;

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
                
                if (!quoNoText && result.quoteNo) {
                    const quoNoEl = document.getElementById('quo_no');
                    if (quoNoEl) {
                        quoNoEl.textContent = result.quoteNo;
                        quoNoEl.classList.add('is-typed');
                    }
                    pureData['quo_no'] = result.quoteNo;
                    
                    // 새 번호가 발급되었으니 copy 영역도 한 번 더 업데이트
                    if(copyEl) {
                        const newCopyText = `${result.quoteNo} / ${finalQuoDate}`;
                        copyEl.textContent = newCopyText;
                        pureData['quo_date_copy'] = newCopyText;
                    }
                }
                
                const updatedSession = { ...sessionData, ...pureData };
                if (result.pageId) updatedSession['_notionPageId'] = result.pageId;
                
                sessionStorage.setItem('finalQuotationData', JSON.stringify(updatedSession));
            } else {
                let errorDetails = result.details ? JSON.stringify(result.details) : '';
                console.error("저장 실패 상세:", result.details);
                
                if (errorDetails.includes('archived')) {
                    alert('🚨 에러: 삭제(보관)된 페이지에는 덮어쓸 수 없습니다!\n\n저장 버튼을 다시 누른 후 [취소]를 선택해 신규 복사 저장하세요.');
                } else {
                    alert(`🚨 저장 실패: ${result.error}\n\n상세원인: ${errorDetails}`);
                }
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