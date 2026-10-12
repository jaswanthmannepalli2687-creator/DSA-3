const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
let edges=[], vertices=new Set(), result=null, animTimer=null;

function addVertex(v){if(v){v=String(v).trim();if(v)vertices.add(v)}}
function addEdge(){
  const u=document.getElementById('from').value.trim(),v=document.getElementById('to').value.trim();
  const c=Number(document.getElementById('capacity').value);
  if(!u||!v||!c||c<1){alert('Enter valid From, To and Capacity values.');return}
  addVertex(u);addVertex(v);edges.push({u,v,c:Number(c),flow:0});refresh();
  document.getElementById('from').value='';document.getElementById('to').value='';document.getElementById('capacity').value='';
}
function clearGraph(){edges=[];vertices.clear();result=null;refresh();resetStats();log('Graph cleared.')}
function loadExample(){
  edges=[
    {u:'S',v:'A',c:16,flow:0},{u:'S',v:'C',c:13,flow:0},
    {u:'A',v:'B',c:12,flow:0},{u:'B',v:'C',c:9,flow:0},
    {u:'C',v:'A',c:4,flow:0},{u:'A',v:'D',c:10,flow:0},
    {u:'C',v:'D',c:14,flow:0},{u:'D',v:'B',c:7,flow:0},
    {u:'B',v:'T',c:20,flow:0},{u:'D',v:'T',c:4,flow:0}
  ];
  vertices=new Set(edges.flatMap(e=>[e.u,e.v]));result=null;refresh();
  document.getElementById('source').value='S';document.getElementById('sink').value='T';
  log('Example network loaded. Press Calculate Maximum Flow.');
}
function refresh(){
  const opts=[...vertices].sort().map(v=>`<option>${esc(v)}</option>`).join('');
  source.innerHTML=opts;sink.innerHTML=opts;
  if(vertices.has('S'))source.value='S'; if(vertices.has('T'))sink.value='T';
  edgeList.innerHTML=edges.map((e,i)=>`<div class="edge-item"><span>${esc(e.u)} → ${esc(e.v)}</span><b>${e.c}</b><button onclick="removeEdge(${i})">×</button></div>`).join('')||'<div class="small">No edges.</div>';
  draw();
}
function removeEdge(i){edges.splice(i,1);rebuildVertices();result=null;refresh()}
function rebuildVertices(){vertices=new Set(edges.flatMap(e=>[e.u,e.v]))}
function resetStats(){maxFlow.textContent='—';augmentations.textContent='0';minCut.textContent='—';tableWrap.innerHTML='<div class="small">Run the algorithm to view final edge flows.</div>'}
function log(s,cls=''){const el=document.getElementById('log');el.innerHTML+=`<div class="${cls}">${esc(s)}</div>`;el.scrollTop=el.scrollHeight}
function clearLog(){document.getElementById('log').innerHTML=''}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function solve(){
  const s=source.value,t=sink.value;
  if(!s||!t||s===t||!edges.length){alert('Select different source/sink vertices and add edges.');return null}
  const cap=new Map(), adj=new Map(); [...vertices].forEach(v=>adj.set(v,[]));
  edges.forEach((e,i)=>{
    cap.set(e.u+'|'+e.v,(cap.get(e.u+'|'+e.v)||0)+e.c);
    if(!adj.get(e.u).includes(e.v))adj.get(e.u).push(e.v);
    if(!adj.get(e.v).includes(e.u))adj.get(e.v).push(e.u);
  });
  const flow=new Map();edges.forEach((e,i)=>flow.set(i,0));
  const steps=[];let total=0;
  function residual(u,v){
    let r=cap.get(u+'|'+v)||0;
    edges.forEach((e,i)=>{if(e.u===v&&e.v===u)r-=flow.get(i)||0});
    edges.forEach((e,i)=>{if(e.u===u&&e.v===v)r+=0});
    // reverse residual is represented by subtracting current forward flow
    edges.forEach((e,i)=>{if(e.u===v&&e.v===u){}});
    return r;
  }
  // Build explicit residual matrix from original capacities and aggregate flow.
  const R={};[...vertices].forEach(u=>R[u]={});
  edges.forEach(e=>{R[e.u][e.v]=(R[e.u][e.v]||0)+e.c;R[e.v][e.u]=(R[e.v][e.u]||0)});
  const original={};edges.forEach((e,i)=>original[i]=e.c);
  function findPath(){
    const q=[s],parent={[s]:null};let qi=0;
    while(qi<q.length){const u=q[qi++];if(u===t)break;
      for(const v of adj.get(u)||[]){if(parent[v]===undefined && (R[u][v]||0)>0){parent[v]=u;q.push(v)}}
    }
    if(parent[t]===undefined)return null;
    const path=[];let v=t,b=Infinity;while(v!==s){const u=parent[v];path.push([u,v]);b=Math.min(b,R[u][v]);v=u}path.reverse();return {path,b};
  }
  while(true){
    const p=findPath();if(!p)break;
    total+=p.b;steps.push({path:p.path.map(x=>x[0]+'→'+x[1]),b:p.b,total});
    for(const [u,v] of p.path){R[u][v]=(R[u][v]||0)-p.b;R[v][u]=(R[v][u]||0)+p.b}
  }
  const finalFlow=edges.map(e=>({u:e.u,v:e.v,c:e.c,flow:0}));
  // Derive net flow on original edges from residual reverse capacity.
  edges.forEach((e,i)=>{
    const reverse=R[e.v][e.u]||0;
    const reverseOriginal=edges.filter(x=>x.u===e.v&&x.v===e.u).reduce((a,x)=>a+x.c,0);
    finalFlow[i]=Math.max(0,Math.min(e.c,reverse-reverseOriginal));
  });
  // More robustly calculate final flow by replaying augmentations on original edge directions.
  finalFlow.forEach(x=>x.flow=0);
  const residual2={};[...vertices].forEach(u=>residual2[u]={});
  edges.forEach(e=>{residual2[e.u][e.v]=(residual2[e.u][e.v]||0)+e.c;});
  // Track aggregate directed flow through a standard residual graph.
  const fmat={};[...vertices].forEach(u=>fmat[u]={});
  function getF(u,v){return (fmat[u]&&fmat[u][v])||0}
  // replay steps, choosing whether each path edge is forward or reverse
  for(const st of steps){
    for(const [u,v] of st.path){
      let idx=edges.findIndex(e=>e.u===u&&e.v===v);
      if(idx>=0){fmat[u][v]=(fmat[u][v]||0)+st.b}
      else {idx=edges.findIndex(e=>e.u===v&&e.v===u);if(idx>=0)fmat[v][u]=(fmat[v][u]||0)-st.b}
    }
  }
  edges.forEach((e,i)=>finalFlow[i].flow=Math.max(0,Math.min(e.c,getF(e.u,e.v))));
  // min-cut reachable vertices in final residual
  const reach=new Set([s]),qq=[s];let qi=0;
  while(qi<qq.length){const u=qq[qi++];for(const v of adj.get(u)||[]){let rr=0;
      const same=edges.filter(e=>e.u===u&&e.v===v).reduce((a,e)=>a+e.c,0);
      const ff=edges.filter(e=>e.u===u&&e.v===v).reduce((a,e)=>a+getF(e.u,e.v),0);
      const rev=edges.filter(e=>e.u===v&&e.v===u).reduce((a,e)=>a+getF(e.u,e.v),0);
      rr=same-ff+rev;
      if(rr>0&&!reach.has(v)){reach.add(v);qq.push(v)}
  }}
  let cut=0;edges.forEach(e=>{if(reach.has(e.u)&&!reach.has(e.v))cut+=e.c});
  return {s,t,total,steps,flow:finalFlow,reach,cut};
}
function runMaxFlow(){
  if(animTimer){clearInterval(animTimer);animTimer=null}
  clearLog();result=solve();if(!result)return;
  maxFlow.textContent=result.total;augmentations.textContent=result.steps.length;minCut.textContent=result.cut;
  log(`Source: ${result.s}   Sink: ${result.t}`,'active');
  result.steps.forEach((x,i)=>log(`Step ${i+1}: ${x.path.join(' → ')} | bottleneck = ${x.b} | total = ${x.total}`,'active'));
  log(`No more augmenting paths. Maximum flow = ${result.total}`,'ok');
  log(`Minimum cut capacity = ${result.cut}`,'cut');
  renderTable();draw();
}
function animateSteps(){
  result=solve();if(!result)return;clearLog();let i=0;
  if(animTimer)clearInterval(animTimer);
  maxFlow.textContent='0';augmentations.textContent='0';minCut.textContent='—';
  animTimer=setInterval(()=>{
    if(i>=result.steps.length){clearInterval(animTimer);animTimer=null;maxFlow.textContent=result.total;augmentations.textContent=result.steps.length;minCut.textContent=result.cut;log(`Animation complete. Max flow = ${result.total}`,'ok');renderTable();draw();return}
    const st=result.steps[i];log(`Augment ${i+1}: ${st.path.join(' → ')} | +${st.b}`,'active');
    maxFlow.textContent=st.total;augmentations.textContent=i+1;
    draw(st.path);i++;
  },900);
}
function renderTable(){
  tableWrap.innerHTML=`<table><thead><tr><th>Edge</th><th>Capacity</th><th>Flow</th><th>Residual</th><th>Status</th></tr></thead><tbody>`+
  result.flow.map(e=>`<tr><td>${esc(e.u)} → ${esc(e.v)}</td><td>${e.c}</td><td>${e.flow}</td><td>${e.c-e.flow}</td><td><span class="badge">${e.flow===e.c?'SATURATED':'AVAILABLE'}</span></td></tr>`).join('')+'</tbody></table>';
}
function positions(){
  const vs=[...vertices],w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;
  const pos={};const s=source.value,t=sink.value;
  if(vs.length===1){pos[vs[0]]={x:cx,y:cy};return pos}
  const others=vs.filter(v=>v!==s&&v!==t), left=s,right=t;
  if(s){pos[left]={x:80,y:cy};} if(t){pos[right]={x:w-80,y:cy}}
  others.forEach((v,i)=>{const cols=Math.max(1,Math.ceil(Math.sqrt(others.length)));const col=i%cols,row=Math.floor(i/cols);const x=250+col*((w-500)/Math.max(1,cols-1));const rows=Math.ceil(others.length/cols);const y=100+(row*((h-200)/Math.max(1,rows-1)));pos[v]={x,y}});
  vs.forEach((v,i)=>{if(!pos[v]){const a=2*Math.PI*i/vs.length;pos[v]={x:cx+Math.cos(a)*(w*.32),y:cy+Math.sin(a)*(h*.34)}}});
  return pos;
}
function resizeCanvas(){const r=canvas.getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);draw()}
function draw(highlight=[]){
  if(!canvas.width)return;const scale=devicePixelRatio||1,w=canvas.width/scale,h=canvas.height/scale;ctx.clearRect(0,0,w,h);
  const pos=positions();const hl=new Set(highlight.map(x=>x[0]+'→'+x[1]));
  edges.forEach(e=>{
    const a=pos[e.u],b=pos[e.v];if(!a||!b)return;
    const key=e.u+'→'+e.v,active=hl.has(key),cut=result&&result.reach.has(e.u)&&!result.reach.has(e.v);
    const ang=Math.atan2(b.y-a.y,b.x-a.x),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);const nx=Math.cos(ang),ny=Math.sin(ang);
    const start={x:a.x+nx*24,y:a.y+ny*24},end={x:b.x-nx*27,y:b.y-ny*27};
    ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineWidth=active?4:cut?3:2;ctx.strokeStyle=active?'#5eead4':cut?'#fbbf24':'#4b78a8';ctx.stroke();
    const ah=9;ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-nx*ah+ny*ah*.55,end.y-ny*ah-nx*ah*.55);ctx.lineTo(end.x-nx*ah-ny*ah*.55,end.y-ny*ah+nx*ah*.55);ctx.closePath();ctx.fillStyle=ctx.strokeStyle;ctx.fill();
    const mx=(start.x+end.x)/2,my=(start.y+end.y)/2-7;
    ctx.fillStyle='#dceaff';ctx.font='12px Segoe UI';ctx.textAlign='center';ctx.fillText(`${e.flow||0}/${e.c}`,mx,my);
  });
  [...vertices].forEach(v=>{const p=pos[v],isS=v===source.value,isT=v===sink.value;ctx.beginPath();ctx.arc(p.x,p.y,23,0,Math.PI*2);ctx.fillStyle=isS||isT?'#4b2330':'#10253d';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=isS||isT?'#fb7185':'#60a5fa';ctx.stroke();ctx.fillStyle='#f1f7ff';ctx.font='bold 14px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v,p.x,p.y)});
}
window.addEventListener('resize',resizeCanvas);
loadExample();resizeCanvas();
