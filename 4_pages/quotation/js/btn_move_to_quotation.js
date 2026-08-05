/* btn_move_to_quotation.js */
'use strict';

/**
 * 조회된 데이터를 SessionStorage에 저장하고 quotation.html로 이동하는 함수
 */
function moveToQuotation(searchParams, resultData) {
    // 1. API 데이터 추출 및 통화 확인
    const dataArray = resultData?.rows ? resultData.rows : (Array.isArray(resultData) ? resultData : []);
    const currency = resultData?.currency || 'USD'; // 백엔드에서 받은 통화값 (기본값 USD)

    // =====================================================================
    // 2. 콘솔창에 가져온 통화와 값 표출 (현재 페이지 index.html 콘솔용)
    // =====================================================================
    console.group('%c[Quotation Data Transfer]', 'color: #8e44ad; font-weight: bold; font-size: 14px;');
    console.log(`%c3. 통화(Currency): ${currency}`, 'color: #e74c3c; font-size: 13px; font-weight: bold;');
    
    console.log('1. 검색 파라미터 (Search Parameters):');
    console.table(searchParams);
    
    console.log('2. API 조회 결과 배열 (Result Array):');
    console.table(dataArray); 
    
    console.log('4. 백엔드 응답 원본 전체 (Raw Data):');
    console.dir(resultData);
    console.groupEnd();

    // =====================================================================
    // 3. cds_calculate.js의 함수를 호출하여 비용 합계 구하기
    // =====================================================================
    let calculatedCosts = { cds: 0 };
    if (typeof calculateCosts === 'function') {
        // 합산 함수에 배열과 화면에서 선택한 컨테이너 타입(예: '20FT')을 함께 넘깁니다.
        calculatedCosts = calculateCosts(dataArray, searchParams.containerType);
    } else {
        console.warn('cds_calculate.js 파일이 연결되지 않았습니다.');
    }

    // 💡 3.5. MODE/TYPE 자동 완성 문구 생성
    const cbmVal = searchParams.cbm || '-';
    const containerVal = (searchParams.containerType || '-').toUpperCase();
    const isConsole = containerVal.includes('CON') || containerVal.includes('LCL');
    
    // 콘솔(LCL) 화물이면 Single Container 문구 제외, 단독 컨테이너면 포함
    const modeTypeStr = isConsole 
        ? `Door to Door / ${containerVal} (${cbmVal} CBM)`
        : `Door to Door / ${containerVal} Single Container (${cbmVal} CBM)`;

    // 4. quotation.html에서 사용할 최종 객체 조립
    const quotationData = {
        q_location: searchParams.region || '',
        q_dest_port: searchParams.poe || '',
        q_cbm: searchParams.cbm || '',
        q_container: searchParams.containerType || '',
        
        // 💡 새롭게 추가된 MODE/TYPE 전달
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

    // 5. 세션 스토리지에 데이터 저장 및 이동
    sessionStorage.setItem('finalQuotationData', JSON.stringify(quotationData));
    window.location.href = './final_quotation/quotation.html';
}