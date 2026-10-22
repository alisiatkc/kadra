import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Atom, GraduationCap, FlaskConical, Building2, Plus, Upload, Download, Search, Link2, StickyNote, Users, Check, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'

const icons = { q: Atom, k: GraduationCap, l: FlaskConical }
const colors = { q: '#9b83c6', k: '#d687aa', l: '#729ed0' }
export function departmentColor(n:any) { return colors[n.id] || (/^#[0-9a-f]{6}$/i.test(n.color||'') ? n.color : '#9b83c6') }
export function DepartmentBadge({department}:{department:any}) {
  const Icon=icons[department.id]||Building2
  return <Badge variant="outline" className="department-badge" style={{'--department-color':departmentColor(department)} as React.CSSProperties} title={department.name} aria-label={department.name}><Icon size={13} aria-hidden="true"/><span>{department.name}</span></Badge>
}
export function Node({node:n,departments,selected,dim}:{node:any,departments:any[],selected:boolean,dim:boolean}) {
 const Icon=icons[n.id]||Building2
 const shared={className:`node ${n.type==='department'?'department':n.type==='note'?'note':'person'} ${selected?'selected':''} ${dim?'dim':''}`, 'data-id':n.id,style:{left:n.x,top:n.y,'--accent':departmentColor(n)} as React.CSSProperties,tabIndex:0,role:'button','aria-label':`Редактировать ${n.name}`}
 if(n.type==='department')return <Card {...shared}><Icon className="department-symbol" size={24} aria-hidden="true"/><CardTitle>{n.name}</CardTitle></Card>
 return <Card {...shared}><CardHeader className="node-header">{n.type==='note'&&<div className="tag">Заметка</div>}<CardTitle className="person-name"><strong>{n.name}</strong>{n.note&&<span className="note-indicator" title={n.note}><AlertCircle size={13}/></span>}</CardTitle></CardHeader><CardContent className="node-content"><CardDescription className="role">{n.role|| (n.type==='person'?'Должность не указана':'Нажмите, чтобы добавить текст')}</CardDescription></CardContent>{n.type==='person'&&<CardFooter className="node-footer">{(n.groups||[]).map(id=>departments.find(d=>d.id===id)).filter(Boolean).map(d=><DepartmentBadge key={d.id} department={d}/>)}{!(n.groups||[]).length&&<span className="no-department">Подразделение не выбрано</span>}</CardFooter>}</Card>
}
const actions={add:[Plus,'Сотрудник'],import:[Upload,'Импорт'],export:[Download,'Экспорт JSON'],addDepartment:[Plus,'Подразделение'],note:[StickyNote,'Заметка'],link:[Link2,'Связь']}
export function renderButton(id:string){const [Icon,label]=actions[id]||[Plus,id];return renderToStaticMarkup(<Button id={id} variant={id==='add'?'default':'outline'} className={id==='add'?'primary':''}><Icon size={15} aria-hidden="true"/>{label}</Button>)}
function renderInput({id,value,...props}:any){return renderToStaticMarkup(<Input id={id} defaultValue={value} {...props}/>)}
function renderTextarea({id,value,...props}:any){return renderToStaticMarkup(<Textarea id={id} defaultValue={value} {...props}/>)}
(window as any).KadryUI={renderNode:(node:any,departments:any[],selected:boolean,dim:boolean)=>renderToStaticMarkup(<Node {...{node,departments,selected,dim}}/>),renderButton,renderInput,renderTextarea}
