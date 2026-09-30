export type Status='not_started'|'learning'|'review'|'confident';
export interface Subject {id:number;name:string;color:string;description?:string;progress?:number}
export interface Topic {id:number;subject_id:number;title:string;status:Status;description:string;updated_at?:string}
export interface Task {id:number;title:string;description?:string;due_date:string;priority:'low'|'normal'|'high'|'urgent';status:'open'|'doing'|'done';category:string;subject_id?:number}
export interface Note {id:number;title:string;content:string;topic_id?:number;favorite:number;updated_at?:string}
export interface Event {id:number;title:string;event_date:string;type:string;subject_id?:number}
export interface Dashboard {subjects:Subject[];topics:Topic[];tasks:Task[];notes:Note[];events:Event[];flashcards:Array<{id:number;question:string;answer:string;topic_id:number;difficulty:string}>;grades:Array<{id:number;name:string;grade:number;subject_id:number;date:string}>;activities:Array<Record<string,unknown>>;departments:Array<Record<string,unknown>>;lessons:Array<Record<string,unknown>>;trainingEntries:Array<Record<string,unknown>>;learningFields?:LearningField[]}

export interface AppConfiguration {id:number;trainee_name?:string;profession:string;training_start?:string;training_end?:string;current_training_year?:number;company?:string;school?:string;class_name?:string;workdays:string}
export interface Teacher {id:number;first_name:string;last_name:string;abbreviation?:string;email?:string;note?:string;active:number}
export interface LearningField {id:number;code:string;name:string;description?:string;training_year?:number;status:'active'|'inactive'|'completed'}
export interface Department {id:number;name:string;abbreviation?:string;description?:string;location?:string;start_date?:string;end_date?:string;contact?:string;active:number}
export interface Contact {id:number;first_name:string;last_name:string;role:string;department_id?:number;email?:string;phone?:string;note?:string;active:number}
export interface TrainingYear {id:number;training_year:number;school_year?:string;start_date?:string;end_date?:string}
export interface ConfigurationData {configuration:AppConfiguration;subjects:Subject[];teachers:Teacher[];teacherSubjects:Array<{teacher_id:number;subject_id:number}>;learningFields:LearningField[];learningFieldSubjects:Array<{learning_field_id:number;subject_id:number}>;departments:Department[];contacts:Contact[];trainingYears:TrainingYear[]}
export interface StoredFile {id:number;original_name:string;object_key:string;mime_type:string;size:number;description?:string;subject_id?:number;learning_field_id?:number;topic_id?:number;lesson_id?:number;task_id?:number;category:string;created_at:string;subject_name?:string;learning_field_code?:string;learning_field_name?:string;topic_name?:string}
