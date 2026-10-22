/* Graph presentation and local autosave. */
const palette={q:'#9b83c6',k:'#d687aa',l:'#729ed0'};

const baseRender=render,baseSave=save,baseTransform=transform;
function accent(n){return palette[n.id]||(/^#[0-9a-f]{6}$/i.test(n.color||'')?n.color:palette[(n.groups||[])[0]]||'#9b83c6')}
render=function(){baseRender();document.querySelectorAll('.node').forEach(el=>{let n=data.nodes.find(x=>x.id===el.dataset.id);el.style.setProperty('--accent',accent(n))});drawEdges()};
function rect(n){let el=[...document.querySelectorAll('.node')].find(x=>x.dataset.id===n.id);return{x:n.x,y:n.y,w:el?.offsetWidth||(n.type==='department'?210:190),h:el?.offsetHeight||116}}
function route(a,b){let A=rect(a),B=rect(b),dx=B.x+B.w/2-A.x-A.w/2,dy=B.y+B.h/2-A.y-A.h/2;let x1,y1,x2,y2,c1x,c1y,c2x,c2y,fromSide,toSide;if(Math.abs(dx)>Math.abs(dy)*1.3){let d=dx>=0?1:-1;x1=A.x+(d>0?A.w:0);y1=A.y+A.h/2;x2=B.x+(d>0?0:B.w);y2=B.y+B.h/2;let bend=Math.max(50,Math.abs(x2-x1)*.45);c1x=x1+d*bend;c1y=y1;c2x=x2-d*bend;c2y=y2;fromSide=d>0?'right':'left';toSide=d>0?'left':'right'}else{let d=dy>=0?1:-1;x1=A.x+A.w/2;y1=A.y+(d>0?A.h:0);x2=B.x+B.w/2;y2=B.y+(d>0?0:B.h);let bend=Math.max(50,Math.abs(y2-y1)*.45);c1x=x1;c1y=y1+d*bend;c2x=x2;c2y=y2-d*bend;fromSide=d>0?'bottom':'top';toSide=d>0?'top':'bottom'}return{path:`M${x1},${y1} C${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`,fromSide,toSide}}
drawEdges=function(){let defs='<defs>'+data.edges.map((e,i)=>{let n=data.nodes.find(n=>n.id===e.from);return `<marker id="arrow-${i}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L9 4.5 L0 9 Z" fill="${n?accent(n):'#888'}"/></marker>`}).join('')+'</defs>';$('#edges').innerHTML=defs+data.edges.map((e,i)=>{let a=data.nodes.find(n=>n.id===e.from),b=data.nodes.find(n=>n.id===e.to);if(!a||!b)return'';let focus=selected&&(selected===a.id||selected===b.id);return `<path class="edge ${focus?'focused':selected?'faded':''}" data-edge="${i}" stroke="${accent(a)}" marker-end="url(#arrow-${i})" d="${route(a,b).path}"><title>${esc(a.name)} → ${esc(b.name)}. Нажмите, чтобы удалить связь.</title></path>`}).join('')};
transform=function(){baseTransform();try{localStorage.setItem('rgpu-view-v1',JSON.stringify({scale,pan}))}catch{}};
save=function(){try{localStorage.setItem('rgpu-team-v1',JSON.stringify(data));$('#saved').textContent='● Сохранено · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}catch{$('#saved').textContent='Не сохранено — экспортируйте JSON';toast('Не удалось сохранить в браузере. Экспортируйте JSON.')}};
$('#viewport').addEventListener('pointermove',()=>{if(drag?.id){document.querySelectorAll('.node').forEach(el=>el.classList.toggle('dragging',el.dataset.id===drag.id));drawEdges()}});$('#viewport').addEventListener('pointerup',()=>{document.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'))});
$('#nodes').addEventListener('focusin',e=>{let el=e.target.closest('.node');if(el){selected=el.dataset.id;drawEdges()}});
render();
const baseEdit=edit;
edit=function(id){baseEdit(id);let p=$('#inspector'),started=false;p.querySelector('.tiny').textContent='Все изменения сохраняются автоматически в этом браузере.';p.oninput=()=>{let n=data.nodes.find(n=>n.id===id);if(!n)return;if(!started){checkpoint();started=true}n.name=$('#name').value.trim()||n.name;n.role=$('#role').value;n.note=$('#comment').value;if(n.type==='person'){n.groups=[...p.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value);data.edges=data.edges.filter(e=>!(e.to===id&&data.nodes.find(d=>d.id===e.from)?.type==='department'));n.groups.forEach(g=>data.edges.push({from:g,to:id}))}save();render()}};

$('#viewport').addEventListener('pointercancel',()=>{save();render()});

$('#addDepartment').onclick=()=>{checkpoint();let v=$('#viewport'),id='d'+Date.now();data.nodes.push({id,type:'department',name:'Новое подразделение',role:'Подразделение',note:'',color:'#9b83c6',x:(v.clientWidth/2-pan.x)/scale-66,y:(v.clientHeight/2-pan.y)/scale-66});save();edit(id)};
const editWithAutosave=edit;
edit=function(id){editWithAutosave(id);let n=data.nodes.find(n=>n.id===id);if(n.type==='department'&&!palette[n.id]){let label=document.createElement('label');label.textContent='Цвет подразделения';let input=document.createElement('input');input.type='color';input.value=accent(n);input.style.height='42px';label.append(input);$('#inspector').append(label);input.addEventListener('input',()=>{n.color=input.value;save();render()})}};

// Pointerdown checks the original target before canvas pointer capture retargets clicks.
document.addEventListener('pointerdown',event=>{
  if(event.button!==0||$('#inspector').hidden)return;
  if(event.target.closest('.node, #inspector, .edge, button, input, textarea, select, a, [role="button"]'))return;
  close();
});
