# Erste Schritte im veröffentlichten Dashboard

Diese Anleitung beginnt nach dem cloudbasierten Deployment. Du brauchst nur die von Cloudflare angezeigte Internetadresse und einen Browser.

## 1. Dashboard öffnen

Öffne die `workers.dev`-Adresse deiner Anwendung und melde dich gegebenenfalls über Cloudflare Access an. Auf dem Dashboard siehst du:

- die nächste anstehende Klausur,
- offene, heutige und überfällige Aufgaben,
- deinen aus Themenstatus berechneten Lernfortschritt,
- den Zustand der aktuellen Berichtsheftwoche,
- heutige Aufgaben und zuletzt bearbeitete Inhalte.

Über **Schnell hinzufügen** legst du direkt einen Lernzettel, eine Aufgabe, ein Thema, eine Karteikarte oder einen Termin an. Das Häkchen neben einer Tagesaufgabe markiert sie als erledigt.

## 2. Eigene Lernstruktur anlegen

1. Öffne links **Lernen**.
2. Klicke auf **Fach anlegen**, beispielsweise „Netzwerke“.
3. Klicke anschließend auf **Thema** und ordne es dem Fach zu, beispielsweise „IPv4“.
4. Pflege den Status rechts am Thema:
   - **Nicht begonnen** – noch nicht bearbeitet,
   - **Lernen** – wird gerade erarbeitet,
   - **Wiederholen** – verstanden, aber noch nicht sicher,
   - **Sicher** – kann zuverlässig angewendet werden.

Dashboard und Fortschrittsbereich berechnen daraus automatisch ihre Prozentwerte.

## 3. Aufgaben und Termine

- Unter **Aufgaben** legst du Aufgaben mit Fälligkeit und Priorität an, hakst sie ab oder löschst sie. Vergangene offene Fälligkeiten erscheinen automatisch als überfällig.
- Unter **Kalender** erfasst du Klausuren, Abgaben, Berufsschultage, Ausbildungstermine und Lernziele.
- Ein Termin mit der Art **Klausur** erscheint automatisch in der Dashboard-Karte „Nächste Prüfung“.

## 4. Lernzettel und Karteikarten

- Einen Lernzettel legst du über die Schnellaktion **Lernzettel** an. Der Inhalt unterstützt Markdown wie `# Überschrift`, `**fett**` und Listen mit `-`.
- Karteikarten erstellst du über **Karteikarte** und wiederholst sie unter **Prüfungstrainer**.
- Im Trainer deckst du die Antwort auf und bewertest dich mit „Wusste ich“, „Unsicher“ oder „Wusste ich nicht“.

Die Karteikartenmaske verlangt derzeit noch eine Themen-ID. Eine komfortable Themenauswahl ist eine vorgesehene UX-Verbesserung.

## 5. Weitere Bereiche

- **Berufsschule** fasst Unterrichtseinheiten und Noten zusammen.
- **Ausbildung** zeigt Abteilungen und dokumentierte Tätigkeiten.
- **Berichtsheft** zeigt Montag bis Freitag der aktuellen Kalenderwoche und markiert fehlende Tage.
- **Fortschritt** zeigt Gesamtfortschritt und Fachfortschritt.

Die Beispieldaten demonstrieren diese Ansichten. Aufgaben, Fächer, Themen, Lernstatus, Lernzettel, Karteikarten und Termine sind über die Oberfläche nutzbar. Die vollständigen Bearbeitungsdialoge für alle Schul-, Ausbildungs- und Berichtsheftdaten werden schrittweise ergänzt.

## 6. Suche, Darstellung und Backup

- Das Suchfeld oben durchsucht Themen, Lernzettel, Aufgaben, Karteikarten, Termine und Unterricht.
- Das Mond-/Sonnensymbol wechselt zwischen heller und dunkler Darstellung und merkt sich die Auswahl.
- Unter **Einstellungen → Daten exportieren** lädst du deine Daten als JSON-Backup herunter.

Die Demo-Einträge sind mit `is_demo = 1` gekennzeichnet. Einzelne Aufgaben, Themen und Lernzettel kannst du über das Papierkorb-Symbol löschen.

## 7. Wenn etwas nicht funktioniert

### Das Dashboard ist leer

Öffne im Cloudflare-Dashboard **Storage & Databases → D1 → ausbildungszentrale → Console**. Prüfe mit folgendem Befehl, ob die Demo-Daten vorhanden sind:

```sql
SELECT COUNT(*) AS anzahl FROM subjects;
```

Das Ergebnis sollte größer als `0` sein. Ist es `0`, führe im Browser nacheinander die SQL-Dateien `migrations/0001_initial.sql` und `migrations/0002_demo.sql` aus, wie in der README beschrieben.

### Speichern funktioniert nicht

Öffne **Workers & Pages → ausbildungszentrale → Settings → Bindings**. Prüfe, dass das D1-Binding exakt `DB` heißt und auf die Datenbank `ausbildungszentrale` zeigt. Unter **Observability → Logs** findest du verständliche Hinweise zu fehlgeschlagenen API-Aufrufen.

### Ein Update ist noch nicht sichtbar

Öffne **Workers & Pages → ausbildungszentrale → Deployments**. Kontrolliere den letzten Build und starte ihn bei Bedarf über **Retry deployment** erneut. Danach die Anwendung im Browser mit **Strg+F5** neu laden.

## D1-Fehler direkt nach dem ersten Deployment beheben

Wenn unter **Observability → Logs** ein Fehler mit `D1DatabaseSessionAlwaysPrimary` beim Aufruf von `/api/dashboard` erscheint, ist das D1-Binding erreichbar, aber mindestens eine benötigte Tabelle fehlt. Das ist kein Frontend-Fehler.

1. Öffne **Storage & Databases → D1 → ausbildungszentrale → Console**.
2. Öffne auf GitHub die Datei `migrations/0001_initial.sql`, wähle **Raw**, kopiere den gesamten Inhalt in die D1-Konsole und klicke auf **Execute**.
3. Warte auf die Erfolgsmeldung.
4. Wiederhole den Vorgang mit `migrations/0002_demo.sql`.
5. Öffne anschließend `https://<deine-worker-adresse>/api/health`. Erwartet wird `{"ok":true,"database":"ready",...}`.
6. Lade das Dashboard mit **Strg+F5** neu.

Falls bereits beim ersten Skript `table ... already exists` erscheint, wurde das Schema schon teilweise angelegt. Führe dann in der D1-Konsole `SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name;` aus und vergleiche die Ausgabe mit `0001_initial.sql`, bevor du einzelne fehlende `CREATE TABLE`-Anweisungen ausführst. Die Demo-Datei darf nur einmal ausgeführt werden, da sie absichtlich echte Beispieldatensätze einfügt.
