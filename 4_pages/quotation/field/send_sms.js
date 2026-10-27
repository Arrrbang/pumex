/* mobile_send_sms.js */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 문자 버튼 클릭 시 1차 검증 후 전화번호 입력 팝업 띄우기
    document.body.addEventListener('click', (e) => {
        const btnSms = e.target.closest('#btnSendSms');
        if (btnSms) {
            const modal = document.getElementById('smsPhoneModal');
            const input = document.getElementById('smsPhoneNumberInput');
            if (modal && input) {
                input.value = ''; // 열 때마다 입력창 초기화
                modal.style.display = 'flex';
                input.focus();
            }
        }
    });

    // 2. 팝업 안의 [취소] 버튼 클릭 시 닫기
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'smsModalCancelBtn' || e.target.id === 'smsPhoneModal') {
            const modal = document.getElementById('smsPhoneModal');
            if (modal) modal.style.display = 'none';
        }
    });

    // 3. 팝업 안의 [발송하기] 버튼 클릭 시 -> [노션 저장 먼저 실행] -> [완료 후 문자 창 오픈]
    document.body.addEventListener('click', async (e) => {
        if (e.target.id === 'smsModalConfirmBtn') {
            const input = document.getElementById('smsPhoneNumberInput');
            const phoneNumber = input ? input.value.trim() : '';

            if (!phoneNumber) {
                alert('전화번호를 입력해 주세요.');
                return;
            }

            // 모달 닫기
            const modal = document.getElementById('smsPhoneModal');
            if (modal) modal.style.display = 'none';

            // 💡 [핵심] 문자 보내기 전 노션 저장 버튼을 프로그래밍 방식으로 강제 클릭하여 저장 수행
            const saveBtn = document.getElementById('btnSaveToNotion');
            if (saveBtn) {
                console.log('📌 문자 발송 전 노션 자동 저장 시작...');
                saveBtn.click();
                
                // 네트워크 통신 및 노션 저장이 안전하게 끝날 때까지 잠시 대기 (약 1.2초)
                await new Promise(resolve => setTimeout(resolve, 1200));
            }

            // 2. 고객명과 총 금액 가져오기
            const salesEmail = document.getElementById('sales-email')?.textContent?.trim() || '';
            const salesTel = document.getElementById('sales-tel')?.textContent?.trim() || '';

            const managerPosition = sessionStorage.getItem('sms_manager_position') || '';
            const managerName = sessionStorage.getItem('sms_manager_name') || '';

            const q_customer_name = document.getElementById('q_customer_name')?.textContent?.trim() || '';
            const q_customer_email = document.getElementById('q_customer_email')?.textContent?.trim() || '';
            const q_origin_add = document.getElementById('q_origin_add')?.textContent?.trim() || '';
            const q_location = document.getElementById('q_location')?.textContent?.trim() || '';
            const q_final_total_converted = document.getElementById('q_final_total_converted')?.textContent?.trim() || '';
            
            // 3. 발송될 메시지 내용 세팅 
            const messageText = `안녕하세요 ${q_customer_name} 고객님, PUMEX 해외이사 견적 안내드립니다.\n\n[견적 요약]\n- 포장지: ${q_origin_add}\n- 배송지: ${q_location}\n- 예상 총 비용: ${q_final_total_converted} 원\n\n- 주의 사항\n※본 임시견적의 비용은 운임 변동, 환율 변동으로 인해 추후 변경될 수 있습니다.\n최종 견적서는 추후 고객님께서 입력하신 이메일(${q_customer_email})로 발송될 예정입니다.\n\n기타 문의는 아래 담당 영업사원에게 문의 바랍니다. 감사합니다.\n\n영업담당\n담당자: ${managerName} ${managerPosition}\n연락처: ${salesTel}\n이메일: ${salesEmail}`; 
            
            // 4. 스마트폰 OS(아이폰/안드로이드)에 따른 문자 프로토콜 분기 처리
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            
            let smsUri = `sms:${phoneNumber}?body=${encodeURIComponent(messageText)}`;
            
            // 아이폰(iOS)의 경우 파라미터 연결자가 '&' 임
            if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
                smsUri = `sms:${phoneNumber}&body=${encodeURIComponent(messageText)}`;
            }

            // 노션 저장이 끝난 후 모바일 문자 앱 호출
            window.location.href = smsUri;
        }
    });
});