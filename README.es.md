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

En el uso diario de DeepSeek Harness, la interfaz original puede presentar ventanas de configuración estrechas, paletas monocromáticas, listas de complementos difíciles de organizar o pérdida del historial de comandos. **Codex UI 2.0 ha sido rediseñado completamente desde su arquitectura interna hasta su diseño visual**, ofreciendo un ecosistema de **siete subcomplementos desacoplados**, de alto rendimiento y orientados a la experiencia nativa:

* 🚀 **Recuperación rápida y predicción inteligente**: Predicción de entrada en línea (`Tab` para aceptar, `Alt+Abajo/Arriba` para alternar opciones), historial estilo terminal (`↑` / `↓`), y ajuste de ancho adaptable;
* 🪟 **Panel de configuración en pantalla completa**: Sustituye cuadros de diálogo reducidos por un lienzo con iluminación difusa Ambient Ground y tarjetas flotantes;
* 🎨 **Temas de cristal físico y mica**: 7 paletas de alta calidad (incluyendo Codex Negro Carbón y Blanco Papel), modos de diseño plano y flotante, 3 niveles de desenfoque y destellos en el suelo;
* 🧭 **Barra lateral modular**: Acordeón suave y reordenación libre por arrastre; cuando se colapsa, se alinea al 100% con el riel oficial de 56px;
* 🧠 **Títulos inteligentes de sesión**: Extracción semántica del primer mensaje para generar títulos estructurados adaptados a modelos de razonamiento;
* 🌐 **Compatibilidad multilingüe con los 8 idiomas oficiales**: Soporte completo para español, inglés, chino, japonés, francés, alemán, ruso y portugués (`es`, `en`, `zh`, `ja`, `fr`, `de`, `ru`, `pt`), adaptando textos, tarjetas de inicio, menús contextuales y títulos de sesión;
* 🖥️ **Menús de ventana de escritorio**: Integración en la barra de menús del sistema con recarga de vistas y reinicio seguro multiplataforma del Host;
* 📦 **Gestión del ecosistema**: Panel unificado para complementos oficiales y de terceros, verificación de versiones y actualización en lote en un clic.

---

## Arquitectura: 7 Subcomplementos Principales

| ID de Subcomplemento | Nombre | Funcionalidad |
| :--- | :--- | :--- |
| `composer` | **Mejoras de Entrada (Composer)** | Predicción inteligente (`Tab`), historial terminal (`↑`/`↓`), almacenamiento por espacio de trabajo, tiradores de ancho y tarjetas de sugerencias. |
| `settings-skin` | **Configuración Nativa (Settings Skin)** | Distribución en pantalla completa, tarjetas flotantes, fondo Ambient Ground y búsqueda nativa. |
| `theme` | **Temas y Cristal (Theme)** | 7 paletas de colores, modos Plano vs. Mica Flotante, 3 preajustes de desenfoque y destellos de suelo. |
| `sidebar` | **Barra Lateral Modular (Sidebar)** | Acordeón integrado, reordenación por arrastre, marcado como no leído/leído y alineación exacta con el riel nativo de 56px. |
| `session-title` | **Título de Sesión (Session Title)** | Generación estandarizada de títulos según la semántica inicial con soporte de 8 idiomas y hasta 4096 tokens de razonamiento. |
| `desktop-menu` | **Menús de Escritorio (Desktop Menus)** | Menú de ayuda en la barra de títulos con recarga de página y reinicio seguro del sistema y del Host. |
| `dependencies` | **Gestor de Ecosistema (Dependencies)** | Monitorización de dependencias, recuento de descargas npm en tiempo real y actualización en lote. |

---

## Compatibilidad del Host

* **Versiones Soportadas**: Familia DeepSeek Harness `0.2.x` (`>=0.2.0-rc.1 <0.3.0-0`);
* **Compilaciones Verificadas**: Todos los RC de `0.2.x` (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`);
* **Requisitos de Entorno**: Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

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

## Licencia

Distribuido bajo la [Licencia Apache 2.0](LICENSE).
