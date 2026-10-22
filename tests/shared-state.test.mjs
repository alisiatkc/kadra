import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handleState,validateMap} from '../lib/map-state.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(fs.readFileSync('drizzle/0000_zippy_mastermind.sql','utf8'));
 return {sqlite,prepare(sql){return {bind(...args){return {
  async first(){return sqlite.prepare(sql).get(...args)||null},
  async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}}
 }}}}};
}
const original=()=>({nodes:[{id:'q',type:'department',name:'Кванториум',x:0,y:0,groups:[]},{id:'p',type:'person',name:'Сотрудник',role:'0,5',note:'',groups:['q'],x:200,y:150}],edges:[{from:'q',to:'p'}]});
const request=(method='GET',body)=>new Request('https://kadry.example/api/state',{method,headers:body?{'Content-Type':'application/json','Origin':'https://kadry.example'}:{},body:body?JSON.stringify(body):undefined});
test('one durable board, atomic revisions, stale writers and malformed documents',async()=>{
 const db=database();let a=await(await handleState(request(),db)).json();assert.equal(a.version,0);
 let response=await handleState(request('PUT',{version:0,data:original()}),db);assert.equal(response.status,200);assert.equal((await response.json()).version,1);
 const doc=original();doc.nodes[1].name='Новое имя';response=await handleState(request('PUT',{version:1,data:doc}),db);assert.equal(response.status,200);
 response=await handleState(request('PUT',{version:1,data:original()}),db);assert.equal(response.status,409);let body=await response.json();assert.equal(body.data.nodes[1].name,'Новое имя');assert.equal(body.version,2);
 // Fresh request/handler has no process-local map state.
 body=await(await handleState(request(),db)).json();assert.equal(body.data.nodes[1].name,'Новое имя');
 assert.equal((await handleState(new Request('https://kadry.example/api/state',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:'{}'}),db)).status,403);
 assert.throws(()=>validateMap({...original(),edges:[{from:'q',to:'missing'}]}));assert.throws(()=>validateMap({...original(),nodes:[...original().nodes,original().nodes[0]]}));db.sqlite.close();
});
function client(db,{storage=new Map(),offline=false}={}){
 let intervals=[];const elements=new Map();function element(){return{hidden:true,textContent:'',classList:{add(){},remove(){}},append(){},replaceChildren(){},querySelector(){return element()},click(){},remove(){}}}function el(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)}
 const client={offline};const context={data:structuredClone(original()),seed:structuredClone(original()),save(){},edit(){},render(){},fit(){},toast(){},checkpoint(){},selected:null,history:[],drag:null,$:el,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},document:{body:element(),hidden:false,createElement:element,querySelector:el,addEventListener(){}},window:{addEventListener(){}},setInterval:fn=>intervals.push(fn),setTimeout,clearTimeout,Blob,URL,AbortController,confirm:()=>true,fetch:async(path,options={})=>{if(client.offline)throw Error('offline');return handleState(new Request('https://kadry.example'+path,options),db)}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('src/sync.js','utf8'),context);return Object.assign(client,{context,storage,refresh:()=>intervals[0](),status:()=>el('#saved').textContent,change:code=>vm.runInContext(code,context),close:()=>{}});
}
const tick=ms=>new Promise(r=>setTimeout(r,ms));
test('two devices load saved edits, preserve concurrent drafts and recover an offline outbox',async()=>{
 const db=database(),a=client(db);await tick(150);const b=client(db);await tick(150);assert.match(a.status(),/Сохранено/);assert.equal(b.context.data.nodes[1].name,'Сотрудник');
 a.change("data.nodes[1].name='Правка с компьютера';data.nodes[1].x=450;save()");await tick(550);await b.refresh();assert.equal(b.context.data.nodes[1].name,'Правка с компьютера');assert.equal(b.context.data.nodes[1].x,450);
 // Both start from the same revision; only one conditional write can succeed.
 a.change("data.nodes[1].note='А';save()");b.change("data.nodes[1].note='Б';save()");await tick(600);assert.ok([a.status(),b.status()].some(s=>s.includes('другого устройства')));assert.equal(a.context.data.nodes[1].note,'А');assert.equal(b.context.data.nodes[1].note,'Б');
 const c=client(db);await tick(100);c.offline=true;c.change("data.nodes[1].role='Работа без сети';save()");await tick(450);assert.ok(c.storage.has('rgpu-cloud-outbox-v1'));
 // A reopened browser resumes the persisted outbox against the same server revision.
 const d=client(db,{storage:c.storage});await tick(200);assert.match(d.status(),/Сохранено/);let state=await(await handleState(request(),db)).json();assert.equal(state.data.nodes[1].role,'Работа без сети');
 c.offline=false;await tick(2200);db.sqlite.close();
});
