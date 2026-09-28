-- Additive migration: preserves all existing user and demo data.
ALTER TABLE subjects ADD COLUMN abbreviation TEXT;
ALTER TABLE subjects ADD COLUMN category TEXT;
ALTER TABLE subjects ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1));
ALTER TABLE subjects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE departments ADD COLUMN abbreviation TEXT;
ALTER TABLE departments ADD COLUMN location TEXT;
ALTER TABLE departments ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1));

ALTER TABLE topics ADD COLUMN learning_field_id INTEGER REFERENCES learning_fields(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN learning_field_id INTEGER REFERENCES learning_fields(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN learning_field_id INTEGER REFERENCES learning_fields(id) ON DELETE SET NULL;

ALTER TABLE files ADD COLUMN original_name TEXT;
ALTER TABLE files ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE files ADD COLUMN learning_field_id INTEGER REFERENCES learning_fields(id) ON DELETE SET NULL;
ALTER TABLE files ADD COLUMN lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE files ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE files ADD COLUMN category TEXT DEFAULT 'Allgemein';
ALTER TABLE files ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
UPDATE files SET original_name = name WHERE original_name IS NULL;

CREATE TABLE app_configuration (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  trainee_name TEXT,
  profession TEXT NOT NULL DEFAULT 'Fachinformatiker für Systemintegration',
  training_start TEXT,
  training_end TEXT,
  current_training_year INTEGER CHECK(current_training_year BETWEEN 1 AND 3),
  company TEXT,
  school TEXT,
  class_name TEXT,
  workdays TEXT NOT NULL DEFAULT '1,2,3,4,5',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO app_configuration(id, profession) VALUES (1, 'Fachinformatiker für Systemintegration');

CREATE TABLE teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  abbreviation TEXT,
  email TEXT,
  note TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(first_name, last_name)
);
CREATE TABLE teacher_subjects (
  teacher_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  PRIMARY KEY(teacher_id, subject_id),
  FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
CREATE TABLE learning_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  training_year INTEGER CHECK(training_year BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','completed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE learning_field_subjects (
  learning_field_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  PRIMARY KEY(learning_field_id, subject_id),
  FOREIGN KEY(learning_field_id) REFERENCES learning_fields(id) ON DELETE CASCADE,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  department_id INTEGER,
  email TEXT,
  phone TEXT,
  note TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);
CREATE TABLE training_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_year INTEGER NOT NULL CHECK(training_year BETWEEN 1 AND 3),
  school_year TEXT,
  start_date TEXT,
  end_date TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(training_year)
);
INSERT INTO training_years(training_year) VALUES (1),(2),(3);

CREATE UNIQUE INDEX idx_subjects_name_nocase ON subjects(lower(name));
CREATE INDEX idx_files_subject ON files(subject_id);
CREATE INDEX idx_files_learning_field ON files(learning_field_id);
CREATE INDEX idx_files_topic ON files(topic_id);
CREATE INDEX idx_contacts_department ON contacts(department_id);
