<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **Conjunto moderno de mejoras visuales para DeepSeek Harness: Historial de comandos instantáneo, interfaz de configuración en pantalla completa, temas de cristal esmerilado nativo y barra lateral modular**

  [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

  [Registro de cambios](CHANGELOG.md) · [Apache-2.0](LICENSE)

  [![Licencia: Apache-2.0](https://img.shields.io/badge/Licencia-Apache--2.0-blue.svg)](LICENSE)
  [![Paquete npm](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![Descargas npm](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=descargas%20npm&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 o superior](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> **Aviso**: DSH Codex UI es un complemento comunitario para DeepSeek Harness (DSH) y no es un producto oficial de DeepSeek AI.

---

## ¿Por qué elegir Codex UI 2.0?

En el uso diario de DeepSeek Harness, la interfaz original puede presentar ventanas de configuración estrechas, paletas monocromáticas, listas de complementos difíciles de organizar o pérdida del historial de comandos. **Codex UI 2.0 ha sido rediseñado completamente desde su arquitectura interna hasta su diseño visual**, ofreciendo un ecosistema de **seis subcomplementos desacoplados y gestión de ecosistema integrada**, de alto rendimiento y orientados a la experiencia nativa:

* 🚀 **Recuperación rápida y predicción inteligente**: Predicción de entrada en línea (`Tab` para aceptar, `Alt+Abajo/Arriba` para alternar opciones), historial estilo terminal (`↑` / `↓`), y ajuste de ancho adaptable;
* 🪟 **Panel de configuración en pantalla completa**: Sustituye cuadros de diálogo reducidos por un lienzo con iluminación difusa Ambient Ground y tarjetas flotantes;
* 🎨 **Temas de cristal físico y mica**: 13 paletas de alta calidad (incluyendo Codex Negro Carbón y Blanco Papel), modos de diseño plano y flotante, 3 niveles de desenfoque y destellos en el suelo;
* 🧭 **Barra lateral modular**: Acordeón suave y reordenación libre por arrastre; cuando se colapsa, se alinea al 100% con el riel oficial de 56px;
* 🧠 **Títulos inteligentes de sesión**: Extracción semántica del primer mensaje para generar títulos estructurados adaptados a modelos de razonamiento;
* 🌐 **Compatibilidad multilingüe con los 8 idiomas oficiales**: Soporte completo para español, inglés, chino, japonés, francés, alemán, ruso y portugués (`es`, `en`, `zh`, `ja`, `fr`, `de`, `ru`, `pt`), adaptando textos, tarjetas de inicio, menús contextuales y títulos de sesión;
* 🖥️ **Menús de ventana de escritorio**: Integración en la barra de menús del sistema con recarga de vistas y reinicio seguro multiplataforma del Host;
* 📦 **Gestión del ecosistema**: Panel unificado para complementos oficiales y de terceros, verificación de versiones y actualización en lote en un clic.

---

## Evolución Arquitectónica: ¿Por qué una reescritura total?

### 1. El dilema de la versión 1.x: Deuda técnica por sobrescritura agresiva
En las primeras etapas del ecosistema DSH, no existían registros de Slots ni componentes headless estables. La versión 1.x recurrió a sobrescribir elementos DOM de forma agresiva e inyectar hojas de estilo CSS globales.
Esto provocaba que cualquier cambio mínimo en el DOM del Host rompiera los estilos, además de dejar tokens CSS huérfanos al desactivar temas, causando estados incoherentes.

### 2. Principios de diseño de la versión 2.0: Respeto nativo y desacoplamiento
En 2.0.0 eliminamos todo el código de sobrescritura de 1.x y adoptamos una arquitectura de micro-núcleo:
* 🏛️ **Uso estricto de componentes nativos y Slots**: Eliminamos widgets CSS dibujados a mano, usando exclusivamente los primitivos oficiales `Switch` y `Button`;
* 🧩 **6 subcomplementos modulares**: Cada subcomponente posee un ciclo de vida independiente y límites de responsabilidad claros;
* 🛡️ **Seguridad fail-closed**: Al desactivar un módulo, sus estilos y tarjetas se purgan de inmediato de la memoria y del DOM sin dejar residuos;
* 🔒 **Aislamiento riguroso de perfiles**: Resolución inequívoca de directorios de perfil para evitar interferencias cruzadas.

---

## Arquitectura: 6 Subcomplementos Principales y Módulo Integrado

| ID de Subcomplemento | Nombre | Funcionalidad |
| :--- | :--- | :--- |
| `composer` | **Mejoras de Entrada (Composer)** | Predicción inteligente (`Tab`), historial terminal (`↑`/`↓`), almacenamiento por conversación o espacio de trabajo, tiradores de ancho y tarjetas de sugerencias. |
| `settings-skin` | **Configuración Nativa (Settings Skin)** | Distribución en pantalla completa, tarjetas flotantes, fondo Ambient Ground y búsqueda nativa. |
| `theme` | **Temas y Cristal (Theme)** | 13 paletas de colores, modos Plano vs. Mica Flotante, 3 preajustes de desenfoque y destellos de suelo. |
| `sidebar` | **Barra Lateral Modular (Sidebar)** | Acordeón integrado, reordenación por arrastre, marcado como no leído/leído y alineación exacta con el riel nativo de 56px. |
| `session-title` | **Título de Sesión (Session Title)** | Generación estandarizada de títulos según la semántica inicial con soporte de 8 idiomas y hasta 4096 tokens de razonamiento. |
| `desktop-menu` | **Menús de Escritorio (Desktop Menus)** | Menú de ayuda en la barra de títulos con recarga de página y reinicio seguro del sistema y del Host. |
| `dependencies` | **Gestor de Ecosistema (Integrado)** | Monitorización de dependencias, recuento de descargas npm en tiempo real y actualización en lote. |

---

## Capturas de Pantalla en Entorno Real

> *Todas las capturas han sido tomadas directamente en entornos reales de ejecución de DeepSeek Harness Web usando `ego-browser`.*

### 1. Espacio de trabajo inmersivo y campo de entrada (Modo Oscuro)
Paleta Codex Dark con acciones destacadas centradas, tarjetas de tareas y campo de entrada inferior con tiradores adaptables e indicación de historial `↑↓`.

![Modo Oscuro Conversación y Entrada](assets/screenshots/conversation.png)

---

### 2. Espacio de trabajo blanco papel (Modo Claro)
Paleta Codex Light respaldada por el degradado de iluminación difusa Ambient Ground, brindando una lectura agradable y relajante.

![Modo Claro Ambient Ground](assets/screenshots/conversation-light.png)

---

### 3. Panel de configuración en pantalla completa (Tarjetas Modulares)
Amplio espacio de trabajo organizado en tarjetas dinámicas según los módulos activos del sistema.

![Panel de Configuración Completo](assets/screenshots/settings-about.png)

---

### 4. Personalización de temas y textura de cristal
14 paletas de colores de alta calidad integradas y 1 opción oficial por defecto (que abarca las series Codex, Claude, Dracula, Cyberpunk, Solarized, Gruvbox y Catppuccin). Admite modos de diseño plano tradicional y flotante Mica, 3 niveles de ajuste de material (Transparente, Estándar, Esmerilado) e interruptor de reflejos en el suelo. Basado en la inyección dinámica de Design Tokens con destrucción de ciclo de vida limpio para evitar la contaminación de estilos globales.

#### Lista de temas integrados y esquemas de color

| Serie | Nombre del tema | ID | Modo | Estilo visual | Paleta central (Acento / Fondo / Texto) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Oficial** | **Oficial por defecto** | `stock` | Auto | Seguir el sistema Interfaz nativa | Accent: ![](https://img.shields.io/badge/-%233b82f6-3b82f6) `#3b82f6` (Sigue el modo claro/oscuro del sistema, sin tokens personalizados) |
| **Codex** | **Codex Oscuro** | `codex-dark` | Oscuro | Negro inmersivo Estilo hacker | Accent: ![](https://img.shields.io/badge/-%23339cff-339cff) `#339cff` · BG: ![](https://img.shields.io/badge/-%2309090b-09090b) `#09090b` · Text: ![](https://img.shields.io/badge/-%23fafafa-fafafa) `#fafafa` |
|  | **Codex Claro** | `codex-light` | Claro | Blanco papel limpio Lectura pura | Accent: ![](https://img.shields.io/badge/-%230169cc-0169cc) `#0169cc` · BG: ![](https://img.shields.io/badge/-%23ffffff-ffffff) `#ffffff` · Text: ![](https://img.shields.io/badge/-%2318181b-18181b) `#18181b` |
| **Claude** | **Claude Oscuro** | `claude-dark` | Oscuro | Tono oscuro cálido y terracota | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23141414-141414) `#141414` · Text: ![](https://img.shields.io/badge/-%23fdfdfd-fdfdfd) `#fdfdfd` |
|  | **Claude Claro** | `claude-light` | Claro | Papel cálido y terracota | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23faf9f5-faf9f5) `#faf9f5` · Text: ![](https://img.shields.io/badge/-%231f1e1d-1f1e1d) `#1f1e1d` |
| **Dracula** | **Dracula** | `dracula` | Oscuro | Rosa vampiro y brillo ciber | Accent: ![](https://img.shields.io/badge/-%23ff79c6-ff79c6) `#ff79c6` · BG: ![](https://img.shields.io/badge/-%23191a21-191a21) `#191a21` · Text: ![](https://img.shields.io/badge/-%23f8f8f2-f8f8f2) `#f8f8f2` |
| **Cyberpunk** | **Cyberpunk** | `cyberpunk` | Oscuro | Verde neón sobre negro · terminal matrix | Accent: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` · BG: ![](https://img.shields.io/badge/-%23000a00-000a00) `#000a00` · Text: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` |
| **Solarized** | **Solarized Oscuro** | `solarized-dark` | Oscuro | Verde azulado y cian | Accent: ![](https://img.shields.io/badge/-%232aa198-2aa198) `#2aa198` · BG: ![](https://img.shields.io/badge/-%23002b36-002b36) `#002b36` · Text: ![](https://img.shields.io/badge/-%2393a1a1-93a1a1) `#93a1a1` |
|  | **Solarized Claro** | `solarized-light` | Claro | Pergamino cálido y azul | Accent: ![](https://img.shields.io/badge/-%23268bd2-268bd2) `#268bd2` · BG: ![](https://img.shields.io/badge/-%23fdf6e3-fdf6e3) `#fdf6e3` · Text: ![](https://img.shields.io/badge/-%23586e75-586e75) `#586e75` |
| **Gruvbox** | **Gruvbox Oscuro** | `gruvbox-dark` | Oscuro | Oscuro retro y oro cálido | Accent: ![](https://img.shields.io/badge/-%23fabd2f-fabd2f) `#fabd2f` · BG: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` · Text: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` |
|  | **Gruvbox Claro** | `gruvbox-light` | Claro | Papel kraft retro y ámbar | Accent: ![](https://img.shields.io/badge/-%23b57614-b57614) `#b57614` · BG: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` · Text: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` |
| **Catppuccin** | **Mocha** | `catppuccin-mocha` | Oscuro | Tono moka oscuro Cómodo para la vista | Accent: ![](https://img.shields.io/badge/-%23cba6f7-cba6f7) `#cba6f7` · BG: ![](https://img.shields.io/badge/-%2311111b-11111b) `#11111b` · Text: ![](https://img.shields.io/badge/-%23cdd6f4-cdd6f4) `#cdd6f4` |
|  | **Macchiato** | `catppuccin-macchiato` | Oscuro | Moka macchiato Suave y elegante | Accent: ![](https://img.shields.io/badge/-%23c6a0f6-c6a0f6) `#c6a0f6` · BG: ![](https://img.shields.io/badge/-%23181926-181926) `#181926` · Text: ![](https://img.shields.io/badge/-%23cad3f5-cad3f5) `#cad3f5` |
|  | **Frappé** | `catppuccin-frappe` | Oscuro | Frappé oscuro Efecto niebla translúcida | Accent: ![](https://img.shields.io/badge/-%23ca9ee6-ca9ee6) `#ca9ee6` · BG: ![](https://img.shields.io/badge/-%23232634-232634) `#232634` · Text: ![](https://img.shields.io/badge/-%23c6d0f5-c6d0f5) `#c6d0f5` |
|  | **Latte** | `catppuccin-latte` | Claro | Latte cálido Luminoso y agradable | Accent: ![](https://img.shields.io/badge/-%238839ef-8839ef) `#8839ef` · BG: ![](https://img.shields.io/badge/-%23eff1f5-eff1f5) `#eff1f5` · Text: ![](https://img.shields.io/badge/-%234c4f69-4c4f69) `#4c4f69` |

---

### 5. Navegación en barra lateral modular (Expandida)
Entradas reordenables, cajón tipo acordeón para herramientas complementarias y filas fijadas de acceso rápido.

![Barra Lateral Modular Expandida](assets/screenshots/sidebar.png)

---

### 6. Riel nativo oficial de 56px (Colapsado)
Se pliega con total fluidez en el riel de iconos compacto de 56px oficial, manteniendo el botón de Nueva Conversación siempre accesible.

![Riel Nativo 56px Colapsado](assets/screenshots/sidebar-collapsed.png)

---

### 7. Menú contextual enriquecido de sesiones
Acciones inmediatas en cada conversación: Fijar, Renombrar, Marcar como no leído/leído, Archivar, Bifurcar y Eliminación segura.

![Menú Enriquecido de Sesión](assets/screenshots/session-menu.png)

---

## Compatibilidad del Host

* **Versiones Soportadas**: Familia DeepSeek Harness `0.2.x` (`>=0.2.0-rc.1 <0.3.0-0`);
* **Compilaciones Verificadas**: Todos los RC de `0.2.x` (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`);
* **Requisitos de Entorno**: Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

> ⚠️ **Aviso**: No active simultáneamente Codex UI y `ds-bot`. Ambos rediseñan ranuras de la barra lateral con mecánicas que pueden solaparse.

---

## Instalación y Primeros Pasos

### Opción A: Instalación Asistida por Agente (Recomendado)

Envíe la siguiente instrucción a un agente con acceso a la terminal (sustituya `web` por el perfil deseado):

```text
Instala el complemento @michengai/dsh-codex-ui en mi perfil local web ejecutando:
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
Luego ejecuta dsh --profile web --dump-config para verificar su activación y recarga el navegador.
```

### Opción B: Instalación Manual

Ejecute en PowerShell o MSYS Bash:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

Una vez instalado, reinicie su entorno DSH Web y fuerce la recarga del navegador (`Ctrl + Shift + R` o `Cmd + Shift + R`).

---

## Guía Rápida de Operación

| Función | Modo de Uso |
| :--- | :--- |
| **Aceptar predicción de entrada** | Pulse `Tab` cuando aparezca el texto proyectado tras el cursor; pulse `Alt + Abajo` / `Alt + Arriba` para alternar sugerencias o `Esc` para descartar. |
| **Configurar modo de predicción** | Vaya a **Configuración → Codex UI** y elija el modo (Desactivado / Solo continuación / Suposición+continuación) en la tarjeta «Mejoras de Entrada». Se puede bloquear en todo el perfil definiendo `config.prediction: false` en `cordis.patch.yml`. |
| **Historial de comandos** | Pulse `↑` / `↓` en un campo de entrada vacío para desplazarse por las entradas anteriores de esta conversación —o de todo el espacio de trabajo, configurable en Ajustes (hasta 200 elementos por alcance)—. |
| **Cambiar alcance del historial** | En la misma tarjeta «Mejoras de entrada», elija «Alcance del historial»: «Esta conversación» (predeterminado) solo recupera mensajes de la conversación actual; «Espacio de trabajo» los comparte con todas las conversaciones del mismo directorio de trabajo y vuelve a hacer visible el historial guardado anteriormente. |
| **Ajustar ancho del campo** | Pase el cursor sobre los bordes laterales de la tarjeta de entrada y arrastre los tiradores azules. |
| **Cambiar temas y desenfoque** | Vaya a **Configuración → Codex UI**, seleccione una de las 13 paletas y alterne entre los modos de cristal Plano y Mica Flotante. |
| **Reordenar barra lateral** | Arrastre verticalmente los elementos; las guías azules indican la posición exacta para ingresar o extraer del cajón «Más». |
| **Plegar barra lateral** | Haga clic en el botón superior de la barra para cambiar al riel oficial compacto de 56px. |
| **Actualizar complementos** | En **Configuración → Codex UI**, pulse **Instalar/actualizar todo** dentro de la tarjeta de complementos. |

---

## Matriz del Ecosistema

Combine Codex UI con los complementos oficiales complementarios para un flujo de desarrollo integrado:

| Complemento | Propósito |
| :--- | :--- |
| [Codex UI](https://github.com/MichengAI/dsh-codex-ui) | **Núcleo de UI**: Historial rápido, piel de configuración, cristal físico y barra modular |
| [Agency Agents](https://github.com/MichengAI/dsh-agency-agents) | **Matriz de Especialistas**: Despacho de agentes especializados para distintas tareas |
| [Skills Manager](https://github.com/MichengAI/dsh-skills-manager) | **Centro de Habilidades**: Búsqueda, importación, activación y gestión de skills locales |
| [Archive Manager](https://github.com/MichengAI/dsh-archive-manager) | **Gestor de Archivos**: Búsqueda profunda, restauración y limpieza de conversaciones pasadas |
| [IM Connect](https://github.com/MichengAI/dsh-im-connect) | **Puente IM**: Conexión con WeChat, DingTalk, Feishu y QQBot |
| [Automation](https://github.com/MichengAI/dsh-automation) | **Automatización**: Tareas programadas con cron y auditoría de ejecución |
| [Code Review](https://github.com/MichengAI/dsh-code-review) | **Revisión de Código**: Comando `/review` para auditoría de código con subagentes |
| [Simplify](https://github.com/MichengAI/dsh-simplify) | **Refactorización**: Comando `/simplify` para limpieza concurrente con 4 agentes |
| [PUA](https://github.com/MichengAI/dsh-pua) | **Resiliencia**: Recuperación de fallos, cambio de hipótesis y verificación de pruebas |
| [BTW](https://github.com/MichengAI/dsh-btw) | **Consultas Paralelas**: Preguntas contextuales efímeras sin alterar el hilo principal |
| [Codex Pet](https://github.com/MichengAI/dsh-codex-pet) | **Mascota Virtual**: Mascota interactiva en el escritorio para alertas y aprobaciones |

---

## Licencia

Distribuido bajo la [Licencia Apache 2.0](LICENSE).
