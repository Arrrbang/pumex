/* btn_notionload.js */
'use strict';

console.log('✅ 노션 불러오기 스크립트 장착 완료!');

let globalQuotationList = [];

const style = document.createElement('style');
style.innerHTML = `
    .nl-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
    .nl-modal-box { background: #fff; width: 800px; max-height: 80vh; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; }
    .nl-modal-header { padding: 20px; background: #1b3b5f; color: #fff; display: flex; justify-content: space-between; align-items: center; }
    .nl-modal-header h2 { margin: 0; font-size: 1.2rem; }
    .nl-modal-close { background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; }
    .nl-modal-body { padding: 20px; overflow-y: auto; }
    .nl-table { width: 100%; border-collapse: collapse; text-align: center; }
    .nl-table th { background: #f0f7f7; padding: 12px; border-bottom: 2px solid #2b9e97; font-weight: 700; color: #1b3b5f; }
    .nl-table td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
    .nl-table tbody tr:hover { background: #f9f9f9; }
    .nl-btn-load { background: #2b9e97; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; margin-right: 5px; }
    .nl-btn-delete { background: #e74c3c; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .nl-loading { text-align: center; padding: 40px; color: #666; font-weight: bold; }
`;
document.head.appendChild(style);

document.body.addEventListener('click', async (e) => {
    if (e.target.id === 'btnLoadFromNotion' || e.target.closest('#btnLoadFromNotion')) {
        const salesName = document.getElementById('sales-name')?.textContent?.trim() || '';
        openLoadModal(salesName);
    }
});

async function openLoadModal(salesName) {
    const overlay = document.createElement('div');
    overlay.className = 'nl-modal-overlay';
    overlay.innerHTML = `
        <div class="nl-modal-box" onclick="event.stopPropagation()">
            <div class="nl-modal-header">
                <h2>나의 견적서 보관함</h2>
                <button class="nl-modal-close">&times;</button>
            </div>
            <div class="nl-modal-body" id="nl-modal-content">
                <div class="nl-loading"><i class="fa-solid fa-spinner fa-spin"></i> 데이터를 불러오는 중입니다...</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.nl-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', () => overlay.remove());

    try {
        const response = await fetch('https://notion-api-hub.vercel.app/api/quotation/list', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sales: salesName })
        });
        
        const result = await response.json();
        const contentEl = document.getElementById('nl-modal-content');
        
        if (result.ok && result.list && result.list.length > 0) {
            globalQuotationList = result.list; 

            let tbodyHtml = '';
            result.list.forEach(item => {
                tbodyHtml += `
                    <tr>
                        <td>${item.date || '-'}</td>
                        <td style="font-weight: 700;">${item.quoteNo || '-'}</td>
                        <td>${item.customer || '-'}</td>
                        <td style="text-align: right; font-weight: 600;">${(item.totalAmount || 0).toLocaleString()}</td>
                        <td>
                            <button class="nl-btn-load" data-id='${item.id}'>적용</button>
                            <button class="nl-btn-delete" data-id="${item.id}">삭제</button>
                        </td>
                    </tr>
                `;
            });

            contentEl.innerHTML = `<table class="nl-table"><thead><tr><th>작성일</th><th>견적번호</th><th>고객명</th><th>총액 (KRW)</th><th>관리</th></tr></thead><tbody>${tbodyHtml}</tbody></table>`;

            const tableEl = contentEl.querySelector('.nl-table');
            tableEl.addEventListener('click', async (ev) => {
                const loadBtn = ev.target.closest('.nl-btn-load');
                const deleteBtn = ev.target.closest('.nl-btn-delete');

                if (loadBtn) {
                    try {
                        const pageId = loadBtn.getAttribute('data-id'); 
                        const targetItem = globalQuotationList.find(i => i.id === pageId);
                        
                        if (targetItem && targetItem.rawData) {
                            let parsedData = targetItem.rawData;
                            if (typeof parsedData === 'string') parsedData = JSON.parse(parsedData);

                            parsedData._notionPageId = pageId; 
                            parsedData['quo_no'] = targetItem.quoteNo; 
                            
                            // 💡 날짜 복원 로직 강화: 노션 리스트(API)에서 반환된 값을 우선 적용
                            const restoredDate = targetItem.date.replace(/-/g, '. '); // 2026-07-30 -> 2026. 07. 30 형태
                            parsedData['quo_date'] = restoredDate;
                            parsedData['quo_date_copy'] = `${targetItem.quoteNo} / ${restoredDate}`;
                            
                            if (targetItem.customer) parsedData['q_customer_name'] = targetItem.customer;
                            if (targetItem.sales) parsedData['sales-name'] = targetItem.sales;
                            
                            sessionStorage.setItem('finalQuotationData', JSON.stringify(parsedData));
                            
                            window.location.href = (window.PUMEX_BASE || '') + '/pumex/4_pages/quotation/load_quotation/load_quotation.html';
                        } else {
                            alert('견적서 상세 데이터(rawData)가 비어있습니다.');
                        }
                    } catch (err) {
                        console.error('❌ 견적 적용 중 에러:', err); 
                        alert('적용 중 문제가 발생했습니다.');
                    }
                    return;
                }

                if (deleteBtn) {
                    const pageId = deleteBtn.getAttribute('data-id');
                    const row = deleteBtn.closest('tr');
                    if (confirm('이 견적서를 정말 삭제하시겠습니까? (노션 보관함으로 이동합니다)')) {
                        await deleteQuotation(pageId, row);
                    }
                }
            });
        } else {
            contentEl.innerHTML = `<div class="nl-loading">저장된 견적서가 없습니다.</div>`;
        }
    } catch (error) {
        console.error('❌ API 통신 에러:', error);
        document.getElementById('nl-modal-content').innerHTML = `<div class="nl-loading" style="color:red;">서버 통신 중 오류가 발생했습니다.<br><small>${error.message}</small></div>`;
    }
}

async function deleteQuotation(pageId, rowElement) {
    try {
        const response = await fetch(`https://notion-api-hub.vercel.app/api/quotation/delete/${pageId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.ok) { rowElement.remove(); } else { alert('삭제 실패: ' + result.error); }
    } catch (error) {
        console.error('❌ 삭제 통신 에러:', error); alert('삭제 중 통신 오류가 발생했습니다.');
    }
}