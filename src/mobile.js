/* Responsive shell; desktop and mobile use the same controls and shared data. */
(()=>{
const small=window.matchMedia('(max-width: 700px)'),header=document.querySelector('header'),menu=$('#mobileActions'),more=$('#moreActions');
const anchors=new Map();for(const id of ['link','note','saved']){let control=$('#'+id),anchor=document.createComment('home-'+id);control.before(anchor);anchors.set(id,anchor)}
function closeMenu(){header.classList.remove('menu-open');more.setAttribute('aria-expanded','false');more.setAttribute('aria-label','Открыть меню действий')}
more.onclick=()=>{let open=header.classList.toggle('menu-open');more.setAttribute('aria-expanded',String(open));more.setAttribute('aria-label',open?'Закрыть меню действий':'Открыть меню действий')};
function moveControls(){closeMenu();for(const id of ['link','note','saved']){let control=$('#'+id);if(small.matches)(id==='saved'?$('#mobileStatus'):menu).append(control);else anchors.get(id).after(control)}}
small.addEventListener('change',()=>{moveControls();fit()});moveControls();
menu.addEventListener('click',event=>{if(event.target.closest('button'))closeMenu()});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#mobileActions, #moreActions'))closeMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
const allFit=fit;
function focusNode(node){if(!node)return;let bounds=rect(node),v=$('#viewport');scale=.85;pan={x:(v.clientWidth-bounds.w*scale)/2-node.x*scale,y:24-node.y*scale};transform()}
fit=function(){if(small.matches)focusNode(data.nodes.find(n=>n.id===selected)||data.nodes.find(n=>n.id==='q')||data.nodes[0]);else allFit()};
$('#fit').onclick=allFit;$('#zoom').onclick=allFit;
for(const button of document.querySelectorAll('[data-filter]')){const handler=button.onclick;button.onclick=event=>{handler(event);if(small.matches)focusNode(data.nodes.find(n=>n.id===(filter==='all'?'q':filter))||data.nodes[0])}}
const searchHandler=$('#search').oninput;$('#search').oninput=event=>{searchHandler(event);if(small.matches&&query)focusNode(data.nodes.find(n=>n.type==='person'&&visible(n)))};
const editCard=edit;edit=function(id){closeMenu();editCard(id);if(small.matches)focusNode(data.nodes.find(n=>n.id===id))};
// Capture pinch gestures before the single-pointer card/pan handlers.
const v=$('#viewport'),points=new Map();let pinch=null;
function geometry(){let [a,b]=[...points.values()],r=v.getBoundingClientRect();return{distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2-r.left,y:(a.y+b.y)/2-r.top}}
v.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')return;points.set(event.pointerId,{x:event.clientX,y:event.clientY});if(points.size>=2){if(drag?.id&&drag.moved)save();drag=null;let g=geometry();pinch={...g,scale,pan:{...pan}};v.setPointerCapture(event.pointerId);event.stopImmediatePropagation()}},{capture:true});
v.addEventListener('pointermove',event=>{if(!points.has(event.pointerId))return;points.set(event.pointerId,{x:event.clientX,y:event.clientY});if(!pinch)return;event.preventDefault();event.stopImmediatePropagation();if(points.size<2)return;let g=geometry(),next=Math.max(.2,Math.min(2,pinch.scale*g.distance/Math.max(pinch.distance,1)));pan={x:g.x-(pinch.x-pinch.pan.x)*next/pinch.scale,y:g.y-(pinch.y-pinch.pan.y)*next/pinch.scale};scale=next;transform()},{capture:true,passive:false});
function endTouch(event){if(event.pointerType!=='touch')return;points.delete(event.pointerId);if(pinch){event.stopImmediatePropagation();drag=null;document.querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));if(points.size===0)pinch=null}}
v.addEventListener('pointerup',endTouch,{capture:true});v.addEventListener('pointercancel',endTouch,{capture:true});
window.addEventListener('resize',()=>{if(small.matches)fit()});
requestAnimationFrame(()=>{if(small.matches)fit()});
})();
