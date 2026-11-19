(() => {
 'use strict';
 const API='https://backend-beta-lemon.vercel.app/api/isf/generate', $=id=>document.getElementById(id);
 const fields=[['hbl','HBL 번호'],['name','화주 영문명'],['birth','생년월일 (예: 25DEC1975)'],['passport','여권번호'],['origin','한국 주소'],['usAddress','미국 주소'],['quantity','수량 (CARTONS)'],['weight','중량 (kg)'],['container','컨테이너 / SEAL 번호']];
 let generation=0;
 function extract(items, pageWidth=1654, pageHeight=2339) {
  // PDF.js 버전에 따라 텍스트가 단어 단위로 나뉘어도 같은 높이의 항목을 한 줄로 묶습니다.
  const raw=items.filter(x=>x.str?.trim() && x.transform);
  const lines=[];
  for(const item of raw.slice().sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])) {
   const x=item.transform[4],y=item.transform[5];
   let line=lines.find(l=>Math.abs(l.y-y)<Math.max(2, pageHeight*0.002));
   if(!line){line={y,parts:[]};lines.push(line);}
   line.parts.push({x,text:item.str});
  }
  const region=(top,bottom)=>lines.filter(l=>l.y/pageHeight<top&&l.y/pageHeight>bottom)
   .map(l=>({y:l.y,parts:l.parts.filter(p=>p.x/pageWidth<0.30).sort((a,b)=>a.x-b.x)}))
   .filter(l=>l.parts.length).sort((a,b)=>b.y-a.y)
   .map(l=>l.parts.map(p=>p.text).join(' ').replace(/\s+/g,' ').trim());

  const sorted=items.filter(x=>x.str?.trim()).map(x=>({text:x.str.trim(),x:x.transform[4],y:x.transform[5]})).sort((a,b)=>b.y-a.y||a.x-b.x);
  const first=sorted.find(x=>/^[A-Z][A-Z ,.'-]+\s*\([^)]*[A-Z0-9][^)]*\)/i.test(x.text));
  const m=first?.text.match(/^(.+?)\s*\(([^)]*)\)/); const parts=(m?.[2]||'').split('/').map(x=>x.trim());
  const birth=parts.find(x=>/^\d{1,2}[A-Z]{3}\d{4}$/i.test(x))||'';
  const passport=parts.find(x=>/^[A-Z0-9]+$/i.test(x)&&x!==birth)||'';
  const data={name:m?.[1]?.trim()||'',birth,passport};
  if(first){const second=sorted.find(x=>x!==first&&x.y<first.y-20&&Math.abs(x.x-first.x)<100&&(x.text===data.name||x.text.startsWith(data.name+'(')));
   if(second){const address=sorted.filter(x=>x.y<first.y&&x.y>second.y&&Math.abs(x.x-first.x)<100).map(x=>x.text);data.origin1=address[0]||'';data.origin2=address.slice(1).join(' ');const next=sorted.filter(x=>x.y<second.y&&x.y>second.y-160&&Math.abs(x.x-second.x)<100&&!/SAME AS CONSIGNEE/i.test(x.text)).map(x=>x.text);data.destination=next[0]||'';data.destination2=next[1]||'';}
  }
  // 왼쪽 상단의 SHIPPER/CONSIGNEE 주소 영역은 이름 표기 차이와 무관하게 읽습니다.
  const korean=region(0.952,0.895), american=region(0.857,0.785);
  if(korean.length){data.origin1=korean[0];data.origin2=korean.slice(1).join(' ');}
  if(american.length){data.destination=american[0];data.destination2=american.slice(1).join(' ');}
  data.container=sorted.map(x=>x.text.match(/\b[A-Z]{4}\d{7}\s*\/\s*[A-Z0-9-]+\b/i)).find(Boolean)?.[0]||'';
  const pol=sorted.find(x=>/^[A-Z ]+,\s*KOREA$/i.test(x.text));
  const pod=sorted.find(x=>/^[A-Z ]+\s*,\s*UNITED STATES$/i.test(x.text));
  data.pol=pol?.text.split(',')[0].trim()||'';data.pod=pod?.text.split(',')[0].trim()||'';
  data.hbl=sorted.find(x=>/^\d{6}-[A-Z0-9]+-\d+$/i.test(x.text))?.text||'';
  data.quantity=sorted.map(x=>x.text.match(/\(?\s*([\d,]+)\s*(?:CARTONS|CTNS|PACKAGES|PKGS)\b/i)).find(Boolean)?.[1]?.replace(/,/g,'')||'';
  data.weight=sorted.map(x=>x.text.match(/([\d,]+(?:\.\d+)?)\s*KGS?\b/i)).find(Boolean)?.[1]?.replace(/,/g,'').replace(/\.0+$/,'')||'';
  const voyage=sorted.find(x=>/^[0-9]{2,5}[A-Z]{1,2}$/i.test(x.text)); const vessel=voyage&&sorted.filter(x=>x.x<voyage.x&&Math.abs(x.y-voyage.y)<12&&/[A-Z]/i.test(x.text)).sort((a,b)=>b.x-a.x)[0];
  return {person:data,vessel:vessel?.text||'',voyage:voyage?.text||''};
 }
 // UTF-8 바이트 기준 줄바꿈. 쉼표를 우선하고, 없으면 공백을 사용합니다.
 function wrapAddress(value, limit=45) {
  const text=String(value||'').replace(/\s+/g,' ').trim();
  const bytes=part=>new TextEncoder().encode(part).length;
  let rest=text;const lines=[];
  while(rest && bytes(rest)>limit){
   let end=0, used=0;
   for(const ch of rest){const size=bytes(ch);if(used+size>limit)break;used+=size;end+=ch.length;}
   if(!end)break;
   let part=rest.slice(0,end), next=rest.slice(end);
   // 경계가 단어 중간이 아니면 그 위치에서 줄을 나눕니다.
   if(!/\s$/.test(part)&&!/^\s/.test(next)){
    const comma=part.lastIndexOf(','); const space=part.lastIndexOf(' ');
    const cut=comma>=0?comma+1:space>=0?space:end;
    part=rest.slice(0,cut);next=rest.slice(cut);
   }
   lines.push(part.trimEnd());rest=next.trimStart();
  }
  if(rest)lines.push(rest);return lines.join('\n');
 }
 function rewrapAddress(input){
  const before=input.value,caret=input.selectionStart;
  // 공백·줄바꿈을 제외한 문자 수를 기준으로 편집 중 커서 위치를 보존합니다.
  const count=Array.from(before.slice(0,caret)).filter(ch=>!/(\s)/u.test(ch)).length;
  const trailing=/[ \t]$/.test(before);let wrapped=wrapAddress(before);
  if(trailing && wrapped && new TextEncoder().encode(wrapped.split('\n').at(-1)+' ').length<=45)wrapped+=' ';
  input.value=wrapped;
  if(caret===before.length){input.setSelectionRange(wrapped.length,wrapped.length);return;}
  if(!count){input.setSelectionRange(0,0);return;}
  let seen=0,pos=0;for(const ch of wrapped){pos+=ch.length;if(!/\s/u.test(ch))seen++;if(seen>=count)break;}input.setSelectionRange(pos,pos);
 }
 function card(person,n,filename) {
  const node=document.createElement('article'); node.className='person';
  const heading=document.createElement('h3'); heading.textContent=`HBL ${n} · ${filename}`; node.appendChild(heading);
  const grid=document.createElement('div'); grid.className='grid hbl-grid';
  for(const [key,label] of fields) {
   const lab=document.createElement('label'); lab.textContent=label;
   const isAddress=key==='origin'||key==='usAddress';
   const partnerField=['container'].includes(key);const active=($('partner').value==='KEYWORD'||$('partner').value.startsWith('SOS ('));if(partnerField){lab.classList.add('partner-field');lab.hidden=!active;}
   if(isAddress) lab.className='hbl-address';
   const input=document.createElement(isAddress?'textarea':'input');
   input.dataset.field=key; input.autocomplete='off'; input.required=!partnerField||active; if(partnerField)input.dataset.partnerField=key;
   if(isAddress) {
    input.rows=2;
    const values=key==='origin'?[person.origin1,person.origin2]:[person.destination,person.destination2];
    input.value=wrapAddress(values.filter(Boolean).join(' '));
    input.addEventListener('input',()=>rewrapAddress(input));
    input.placeholder='주소를 입력하세요 (한 줄 최대 45바이트)';
   } else {input.value=person[key]||'';if(key==='birth')input.placeholder=person.birth?'': '예: 19800526 또는 26MAY1980';}
   lab.appendChild(input); grid.appendChild(lab);
  }
  node.appendChild(grid); return node;
 }
 // 입력한 생년월일을 두 파트너가 공통으로 사용할 수 있는 DDMMMYYYY 형식으로 변환합니다.
 function normalizeBirth(value) {
  const input=String(value||'').trim().toUpperCase();
  const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let m=input.match(/^(\d{1,2})\s*([A-Z]{3})\s*(\d{4})$/), y, mo, d;
  if(m){d=+m[1];mo=months.indexOf(m[2])+1;y=+m[3];}
  else {m=input.match(/^(\d{4})(\d{2})(\d{2})$/)||input.match(/^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?$/);if(!m)return '';y=+m[1];mo=+m[2];d=+m[3];}
  const date=new Date(0);date.setUTCHours(0,0,0,0);date.setUTCFullYear(y,mo-1,d);
  if(y<1900||mo<1||mo>12||date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||date.getUTCDate()!==d)return '';
  return `${String(d).padStart(2,'0')}${months[mo-1]}${y}`;
 }
 function collectPerson(card) {
  const values=Object.fromEntries([...card.querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input.value.trim()]));
  const splitAddress=(value,label)=>{const lines=(value||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);if(lines.length>3)throw Error(`${label}가 3줄을 초과합니다. 주소를 줄여 3줄 이내로 입력해 주세요.`);return [lines[0]||'',lines[1]||'',lines[2]||''];};
  const [origin1,origin2,origin3]=splitAddress(values.origin,'한국 주소');
  const [destination,destination2,destination3]=splitAddress(values.usAddress,'미국 주소');
  delete values.origin; delete values.usAddress;
  return {...values,origin1,origin2,origin3,destination,destination2,destination3};
 }

 function updatePartnerFields(){const partner=$('partner').value;document.querySelectorAll('.partner-field').forEach(lab=>{const input=lab.querySelector('input'),key=input.dataset.partnerField;const active=(partner==='KEYWORD'||partner.startsWith('SOS ('));lab.hidden=!active;input.required=active;});const needsEta=partner.startsWith('SOS (')||partner==='KT (ATLANTA)';$('eta').required=needsEta;}
 $('partner').addEventListener('change',updatePartnerFields);

 const dropzone=$('dropzone'), pdfInput=$('pdfs');
 let pendingCards=null;
 for(const name of ['dragenter','dragover'])dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.add('is-dragging');});
 for(const name of ['dragleave','drop'])dropzone.addEventListener(name,e=>{e.preventDefault();dropzone.classList.remove('is-dragging');});
 dropzone.addEventListener('drop',e=>{
  const incoming=[...e.dataTransfer.files],existing=[...pdfInput.files];
  if(!incoming.length||incoming.some(file=>file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name))){$('status').textContent='PDF 파일만 추가할 수 있습니다.';return;}
  const key=file=>[file.name,file.size,file.lastModified].join('\u0000');
  const seen=new Set(existing.map(key));
  if(incoming.some(file=>{const k=key(file);if(seen.has(k))return true;seen.add(k);return false;})){$('status').textContent='이미 추가된 파일이 있습니다.';return;}
  if(existing.length+incoming.length>2){$('status').textContent='HBL PDF는 최대 2개까지 추가할 수 있습니다. 기존 파일을 삭제한 후 다시 추가해 주세요.';return;}
  const cards=[...document.querySelectorAll('#people .person')];
  const saved=existing.map((_,i)=>cards[i]?Object.fromEntries([...cards[i].querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input.value])):null);
  try{const transfer=new DataTransfer();[...existing,...incoming].forEach(file=>transfer.items.add(file));pdfInput.files=transfer.files;pendingCards=saved;pdfInput.dispatchEvent(new Event('change',{bubbles:true}));}
  catch(error){pendingCards=null;$('status').textContent='드래그 업로드를 사용할 수 없습니다. 파일 선택 버튼을 이용해 주세요.';}
 });

 function renderFiles(files) {
  const list=$('selectedFiles'); list.replaceChildren(); $('uploadedList').hidden=!files.length;
  $('fileCount').textContent=`${files.length} / 2개`;
  files.forEach((file,index)=>{
   const row=document.createElement('li'); row.className='file-row';
   const info=document.createElement('div'); info.className='file-info';
   const icon=document.createElement('span'); icon.className='pdf-badge'; icon.textContent='PDF'; icon.setAttribute('aria-hidden','true');
   const name=document.createElement('span'); name.className='file-name'; name.textContent=file.name; name.title=file.name;
   info.append(icon,name);
   const size=document.createElement('span'); size.className='file-size'; size.textContent=file.size>=1048576 ? `${(file.size/1048576).toFixed(2)} MB` : `${(file.size/1024).toFixed(1)} KB`;
   const remove=document.createElement('button'); remove.type='button'; remove.className='file-remove'; remove.textContent='삭제'; remove.setAttribute('aria-label',`${file.name} 삭제`);
   remove.addEventListener('click',()=>{try{const transfer=new DataTransfer();files.forEach((f,i)=>{if(i!==index)transfer.items.add(f)});pdfInput.files=transfer.files;pdfInput.dispatchEvent(new Event('change',{bubbles:true}));}catch(error){$('status').textContent='파일을 삭제할 수 없습니다. 파일 선택 버튼으로 다시 선택해 주세요.';}});
   row.append(info,size,remove); list.appendChild(row);
  });
 }
 pdfInput.addEventListener('change',async()=>{const saved=pendingCards;pendingCards=null;const current=++generation,files=[...pdfInput.files];renderFiles(files);$('people').replaceChildren();$('generate').disabled=true;$('result').textContent='';if(files.length<1){$('status').textContent='';return;}if(files.length>2||files.some(file=>file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name))){$('status').textContent='PDF 파일 1개 또는 2개를 선택해 주세요.';return;}if(!window.pdfjsLib){$('status').textContent='PDF 읽기 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';return;}
  $('status').textContent='PDF를 읽고 있습니다…';pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const parsed=[];
  for(const file of files){try{if(file.size>10*1024*1024)throw Error('파일 크기는 각각 10MB까지 가능합니다.');const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const page=await pdf.getPage(1);const viewport=page.getViewport({scale:1});const items=(await page.getTextContent()).items;parsed.push(extract(items,viewport.width,viewport.height));}catch(e){parsed.push({person:{},vessel:'',voyage:''});}}
  if(current!==generation)return;parsed.forEach((p,i)=>{const node=card(p.person,i+1,files[i].name);if(saved?.[i])node.querySelectorAll('[data-field]').forEach(input=>{if(Object.prototype.hasOwnProperty.call(saved[i],input.dataset.field))input.value=saved[i][input.dataset.field];});$('people').appendChild(node);});
  for(const key of ['vessel','voyage']){const vals=[...new Set(parsed.map(p=>p[key]).filter(Boolean))];$(key).value=vals.length===1?vals[0]:'';}
  const missingBirth=parsed.some(p=>!p.person.birth);const conflict=['vessel','voyage'].some(key=>new Set(parsed.map(p=>p[key]).filter(Boolean)).size>1);$('status').textContent=conflict?'두 HBL의 선명 또는 항차가 다릅니다. 공통 정보를 직접 확인해 주세요.':missingBirth?'생년월일을 찾지 못한 HBL이 있습니다. 해당 화주의 생년월일을 직접 입력해 주세요.':'자동 추출된 정보를 확인해 주세요. 찾지 못한 항목은 직접 입력해 주세요.';$('generate').disabled=false;
 });
 function formatEtd(value) {
  if (!/^\d{8}$/.test(value)) return '';
  const y=Number(value.slice(0,4)), m=Number(value.slice(4,6)), d=Number(value.slice(6,8));
  const date=new Date(0); date.setUTCHours(0,0,0,0); date.setUTCFullYear(y,m-1,d);
  if (!y || date.getUTCFullYear()!==y || date.getUTCMonth()!==m-1 || date.getUTCDate()!==d) return '';
  const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[m-1]}. ${value.slice(6,8)}, ${value.slice(0,4)}`;
 }
 function safeFilenamePart(value) {
  return String(value || '').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/g,'');
 }
 function makeFilename(partner, people) {
  const base=['ISF',partner,...people.map(person=>person.name)].map(safeFilenamePart).filter(Boolean).join(' ').slice(0,200).replace(/[. ]+$/g,'');
  return `${base}.xlsx`;
 }
 for(const id of ['etd','eta']) $(id).addEventListener('input', e=>{
  const input=e.currentTarget;
  input.value=input.value.replace(/\D/g,'').slice(0,8);
  input.setCustomValidity(input.value && !formatEtd(input.value) ? '올바른 날짜를 8자리로 입력해 주세요. 예: 20261119' : '');
 });
 $('isfForm').addEventListener('submit',async e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;const btn=$('generate');btn.disabled=true;$('result').textContent='엑셀을 생성하고 있습니다…';try{const etd=formatEtd($('etd').value);if(!etd)throw Error('올바른 ETD를 입력해 주세요.');const people=[...document.querySelectorAll('.person')].map(collectPerson);for(let i=0;i<people.length;i++){const birth=normalizeBirth(people[i].birth);if(!birth)throw Error(`HBL ${i+1}: 생년월일을 확인해 주세요. 예: 19800526 또는 26MAY1980`);people[i].birth=birth;}const eta=$('eta').value?formatEtd($('eta').value):'';if(($('partner').value.startsWith('SOS (')||$('partner').value==='KT (ATLANTA)')&&!eta)throw Error('올바른 ETA를 입력해 주세요.');const body={eta,partner:$('partner').value,forwarder:$('forwarder').value,mbl:$('mbl').value.trim(),etd,vessel:$('vessel').value.trim(),voyage:$('voyage').value.trim(),people};const token=localStorage.getItem('token');if(!token)throw Error('로그인이 필요합니다.');const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});if(!response.ok){let data;try{data=await response.json()}catch{}throw Error(data?.error||`요청 실패 (${response.status})`);}const blob=await response.blob();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=makeFilename($('partner').selectedOptions[0]?.textContent.trim() || body.partner,people);a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('result').textContent='엑셀 파일을 다운로드했습니다.';}catch(err){$('result').textContent=err.message||'엑셀 생성에 실패했습니다.';}finally{btn.disabled=false;}});
})();
