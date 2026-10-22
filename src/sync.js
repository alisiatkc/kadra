/* One shared board, optimistic revisions, and a recoverable local outbox. */
(()=>{
const OUTBOX='rgpu-cloud-outbox-v1',META='rgpu-cloud-meta-v1',BACKUP='rgpu-before-cloud-v1';
let ready=false,busy=false,dirty=false,blocked=false,revision=0,timer=null,retry=1000,remoteConflict=null;
const clone=x=>JSON.parse(JSON.stringify(x));
const fingerprint=d=>JSON.stringify({nodes:d.nodes.map(n=>({id:n.id,type:n.type,name:n.name,role:n.role||'',note:n.note||'',groups:[...(n.groups||[])].sort(),x:n.x,y:n.y,color:n.color||null})).sort((a,b)=>a.id.localeCompare(b.id)),edges:d.edges.map(e=>e.from+'\u0000'+e.to).sort()});
const localRead=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
const localWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const localRemove=k=>{try{localStorage.removeItem(k)}catch{}};
const initial=clone(data),hadLocal=!!localRead('rgpu-team-v1');
let outbox=localRead(OUTBOX),meta=localRead(META);
if(hadLocal&&!meta&&!localRead(BACKUP))localWrite(BACKUP,initial);
const banner=document.createElement('div');banner.id='sync-banner';banner.hidden=true;document.querySelector('main').append(banner);
function status(message){$('#saved').textContent=message}
function notice(message,buttons){banner.replaceChildren();let text=document.createElement('span');text.textContent=message;banner.append(text);buttons.forEach(([label,action])=>{let b=document.createElement('button');b.textContent=label;b.onclick=action;banner.append(b)});banner.hidden=false}
function dismiss(){banner.hidden=true;banner.replaceChildren()}
function download(d,name='Кадры-резервная-копия.json'){let a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function stash(){localWrite('rgpu-team-v1',data);localWrite(OUTBOX,{version:revision,data:clone(data)});dirty=true}
function ack(doc){meta={version:revision,fingerprint:fingerprint(doc)};localWrite(META,meta)}
async function request(method='GET',body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{let response=await fetch('/api/state',{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});let payload;try{payload=await response.json()}catch{throw Error('Не удалось открыть общую карту. Проверьте вход в аккаунт.')}if(!response.ok&&response.status!==409)throw Error(payload.error||'Ошибка сохранения');return{status:response.status,payload}}finally{clearTimeout(timeout)}}
function apply(snapshot){revision=snapshot.version;data=clone(snapshot.data);selected=null;$('#inspector').hidden=true;history=[];dirty=false;blocked=false;remoteConflict=null;localWrite('rgpu-team-v1',data);localRemove(OUTBOX);ack(data);dismiss();render();status('● Сохранено в общей карте')}
function schedule(delay=400){clearTimeout(timer);timer=setTimeout(flush,delay)}
function conflict(snapshot){blocked=true;remoteConflict=snapshot;status('⚠ Есть изменения с другого устройства');notice('Общая карта изменилась. Ваши правки сохранены отдельно на этом устройстве.',[
 ['Скачать мои правки',()=>download(data)],
 ['Загрузить общую карту',async()=>{if(!confirm('Загрузить общую версию? Ваши текущие правки будут сохранены в резервной копии.'))return;localWrite(BACKUP,data);try{const {payload}=await request();if(payload.data){apply(payload);fit()}}catch(e){toast(e.message)}}],
 ['Сохранить мою версию',async()=>{if(!confirm('Заменить общую карту вашей версией? Изменения с другого устройства будут заменены.'))return;try{let {payload}=await request();revision=payload.version;blocked=false;dismiss();stash();schedule(0)}catch(e){toast(e.message)}}]
 ])}
const localSave=save;
save=function(){localSave();stash();if(blocked){status('⚠ Локальные правки · общая карта не перезаписана');return}status(ready?'◌ Сохраняем общую карту…':'◌ Копия на устройстве · подключаемся…');schedule()};
async function initialize(){
 if(busy)return;busy=true;document.body.classList.add('sync-loading');status('◌ Загружаем общую карту…');
 try{
  const {payload:remote}=await request();ready=true;retry=1000;
  let pending=localRead(OUTBOX);if(pending&&pending.data)outbox=pending;
  if(!remote.data){revision=0;stash();schedule(0)}
  else if(outbox&&outbox.data){data=clone(outbox.data);if(fingerprint(data)===fingerprint(remote.data)){apply(remote)}else if(outbox.version===remote.version){revision=remote.version;dirty=true;render();schedule(0)}else{revision=outbox.version;dirty=true;render();conflict(remote)}}
  else if(dirty){if(fingerprint(data)===fingerprint(remote.data))apply(remote);else conflict(remote)}
  else{
   const legacy=hadLocal&&!meta&&fingerprint(initial)!==fingerprint(remote.data)&&fingerprint(initial)!==fingerprint(seed)?clone(initial):null;
   apply(remote);fit();if(legacy){notice('На этом устройстве есть прежняя локальная версия карты. Общая версия уже загружена.',[['Скачать прежнюю версию',()=>download(legacy,'Кадры-прежняя-версия.json')],['Перенести прежнюю версию',()=>{if(!confirm('Перенести прежнюю версию в общую карту? Это заменит текущие общие данные.'))return;checkpoint();data=clone(legacy);dismiss();render();save()}],['Оставить общую',dismiss]])}
  }
 }catch(e){status('○ Нет связи · правки остаются на устройстве');clearTimeout(timer);timer=setTimeout(initialize,Math.min(retry*=2,15000))}
 finally{busy=false;document.body.classList.remove('sync-loading')}
}
async function flush(){
 if(!ready){initialize();return}if(busy){schedule(250);return}if(!dirty||blocked)return;
 busy=true;const outgoing=clone(data),hash=fingerprint(outgoing),version=revision;status('◌ Сохраняем общую карту…');
 try{
  const {status:code,payload}=await request('PUT',{data:outgoing,version});
  if(code===409){if(payload.data&&fingerprint(outgoing)===fingerprint(payload.data)&&hash===fingerprint(data)){apply(payload)}else conflict(payload);return}
  revision=payload.version;ack(outgoing);retry=1000;
  if(hash===fingerprint(data)){dirty=false;outbox=null;localRemove(OUTBOX);status('● Сохранено в общей карте')}else{stash();schedule(0)}
 }catch(e){status('○ Нет связи · копия на устройстве');schedule(Math.min(retry*=2,15000))}
 finally{busy=false}
}
async function refresh(){
 if(!ready){initialize();return}if(busy||dirty||blocked||drag||!$('#inspector').hidden||document.hidden)return;
 busy=true;try{const {payload}=await request();if(dirty||drag||!$('#inspector').hidden)return;if(payload.data&&payload.version>revision){apply(payload);toast('Загружены изменения с другого устройства')}}catch{status('○ Нет связи · показываем последнюю копию')}finally{busy=false}
}
window.addEventListener('online',()=>{if(dirty)schedule(0);else refresh()});window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
window.addEventListener('pagehide',()=>{if(ready&&dirty&&!busy&&!blocked){fetch('/api/state',{method:'PUT',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({version:revision,data})}).catch(()=>{})}});
setInterval(refresh,4000);
// Server sync has its own status; editing copy is saved locally before upload.
const inspectorEdit=edit;edit=function(id){inspectorEdit(id);$('#inspector').querySelector('.tiny').textContent='Изменения сохраняются в общей карте и доступны на других устройствах.'};
initialize();
})();
