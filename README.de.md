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

Bei der täglichen Nutzung von DeepSeek Harness kann die Standardoberfläche durch enge Dialogfenster, eintönige Farben, unübersichtliche Seitenleisten oder verlorene Eingabeverläufe einschränken. **Codex UI 2.0 wurde von Grund auf neu konzipiert**, basierend auf **sieben entkoppelten Sub-Plugins** mit nativer Ausrichtung und hoher Ausführungsgeschwindigkeit:

* 🚀 **Schneller Eingabeverlauf & smarte Vorhersage**: Intelligente Inline-Vorhersage (`Tab` zum Übernehmen, `Alt+Ab/Auf` zum Wechseln), Terminal-Eingabeverlauf (`↑` / `↓`) und anpassbare Breitenregler;
* 🪟 **Vollbild-Einstellungs-Workbench**: Ersetzt beengte Dialoge durch eine Ambient Ground Diffuslicht-Fläche und schwebende Karten-Arbeitsbereiche;
* 🎨 **Physisches Milchglas & Themes**: 7 hochwertige Farbpaletten (inklusive Codex Anthrazit und Papierweiß), flache vs. schwebende Glimmer-Layoutmodi, 3 Unschärfe-Stufen und Bodenglanz-Schalter;
* 🧭 **Modulare Seitenleiste**: Sanftes Akkordeon-Menü und freies Drag-and-Drop-Sortieren; im eingeklappten Zustand **zu 100% am offiziellen 56px-Symbolstreifen ausgerichtet**;
* 🧠 **Intelligente Sitzungstitel**: Semantische Analyse der ersten Nachricht für normierte Titel, passend für Reasoning-Modelle mit langen Kontexten;
* 🌐 **Vollständige Unterstützung aller 8 offiziellen Sprachen**: Umfassender Support für Deutsch, Englisch, Chinesisch, Japanisch, Spanisch, Französisch, Russisch und Portugiesisch (`de`, `en`, `zh`, `ja`, `es`, `fr`, `ru`, `pt`), inklusive UI-Texten, Vorschlagskarten, Kontextmenüs und Sitzungstiteln;
* 🖥️ **Desktop-Fenstermenüs**: Integriert ein Hilfemenü in die Desktop-Titelleiste mit Ansichtsaktualisierung und zuverlässigem Neustart von App und Host;
* 📦 **Ökosystem-Verwaltung**: Zentrales Dashboard für offizielle und Drittanbieter-Plugins, Versionsprüfung und 1-Klick-Batch-Updates.

---

## Architektur: 7 Kern-Sub-Plugins

| Sub-Plugin-ID | Name | Funktionen |
| :--- | :--- | :--- |
| `composer` | **Eingabe-Erweiterung (Composer)** | Inline-Vorhersage (`Tab`), Terminal-Verlauf (`↑`/`↓`), Arbeitsbereich-Speicher, Breitenregler und Startkarten. |
| `settings-skin` | **Natives Einstellungs-Skin (Settings Skin)** | Vollbild-Workbench, schwebendes Kartensystem, Ambient Ground-Hintergrund und native Suche. |
| `theme` | **Theme & Glasmorphismus (Theme)** | 7 Farbpaletten, Flat vs. Mica-Karten, 3 Material-Presets und Bodenglanz-Effekte. |
| `sidebar` | **Modulare Seitenleiste (Sidebar)** | Akkordeon-Schublade, Drag-and-Drop-Sortierung, ungelesen/gelesen-Markierung und 56px-Leisten-Treue. |
| `session-title` | **Sitzungstitel (Session Title)** | Automatische semantische Titelgenerierung mit 8-Sprachen-Support und bis zu 4096 Tokens. |
| `desktop-menu` | **Desktop-Menüs (Desktop Menus)** | Titelleisten-Hilfemenü für Desktop mit Seiten-Reload und sicherem Neustart von Host und App. |
| `dependencies` | **Begleit-Plugins (Dependencies)** | Dashboard für DSH-Plugins mit Live-npm-Download-Zahlen und synchronisierten 1-Klick-Updates. |

---

## Host-Kompatibilität

* **Unterstützte Generationen**: Vollständige DeepSeek Harness `0.2.x`-Reihe (`>=0.2.0-rc.1 <0.3.0-0`);
* **Geprüfte Builds**: Alle `0.2.x` Release Candidates (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`);
* **Laufzeit-Anforderungen**: Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

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

## Lizenz

Veröffentlicht unter der [Apache-2.0-Lizenz](LICENSE).
