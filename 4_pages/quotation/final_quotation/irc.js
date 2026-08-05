/* irc.js */
document.addEventListener('DOMContentLoaded', function () {
    const savedData = sessionStorage.getItem('finalQuotationData');
    if (!savedData) return;

    try {
        const quotationData = JSON.parse(savedData);

        const curIrc = quotationData.cur_irc || 'KRW';
        const ircAmount = quotationData.irc_amount || '0';
        const ircRate = quotationData.irc_rate || '0';
        const qIrcSubtotal = quotationData.q_irc_amount || '0';

        // 💡 통화 코드에 따른 기호(심볼)를 반환하는 함수
        const getCurrencySymbol = (code) => {
            switch ((code || '').toUpperCase()) {
                case 'USD': return '$';
                case 'KRW': return '₩';
                case 'EUR': return '€';
                case 'JPY': return '¥';
                case 'GBP': return '£';
                default: return code; // 정의되지 않은 통화는 코드 그대로 출력
            }
        };

        const symbol = getCurrencySymbol(curIrc);

        // 1. irc_info 영역에 통화 마크가 반영된 포맷으로 텍스트 구성
        // 예: "부보액 $ 300,000 * 보험요율 1.5%" (원하실 경우 심볼 대신 curIrc 코드를 같이 표기할 수도 있습니다)
        const ircInfoElement = document.getElementById('irc_info');
        if (ircInfoElement) {
            if (ircAmount !== '0' && ircRate !== '0') {
                ircInfoElement.textContent = `Insurance Charge(해상적하보험): Insured Value ${symbol}${ircAmount} * Insurance Rate ${ircRate}%`;
            } else {
                ircInfoElement.textContent = `*별도 기재 필요*`;
            }
        }

        // 2. cur_irc 요소에 통화 반영 (여기는 기존처럼 통화 코드 유지 혹은 심볼로 변경 선택 가능)
        const curIrcElement = document.getElementById('cur_irc');
        if (curIrcElement) {
            curIrcElement.textContent = curIrc; // 통화 셀에는 기존대로 코드(KRW, USD 등) 노출
        }

        // 3. q_irc_amount 요소에 보험료 최종 금액 반영
        const subtotalElement = document.getElementById('q_irc_amount');
        if (subtotalElement) {
            subtotalElement.textContent = qIrcSubtotal;
        }

    } catch (error) {
        console.error('보험(IRC) 데이터를 처리하는 중 오류가 발생했습니다.', error);
    }
});