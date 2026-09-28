export type Status='not_started'|'learning'|'review'|'confident';
export interface Subject {id:number;name:string;color:string;description?:string;progress?:number}
export interface Topic {id:number;subject_id:number;title:string;status:Status;description:string;updated_at?:string}
export interface Task {id:number;title:string;description?:string;due_date:string;priority:'low'|'normal'|'high'|'urgent';status:'open'|'doing'|'done';category:string;subject_id?:number}
export interface Note {id:number;title:string;content:string;topic_id?:number;favorite:number;updated_at?:string}
export interface Event {id:number;title:string;event_date:string;type:string;subject_id?:number}
export interface Dashboard {subjects:Subject[];topics:Topic[];tasks:Task[];notes:Note[];events:Event[];flashcards:Array<{id:number;question:string;answer:string;topic_id:number;difficulty:string}>;grades:Array<{id:number;name:string;grade:number;subject_id:number;date:string}>;activities:Array<Record<string,unknown>>;departments:Array<Record<string,unknown>>;lessons:Array<Record<string,unknown>>;trainingEntries:Array<Record<string,unknown>>}
