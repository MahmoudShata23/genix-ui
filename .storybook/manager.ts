import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

// Storybook's own chrome (sidebar, toolbar) themed with the GlobeMed kit's
// brand tokens, so the tool itself doesn't clash with the components it's
// previewing. Values are copied from `tokens.css` rather than imported,
// since the manager bundle is built separately from the preview.
const gmTheme = create({
  base: 'light',
  brandTitle: 'Genix UI',
  colorPrimary: '#0b6ea8',
  colorSecondary: '#0b6ea8',

  appBg: '#f8f9fa',
  appContentBg: '#ffffff',
  appBorderColor: '#e3e7ec',
  appBorderRadius: 6,

  fontBase: "'Segoe UI', 'Arial', sans-serif",

  textColor: '#1f2937',
  textInverseColor: '#ffffff',

  barTextColor: '#6b7280',
  barSelectedColor: '#0b6ea8',
  barHoverColor: '#0b6ea8',
  barBg: '#ffffff',

  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  inputTextColor: '#1f2937',
  inputBorderRadius: 6,
});

addons.setConfig({
  theme: gmTheme,
});
