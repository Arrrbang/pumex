/* 해상운임 변동 전용: 외부 그래프 라이브러리 없이 반응형 SVG와 지점별 운임 라벨을 생성합니다. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), section=$('rateHistory'), status=$('historyStatus'), charts=$('historyCharts'), retry=$('retryHistory');
  const colors=['#0078d4','#16816a','#b85e22','#8754ad','#c34167','#456c82'];
  let request=null,version=0,lastPorts=[];
  const tag=(name,text)=>{const el=document.createElement(name);if(text!==undefined)el.textContent=text;return el;};
  function svgTag(name,attrs={},text){const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
  function render(container){
    const card=tag('article');card.className='history-chart-card';card.appendChild(tag('h3',container.name));
    // 여러 PORT CODE가 같은 값을 나타내므로 데이터가 있는 첫 시계열 하나만 표시합니다.
    const candidates=container.series||[];
    const selected=candidates.find(line=>line.points.some(point=>typeof point.value==='number'&&Number.isFinite(point.value)))||candidates[0];
    const series=selected?[selected]:[];
    const values=series.flatMap(line=>line.points.map(point=>point.value)).filter(value=>typeof value==='number'&&Number.isFinite(value));
    if(!values.length){card.appendChild(tag('p','연결된 PORT CODE에 등록된 변동 데이터가 없습니다.'));charts.appendChild(card);return;}
    const width=Math.max(960,(series[0]?.points.length||0)*76+100),height=360,left=44,right=40,top=46,bottom=66;
    const n=Math.max(...series.map(line=>line.points.length),1);
    const min=Math.min(0,...values),rawMax=Math.max(0,...values),max=rawMax===min?min+1:rawMax+(rawMax-min)*.1;
    const x=i=>left+(n===1?(width-left-right)/2:i*(width-left-right)/(n-1));
    const y=value=>top+(max-value)*(height-top-bottom)/(max-min);
    const svg=svgTag('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':`${container.name} 운임 변동 꺾은선 그래프. 각 지점에 반올림한 운임 금액이 표시됩니다.`});
    for(let i=0;i<=4;i++){
      const value=min+(max-min)*i/4,py=y(value);
      svg.appendChild(svgTag('line',{x1:left,y1:py,x2:width-right,y2:py,stroke:'#e1e8ef'}));
    }
    const base=series[0]?.points||[],stride=Math.max(1,Math.ceil(n/8));
    base.forEach((point,i)=>{if(i%stride!==0&&i!==n-1)return;
      svg.appendChild(svgTag('text',{x:x(i),y:height-bottom+24,'text-anchor':'middle',fill:'#64748b','font-size':12},point.period.replace(/\s+(20DRY?|40HC)\s*$/i,'')));
    });
    svg.style.minWidth=`${width}px`;
    series.forEach((line,index)=>{
      const color=colors[index%colors.length];let path='';let open=false;
      line.points.forEach((point,i)=>{
        if(point.value===null||!Number.isFinite(point.value)){open=false;return;}
        path+=`${open?'L':'M'}${x(i)},${y(point.value)} `;open=true;
      });
      svg.appendChild(svgTag('path',{d:path,fill:'none',stroke:color,'stroke-width':2.5,'stroke-linejoin':'round'}));
      line.points.forEach((point,i)=>{
        if(point.value===null||!Number.isFinite(point.value))return;
        const dot=svgTag('circle',{cx:x(i),cy:y(point.value),r:4,fill:color,tabindex:0});
        const label=`${line.name} · ${line.code} · ${point.period}: $${Math.round(point.value).toLocaleString()}`;
        dot.setAttribute('aria-label',label);dot.appendChild(svgTag('title',{},label));svg.appendChild(dot);
        svg.appendChild(svgTag('text',{x:x(i),y:y(point.value)-13,'text-anchor':'middle',fill:'#122343','font-size':12,'font-weight':600},`$${Math.round(point.value).toLocaleString()}`));
      });

    });
    const plot=tag('div');plot.className='history-plot-scroll';plot.appendChild(svg);card.appendChild(plot);
    charts.appendChild(card);
  }
  function reset(){version++;request?.abort();request=null;section.hidden=true;charts.replaceChildren();status.textContent='';retry.hidden=true;lastPorts=[];}
  async function load(ports){
    request?.abort();const current=++version,abort=new AbortController();request=abort;lastPorts=ports;
    section.hidden=false;charts.replaceChildren();status.textContent='운임 변동 조회중…';retry.hidden=true;
    const timer=setTimeout(()=>abort.abort(),90000);
    try{
      const ids=[...new Set(ports.map(port=>port.id||port.value))];
      const response=await fetch(`https://notion-api-hub.vercel.app/api/rate-search/history?${new URLSearchParams({portIds:ids.join(',')})}`,{signal:abort.signal,cache:'no-store'});
      const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'운임 변동 조회 실패');
      if(current!==version)return;
      if(!Array.isArray(data.containers))throw Error('운임 변동 응답 형식이 올바르지 않습니다.');
      data.containers.forEach(render);status.textContent='';
    }catch(error){if(current!==version)return;charts.replaceChildren();status.textContent=error.name==='AbortError'?'운임 변동 조회 시간이 초과되었습니다.':error.message;retry.hidden=false;}
    finally{clearTimeout(timer);if(current===version)request=null;}
  }
  retry.addEventListener('click',()=>load(lastPorts));window.RateHistory={reset,load};
})();
