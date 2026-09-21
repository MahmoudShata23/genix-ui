import type { Preview } from '@storybook/angular';

// Served from `staticDirs` (main.ts) rather than imported, so no CSS loader
// is needed in the Storybook webpack config.
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/styles/tokens.css';
document.head.appendChild(link);

const preview: Preview = {
  decorators: [
    (story) => {
      const rendered = story();
      // Storybook's Angular framework bootstraps a fresh Angular application
      // per story render. The very first interactive element in that fresh
      // app's template can end up with a click listener that never fires on
      // the first attempt — a first-render race in Storybook's own
      // `bootstrapApplication` bootstrapping, reproduced identically on
      // completely unmodified library code, and absent outside Storybook
      // (verified against the built package in a real Angular app). A
      // display:none placeholder absorbs that broken first slot instead of
      // a real, user-facing control. Only applies to `render()` stories
      // returning an inline template — component-driven stories (`args`
      // only, no `template`) are left untouched.
      if (typeof rendered?.template !== 'string') {
        return rendered;
      }
      return {
        ...rendered,
        template: `<div style="display:none" aria-hidden="true"></div>${rendered.template}`,
      };
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
