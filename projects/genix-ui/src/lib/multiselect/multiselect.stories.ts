import { importProvidersFrom } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';

import { GmMultiselectComponent } from './multiselect.component';

interface Role {
  id: number;
  name: string;
}

const roles: Role[] = [
  { id: 1, name: 'Administrator' },
  { id: 2, name: 'Editor' },
  { id: 3, name: 'Viewer' },
  { id: 4, name: 'Billing Manager' },
  { id: 5, name: 'Support Agent' },
  { id: 6, name: 'Auditor' },
];

const manyRoles: Role[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `Role ${i + 1}`,
}));

const longLabelOptions: Role[] = [
  { id: 1, name: 'Doctor' },
  { id: 2, name: 'Radiologist' },
  {
    id: 3,
    name: 'Profession within the health care sector focused on the care of individuals',
  },
  { id: 4, name: 'Doctor - A medical practitioner including Physician and Surgeon' },
  { id: 5, name: 'Pharmaceutical' },
];

const meta: Meta<GmMultiselectComponent> = {
  title: 'Components/Multiselect',
  component: GmMultiselectComponent,
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule] }),
    applicationConfig({ providers: [importProvidersFrom(ReactiveFormsModule)] }),
  ],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<GmMultiselectComponent>;

export const Default: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const MenuDisplayWithValue: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([1, 2]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          display="menu"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const ChipDisplay: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([1, 2, 4]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          display="chip"
          placeholder="Select roles"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const ManySelectedSummary: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([1, 2, 3, 4, 5]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          display="menu"
          [maxSelectedLabels]="3"
          selectedItemsLabel="{0} roles selected"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const Filterable: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Search and select roles"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
          [filter]="true"
          filterPlaceholder="Type to filter..."
        />
      </div>
    `,
  }),
};

export const WithoutSelectAll: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          [showToggleAll]="false"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const SelectionLimit: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([1, 2]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles (max 2)"
          display="chip"
          [selectionLimit]="2"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const Clearable: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([1, 3]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          display="chip"
          [clearable]="true"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const Required: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          [required]="true"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const WithHint: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          hint="Pick every role this account needs"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const WithError: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          error="Select at least one role"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

/**
 * Demonstrates that the field's height stays fixed when an error appears or
 * clears — a sibling box below is used as a visual ruler so any shift is
 * obvious. Click the button to toggle the error state.
 */
export const ErrorDoesNotShiftLayout: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      roles,
      showError: false,
      toggle(this: { showError: boolean }) {
        this.showError = !this.showError;
      },
    },
    template: `
      <div style="max-width: 360px">
        <button type="button" (click)="toggle()" style="margin-bottom: 16px">
          Toggle error
        </button>
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          [error]="showError ? 'Select at least one role' : ''"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
        <div style="margin-top: 16px; padding: 8px; background: #f0f4f8; border: 1px dashed #94a3b8;">
          Reference box — its position should never move when the error toggles.
        </div>
      </div>
    `,
  }),
};

/**
 * A long option label wraps onto another line within the panel instead of
 * stretching the panel wider than the trigger.
 */
export const LongOptionLabelWraps: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      longLabelOptions,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Professional Type"
          placeholder="Select type"
          [options]="longLabelOptions"
          optionLabel="name"
          optionValue="id"
          [filter]="true"
        />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>({ value: [1, 2], disabled: true }),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          display="chip"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const ReadOnly: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([1, 2]),
      roles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          display="chip"
          [readOnly]="true"
          [options]="roles"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const Loading: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Loading roles..."
          [options]="[]"
          [loading]="true"
        />
      </div>
    `,
  }),
};

export const EmptyOptions: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select roles"
          [options]="[]"
          emptyMessage="No roles configured"
        />
      </div>
    `,
  }),
};

export const VirtualScroll: Story = {
  render: () => ({
    props: {
      control: new FormControl<number[]>([]),
      manyRoles,
    },
    template: `
      <div style="max-width: 360px">
        <gm-multiselect
          [formControl]="control"
          label="Roles"
          placeholder="Select from 200 options"
          [options]="manyRoles"
          optionLabel="name"
          optionValue="id"
          [filter]="true"
          [virtualScroll]="true"
        />
      </div>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    props: {
      empty: new FormControl<number[]>([]),
      filled: new FormControl<number[]>([1, 2]),
      chips: new FormControl<number[]>([1, 3, 5]),
      error: new FormControl<number[]>([]),
      disabled: new FormControl<number[]>({ value: [1, 2], disabled: true }),
      toggleable: new FormControl<number[]>([]),
      wrapping: new FormControl<number[]>([]),
      roles,
      longLabelOptions,
      showError: false,
      toggle(this: { showError: boolean }) {
        this.showError = !this.showError;
      },
    },
    template: `
      <div style="display:flex; flex-direction:column; gap:16px; max-width: 360px">
        <gm-multiselect [formControl]="empty" label="Default" placeholder="Select roles" [options]="roles" optionLabel="name" optionValue="id" />
        <gm-multiselect [formControl]="filled" label="Menu display" [options]="roles" optionLabel="name" optionValue="id" />
        <gm-multiselect [formControl]="chips" label="Chip display" display="chip" [options]="roles" optionLabel="name" optionValue="id" />
        <gm-multiselect [formControl]="error" label="With error" error="Select at least one role" [options]="roles" optionLabel="name" optionValue="id" />
        <gm-multiselect [formControl]="disabled" label="Disabled" display="chip" [options]="roles" optionLabel="name" optionValue="id" />

        <div>
          <button type="button" (click)="toggle()" style="margin-bottom: 8px">Toggle error</button>
          <gm-multiselect
            [formControl]="toggleable"
            label="Error toggles without shifting layout"
            placeholder="Select roles"
            [error]="showError ? 'Select at least one role' : ''"
            [options]="roles"
            optionLabel="name"
            optionValue="id"
          />
        </div>

        <gm-multiselect
          [formControl]="wrapping"
          label="Long option label wraps"
          placeholder="Select type"
          [options]="longLabelOptions"
          optionLabel="name"
          optionValue="id"
          [filter]="true"
        />
      </div>
    `,
  }),
};
