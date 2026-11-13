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
* 🎨 **Physisches Milchglas & Themes**: 14 hochwertige Farbpaletten (Serien Codex, Claude, Dracula, Cyberpunk, Solarized, Gruvbox und Catppuccin), flache vs. schwebende Glimmer-Layoutmodi, 3 Unschärfe-Stufen und Bodenglanz-Schalter;
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
| `composer` | **Eingabe-Erweiterung (Composer)** | Inline-Vorhersage (`Tab`), Terminal-Verlauf (`↑`/`↓`), Speicher pro Unterhaltung oder Arbeitsbereich, Breitenregler und Startkarten. |
| `settings-skin` | **Natives Einstellungs-Skin (Settings Skin)** | Vollbild-Workbench, schwebendes Kartensystem, Ambient Ground-Hintergrund und native Suche. |
| `theme` | **Theme & Glasmorphismus (Theme)** | 14 Farbpaletten, Flat vs. Mica-Karten, 3 Material-Presets und Bodenglanz-Effekte. |
| `sidebar` | **Modulare Seitenleiste (Sidebar)** | Arbeitsbereichs-Sektionen (inklusive direktem Button „Arbeitsbereich hinzufügen“ in jedem Abschnittskopf, sichtbar je nach Host-Ordnerauswahl und mit automatischer Zuordnung), Akkordeon-Schublade, Drag-and-Drop-Sortierung, ungelesen/gelesen-Markierung und 56px-Leisten-Treue. |
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
14 integrierte hochwertige Farbschemata und 1 offizielle Standardoption (umfassend die Serien Codex, Claude, Dracula, Cyberpunk, Solarized, Gruvbox und Catppuccin). Unterstützt traditionelles flaches Glas und schwebendes Mica-Design, 3 Materialstufen (Klar, Standard, Mattiert) und Bodenreflexions-Schalter. Basiert auf dynamischer Design-Token-Injektion mit sauberem Lebenszyklus-Cleanup zur Vermeidung globaler Stilverschmutzung.

#### Übersicht der integrierten Themes und Farbschemata

| Serie | Themenname | ID | Modus | Visueller Stil | Farbpalette (Akzent / Hintergrund / Text) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Offiziell** | **Offizieller Standard** | `stock` | Auto | System folgen Natives UI | Accent: ![](https://img.shields.io/badge/-%233b82f6-3b82f6) `#3b82f6` (Folgt dem System Hell/Dunkel, keine benutzerdefinierten Tokens) |
| **Codex** | **Codex Dunkel** | `codex-dark` | Dunkel | Immersives Anthrazit Puristischer Stil | Accent: ![](https://img.shields.io/badge/-%23339cff-339cff) `#339cff` · BG: ![](https://img.shields.io/badge/-%2309090b-09090b) `#09090b` · Text: ![](https://img.shields.io/badge/-%23fafafa-fafafa) `#fafafa` |
|  | **Codex Hell** | `codex-light` | Hell | Klares Papierweiß Angenehmes Lesen | Accent: ![](https://img.shields.io/badge/-%230169cc-0169cc) `#0169cc` · BG: ![](https://img.shields.io/badge/-%23ffffff-ffffff) `#ffffff` · Text: ![](https://img.shields.io/badge/-%2318181b-18181b) `#18181b` |
| **Claude** | **Claude Dunkel** | `claude-dark` | Dunkel | Warmer Dunkelton & Terrakotta | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23141414-141414) `#141414` · Text: ![](https://img.shields.io/badge/-%23fdfdfd-fdfdfd) `#fdfdfd` |
|  | **Claude Hell** | `claude-light` | Hell | Warmes Papier & Terrakotta | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23faf9f5-faf9f5) `#faf9f5` · Text: ![](https://img.shields.io/badge/-%231f1e1d-1f1e1d) `#1f1e1d` |
| **Dracula** | **Dracula** | `dracula` | Dunkel | Vampir-Pink & Cyber-Glow | Accent: ![](https://img.shields.io/badge/-%23ff79c6-ff79c6) `#ff79c6` · BG: ![](https://img.shields.io/badge/-%23191a21-191a21) `#191a21` · Text: ![](https://img.shields.io/badge/-%23f8f8f2-f8f8f2) `#f8f8f2` |
| **Cyberpunk** | **Cyberpunk** | `cyberpunk` | Dunkel | Neongrün auf Schwarz · Matrix-Terminal | Accent: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` · BG: ![](https://img.shields.io/badge/-%23000a00-000a00) `#000a00` · Text: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` |
| **Solarized** | **Solarized Dunkel** | `solarized-dark` | Dunkel | Tiefes Blaugrün & Cyan | Accent: ![](https://img.shields.io/badge/-%232aa198-2aa198) `#2aa198` · BG: ![](https://img.shields.io/badge/-%23002b36-002b36) `#002b36` · Text: ![](https://img.shields.io/badge/-%2393a1a1-93a1a1) `#93a1a1` |
|  | **Solarized Hell** | `solarized-light` | Hell | Warmes Pergament & Blau | Accent: ![](https://img.shields.io/badge/-%23268bd2-268bd2) `#268bd2` · BG: ![](https://img.shields.io/badge/-%23fdf6e3-fdf6e3) `#fdf6e3` · Text: ![](https://img.shields.io/badge/-%23586e75-586e75) `#586e75` |
| **Gruvbox** | **Gruvbox Dunkel** | `gruvbox-dark` | Dunkel | Retro-Dunkel & Warmgold | Accent: ![](https://img.shields.io/badge/-%23fabd2f-fabd2f) `#fabd2f` · BG: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` · Text: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` |
|  | **Gruvbox Hell** | `gruvbox-light` | Hell | Vintage-Kraftpapier & Bernstein | Accent: ![](https://img.shields.io/badge/-%23b57614-b57614) `#b57614` · BG: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` · Text: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` |
| **Catppuccin** | **Mocha** | `catppuccin-mocha` | Dunkel | Dunkles Mokka Augenschonend | Accent: ![](https://img.shields.io/badge/-%23cba6f7-cba6f7) `#cba6f7` · BG: ![](https://img.shields.io/badge/-%2311111b-11111b) `#11111b` · Text: ![](https://img.shields.io/badge/-%23cdd6f4-cdd6f4) `#cdd6f4` |
|  | **Macchiato** | `catppuccin-macchiato` | Dunkel | Dunkles Macchiato Sanft und elegant | Accent: ![](https://img.shields.io/badge/-%23c6a0f6-c6a0f6) `#c6a0f6` · BG: ![](https://img.shields.io/badge/-%23181926-181926) `#181926` · Text: ![](https://img.shields.io/badge/-%23cad3f5-cad3f5) `#cad3f5` |
|  | **Frappé** | `catppuccin-frappe` | Dunkel | Dunkles Frappé Nebelig-transparent | Accent: ![](https://img.shields.io/badge/-%23ca9ee6-ca9ee6) `#ca9ee6` · BG: ![](https://img.shields.io/badge/-%23232634-232634) `#232634` · Text: ![](https://img.shields.io/badge/-%23c6d0f5-c6d0f5) `#c6d0f5` |
|  | **Latte** | `catppuccin-latte` | Hell | Warmes Latte Hell und freundlich | Accent: ![](https://img.shields.io/badge/-%238839ef-8839ef) `#8839ef` · BG: ![](https://img.shields.io/badge/-%23eff1f5-eff1f5) `#eff1f5` · Text: ![](https://img.shields.io/badge/-%234c4f69-4c4f69) `#4c4f69` |

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
* **Geprüfte Builds**: Alle `0.2.x` Release Candidates (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`–`0.2.2-rc.3`);
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
| **Vorhersagemodus einstellen** | In **Einstellungen → Codex UI** auf der Karte „Eingabe-Erweiterungen“ den Modus auswählen (Aus / Nur Fortsetzung / Schätzen+Fortsetzung). Kann für das gesamte Profil via `config.prediction: false` in `cordis.patch.yml` deaktiviert werden. |
| **Eingabeverlauf abrufen** | In leerem Eingabefeld `↑` / `↓` drücken, um durch frühere Eingaben dieser Unterhaltung (oder des gesamten Arbeitsbereichs, in den Einstellungen umschaltbar; bis zu 200 Einträge pro Bereich) zu blättern. |
| **Verlaufsbereich wechseln** | In **Einstellungen → Codex UI → Eingabe-Erweiterungen** unter „Verlaufsbereich“ wählen: „Diese Unterhaltung“ (Standard) ruft nur Eingaben dieser Unterhaltung ab; „Arbeitsbereich“ teilt den Verlauf mit allen Unterhaltungen desselben Arbeitsverzeichnisses und macht früher gespeicherte Arbeitsbereichsverläufe wieder sichtbar (bis zu einem Limit der letzten 100 Bereiche vor dem Verwerfen). |
| **Breite anpassen** | Bewegen Sie den Mauszeiger über die seitlichen Ränder der Eingabekarte und ziehen Sie die blauen Anfasser. |
| **Design & Weichzeichnung** | Unter **Einstellungen → Codex UI** aus 14 Paletten wählen und zwischen Flat- und Mica-Karten sowie Unschärfe-Stufen wechseln. |
| **Seitenleiste sortieren** | Elemente vertikal ziehen; blaue Linien signalisieren die genaue Ablageposition innerhalb oder außerhalb des Mehr-Fachs. |
| **Arbeitsbereich im Abschnitt hinzufügen** | Über den Titel eines beliebigen Abschnitts (Angeheftet, Projekte oder benutzerdefiniert) fahren oder fokussieren und rechts neben `···` auf „Arbeitsbereich hinzufügen“ klicken (sichtbar bei verfügbarer Host-Ordnerauswahl); der neue Arbeitsbereich wird dort automatisch einsortiert und aufgeklappt. |
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
