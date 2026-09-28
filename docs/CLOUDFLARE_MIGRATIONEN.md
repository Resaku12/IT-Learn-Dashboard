# D1-Migrationen bei dieser Installation

Die produktive D1-Datenbank wurde ursprünglich über die Cloudflare-Webkonsole eingerichtet. Deshalb enthält sie kein Wrangler-Migrationsjournal für `0001` und `0002`. Ein automatisches `wrangler d1 migrations apply` würde beide Dateien erneut ausführen und mit `table subjects already exists` abbrechen.

## Neue Migration anwenden

1. Öffne im Cloudflare-Dashboard **Storage & Databases → D1 → ausbildungszentrale → Console**.
2. Öffne für Migration 0003 auf GitHub die speziell für die Webkonsole vorbereitete Datei `docs/sql/0003_master_data_and_files_console.sql`. Für spätere Migrationen wird ebenfalls eine Console-Datei bereitgestellt.
3. Wähle **Raw**, kopiere den gesamten Inhalt in die D1-Konsole und klicke genau einmal auf **Execute**.
4. Der normale Cloudflare-Deploy-Befehl lautet `npm run deploy:cloudflare`; er veröffentlicht nur den Worker und führt keine alten Migrationen erneut aus.
5. Dokumentiere in der Beschreibung des Deployments, welche SQL-Datei zuletzt ausgeführt wurde.

Bereits erfolgreich ausgeführte Migrationen dürfen nicht erneut ausgeführt werden. Alle neuen Migrationen müssen additiv sein und dürfen bestehende Nutzerdaten nicht löschen.


### Wenn beide Prüfabfragen „no data“ liefern

Dann wurde `0003_master_data_and_files.sql` noch gar nicht angewendet. Verwende jetzt ausschließlich `docs/sql/0003_master_data_and_files_console.sql`: Öffne die Datei auf GitHub, wähle **Raw**, kopiere alles unverändert in das Eingabefeld und klicke genau einmal auf **Execute**. Diese Variante enthält weder eine führende reine Kommentarabfrage noch ein abschließendes Semikolon und verhindert damit leere Statements im Cloudflare-Batch. Wiederhole anschließend die beiden Prüfabfragen.

## Meldung „Requests without any query are not supported“

Diese Meldung erscheint, wenn in der D1-Konsole bei leerem Eingabefeld noch einmal **Execute** gewählt wird. Sie sagt nicht aus, dass die vorherige Migration fehlgeschlagen ist. Prüfe den Zustand mit:

```sql
SELECT name FROM sqlite_schema
WHERE type = 'table'
  AND name IN ('app_configuration','teachers','teacher_subjects','learning_fields','learning_field_subjects','contacts','training_years')
ORDER BY name;
```

Es müssen sieben Zeilen erscheinen. Prüfe zusätzlich die Dateierweiterung:

```sql
SELECT name FROM pragma_table_info('files')
WHERE name IN ('original_name','description','learning_field_id','lesson_id','task_id','category','updated_at')
ORDER BY name;
```

Erscheinen ebenfalls sieben Zeilen, wurde `0003_master_data_and_files.sql` vollständig angewendet. Führe die Migration dann nicht erneut aus. Bleibt die Eingabezeile unten leer, gib zuerst eine Prüfabfrage ein und klicke erst danach auf **Execute**.
