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

Dans l'utilisation quotidienne de DeepSeek Harness, l'interface standard peut présenter des fenêtres de paramètres exigües, des palettes monochromes ou la perte de l'historique des requêtes. **Codex UI 2.0 a été intégralement repensé, de son architecture interne à son design visuel**, reposant sur **six sous-plugins découplés et un module d'écosystème intégré** offrant des performances élevées, une faible intrusion et une intégration native :

* 🚀 **Rappel d'historique instantané et prédiction intelligente** : Prédiction et complétion de saisie en ligne (`Tab` pour accepter, `Alt+Bas/Haut` pour faire défiler), historique de commandes de style terminal (`↑` / `↓`), et poignées de redimensionnement adaptatif ;
* 🪟 **Atelier des paramètres en plein écran** : Remplace les boîtes de dialogue exiguës par un canevas à diffusion lumineuse Ambient Ground et des cartes flottantes ;
* 🎨 **Thèmes en verre dépoli physique et mica** : 13 palettes d'apparence de haute qualité (avec Codex Noir Carbone et Blanc Papier), modes d'agencement plat ou flottant mica, 3 préréglages de flou et reflets au sol ;
* 🧭 **Barre latérale modulaire** : Tiroir accordéon fluide et réorganisation libre par glisser-déposer ; s'aligne rigoureusement sur le rail compact officiel de 56px une fois repliée ;
* 🧠 **Titres de session intelligents** : Analyse sémantique du premier message pour extraire des titres standardisés adaptés aux modèles de raisonnement longs ;
* 🌐 **Prise en charge intégrale des 8 langues officielles** : Support complet pour le français, l'anglais, le chinois, le japonais, l'espagnol, l'allemand, le russe et le portugais (`fr`, `en`, `zh`, `ja`, `es`, `de`, `ru`, `pt`), adaptant textes, cartes d'accueil, menus contextuels et titres ;
* 🖥️ **Menus de fenêtre de bureau** : Intégration d'un menu d'aide dans la barre de titre avec actualisation de la vue et redémarrage fiable et sécurisé de l'hôte ;
* 📦 **Gestion de l'écosystème** : Tableau de bord unifié pour les plugins officiels et tiers, détection des versions et mise à jour groupée en un clic.

---

## Évolution Architecturale : Pourquoi une réécriture intégrale ?

### 1. Le dilemme de la version 1.x : Dette technique due aux surcharges invasives
Aux débuts de l'écosystème DSH, les registres de Slots officiels n'existaient pas encore. La version 1.x dépendait donc de surcharges agressives du DOM et de styles CSS globaux.
Cette approche entraînait des ruptures d'affichage à chaque mise à jour mineure de l'hôte DSH et laissait des règles CSS orphelines lors de la désactivation des thèmes.

### 2. Les choix de conception de la version 2.0 : Respect strict des composants natifs
Avec la version 2.0.0, l'ensemble du code de surcharge a été **supprimé** au profit d'une architecture micro-noyau propre :
* 🏛️ **Utilisation exclusive des primitives et Slots officiels** : Suppression des contrôles CSS personnalisés au profit des composants `Switch` et `Button` officiels ;
* 🧩 **6 sous-plugins découplés** : Des frontières nettes garantissent des cycles de vie indépendants et une maintenance simplifiée ;
* 🛡️ **Sécurité fail-closed** : La désactivation d'un sous-plugin supprime instantanément ses attributs et nettoie l'interface sans laisser d'éléments inertes dans le DOM ;
* 🔒 **Isolation stricte des profils** : Gestion rigoureuse des répertoires de profils évitant toute interférence croisée.

---

## Architecture : 6 Sous-Plugins Clés et Module Intégré

| ID du Sous-Plugin | Nom | Fonctionnalités |
| :--- | :--- | :--- |
| `composer` | **Améliorations de Saisie (Composer)** | Prédiction en ligne (`Tab`), historique terminal (`↑`/`↓`), isolation par espace de travail, poignées de largeur et cartes de suggestions. |
| `settings-skin` | **Habillage des Paramètres (Settings Skin)** | Atelier plein écran, cartes d'options flottantes, arrière-plan Ambient Ground et recherche native. |
| `theme` | **Thème et Verre Dépoli (Theme)** | 13 palettes de couleurs, modes Plat vs. Cartes Mica, 3 niveaux de flou et contrôle des reflets au sol. |
| `sidebar` | **Barre Latérale Modulaire (Sidebar)** | Déploiement accordéon, réorganisation par glisser-déposer, marquage lu/non-lu et alignement parfait avec le rail 56px. |
| `session-title` | **Titres de Session (Session Title)** | Génération intelligente de titres selon la sémantique de départ avec prise en charge de 8 langues et jusqu'à 4096 jetons. |
| `desktop-menu` | **Menus de Bureau (Desktop Menus)** | Menu d'aide dans la barre de titre avec actualisation de la vue et redémarrage sécurisé de l'application et de l'hôte. |
| `dependencies` | **Gestion des Extensions (Intégré)** | Suivi des dépendances associées, compteur de téléchargements npm en direct et mise à jour groupée en un clic. |

---

## Aperçu Visuel en Environnement Réel

> *Toutes les captures d'écran proviennent directement d'environnements d'exécution réels de DeepSeek Harness Web capturés via `ego-browser`.*

### 1. Espace de travail immersif et zone de saisie (Mode Sombre)
Palette Codex Dark avec actions principales centrées, cartes de démarrage et zone de saisie inférieure dotée de poignées adaptatives et d'indicateurs d'historique `↑↓`.

![Mode Sombre Conversation et Saisie](assets/screenshots/conversation.png)

---

### 2. Espace de travail blanc papier (Mode Clair)
Palette Codex Light reposant sur le dégradé lumineux Ambient Ground pour un confort de lecture optimal.

![Mode Clair Ambient Ground](assets/screenshots/conversation-light.png)

---

### 3. Atelier des paramètres en plein écran (Système Modulaire)
Espace de configuration généreux structuré en cartes thématiques adaptées aux sous-composants actifs.

![Atelier Plein Écran](assets/screenshots/settings-about.png)

---

### 4. Personnalisation de l'apparence et verre dépoli
13 cartes de sélection de palette, contrôles segmentés pour le mode de disposition et la force du flou d'arrière-plan.

---

### 5. Navigation modulaire de la barre latérale (Déployée)
Éléments réorganisables, tiroir accordéon pour les outils et raccourcis d'accès rapide.

![Barre Latérale Modulaire Déployée](assets/screenshots/sidebar.png)

---

### 6. Rail officiel compact de 56px (Replié)
Se rétracte harmonieusement dans le rail d'icônes officiel de 56px tout en conservant le bouton Nouveau Chat bien visible.

![Rail Compact 56px Replié](assets/screenshots/sidebar-collapsed.png)

---

### 7. Menu contextuel enrichi des conversations
Actions rapides sur chaque session : Épingler, Renommer, Marquer non lu/lu, Archiver, Cloner et Suppression sécurisée.

![Menu Enrichi de Session](assets/screenshots/session-menu.png)

---

## Compatibilité avec l'Hôte

* **Générations Prises en Charge** : Famille DeepSeek Harness `0.2.x` (`>=0.2.0-rc.1 <0.3.0-0`) ;
* **Versions Validées** : Toutes les versions RC de `0.2.x` (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`) ;
* **Prérequis d'Exécution** : Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

> ⚠️ **Attention** : N'activez pas simultanément Codex UI et `ds-bot`. Les deux extensions modifient les emplacements de la barre latérale avec des risques d'interférence.

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

## Guide d'Utilisation Rapide

| Fonction | Utilisation |
| :--- | :--- |
| **Accepter la prédiction** | Appuyez sur `Tab` lorsque le texte d'aide apparaît en filigrane ; utilisez `Alt + Bas` / `Alt + Haut` pour parcourir les variantes ou `Échap` pour rejeter. |
| **Configurer le mode de prédiction** | Rendez-vous dans **Paramètres → Codex UI** et sélectionnez le mode (Désactivé / Continuer uniquement / Deviner+continuer) dans la carte « Améliorations de Saisie ». |
| **Rappel de l'historique** | Dans une zone de saisie vide, appuyez sur `↑` / `↓` pour faire défiler les 200 dernières commandes de l'espace de travail. |
| **Ajuster la largeur** | Survolez les bordures latérales de la zone de saisie et tirez sur les poignées bleues. |
| **Changer de thème et de verre** | Dans **Paramètres → Codex UI**, choisissez parmi les 13 palettes et basculez entre les modes Plat et Cartes Mica. |
| **Réorganiser la barre latérale** | Glissez verticalement les éléments ; les repères bleus indiquent l'emplacement exact d'insertion ou de retrait. |
| **Replier la barre latérale** | Cliquez sur le bouton de réduction en haut de la barre pour passer au rail officiel de 56px. |
| **Mettre à jour les extensions** | Dans **Paramètres → Codex UI**, cliquez sur **Tout installer/mettre à jour** dans la carte des dépendances. |

---

## Matrice de l'Écosystème

Associez Codex UI aux autres extensions complémentaires pour un flux de développement unifié :

| Extension | Fonction |
| :--- | :--- |
| [Codex UI](https://github.com/MichengAI/dsh-codex-ui) | **Cœur de l'UI** : Historique rapide, panneau de paramètres, verre dépoli et barre modulaire |
| [Agency Agents](https://github.com/MichengAI/dsh-agency-agents) | **Matrice d'Experts** : Appel et délégation à des profils d'agents spécialisés |
| [Skills Manager](https://github.com/MichengAI/dsh-skills-manager) | **Gestionnaire de Compétences** : Découverte, importation et activation des compétences locales |
| [Archive Manager](https://github.com/MichengAI/dsh-archive-manager) | **Gestion des Archives** : Recherche approfondie, restauration et nettoyage des sessions |
| [IM Connect](https://github.com/MichengAI/dsh-im-connect) | **Passerelle IM** : Connexion à WeChat, DingTalk, Feishu et QQBot |
| [Automation](https://github.com/MichengAI/dsh-automation) | **Automatisation** : Planification de tâches cron et suivi des journaux d'exécution |
| [Code Review](https://github.com/MichengAI/dsh-code-review) | **Revue de Code** : Commande `/review` pour un audit autonome avec des sous-agents |
| [Simplify](https://github.com/MichengAI/dsh-simplify) | **Refactorisation** : Commande `/simplify` pour un nettoyage concurrent à 4 agents |
| [PUA](https://github.com/MichengAI/dsh-pua) | **Résilience** : Reprise sur incident, basculement d'hypothèses et vérification des preuves |
| [BTW](https://github.com/MichengAI/dsh-btw) | **Questions Annexes** : Requêtes contextuelles éphémères sans polluer le fil principal |
| [Codex Pet](https://github.com/MichengAI/dsh-codex-pet) | **Compagnon de Bureau** : Animal interactif pour les approbations et les alertes |

---

## Licence

Distribué et sous licence [Apache License 2.0](LICENSE).
