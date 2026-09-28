# Meine Ausbildungszentrale

Eine persönliche Webanwendung für die Ausbildung zum **Fachinformatiker für Systemintegration**. Dashboard, Lerninhalte, Aufgaben, Berufsschule, betriebliche Tätigkeiten, Berichtsheft, Kalender, Karteikarten und Fortschritt verwenden ein gemeinsames Datenmodell.

> **Der Hauptweg ist vollständig cloudbasiert.** Für Einrichtung und spätere Updates brauchst du auf deinem Firmen-Notebook nur einen Browser, GitHub, Codex Cloud und das Cloudflare-Web-Dashboard. Du musst lokal weder Node.js noch Git, Wrangler oder einen Editor installieren.

## Architektur

- **React, TypeScript und Vite** für die Benutzeroberfläche
- **Cloudflare Worker mit Hono** für die API und die Auslieferung des Frontends
- **Cloudflare D1** als relationale Datenbank
- **Cloudflare R2** als vorbereiteter privater Dateispeicher
- **Cloudflare Workers Builds** für automatische Builds und Deployments direkt aus GitHub
- **GitHub Actions** als unabhängige Qualitätskontrolle für Pull Requests und `main`

Die Anwendung verwendet zunächst keinen selbst gebauten Login. Schütze die Worker-Adresse nach der Einrichtung mit Cloudflare Access und erlaube nur deine eigene E-Mail-Adresse.

# Cloud-Setup ohne lokale Installation

Du führst alle folgenden Schritte im Browser aus. Die Einrichtung ist einmalig.

## 1. Repository auf GitHub prüfen

Codex Cloud arbeitet bereits im verbundenen GitHub-Repository. Öffne das Repository auf github.com und kontrolliere, dass mindestens diese Dateien vorhanden sind:

- `package.json`
- `wrangler.jsonc`
- `worker/index.ts`
- `migrations/0001_initial.sql`
- `migrations/0002_demo.sql`

Spätere Änderungen lässt du von Codex Cloud committen. Nach einem Merge oder Push auf den verbundenen Produktionsbranch baut Cloudflare die Anwendung automatisch neu.

## 2. D1-Datenbank im Cloudflare-Dashboard erstellen

1. Öffne [dash.cloudflare.com](https://dash.cloudflare.com) und wähle dein Konto.
2. Öffne **Storage & Databases → D1 SQL database**.
3. Klicke auf **Create database**.
4. Verwende exakt den Namen `ausbildungszentrale`.
5. Öffne die neue Datenbank und kopiere die angezeigte **Database ID**.

## 3. Database ID ausschließlich im Browser eintragen

1. Öffne auf GitHub die Datei `wrangler.jsonc`.
2. Klicke auf das Stift-Symbol **Edit this file**.
3. Ersetze nur `D1_DATABASE_ID` durch die kopierte ID. Name und Binding `DB` bleiben unverändert.
4. Speichere die Änderung über **Commit changes** in einem Branch oder direkt in `main`.

Damit ist D1 als Binding `DB` Teil jeder Worker-Bereitstellung. Nach dem ersten Deployment kannst du die Verbindung in Cloudflare unter **Workers & Pages → ausbildungszentrale → Settings → Bindings** kontrollieren. Dort muss ein D1-Binding namens `DB` auf `ausbildungszentrale` zeigen.

## 4. R2-Bucket für Dateien erstellen

1. Öffne im Cloudflare-Dashboard **Storage & Databases → R2 Object Storage**.
2. Klicke auf **Create bucket**.
3. Verwende exakt den Namen `ausbildungszentrale-files`.

Die Konfiguration bindet diesen privaten Bucket unter dem Namen `FILES` an den Worker. Es werden keine öffentlichen R2-Zugangsdaten im Browser gespeichert.

## 5. GitHub-Repository mit Cloudflare Workers verbinden

1. Öffne **Workers & Pages** im Cloudflare-Dashboard.
2. Wähle **Create application → Import a repository** beziehungsweise **Connect to Git**.
3. Autorisiere Cloudflare für GitHub und wähle dieses Repository.
4. Wähle den Branch `main` als Produktionsbranch.
5. Trage in den Build-Einstellungen ein:

| Einstellung | Wert |
| --- | --- |
| Root directory | `/` beziehungsweise leer |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:cloudflare` |
| Non-production branch deploy command | `npx wrangler versions upload` |

6. Speichere und starte das erste Deployment.

Der Deploy-Befehl wendet zuerst alle noch nicht ausgeführten Dateien aus `migrations/` auf D1 an und veröffentlicht danach den Worker. Bei späteren Updates reicht ein Merge oder Push nach `main`; Cloudflare baut, migriert und veröffentlicht automatisch.

## 6. Falls die automatische Migration beim ersten Build nicht klappt

Die Migrationen lassen sich vollständig im Browser ausführen:

1. Öffne **Storage & Databases → D1 → ausbildungszentrale → Console**.
2. Öffne parallel auf GitHub `migrations/0001_initial.sql`, kopiere den gesamten Inhalt in die D1-Konsole und klicke auf **Execute**.
3. Wiederhole das einmal mit `migrations/0002_demo.sql`.
4. Ändere in den Cloudflare-Build-Einstellungen den **Deploy command** auf `npx wrangler deploy`, damit die bereits manuell ausgeführten SQL-Dateien nicht erneut angewendet werden.
5. Starte danach unter **Workers & Pages → ausbildungszentrale → Deployments** über **Retry deployment** einen neuen Build.

Führe die Demo-Migration nicht mehrfach manuell aus. Wenn du diesen Fallback verwendest, führst du auch künftige neue SQL-Dateien einmalig über die D1-Konsole aus. Der bevorzugte automatische Weg mit `npm run deploy:cloudflare` führt jede Migration dagegen nur einmal aus.

## 7. Anwendung privat schützen

1. Öffne im Cloudflare-Dashboard **Zero Trust**.
2. Öffne **Access → Applications → Add an application**.
3. Wähle **Self-hosted** und trage die veröffentlichte Worker-Adresse ein.
4. Erstelle eine Allow-Regel ausschließlich für deine E-Mail-Adresse.

Danach öffnest du die von Cloudflare angezeigte `workers.dev`-Adresse und meldest dich über Cloudflare Access an.

## Anwendung benutzen

Die bebilderungsunabhängige Schritt-für-Schritt-Anleitung für Dashboard, Fächer, Themen, Lernstatus, Aufgaben, Termine, Lernzettel, Karteikarten, Suche, Dark Mode und Backups steht unter **[Erste Schritte](docs/ERSTE_SCHRITTE.md)**.

Kurzfassung:

1. Unter **Lernen** zuerst ein Fach und anschließend Themen anlegen.
2. Den Status der Themen von „Nicht begonnen“ bis „Sicher“ pflegen.
3. Aufgaben und Klausuren über die Schnellaktionen auf dem Dashboard erfassen.
4. Regelmäßig unter **Einstellungen → Daten exportieren** ein JSON-Backup herunterladen.

## Automatische Qualitätssicherung

GitHub Actions führt bei Pull Requests und Änderungen auf `main` automatisch TypeScript-Prüfung, Tests und Produktions-Build aus. Das Ergebnis siehst du im GitHub-Tab **Actions**. Das eigentliche Deployment übernimmt Cloudflare Workers Builds; deshalb sind keine Cloudflare-API-Schlüssel als GitHub-Secrets nötig.

## Daten und Backups im Browser

- **JSON-Backup:** In der Anwendung **Einstellungen → Daten exportieren** wählen.
- **D1-Backup:** Im Cloudflare-Dashboard die D1-Datenbank öffnen und die Export-/Backup-Funktion verwenden.
- **R2-Dateien:** Im R2-Bucket können Dateien separat eingesehen und heruntergeladen werden.

Geheimnisse gehören niemals in `VITE_*`-Variablen oder in das Repository.

## Optionale lokale Entwicklung für Entwickler

Dieser Abschnitt ist für dich nicht erforderlich. Entwickler mit einer lokalen Node.js-Installation können optional ausführen:

```bash
npm install
npm run db:migrate:local
npm run dev
```

Prüfungen:

```bash
npm run check
```

Produktions- und lokale D1-Daten sind strikt getrennt. Lokale Daten liegen unter `.wrangler/state`.

## Datenmodell

Die versionierten Migrationen liegen unter `migrations/`. Fächer verbinden Themen; Themen verbinden Lernzettel, Karteikarten, Quizfragen, Dateien, Unterricht, Aufgaben und Termine. Aktivitäten referenzieren Abteilungen und können später in das Berichtsheft übernommen werden. `is_demo = 1` kennzeichnet Beispieldaten eindeutig.

## Erweiterung: Grundkonfiguration und echte Dateiablage

Der Hauptbereich **Grundkonfiguration** speichert persönliche Ausbildungsdaten, Fächer, Lehrer und deren Fachzuordnungen, Lernfelder, Abteilungen, betriebliche Ansprechpartner sowie Ausbildungsjahre zentral in D1. Aufgaben, Termine, Lernzettel, Karteikarten und Datei-Uploads verwenden diese Stammdaten bereits als Auswahl.

Dateien werden mit sicher erzeugten Objekt-IDs im privaten R2-Bucket `ausbildungszentrale-files` gespeichert. D1 enthält ausschließlich Metadaten und Verknüpfungen. Unterstützt werden PDF, PNG, JPEG, DOCX, XLSX, PPTX, TXT und Markdown bis 20 MB. MIME-Type, Dateisignatur und Größe werden serverseitig geprüft.

### Einmaliges Update im Cloudflare-Web-Dashboard

Beim bevorzugten Deploy-Befehl `npm run deploy:cloudflare` wird `migrations/0003_master_data_and_files.sql` automatisch und ohne Datenverlust angewendet. Falls dein Cloudflare-Projekt weiterhin nur `npx wrangler deploy` verwendet:

1. Öffne **Storage & Databases → D1 → ausbildungszentrale → Console**.
2. Öffne in GitHub `migrations/0003_master_data_and_files.sql`, wähle **Raw**, kopiere alles in die Konsole und klicke genau einmal auf **Execute**.
3. Öffne **Workers & Pages → it-learn-dashboard → Settings → Bindings**.
4. Kontrolliere das R2-Binding: Variablenname `FILES`, Bucket `ausbildungszentrale-files`. Lege den Bucket unter **R2 Object Storage → Create bucket** an, falls er noch fehlt.
5. Starte unter **Deployments** einen neuen Build und lade anschließend die Anwendung neu.

### Aktueller Integrationsstand

Bereits an zentrale Stammdaten angebunden sind die Auswahlfelder für Aufgaben, Termine, Lernzettel, Karteikarten und Dateien. Die Dateiverwaltung speichert Uploads real in R2 und Metadaten in D1.

Als nächste fachliche Ausbaustufe sollten die bisher überwiegend lesenden Ansichten **Berufsschule**, **Ausbildung** und **Berichtsheft** vollständige Erstellen-/Bearbeiten-Dialoge erhalten. Außerdem sollte die Themenseite zu einer eigenen Detailroute mit Tabs für Lernzettel, Karteikarten, Quiz und automatisch gefilterte Dateien ausgebaut werden. Die Datenbankbeziehungen dafür sind vorbereitet; bestehende Daten bleiben erhalten.
