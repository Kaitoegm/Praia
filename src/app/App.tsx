import { Marca } from "./Marca"
import { useEffect, useState } from 'react'
import { CalendarDays, Camera, Trophy, MapPin, Users, Sun, Clock3, Umbrella, Volleyball, Utensils, Image as Photo } from 'lucide-react'

const tabs = [
  { path: '/agenda', label: 'Agenda', icon: CalendarDays },
  { path: '/ranking', label: 'Jogos', icon: Trophy },
  { path: '/album', label: 'Álbum', icon: Camera },
]
const days = ['Sáb', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex']
const events = [
  { time: '09h00', title: 'Manhã na praia', place: 'Guarda-sol da família', icon: Umbrella },
  { time: '16h00', title: 'Vôlei de areia', place: 'Quadra da orla', icon: Volleyball },
  { time: '19h30', title: 'Jantar em família', place: 'Casa da praia', icon: Utensils },
]
const ranking = [['Ana',12],['Bruno',12],['Clara',8],['Davi',5],['Elisa',3],['Felipe',2],['Gabi',0],['Luca',0],['Nina',0]] as const

function Agenda() {
  const [day, setDay] = useState(0)
  return <>
    <div className="hero"><div><span className="period"><CalendarDays size={16}/> 16 — 22 JAN 2027</span><h1>Férias em<br/>família</h1><span className="people"><Users size={16}/> 9 participantes</span></div></div>
    <section><h2>Agenda da viagem</h2><div className="days">{days.map((label,i)=><button key={label} aria-pressed={i===day} onClick={()=>setDay(i)}>{label}<strong>{16+i}</strong></button>)}</div></section>
    <section><h2>{day===0?'Sábado': ['','Domingo','Segunda','Terça','Quarta','Quinta','Sexta'][day]}, {16+day} de janeiro</h2>
    {day===0 ? events.map(({time,title,place,icon:Icon})=><article key={title}><span className="tile"><Icon/></span><div><small><Clock3 size={13}/>{time}</small><h3>{title}</h3><span className="location"><MapPin size={14}/>{place}</span></div></article>) : <p className="empty">Dia livre na praia.</p>}</section>
  </>
}

function Jogos() {
  return <><header className="panel blue"><Trophy/><h1>Jogos da família</h1><p>Classificação geral</p></header><section><h2>Ranking de pontuação</h2><ol>{ranking.map(([name,points],i)=><li key={name}><b>{ranking.findIndex(row=>row[1]===points)+1}º</b><strong>{name}</strong><span>{ranking[i][1]} pts</span></li>)}</ol></section></>
}

function Album() {
  return <><header className="panel yellow"><Sun/><h1>Minha cor</h1><p>Amarelo · Coleção de exemplo</p></header><section><h2>Minhas fotos</h2><strong>0 de 9 fotos enviadas</strong><ol className="grid">{Array.from({length:9},(_,i)=><li key={i}><Photo/><span>Foto {i+1} de 9</span></li>)}</ol></section></>
}

export function App() {
  const path = location.pathname.replace(/\/$/,'') || '/agenda'
  const current = tabs.find(tab=>tab.path===path)
  useEffect(()=>{document.title = (current?.label ?? 'Entrada')+' · OHANA'},[current])
  return <div className="shell"><a className="skip" href="#conteudo">Ir ao conteúdo</a><div className="brand"><Marca/> <span>Prévia da viagem</span></div>
    <main id="conteudo">{path==='/agenda'?<Agenda/>:path==='/album'?<Album/>:path==='/ranking'?<Jogos/>:<header className="panel"><Umbrella/><h1>{path==='/entrar'?'OHANA':'Página indisponível'}</h1><p>Explore a viagem com dados de exemplo.</p><a href="/agenda">Abrir agenda</a></header>}</main>
    <nav aria-label="Navegação principal">{tabs.map(({path:href,label,icon:Icon})=><a key={href} href={href} aria-current={path===href?'page':undefined}><Icon size={21}/>{label}</a>)}</nav></div>
}
