<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **Suite d'interface moderne pour DeepSeek Harness : Rappel d'historique instantané, panneau de paramètres plein écran, thèmes en verre dépoli physique et barre latérale modulaire**

  [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

  [Journal des modifications](CHANGELOG.md) · [Apache-2.0](LICENSE)

  [![Licence : Apache-2.0](https://img.shields.io/badge/Licence-Apache--2.0-blue.svg)](LICENSE)
  [![Package npm](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![Téléchargements npm](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=t%C3%A9l%C3%A9chargements%20npm&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 ou ultérieur](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> **Avertissement** : DSH Codex UI est une extension d'interface communautaire pour DeepSeek Harness (DSH) et n'est pas un produit officiel de DeepSeek AI.

---

## Pourquoi choisir Codex UI 2.0 ?

Dans l'utilisation quotidienne de DeepSeek Harness, l'interface standard peut présenter des fenêtres de paramètres exigües, des palettes monochromes ou la perte de l'historique des requêtes. **Codex UI 2.0 a été intégralement repensé, de son architecture interne à son design visuel**, reposant sur **sept sous-plugins découplés** offrant des performances élevées, une faible intrusion et une intégration native :

* 🚀 **Rappel d'historique instantané et prédiction intelligente** : Prédiction et complétion de saisie en ligne (`Tab` pour accepter, `Alt+Bas/Haut` pour faire défiler), historique de commandes de style terminal (`↑` / `↓`), et poignées de redimensionnement adaptatif ;
* 🪟 **Atelier des paramètres en plein écran** : Remplace les boîtes de dialogue exiguës par un canevas à diffusion lumineuse Ambient Ground et des cartes flottantes ;
* 🎨 **Thèmes en verre dépoli physique et mica** : 7 palettes d'apparence de haute qualité (avec Codex Noir Carbone et Blanc Papier), modes d'agencement plat ou flottant mica, 3 préréglages de flou et reflets au sol ;
* 🧭 **Barre latérale modulaire** : Tiroir accordéon fluide et réorganisation libre par glisser-déposer ; s'aligne rigoureusement sur le rail compact officiel de 56px une fois repliée ;
* 🧠 **Titres de session intelligents** : Analyse sémantique du premier message pour extraire des titres standardisés adaptés aux modèles de raisonnement longs ;
* 🌐 **Prise en charge intégrale des 8 langues officielles** : Support complet pour le français, l'anglais, le chinois, le japonais, l'espagnol, l'allemand, le russe et le portugais (`fr`, `en`, `zh`, `ja`, `es`, `de`, `ru`, `pt`), adaptant textes, cartes d'accueil, menus contextuels et titres ;
* 🖥️ **Menus de fenêtre de bureau** : Intégration d'un menu d'aide dans la barre de titre avec actualisation de la vue et redémarrage fiable et sécurisé de l'hôte ;
* 📦 **Gestion de l'écosystème** : Tableau de bord unifié pour les plugins officiels et tiers, détection des versions et mise à jour groupée en un clic.

---

## Architecture : 7 Sous-Plugins Clés

| ID du Sous-Plugin | Nom | Fonctionnalités |
| :--- | :--- | :--- |
| `composer` | **Améliorations de Saisie (Composer)** | Prédiction en ligne (`Tab`), historique terminal (`↑`/`↓`), isolation par espace de travail, poignées de largeur et cartes de suggestions. |
| `settings-skin` | **Habillage des Paramètres (Settings Skin)** | Atelier plein écran, cartes d'options flottantes, arrière-plan Ambient Ground et recherche native. |
| `theme` | **Thème et Verre Dépoli (Theme)** | 7 palettes de couleurs, modes Plat vs. Cartes Mica, 3 niveaux de flou et contrôle des reflets au sol. |
| `sidebar` | **Barre Latérale Modulaire (Sidebar)** | Déploiement accordéon, réorganisation par glisser-déposer, marquage lu/non-lu et alignement parfait avec le rail 56px. |
| `session-title` | **Titres de Session (Session Title)** | Génération intelligente de titres selon la sémantique de départ avec prise en charge de 8 langues et jusqu'à 4096 jetons. |
| `desktop-menu` | **Menus de Bureau (Desktop Menus)** | Menu d'aide dans la barre de titre avec actualisation de la vue et redémarrage sécurisé de l'application et de l'hôte. |
| `dependencies` | **Gestion des Extensions (Dependencies)** | Suivi des dépendances associées, compteur de téléchargements npm en direct et mise à jour groupée en un clic. |

---

## Compatibilité avec l'Hôte

* **Générations Prises en Charge** : Famille DeepSeek Harness `0.2.x` (`>=0.2.0-rc.1 <0.3.0-0`) ;
* **Versions Validées** : Toutes les versions RC de `0.2.x` (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`) ;
* **Prérequis d'Exécution** : Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

---

## Installation et Prise en Main

### Option A : Installation Assistée par Agent (Recommandé)

Transmettez l'instruction suivante à un agent capable d'exécuter des commandes de terminal (remplacez `web` par le profil souhaité) :

```text
Veuillez installer le plugin DSH @michengai/dsh-codex-ui dans mon profil web local en exécutant :
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
Puis exécutez dsh --profile web --dump-config pour confirmer son activation et rechargez le navigateur.
```

### Option B : Installation Manuelle

Exécutez dans PowerShell ou MSYS Bash :

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

Une fois installé, redémarrez votre instance DSH Web et rechargez complètement votre navigateur (`Ctrl + Shift + R` ou `Cmd + Shift + R`).

---

## Licence

Distribué et sous licence [Apache License 2.0](LICENSE).
