import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../projects/genix-ui/src/lib/**/*.stories.@(ts|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  staticDirs: [
    { from: '../projects/genix-ui/styles', to: '/styles' },
  ],
  docs: {
    autodocs: 'tag',
  },
};

export default config;
