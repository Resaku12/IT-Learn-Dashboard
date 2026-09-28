import { Hono } from 'hono';
import { z } from 'zod';

type Bindings = { DB: D1Database; FILES: R2Bucket; ASSETS: Fetcher; APP_ENV: string };
type Resource = keyof typeof resourceFields;

const app = new Hono<{ Bindings: Bindings }>();
const resourceFields = {
  subjects: ['name', 'abbreviation', 'color', 'description', 'category', 'active', 'sort_order'],
  topics: ['subject_id', 'learning_field_id', 'title', 'status', 'description'],
  tasks: ['title', 'description', 'due_date', 'priority', 'status', 'category', 'subject_id', 'learning_field_id', 'topic_id'],
  notes: ['title', 'content', 'topic_id', 'favorite'],
  events: ['title', 'event_date', 'type', 'subject_id', 'learning_field_id', 'topic_id'],
  flashcards: ['topic_id', 'question', 'answer', 'difficulty', 'tags'],
  grades: ['subject_id', 'name', 'date', 'grade', 'weight', 'comment'],
  departments: ['name', 'abbreviation', 'start_date', 'end_date', 'description', 'technologies', 'contact', 'location', 'active'],
  activities: ['department_id', 'topic_id', 'activity_date', 'title', 'description', 'programs', 'duration_minutes'],
  lessons: ['subject_id', 'topic_id', 'lesson_date', 'title', 'notes', 'homework'],
  training_entries: ['week_id', 'weekday', 'entry_type', 'content', 'minutes'],
  teachers: ['first_name', 'last_name', 'abbreviation', 'email', 'note', 'active'],
  learning_fields: ['code', 'name', 'description', 'training_year', 'status'],
  contacts: ['first_name', 'last_name', 'role', 'department_id', 'email', 'phone', 'note', 'active'],
  training_years: ['training_year', 'school_year', 'start_date', 'end_date'],
} as const;

const allowedMime = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const safe = (value: unknown) => value === '' ? null : value;
const isResource = (value: string): value is Resource => value in resourceFields;
const id = (value: FormDataEntryValue | null) => value ? Number(value) : null;

function validSignature(type: string, bytes: Uint8Array) {
  if (type === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type.includes('openxmlformats')) return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if(type === 'text/plain' || type === 'text/markdown'){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);return true}catch{return false}}
  return false;
}

app.use('/api/*', async (c, next) => {
  try { await next(); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ type: 'api_error', path: c.req.path, message, stack: error instanceof Error ? error.stack : undefined }));
    if (message.includes('no such table')) return c.json({ error: 'Die Datenbankmigrationen fehlen. Bitte führe sie im Cloudflare-Dashboard aus.' }, 503);
    if (message.includes('UNIQUE constraint failed')) return c.json({ error: 'Dieser Eintrag existiert bereits.' }, 409);
    if (message.includes('FOREIGN KEY constraint failed')) return c.json({ error: 'Der Eintrag wird noch verwendet und kann nicht gelöscht werden.' }, 409);
    return c.json({ error: 'Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es erneut.' }, 500);
  }
});

app.get('/api/health', async c => {
  try {
    const result = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM subjects').first<{ count: number }>();
    return c.json({ ok: true, database: 'ready', subjects: result?.count ?? 0 });
  } catch {
    return c.json({ ok: false, database: 'not_ready', hint: 'Führe alle Migrationen in der richtigen Reihenfolge aus.' }, 503);
  }
});

app.get('/api/dashboard', async c => {
  const names = ['subjects', 'topics', 'tasks', 'notes', 'events', 'flashcards', 'grades', 'departments', 'activities', 'lessons', 'training_entries', 'learning_fields'] as const;
  const out: Record<string, unknown> = {};
  await Promise.all(names.map(async name => {
    out[name] = (await c.env.DB.prepare(`SELECT * FROM ${name} ORDER BY ${name === 'tasks' ? 'due_date' : name === 'events' ? 'event_date' : 'id'} ${name === 'notes' ? 'DESC' : 'ASC'}`).all()).results;
  }));
  return c.json({ ...out, trainingEntries: out.training_entries, learningFields: out.learning_fields });
});

app.get('/api/configuration', async c => {
  const query = (sql: string) => c.env.DB.prepare(sql).all().then(result => result.results);
  const [configuration, subjects, teachers, teacherSubjects, learningFields, learningFieldSubjects, departments, contacts, trainingYears] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM app_configuration WHERE id=1').first(),
    query('SELECT * FROM subjects ORDER BY sort_order,name'),
    query('SELECT * FROM teachers ORDER BY last_name,first_name'),
    query('SELECT * FROM teacher_subjects'),
    query('SELECT * FROM learning_fields ORDER BY training_year,code'),
    query('SELECT * FROM learning_field_subjects'),
    query('SELECT * FROM departments ORDER BY start_date,name'),
    query('SELECT * FROM contacts ORDER BY last_name,first_name'),
    query('SELECT * FROM training_years ORDER BY training_year'),
  ]);
  return c.json({ configuration, subjects, teachers, teacherSubjects, learningFields, learningFieldSubjects, departments, contacts, trainingYears });
});

app.put('/api/configuration', async c => {
  const body = await c.req.json<Record<string, unknown>>();
  const fields = ['trainee_name','profession','training_start','training_end','current_training_year','company','school','class_name','workdays'].filter(field => body[field] !== undefined);
  if (!fields.length) return c.json({ error: 'Keine Änderungen übermittelt.' }, 400);
  await c.env.DB.prepare(`UPDATE app_configuration SET ${fields.map(field => `${field}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=1`).bind(...fields.map(field => safe(body[field]))).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM app_configuration WHERE id=1').first());
});

app.put('/api/relations/:type/:id', async c => {
  const type = c.req.param('type');
  const parentId = Number(c.req.param('id'));
  const body = await c.req.json<{ ids: number[] }>();
  const ids = [...new Set(body.ids.filter(Number.isInteger))];
  const mapping = type === 'teacher-subjects'
    ? { table: 'teacher_subjects', parent: 'teacher_id', child: 'subject_id' }
    : type === 'learning-field-subjects'
      ? { table: 'learning_field_subjects', parent: 'learning_field_id', child: 'subject_id' }
      : null;
  if (!mapping || !Number.isInteger(parentId)) return c.json({ error: 'Ungültige Zuordnung.' }, 400);
  const statements = [c.env.DB.prepare(`DELETE FROM ${mapping.table} WHERE ${mapping.parent}=?`).bind(parentId), ...ids.map(child => c.env.DB.prepare(`INSERT INTO ${mapping.table}(${mapping.parent},${mapping.child}) VALUES (?,?)`).bind(parentId, child))];
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

app.get('/api/files', async c => {
  const clauses: string[] = [];
  const values: unknown[] = [];
  for (const [param, column] of [['q','f.original_name'],['subject_id','f.subject_id'],['learning_field_id','f.learning_field_id'],['topic_id','f.topic_id'],['category','f.category'],['mime_type','f.mime_type']] as const) {
    const value = c.req.query(param);
    if (!value) continue;
    clauses.push(param === 'q' ? `${column} LIKE ?` : `${column}=?`);
    values.push(param === 'q' ? `%${value.slice(0,100)}%` : value);
  }
  const rows = await c.env.DB.prepare(`SELECT f.*,s.name subject_name,lf.code learning_field_code,lf.name learning_field_name,t.title topic_name FROM files f LEFT JOIN subjects s ON s.id=f.subject_id LEFT JOIN learning_fields lf ON lf.id=f.learning_field_id LEFT JOIN topics t ON t.id=f.topic_id ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY f.created_at DESC`).bind(...values).all();
  return c.json(rows.results);
});

app.post('/api/files', async c => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'Bitte wähle eine Datei aus.' }, 400);
  if (!file.name || file.name.length > 255 || /[\x00-\x1f]/.test(file.name)) return c.json({ error: 'Der Dateiname ist ungültig oder zu lang.' }, 400);
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return c.json({ error: 'Die Datei muss zwischen 1 Byte und 20 MB groß sein.' }, 400);
  if (!allowedMime.has(file.type)) return c.json({ error: 'Dieser Dateityp wird nicht unterstützt.' }, 400);
  const buffer = await file.arrayBuffer();
  if (!validSignature(file.type, new Uint8Array(buffer).slice(0, 16))) return c.json({ error: 'Dateiinhalt und Dateityp stimmen nicht überein.' }, 400);
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const objectKey = `uploads/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${extension}`;
  await c.env.FILES.put(objectKey, buffer, { httpMetadata: { contentType: file.type } });
  try {
    const result = await c.env.DB.prepare('INSERT INTO files(name,original_name,object_key,mime_type,size,description,subject_id,learning_field_id,topic_id,lesson_id,task_id,category) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(file.name, file.name, objectKey, file.type, file.size, String(form.get('description') ?? ''), id(form.get('subject_id')), id(form.get('learning_field_id')), id(form.get('topic_id')), id(form.get('lesson_id')), id(form.get('task_id')), String(form.get('category') || 'Allgemein')).run();
    return c.json(await c.env.DB.prepare('SELECT * FROM files WHERE id=?').bind(result.meta.last_row_id).first(), 201);
  } catch (error) {
    await c.env.FILES.delete(objectKey);
    throw error;
  }
});

app.get('/api/files/:id/content', async c => {
  const row = await c.env.DB.prepare('SELECT * FROM files WHERE id=?').bind(Number(c.req.param('id'))).first<{object_key:string;original_name:string;mime_type:string}>();
  if (!row) return c.json({ error: 'Datei nicht gefunden.' }, 404);
  const object = await c.env.FILES.get(row.object_key);
  if (!object) return c.json({ error: 'Die Datei fehlt im Dateispeicher.' }, 404);
  const inline = !c.req.query('download') && (row.mime_type === 'application/pdf' || row.mime_type.startsWith('image/'));
  const safeName = row.original_name.replace(/["\r\n]/g, '_');
  return new Response(object.body, { headers: { 'Content-Type': row.mime_type, 'Content-Length': String(object.size), 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=300' } });
});

app.put('/api/files/:id', async c => {
  const body = await c.req.json<Record<string, unknown>>();
  const fields = ['description','subject_id','learning_field_id','topic_id','lesson_id','task_id','category'].filter(field => body[field] !== undefined);
  if (!fields.length) return c.json({ error: 'Keine Änderungen übermittelt.' }, 400);
  await c.env.DB.prepare(`UPDATE files SET ${fields.map(field => `${field}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...fields.map(field => safe(body[field])), Number(c.req.param('id'))).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM files WHERE id=?').bind(Number(c.req.param('id'))).first());
});

app.delete('/api/files/:id', async c => {
  const row = await c.env.DB.prepare('SELECT object_key FROM files WHERE id=?').bind(Number(c.req.param('id'))).first<{object_key:string}>();
  if (!row) return c.json({ error: 'Datei nicht gefunden.' }, 404);
  await c.env.FILES.delete(row.object_key);
  await c.env.DB.prepare('DELETE FROM files WHERE id=?').bind(Number(c.req.param('id'))).run();
  return c.json({ ok: true });
});

app.post('/api/:resource', async c => {
  const resource = c.req.param('resource');
  if (!isResource(resource)) return c.json({ error: 'Unbekannter Bereich.' }, 404);
  const body = await c.req.json<Record<string, unknown>>();
  const fields = resourceFields[resource].filter(field => body[field] !== undefined);
  if (!fields.length) return c.json({ error: 'Bitte fülle die Pflichtfelder aus.' }, 400);
  const required: Partial<Record<Resource,string[]>> = {subjects:['name'],topics:['title'],tasks:['title','due_date'],notes:['title'],events:['title','event_date'],flashcards:['question','answer'],departments:['name'],activities:['title','activity_date'],lessons:['title','lesson_date'],teachers:['first_name','last_name'],learning_fields:['code','name'],contacts:['first_name','last_name','role'],training_years:['training_year']};
  if ((required[resource] || []).some(field => body[field] === undefined || body[field] === null || String(body[field]).trim() === '')) return c.json({ error: 'Bitte fülle alle Pflichtfelder korrekt aus.' }, 400);
  for (const field of fields) if (typeof body[field] === 'string' && !z.string().max(20000).safeParse(body[field]).success) return c.json({ error: 'Eine Eingabe ist zu lang.' }, 400);
  const result = await c.env.DB.prepare(`INSERT INTO ${resource} (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`).bind(...fields.map(field => safe(body[field]))).run();
  return c.json(await c.env.DB.prepare(`SELECT * FROM ${resource} WHERE id=?`).bind(result.meta.last_row_id).first(), 201);
});

app.put('/api/:resource/:id', async c => {
  const resource = c.req.param('resource');
  if (!isResource(resource)) return c.json({ error: 'Unbekannter Bereich.' }, 404);
  const rowId = Number(c.req.param('id'));
  const body = await c.req.json<Record<string, unknown>>();
  const fields = resourceFields[resource].filter(field => body[field] !== undefined);
  if (!Number.isInteger(rowId) || !fields.length) return c.json({ error: 'Ungültige Eingabe.' }, 400);
  await c.env.DB.prepare(`UPDATE ${resource} SET ${fields.map(field => `${field}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...fields.map(field => safe(body[field])), rowId).run();
  return c.json(await c.env.DB.prepare(`SELECT * FROM ${resource} WHERE id=?`).bind(rowId).first());
});

app.delete('/api/:resource/:id', async c => {
  const resource = c.req.param('resource');
  if (!isResource(resource)) return c.json({ error: 'Unbekannter Bereich.' }, 404);
  const rowId = Number(c.req.param('id'));
  if (resource === 'subjects') {
    const usage = await c.env.DB.prepare('SELECT (SELECT COUNT(*) FROM topics WHERE subject_id=?)+(SELECT COUNT(*) FROM tasks WHERE subject_id=?)+(SELECT COUNT(*) FROM events WHERE subject_id=?)+(SELECT COUNT(*) FROM grades WHERE subject_id=?)+(SELECT COUNT(*) FROM files WHERE subject_id=?) count').bind(rowId,rowId,rowId,rowId,rowId).first<{count:number}>();
    if (usage?.count) return c.json({ error: `Dieses Fach wird noch in ${usage.count} Einträgen verwendet. Deaktiviere es stattdessen.` }, 409);
  }
  await c.env.DB.prepare(`DELETE FROM ${resource} WHERE id=?`).bind(rowId).run();
  return c.json({ ok: true });
});

app.get('/api/search', async c => {
  const q = `%${(c.req.query('q') || '').slice(0,100)}%`;
  const query = (table:string, columns:string) => c.env.DB.prepare(`SELECT * FROM ${table} WHERE ${columns.split(',').map(column => `${column} LIKE ?`).join(' OR ')} LIMIT 10`).bind(...columns.split(',').map(() => q)).all().then(result => result.results);
  const [topics, notes, tasks, flashcards, events, lessons] = await Promise.all([query('topics','title,description'),query('notes','title,content'),query('tasks','title,description'),query('flashcards','question,answer'),query('events','title,type'),query('lessons','title,notes')]);
  return c.json({ Themen:topics,Lernzettel:notes,Aufgaben:tasks,Karteikarten:flashcards,Termine:events,Unterricht:lessons });
});

app.get('/api/export', async c => {
  const tables = [...Object.keys(resourceFields), 'app_configuration','teacher_subjects','learning_field_subjects','files'];
  const output: Record<string, unknown> = { exportedAt:new Date().toISOString(),version:2 };
  for (const table of tables) output[table] = (await c.env.DB.prepare(`SELECT * FROM ${table}`).all()).results;
  return c.json(output);
});

export default app;
