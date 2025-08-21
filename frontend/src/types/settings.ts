export interface GitSettings {
  commitsToLoad: number;
}

export interface TerminalSettings {
  defaultCommand: string;
  fontSize: number;
  colorScheme: 'default' | 'dark' | 'light' | 'solarized' | 'monokai' | 'tomorrow';
  cursorStyle: 'block' | 'underline' | 'bar';
}

export interface UISettings {
  autoShowCommitDetails: boolean;
}

export interface AppSettings {
  git: GitSettings;
  terminal: TerminalSettings;
  ui: UISettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  git: {
    commitsToLoad: 100,
  },
  terminal: {
    defaultCommand: '',  // Empty means use system default
    fontSize: 14,
    colorScheme: 'default',
    cursorStyle: 'block',
  },
  ui: {
    autoShowCommitDetails: true,
  },
};

export const TERMINAL_COLOR_SCHEMES = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'solarized', label: 'Solarized' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'tomorrow', label: 'Tomorrow' },
] as const;

export const TERMINAL_CURSOR_STYLES = [
  { value: 'block', label: 'Block' },
  { value: 'underline', label: 'Underline' },
  { value: 'bar', label: 'Bar' },
] as const;

export const FONT_SIZE_OPTIONS = [
  { value: 10, label: '10px' },
  { value: 12, label: '12px' },
  { value: 14, label: '14px' },
  { value: 16, label: '16px' },
  { value: 18, label: '18px' },
  { value: 20, label: '20px' },
] as const;