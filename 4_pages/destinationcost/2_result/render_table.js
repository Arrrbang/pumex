/* render_table.js */
(function() {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[m]));
  }

  // ✨ 어떤 꼼수(?)를 부려도 무조건 줄바꿈으로 바꿔버리는 무적의 필터!
  function allowBr(s) {
    if (s == null) return '';
    
    // 1. 노션/API에서 넘어올 수 있는 모든 형태의 줄바꿈을 임시 기호([[BR]])로 싹 통일합니다.
    let temp = String(s)
      .replace(/&lt;br\s*\/?&gt;/gi, '[[BR]]') // API가 이미 이스케이프 해버린 경우
      .replace(/<br\s*\/?>/gi, '[[BR]]')       // 사용자가 직접 친 <br>, <BR>, <br/>
      .replace(/\\n/g, '[[BR]]')               // 텍스트 형태의 \n
      .replace(/\n/g, '[[BR]]');               // 실제 사용자가 친 엔터키(줄바꿈)

    // 2. 나머지 위험한 문자들만 안전하게 보안(esc) 처리합니다.
    temp = esc(temp);

    // 3. 안전하게 처리된 문장들 사이에, 임시 기호를 진짜 HTML 줄바꿈 태그로 바꿔 끼워 넣습니다!
    return temp.replace(/\[\[BR\]\]/g, '<br>');
  }

  window.TableRenderer = {
    render: function(wrapId, data, type, isRegionFiltered, cbm) {
      const wrap = typeof wrapId === 'string' ? document.getElementById(wrapId) : wrapId;
      if (!wrap) return;

      let rows = Array.isArray(data?.rows) ? data.rows : [];
      
      if (!rows.length) {
        wrap.innerHTML = '<div class="muted" style="padding:20px; text-align:center;">조회된 데이터가 없습니다.</div>';
        return;
      }

      rows.sort((a, b) => {
        const getGroup = (r) => {
          const dType = String(r.displayType || r['표시타입'] || '').trim();
          const bType = String(r.basicType || r['기본/추가'] || '').trim();
          if (dType === '기타내용') return 3; 
          if (bType === '추가' || bType === '선택') return 2; 
          return 1; 
        };
        const groupA = getGroup(a);
        const groupB = getGroup(b);
        if (groupA !== groupB) return groupA - groupB;

        const getOrd = (r) => {
          const n = r?.순서 ?? r?.order ?? r?.Order ?? r?.ORD ?? r?.index ?? r?.seq;
          return Number.isFinite(Number(n)) ? Number(n) : Infinity;
        };
        return getOrd(a) - getOrd(b);
      });

      const baseCur = (data?.currency || data?.currencyCode || '').toUpperCase();
      const colgroup = `<colgroup><col class="col-sel"><col class="col-item"><col class="col-amt"></colgroup>`;
      const thead = `<tr><th class="sel-col">구분</th><th>항목</th><th class="type-col">${esc(type)}</th></tr>`;

      let tbody = '';
      rows.forEach(r => {
        const bType = String(r.basicType || '').trim();
        const dType = String(r.displayType || r['표시타입'] || '').trim();
        
        if (dType === '기타내용') {
          const extra = r.extra || r['참고사항'] || '';
          const item = r.item || '상세 정보';
          
          tbody += `<tr class="row-other"><td class="sel">-</td><td colspan="2" class="item-cell has-extra hover-dim"><div class="item-title"><span class="toggle-icon">▶</span> <span>${allowBr(item)}</span></div><div class="item-extra">${allowBr(extra)}</div></td></tr>`;
        } else {
          const amt = r?.[type];
          let rawAmt = Number(amt);
          if (!Number.isFinite(rawAmt)) rawAmt = 0;
          
          const amtTxt = window.CostUI && window.CostUI.formatAmount ? window.CostUI.formatAmount(amt, type) : rawAmt.toLocaleString();
          const extra = r.extra || '';
          const item = r.item || '';
          const hasExtra = Boolean(extra.trim());
          
          // 토글이 없는 항목도 여백을 맞추기 위한 투명 아이콘 적용
          const toggleIcon = hasExtra ? '<span class="toggle-icon">▶</span>' : '<span class="toggle-icon"></span>';

          tbody += `
            <tr class="${bType === '추가' ? 'row-extra' : 'row-basic'}">
              <td class="sel">${bType === '추가' ? `<label class="sel-check"><input type="checkbox" class="extra-check" data-raw="${rawAmt}"></label>` : '기본'}</td>
              <td class="item-cell ${hasExtra ? 'has-extra hover-dim' : ''}">
                <div class="item-title">${toggleIcon} <span>${allowBr(item)}</span></div>
                ${hasExtra ? `<div class="item-extra">${allowBr(extra)}</div>` : ''}
              </td>
              <td class="amt" data-raw="${rawAmt}" data-base-amt="${rawAmt}">${amtTxt}</td>
            </tr>`;
        }
      });

      wrap.innerHTML = `<table class="result-table" data-base-currency="${esc(baseCur)}">${colgroup}<thead>${thead}</thead><tbody>${tbody}</tbody></table>`;

      // 아코디언 토글 이벤트
      wrap.querySelectorAll('.item-cell.has-extra').forEach(cell => {
        cell.addEventListener('click', function(e) {
          if (e.target.tagName === 'INPUT') return;
          const extraDiv = this.querySelector('.item-extra');
          const icon = this.querySelector('.toggle-icon');
          if (extraDiv) {
            const isHidden = extraDiv.style.display === 'none' || extraDiv.style.display === '';
            extraDiv.style.display = isHidden ? 'block' : 'none';
            if (icon) icon.textContent = isHidden ? '▼' : '▶';
          }
        });
      });
    }
  };
})();