/* btn_mobile_move_to_quotation.js */
'use strict';

/**
 * 모바일 조회 화면(mobile_quotation.html)의 모든 입력값을 세션에 저장하고 
 * 모바일 결과 화면(mobile_quotation_result.html)으로 이동하는 전용 함수
 */
function moveToQuotation(searchParams, resultData) {
    // 1. API 데이터 추출 및 통화 확인
    const dataArray = resultData?.rows ? resultData.rows : (Array.isArray(resultData) ? resultData : []);
    const currency = resultData?.currency || 'USD'; // 백엔드에서 받은 통화값 (기본값 USD)

    // =====================================================================
    // 2. 모바일 화면(1단계)에서 사용자가 입력한 추가 데이터 직접 수집
    // =====================================================================
    const customerNameVal = document.getElementById('q_customer_name')?.value || '';
    const customerEmailVal = document.getElementById('q_customer_email')?.value || '';
    const originAddVal = document.getElementById('q_origin_add')?.value || '';
    
    // 달력 날짜는 사용자가 보기 편하게 세팅된 값 그대로 긁어옵니다 (예: 2026/07/20 (MON))
    const pdateVal = document.getElementById('q_pdate')?.value || '';

    // =====================================================================
    // 3. 콘솔창 데이터 표출 (모바일 디버깅용)
    // =====================================================================
    console.group('%c[Mobile Quotation Transfer]', 'color: #159b64; font-weight: bold; font-size: 14px;');
    console.log(`%c3. 통화(Currency): ${currency}`, 'color: #e74c3c; font-size: 13px; font-weight: bold;');
    console.log('1. 검색 파라미터 (Search Parameters):', searchParams);
    console.log('1-2. 사용자 입력 1단계 파라미터:', { customerNameVal, customerEmailVal, pdateVal, originAddVal });
    console.table(dataArray); 
    console.groupEnd();

    // =====================================================================
    // 4. cds_calculate.js의 함수를 호출하여 비용 합계 구하기
    // =====================================================================
    let calculatedCosts = { cds: 0 };
    if (typeof calculateCosts === 'function') {
        // 합산 함수에 배열과 화면에서 선택한 컨테이너 타입을 함께 넘깁니다.
        calculatedCosts = calculateCosts(dataArray, searchParams.containerType);
    } else {
        console.warn('cds_calculate.js 파일이 연결되지 않았습니다.');
    }

    // 💡 MODE/TYPE 자동 완성 문구 생성
    const cbmVal = searchParams.cbm || '-';
    const containerVal = (searchParams.containerType || '-').toUpperCase();
    const isConsole = containerVal.includes('CON') || containerVal.includes('LCL');
    
    // 콘솔(LCL) 화물이면 Single Container 문구 제외, 단독 컨테이너면 포함
    const modeTypeStr = isConsole 
        ? `Door to Door / ${containerVal} (${cbmVal} CBM)`
        : `Door to Door / ${containerVal} Single Container (${cbmVal} CBM)`;

    // =====================================================================
    // 5. 결과 페이지(mobile_quotation_result.html)에서 쓸 최종 객체 조립
    // =====================================================================
    const quotationData = {
        // 💡 [신규 추가] 모바일 1단계에서 입력받은 데이터들 매칭
        q_customer_name: customerNameVal,
        q_customer_email: customerEmailVal,
        q_pdate: pdateVal,
        q_origin_add: originAddVal,

        // 기존 searchParams 데이터 매칭
        q_location: searchParams.region || '',
        q_dest_port: searchParams.poe || '',
        q_cbm: searchParams.cbm || '',
        q_container: searchParams.containerType || '',
        q_mode_type: modeTypeStr,
        
        // 화면 매칭용 추가 데이터 (통화 및 계산된 CDS 합계)
        cur_cds: currency, 
        q_destination_amount: calculatedCosts.cds > 0 ? calculatedCosts.cds.toLocaleString('en-US') : '',
        
        // 데이터 유지용
        _fullSearchParams: searchParams,
        _fullResultData: dataArray,
        _currency: currency,
        _rawData: resultData
    };

    // 6. 세션 스토리지에 데이터 저장 및 신규 모바일 결과 페이지로 이동!
    sessionStorage.setItem('finalQuotationData', JSON.stringify(quotationData));
    
    // 💡 이동할 목적지 URL을 방금 만드신 모바일 결과 파일명으로 변경
    window.location.href = '/pumex/4_pages/customer_quo/result/mobile_quotation_result.html';
}