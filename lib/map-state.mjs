const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validateMap(input){
 if(!input||!Array.isArray(input.nodes)||!Array.isArray(input.edges)||input.nodes.length>1000||input.edges.length>5000)throw Error('Некорректная карта');
 const ids=new Set();const nodes=input.nodes.map(n=>{
  if(!n||typeof n.id!=='string'||!n.id||n.id.length>128||ids.has(n.id)||!['person','department','note'].includes(n.type)||typeof n.name!=='string'||n.name.length>500||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>1e6||Math.abs(n.y)>1e6)throw Error('Некорректная карточка');
  ids.add(n.id);let result={id:n.id,type:n.type,name:n.name,x:n.x,y:n.y};
  for(const key of ['role','note']){if(n[key]!=null&&(typeof n[key]!=='string'||n[key].length>10000))throw Error('Слишком длинный текст');result[key]=n[key]||''}
  if(n.groups!=null&&(!Array.isArray(n.groups)||n.groups.length>1000||n.groups.some(g=>typeof g!=='string')))throw Error('Некорректные подразделения');result.groups=[...new Set(n.groups||[])];
  if(n.color!=null){if(!/^#[a-f0-9]{6}$/i.test(n.color))throw Error('Некорректный цвет');result.color=n.color}
  return result;
 });
 const departments=new Set(nodes.filter(n=>n.type==='department').map(n=>n.id));if(nodes.some(n=>n.groups.some(id=>!departments.has(id))))throw Error('Подразделение не найдено');
 const edges=input.edges.map(e=>{if(!e||!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw Error('Некорректная связь');return{from:e.from,to:e.to}});
 return{nodes,edges};
}
async function read(db){const row=await db.prepare('SELECT document, version, updated_at FROM staff_maps WHERE id = ?').bind('main').first();return row?{data:JSON.parse(row.document),version:row.version,updatedAt:row.updated_at}:{data:null,version:0,updatedAt:null}}
// The Site is owner-private; dispatch authenticates every request, including service access.
export async function handleState(request,db){
 if(!db)return json({error:'Хранилище пока недоступно'},503);
 try{
  if(request.method==='GET')return json(await read(db));
  if(request.method!=='PUT')return json({error:'Метод не поддерживается'},405);
  const origin=request.headers.get('Origin');if((origin&&origin!==new URL(request.url).origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Запрос с другого сайта запрещён'},403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'Ожидается JSON'},415);
  const text=await request.text();if(new TextEncoder().encode(text).length>1500000)return json({error:'Карта слишком большая'},413);
  let body;try{body=JSON.parse(text)}catch{return json({error:'Некорректный JSON'},400)}
  if(!Number.isSafeInteger(body.version)||body.version<0)return json({error:'Не указана версия карты'},400);
  let data;try{data=validateMap(body.data)}catch(e){return json({error:e.message},400)}
  const now=new Date().toISOString(),document=JSON.stringify(data);
  const result=body.version===0
   ?await db.prepare('INSERT INTO staff_maps (id, document, version, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO NOTHING').bind('main',document,now).run()
   :await db.prepare('UPDATE staff_maps SET document = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(document,now,'main',body.version).run();
  if(result.meta.changes!==1)return json({error:'Карта уже изменена на другом устройстве',...(await read(db))},409);
  return json({version:body.version+1,updatedAt:now});
 }catch(error){console.error('Map storage request failed',error?.message);return json({error:'Не удалось обратиться к хранилищу'},503)}
}
