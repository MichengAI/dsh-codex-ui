/**
 * 主题专属 Shiki 代码高亮 Token 映射字典
 * 为全套内置主题提供官方标准的代码语法高亮配色覆盖，
 * 包含关键字、字符串、函数、常量、注释、标点等核心语法着色。
 */

export type ShikiTokenName =
  | '--shiki-foreground'
  | '--shiki-background'
  | '--shiki-token-constant'
  | '--shiki-token-string'
  | '--shiki-token-comment'
  | '--shiki-token-keyword'
  | '--shiki-token-parameter'
  | '--shiki-token-function'
  | '--shiki-token-string-expression'
  | '--shiki-token-punctuation'
  | '--shiki-token-link'

export type ShikiTokens = Record<ShikiTokenName, string>

const COMMON_SHIKI_SURFACE = {
  '--shiki-foreground': 'var(--dsw-alias-label-primary)',
  '--shiki-background': 'var(--dsw-alias-markdown-code-block)',
} as const

export const SHIKI_TOKENS_BY_THEME: Record<string, ShikiTokens> = {
  // Codex 双子星
  'codex-dark': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#d19a66',
    '--shiki-token-string': '#98c379',
    '--shiki-token-comment': '#5c6370',
    '--shiki-token-keyword': '#339cff',
    '--shiki-token-parameter': '#e06c75',
    '--shiki-token-function': '#61afef',
    '--shiki-token-string-expression': '#98c379',
    '--shiki-token-punctuation': '#abb2bf',
    '--shiki-token-link': '#339cff',
  },
  'codex-light': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#986801',
    '--shiki-token-string': '#50a14f',
    '--shiki-token-comment': '#a0a1a7',
    '--shiki-token-keyword': '#0169cc',
    '--shiki-token-parameter': '#e45649',
    '--shiki-token-function': '#4078f2',
    '--shiki-token-string-expression': '#50a14f',
    '--shiki-token-punctuation': '#383a42',
    '--shiki-token-link': '#0169cc',
  },

  // Claude 双子星
  'claude-dark': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#c397d8',
    '--shiki-token-string': '#78a98b',
    '--shiki-token-comment': '#87867f',
    '--shiki-token-keyword': '#d97757',
    '--shiki-token-parameter': '#e5b567',
    '--shiki-token-function': '#85a7e9',
    '--shiki-token-string-expression': '#78a98b',
    '--shiki-token-punctuation': '#b4b29a',
    '--shiki-token-link': '#d97757',
  },
  'claude-light': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#6b3f94',
    '--shiki-token-string': '#2e6b4d',
    '--shiki-token-comment': '#827d75',
    '--shiki-token-keyword': '#b53a1a',
    '--shiki-token-parameter': '#8a4f00',
    '--shiki-token-function': '#1d5fb0',
    '--shiki-token-string-expression': '#2e6b4d',
    '--shiki-token-punctuation': '#59564f',
    '--shiki-token-link': '#b53a1a',
  },

  // Dracula 经典
  'dracula': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#bd93f9',
    '--shiki-token-string': '#f1fa8c',
    '--shiki-token-comment': '#6272a4',
    '--shiki-token-keyword': '#ff79c6',
    '--shiki-token-parameter': '#ffb86c',
    '--shiki-token-function': '#50fa7b',
    '--shiki-token-string-expression': '#f1fa8c',
    '--shiki-token-punctuation': '#f8f8f2',
    '--shiki-token-link': '#8be9fd',
  },

  // Solarized 双子星
  'solarized-dark': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#d33682',
    '--shiki-token-string': '#2aa198',
    '--shiki-token-comment': '#586e75',
    '--shiki-token-keyword': '#859900',
    '--shiki-token-parameter': '#cb4b16',
    '--shiki-token-function': '#268bd2',
    '--shiki-token-string-expression': '#2aa198',
    '--shiki-token-punctuation': '#93a1a1',
    '--shiki-token-link': '#268bd2',
  },
  'solarized-light': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#d33682',
    '--shiki-token-string': '#2aa198',
    '--shiki-token-comment': '#93a1a1',
    '--shiki-token-keyword': '#859900',
    '--shiki-token-parameter': '#cb4b16',
    '--shiki-token-function': '#268bd2',
    '--shiki-token-string-expression': '#2aa198',
    '--shiki-token-punctuation': '#586e75',
    '--shiki-token-link': '#268bd2',
  },

  // Gruvbox 双子星
  'gruvbox-dark': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#d3869b',
    '--shiki-token-string': '#b8bb26',
    '--shiki-token-comment': '#928374',
    '--shiki-token-keyword': '#fb4934',
    '--shiki-token-parameter': '#83a598',
    '--shiki-token-function': '#fabd2f',
    '--shiki-token-string-expression': '#b8bb26',
    '--shiki-token-punctuation': '#ebdbb2',
    '--shiki-token-link': '#8ec07c',
  },
  'gruvbox-light': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#8f3f71',
    '--shiki-token-string': '#79740e',
    '--shiki-token-comment': '#928374',
    '--shiki-token-keyword': '#9d0006',
    '--shiki-token-parameter': '#076678',
    '--shiki-token-function': '#b57614',
    '--shiki-token-string-expression': '#79740e',
    '--shiki-token-punctuation': '#3c3836',
    '--shiki-token-link': '#427b58',
  },

  // Catppuccin 官方 4 套
  'catppuccin-latte': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#fe640b',
    '--shiki-token-string': '#40a02b',
    '--shiki-token-comment': '#7c7f93',
    '--shiki-token-keyword': '#8839ef',
    '--shiki-token-parameter': '#e64553',
    '--shiki-token-function': '#1e66f5',
    '--shiki-token-string-expression': '#40a02b',
    '--shiki-token-punctuation': '#7c7f93',
    '--shiki-token-link': '#1e66f5',
  },
  'catppuccin-frappe': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#ef9f76',
    '--shiki-token-string': '#a6d189',
    '--shiki-token-comment': '#949cbb',
    '--shiki-token-keyword': '#ca9ee6',
    '--shiki-token-parameter': '#ea999c',
    '--shiki-token-function': '#8caaee',
    '--shiki-token-string-expression': '#a6d189',
    '--shiki-token-punctuation': '#949cbb',
    '--shiki-token-link': '#8caaee',
  },
  'catppuccin-macchiato': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#f5a97f',
    '--shiki-token-string': '#a6da95',
    '--shiki-token-comment': '#939ab7',
    '--shiki-token-keyword': '#c6a0f6',
    '--shiki-token-parameter': '#ee99a0',
    '--shiki-token-function': '#8aadf4',
    '--shiki-token-string-expression': '#a6da95',
    '--shiki-token-punctuation': '#939ab7',
    '--shiki-token-link': '#8aadf4',
  },
  'catppuccin-mocha': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#fab387',
    '--shiki-token-string': '#a6e3a1',
    '--shiki-token-comment': '#9399b2',
    '--shiki-token-keyword': '#cba6f7',
    '--shiki-token-parameter': '#eba0ac',
    '--shiki-token-function': '#89b4fa',
    '--shiki-token-string-expression': '#a6e3a1',
    '--shiki-token-punctuation': '#9399b2',
    '--shiki-token-link': '#89b4fa',
  },
  'cyberpunk': {
    ...COMMON_SHIKI_SURFACE,
    '--shiki-token-constant': '#00f0ff',
    '--shiki-token-string': '#79ffe1',
    '--shiki-token-comment': '#3d5c48',
    '--shiki-token-keyword': '#00ff66',
    '--shiki-token-parameter': '#ffe600',
    '--shiki-token-function': '#00f0ff',
    '--shiki-token-string-expression': '#79ffe1',
    '--shiki-token-punctuation': '#709982',
    '--shiki-token-link': '#00ff66',
  },
}
