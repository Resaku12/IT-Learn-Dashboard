import type { ReactNode } from 'react';
export function Card({children,className=''}:{children:ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>}
export function Progress({value}:{value:number}){return <div className="progress" aria-label={`${value}%`}><span style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>}
export function Empty({title,action}:{title:string;action?:ReactNode}){return <div className="empty"><div className="empty-icon">✦</div><b>{title}</b><p>Lege deinen ersten Eintrag an und starte durch.</p>{action}</div>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>}
