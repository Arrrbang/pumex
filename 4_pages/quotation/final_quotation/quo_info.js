document.addEventListener('DOMContentLoaded', function () {
    const quoNo = document.getElementById('quo_no');
    const quoDate = document.getElementById('quo_date');
    const quoValidity = document.getElementById('quo_validity');
    const quoDateCopy = document.getElementById('quo_date_copy');

    if (!quoNo || !quoDate || !quoDateCopy) {
        console.warn('quo_no, quo_date 또는 quo_date_copy 요소를 찾을 수 없습니다.');
        return;
    }

    // quo_date_copy에 "견적번호 / 날짜" 형태로 결합하여 반영하는 함수
    const updateCopy = () => {
        const noText = quoNo.textContent.trim();
        const dateText = quoDate.textContent.trim();

        if (noText && dateText) {
            quoDateCopy.textContent = `${noText} / ${dateText}`;
        } else {
            quoDateCopy.textContent = noText || dateText || '';
        }
    };

    // 💡 입력된 텍스트가 "숫자/숫자" 형태일 경우 날짜 포맷으로 바꿔주는 공용 함수
    const formatToDateString = function () {
        const text = this.textContent.trim();
        
        // 정규식: 숫자1~2자리/숫자1~2자리 형식 (예: 5/17, 05/17) 확인[cite: 19]
        const datePattern = /^(\d{1,2})\/(\d{1,2})$/;
        const match = text.match(datePattern);

        if (match) {
            const currentYear = new Date().getFullYear(); // 현재 연도 기준[cite: 19]
            const month = parseInt(match[1], 10);
            const day = parseInt(match[2], 10);

            const dateObj = new Date(currentYear, month - 1, day);

            // 유효한 날짜인 경우 포맷팅 진행 (예: 2026. 05. 17 형태로 변환)[cite: 19]
            if (dateObj.getMonth() === month - 1) {
                const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                const dayName = days[dateObj.getDay()];

                this.textContent = `${yyyy}. ${mm}. ${dd} (${dayName})`;
            }
        }
        
        updateCopy();
    };

    // 💡 quo_date와 quo_validity(존재할 경우)에만 포커스 아웃(blur) 시 날짜 변환 적용
    quoDate.addEventListener('blur', formatToDateString);
    if (quoValidity) {
        quoValidity.addEventListener('blur', formatToDateString);
    }

    // Enter 키를 누르면 줄바꿈 대신 포커스 해제(blur) 처리하는 공용 함수
    const preventEnterAndBlur = function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            this.blur();        
        }
    };

    quoDate.addEventListener('keydown', preventEnterAndBlur);
    if (quoValidity) {
        quoValidity.addEventListener('keydown', preventEnterAndBlur);
    }
    if (quoNo) {
        quoNo.addEventListener('keydown', preventEnterAndBlur);
    }

    quoDate.addEventListener('input', updateCopy);
    if (quoNo) {
        quoNo.addEventListener('input', updateCopy);
        quoNo.addEventListener('blur', updateCopy);
    }
    
    setTimeout(updateCopy, 50);
});