<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **Conjunto moderno de interface para o DeepSeek Harness: Histórico de comandos instantâneo, painel de configurações em tela cheia, temas com vidro fosco físico e barra lateral modular**

  [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

  [Histórico de alterações](CHANGELOG.md) · [Apache-2.0](LICENSE)

  [![Licença: Apache-2.0](https://img.shields.io/badge/Licen%C3%A7a-Apache--2.0-blue.svg)](LICENSE)
  [![Pacote npm](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![Downloads no npm](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=downloads%20npm&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 ou superior](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> **Aviso**: O DSH Codex UI é um plugin de interface mantido pela comunidade para o DeepSeek Harness (DSH) e não é um produto oficial da DeepSeek AI.

---

## Por que escolher o Codex UI 2.0?

No uso diário do DeepSeek Harness, a interface padrão pode apresentar caixas de diálogo estreitas, temas monótonos ou perda do histórico de comandos. **O Codex UI 2.0 foi totalmente reestruturado em sua arquitetura e design visual**, reunindo **sete subplugins desacoplados**, de alto desempenho e foco na experiência nativa:

* 🚀 **Recuperação rápida e previsão inteligente**: Previsão de digitação em linha (`Tab` para aceitar, `Alt+Abaixo/Acima` para alternar opções), histórico de comandos estilo terminal (`↑` / `↓`) e alças de largura adaptáveis;
* 🪟 **Painel de configurações em tela cheia**: Substitui diálogos estreitos por uma tela ampla com iluminação difusa Ambient Ground e cartões flutuantes;
* 🎨 **Temas com vidro fosco físico e mica**: 7 paletas de alta qualidade (incluindo Codex Preto Carvão e Branco Papel), modos de layout plano e flutuante, 3 níveis de desfoque e brilhos de chão;
* 🧭 **Barra lateral modular**: Gaveta tipo sanfona fluida e reorganização livre por arrasto; quando recolhida, **alinha-se 100% ao trilho oficial nativo de 56px**;
* 🧠 **Títulos de sessão inteligentes**: Extração semântica da primeira mensagem para gerar títulos padronizados adaptados a modelos de raciocínio de contexto longo;
* 🌐 **Compatibilidade nativa com os 8 idiomas oficiais**: Suporte completo para português, inglês, chinês, japonês, espanhol, francês, alemão e russo (`pt`, `en`, `zh`, `ja`, `es`, `fr`, `de`, `ru`), adaptando textos, cartões iniciais, menus de contexto e títulos;
* 🖥️ **Menus de janela da área de trabalho**: Integração de menu de ajuda na barra de título do aplicativo com recarregamento de visualização e reinicialização segura do Host;
* 📦 **Gestão do ecossistema**: Painel unificado para plugins oficiais e de terceiros, verificação de versões e atualização em lote em um clique.

---

## Arquitetura: 7 Subplugins Principais

| ID do Subplugin | Nome | Funcionalidades |
| :--- | :--- | :--- |
| `composer` | **Melhorias de Entrada (Composer)** | Previsão inteligente (`Tab`), histórico de terminal (`↑`/`↓`), isolamento por espaço de trabalho, alças de largura e sugestões. |
| `settings-skin` | **Visual de Configurações (Settings Skin)** | Painel em tela cheia, cartões flutuantes de opções, fundo Ambient Ground e busca nativa. |
| `theme` | **Temas e Vidro Fosco (Theme)** | 7 paletas de cores, modos Plano vs. Cartões Mica, 3 pré-definições de desfoque e brilhos de reflexo. |
| `sidebar` | **Barra Lateral Modular (Sidebar)** | Expansão suave, reorganização por arrasto, marcador de lido/não lido e aderência estrita ao trilho de 56px. |
| `session-title` | **Títulos de Sessão (Session Title)** | Geração padronizada de títulos baseada na semântica da primeira solicitação, com suporte a 8 idiomas e até 4096 tokens. |
| `desktop-menu` | **Menus do Desktop (Desktop Menus)** | Menu de ajuda integrado na barra de título do aplicativo desktop, com recarregamento e reinício seguro do Host. |
| `dependencies` | **Gestão de Dependências (Dependencies)** | Monitoramento de plugins integrados, contagem de downloads npm em tempo real e atualização em lote com um clique. |

---

## Compatibilidade com o Host

* **Gerações Suportadas**: Linha completa DeepSeek Harness `0.2.x` (`>=0.2.0-rc.1 <0.3.0-0`);
* **Compilações Verificadas**: Todas as versões Release Candidate `0.2.x` (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`);
* **Requisitos de Execução**: Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

---

## Instalação e Primeiros Passos

### Opção A: Instalação Assistida por Agente (Recomendado)

Envie a instrução abaixo para qualquer agente com permissão de terminal (substitua `web` pelo perfil de destino):

```text
Instale o plugin DSH @michengai/dsh-codex-ui no meu perfil web local executando:
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
Em seguida, execute dsh --profile web --dump-config para verificar a ativação e recarregue a página no navegador.
```

### Opção B: Instalação Manual

Execute no PowerShell ou MSYS Bash:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

Após a instalação, reinicie a instância do DSH Web e force a atualização da página no navegador (`Ctrl + Shift + R` ou `Cmd + Shift + R`).

---

## Licença

Distribuído e licenciado sob a [Licença Apache 2.0](LICENSE).
