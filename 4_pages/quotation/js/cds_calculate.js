/* cds_calculate.js */
'use strict';

/**
 * 백엔드 데이터 배열을 받아 항목별(CDS 등) 합계를 계산하는 함수
 * @param {Array} dataArray - API에서 받아온 rows 데이터 배열
 * @param {String} containerType - 화면에서 선택한 타입 (예: '20FT', '40HC', 'CONSOLE')
 * @returns {Object} - 계산된 합계 금액 객체
 */
function calculateCosts(dataArray, containerType) {
    let cdsTotalAmount = 0;

    if (Array.isArray(dataArray)) {
        // 화면에서 선택한 컨테이너 타입이 파라미터로 넘어오지 않았다면 기본값 '20FT' 사용
        const typeKey = containerType || '20FT';

        dataArray.forEach(item => {
            if (item.rowType === 'CDS') {
                // 💡 백엔드 응답 구조에 맞게 해당 타입(typeKey)의 금액을 추출하여 합산
                const amt = parseFloat(item[typeKey]) || 0; 
                cdsTotalAmount += amt;
            }
        });
    }

    return {
        cds: cdsTotalAmount
    };
}