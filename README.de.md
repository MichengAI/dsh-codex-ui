<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **Moderne UI-Suite für DeepSeek Harness: Schneller Eingabeverlauf, Vollbild-Einstellungs-Workbench, physische Milchglas-Themes und modulare Seitenleiste**

  [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

  [Änderungsprotokoll](CHANGELOG.md) · [Apache-2.0](LICENSE)

  [![Lizenz: Apache-2.0](https://img.shields.io/badge/Lizenz-Apache--2.0-blue.svg)](LICENSE)
  [![npm package](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![npm Downloads](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=npm%20Downloads&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 oder höher](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> **Hinweis**: DSH Codex UI ist ein von der Community gepflegtes Interface-Plugin für DeepSeek Harness (DSH) und kein offizielles Produkt von DeepSeek AI.

---

## Warum Codex UI 2.0 wählen?

Bei der täglichen Nutzung von DeepSeek Harness kann die Standardoberfläche durch enge Dialogfenster, eintönige Farben, unübersichtliche Seitenleisten oder verlorene Eingabeverläufe einschränken. **Codex UI 2.0 wurde von Grund auf neu konzipiert**, basierend auf **sechs entkoppelten Sub-Plugins und integrierter Ökosystem-Verwaltung** mit nativer Ausrichtung und hoher Ausführungsgeschwindigkeit:

* 🚀 **Schneller Eingabeverlauf & smarte Vorhersage**: Intelligente Inline-Vorhersage (`Tab` zum Übernehmen, `Alt+Ab/Auf` zum Wechseln), Terminal-Eingabeverlauf (`↑` / `↓`) und anpassbare Breitenregler;
* 🪟 **Vollbild-Einstellungs-Workbench**: Ersetzt beengte Dialoge durch eine Ambient Ground Diffuslicht-Fläche und schwebende Karten-Arbeitsbereiche;
* 🎨 **Physisches Milchglas & Themes**: 13 hochwertige Farbpaletten (inklusive Codex Anthrazit und Papierweiß), flache vs. schwebende Glimmer-Layoutmodi, 3 Unschärfe-Stufen und Bodenglanz-Schalter;
* 🧭 **Modulare Seitenleiste**: Sanftes Akkordeon-Menü und freies Drag-and-Drop-Sortieren; im eingeklappten Zustand **zu 100% am offiziellen 56px-Symbolstreifen ausgerichtet**;
* 🧠 **Intelligente Sitzungstitel**: Semantische Analyse der ersten Nachricht für normierte Titel, passend für Reasoning-Modelle mit langen Kontexten;
* 🌐 **Vollständige Unterstützung aller 8 offiziellen Sprachen**: Umfassender Support für Deutsch, Englisch, Chinesisch, Japanisch, Spanisch, Französisch, Russisch und Portugiesisch (`de`, `en`, `zh`, `ja`, `es`, `fr`, `ru`, `pt`), inklusive UI-Texten, Vorschlagskarten, Kontextmenüs und Sitzungstiteln;
* 🖥️ **Desktop-Fenstermenüs**: Integriert ein Hilfemenü in die Desktop-Titelleiste mit Ansichtsaktualisierung und zuverlässigem Neustart von App und Host;
* 📦 **Ökosystem-Verwaltung**: Zentrales Dashboard für offizielle und Drittanbieter-Plugins, Versionsprüfung und 1-Klick-Batch-Updates.

---

## Architekturelle Evolution: Warum ein vollständiger Rewrite?

### 1. Das Dilemma der 1.x-Linie: Technische Schulden durch invasive Overrides
In den Anfangstagen des DSH-Ökosystems gab es weder standardisierte Slots-Registrierungen noch offizielle Primitive-Komponenten. Version 1.x musste DOM-Knoten direkt manipulieren und globale CSS-Stile erzwingen.
Jedes Host-Update konnte Stile unvorhersehbar zerstören, und beim Deaktivieren von Themes blieben globale Farbdefinitionen oft isoliert zurück.

### 2. Designprinzipien der 2.0: Konsequente Ausrichtung auf offizielle Standards
Mit Version 2.0.0 wurde der alte Überschreibungscode vollständig **verworfen** und ein modernes Micro-Kernel-Fundament geschaffen:
* 🏛️ **Konsequente Nutzung offizieller Primitives und Slots**: Keine handgezeichneten CSS-Widgets mehr; ausschließlicher Einsatz der offiziellen `Switch`- und `Button`-Elemente;
* 🧩 **6 modulare Sub-Plugins**: Saubere Schnittstellen garantieren unabhängige Lebenszyklen und strikte Wartbarkeit;
* 🛡️ **Fail-Closed Sicherheitskontrakte**: Bei Deaktivierung eines Moduls werden alle injizierten Stile und Einstellungen rückstandslos aus dem DOM entfernt;
* 🔒 **Saubere Profil-Isolation**: Präzise Auflösung der Profilverzeichnisse verhindert gegenseitige Beeinflussung.

---

## Architektur: 6 Kern-Sub-Plugins und integriertes Modul

| Sub-Plugin-ID | Name | Funktionen |
| :--- | :--- | :--- |
| `composer` | **Eingabe-Erweiterung (Composer)** | Inline-Vorhersage (`Tab`), Terminal-Verlauf (`↑`/`↓`), Arbeitsbereich-Speicher, Breitenregler und Startkarten. |
| `settings-skin` | **Natives Einstellungs-Skin (Settings Skin)** | Vollbild-Workbench, schwebendes Kartensystem, Ambient Ground-Hintergrund und native Suche. |
| `theme` | **Theme & Glasmorphismus (Theme)** | 13 Farbpaletten, Flat vs. Mica-Karten, 3 Material-Presets und Bodenglanz-Effekte. |
| `sidebar` | **Modulare Seitenleiste (Sidebar)** | Akkordeon-Schublade, Drag-and-Drop-Sortierung, ungelesen/gelesen-Markierung und 56px-Leisten-Treue. |
| `session-title` | **Sitzungstitel (Session Title)** | Automatische semantische Titelgenerierung mit 8-Sprachen-Support und bis zu 4096 Tokens. |
| `desktop-menu` | **Desktop-Menüs (Desktop Menus)** | Titelleisten-Hilfemenü für Desktop mit Seiten-Reload und sicherem Neustart von Host und App. |
| `dependencies` | **Ökosystem-Verwaltung (Integriert)** | Dashboard für DSH-Plugins mit Live-npm-Download-Zahlen und synchronisierten 1-Klick-Updates. |

---

## Live-Vorschau in echter Umgebung

> *Alle Bildschirmfotos wurden direkt in laufenden DeepSeek Harness Web-Instanzen über `ego-browser` aufgenommen.*

### 1. Immersiver Arbeitsbereich und Eingabebereich (Dark Mode)
Codex Dark-Farbpalette mit zentrierten Starter-Aktionen, Aufgabenkarten und Eingabebereich mit variablen Breitenreglern sowie `↑↓`-Verlaufshinweisen.

![Dark Mode Konversation und Eingabe](assets/screenshots/conversation.png)

---

### 2. Papierweißer Arbeitsbereich (Light Mode)
Codex Light-Farbpalette mit sanftem Ambient Ground Diffuslicht-Farbverlauf für ein ruhiges Leseerlebnis.

![Light Mode Ambient Ground Arbeitsbereich](assets/screenshots/conversation-light.png)

---

### 3. Vollbild-Einstellungs-Workbench (Modulares Kartensystem)
Großzügige Einstellungs-Workbench mit modular strukturierten Karten, passend zu den aktiven Komponenten.

![Vollbild Einstellungs-Workbench](assets/screenshots/settings-about.png)

---

### 4. Erscheinungsbild und Milchglas-Anpassung
13 Farbauswahlkarten, Segmented Controls für Layout-Modus und Material-Weichzeichnung sowie Bodenglanz-Schalter.

---

### 5. Modulare Seitenleisten-Navigation (Ausgeklappt)
Frei sortierbare Navigationseinträge, Akkordeon-Fach für Werkzeuge und Schnellzugriffszeilen.

![Modulare Seitenleiste Ausgeklappt](assets/screenshots/sidebar.png)

---

### 6. Offizieller nativer 56px-Streifen (Eingeklappt)
Fügt sich nahtlos in den schmalen 56px-Streifen des Hosts ein, wobei alle Symbole zentriert und der Button für neue Chats stets präsent bleiben.

![Offizieller 56px Streifen Eingeklappt](assets/screenshots/sidebar-collapsed.png)

---

### 7. Erweitertes Kontextmenü für Sitzungen
Direkte Aktionen an jeder Konversation: Anheften, Umbenennen, Als ungelesen/gelesen markieren, Archivieren, Forken und sicheres Löschen.

![Erweitertes Sitzungskontextmenü](assets/screenshots/session-menu.png)

---

## Host-Kompatibilität

* **Unterstützte Generationen**: Vollständige DeepSeek Harness `0.2.x`-Reihe (`>=0.2.0-rc.1 <0.3.0-0`);
* **Geprüfte Builds**: Alle `0.2.x` Release Candidates (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`);
* **Laufzeit-Anforderungen**: Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

> ⚠️ **Wichtiger Hinweis**: Aktivieren Sie Codex UI und `ds-bot` nicht gleichzeitig, da beide Modifikationen an der Seitenleiste vornehmen.

---

## Installation & Erste Schritte

### Option A: Installation per KI-Agent (Empfohlen)

Senden Sie die folgende Aufforderung an einen Agenten mit Terminal-Zugriff (ersetzen Sie `web` durch Ihr gewünschtes Profil):

```text
Bitte installiere das DSH-Plugin @michengai/dsh-codex-ui in mein lokales web-Profil mit:
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
Führe danach dsh --profile web --dump-config aus und erinnere mich an das Neuladen des Browsers.
```

### Option B: Manuelle Installation

In PowerShell oder MSYS Bash ausführen:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

Nach der Installation DSH Web neu starten und den Browser mit `Strg + Umschalt + R` (bzw. `Cmd + Shift + R`) neu laden.

---

## Schnellübersicht der Bedienung

| Funktion | Anleitung |
| :--- | :--- |
| **Eingabevorschlag übernehmen** | `Tab` drücken, wenn vorausschauender Geistertext hinter dem Cursor erscheint; mit `Alt + Ab` / `Alt + Auf` Varianten wechseln oder mit `Esc` verwerfen. |
| **Vorhersage umschalten** | In **Einstellungen → Codex UI** auf der Karte „Eingabe-Erweiterungen“ umschalten. Kann für das gesamte Profil via `config.prediction: false` in `cordis.patch.yml` deaktiviert werden. |
| **Eingabeverlauf abrufen** | In leerem Eingabefeld `↑` / `↓` drücken, um durch die letzten 200 Eingaben des aktuellen Arbeitsbereichs zu blättern. |
| **Breite anpassen** | Bewegen Sie den Mauszeiger über die seitlichen Ränder der Eingabekarte und ziehen Sie die blauen Anfasser. |
| **Design & Weichzeichnung** | Unter **Einstellungen → Codex UI** aus 13 Paletten wählen und zwischen Flat- und Mica-Karten sowie Unschärfe-Stufen wechseln. |
| **Seitenleiste sortieren** | Elemente vertikal ziehen; blaue Linien signalisieren die genaue Ablageposition innerhalb oder außerhalb des Mehr-Fachs. |
| **Seitenleiste einklappen** | Oben auf der Seitenleiste auf Einklappen klicken, um zum offiziellen 56px-Symbolstreifen zu wechseln. |
| **Plugins aktualisieren** | In **Einstellungen → Codex UI** auf der Karte für Begleit-Plugins auf **Alle installieren/aktualisieren** klicken. |

---

## Ökosystem-Matrix

Nutzen Sie Codex UI zusammen mit den offiziellen Begleit-Plugins für einen nahtlosen Entwicklungs-Workflow:

| Plugin | Einsatzzweck |
| :--- | :--- |
| [Codex UI](https://github.com/MichengAI/dsh-codex-ui) | **UI-Kern**: Schneller Verlauf, Einstellungs-Skin, Milchglas und modulare Seitenleiste |
| [Agency Agents](https://github.com/MichengAI/dsh-agency-agents) | **Spezialisten-Matrix**: Bereitstellung und Koordination spezialisierter Agentenprofile |
| [Skills Manager](https://github.com/MichengAI/dsh-skills-manager) | **Skill-Zentrale**: Entdecken, Importieren, Aktivieren und Konfigurieren lokaler Skills |
| [Archive Manager](https://github.com/MichengAI/dsh-archive-manager) | **Sitzungsarchiv**: Tiefensuche, Wiederherstellung und Bereinigung alter Unterhaltungen |
| [IM Connect](https://github.com/MichengAI/dsh-im-connect) | **IM-Brücke**: Anbindung an WeChat, DingTalk, Feishu und QQBot |
| [Automation](https://github.com/MichengAI/dsh-automation) | **Automatisierung**: Cron-gesteuerte Workflows und Protokollierung von Ausführungsnachweisen |
| [Code Review](https://github.com/MichengAI/dsh-code-review) | **Code-Review**: `/review`-Befehl für autonome Code-Prüfungen mit Subagenten |
| [Simplify](https://github.com/MichengAI/dsh-simplify) | **Refaktorisierung**: `/simplify`-Befehl für parallele 4-Agenten-Bereinigung |
| [PUA](https://github.com/MichengAI/dsh-pua) | **Resilienz**: Fehlerbehebung, Hypothesenwechsel und Verifikation von Nachweisen |
| [BTW](https://github.com/MichengAI/dsh-btw) | **Nebenbei-Fragen**: Kurzzeitige Kontext-Fragen ohne Unterbrechung des Hauptstrangs |
| [Codex Pet](https://github.com/MichengAI/dsh-codex-pet) | **Desktop-Begleiter**: Interaktives Haustier für Freigaben und Benachrichtigungen |

---

## Lizenz

Veröffentlicht unter der [Apache-2.0-Lizenz](LICENSE).
