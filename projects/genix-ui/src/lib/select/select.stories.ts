import { importProvidersFrom } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig, moduleMetadata } from "@storybook/angular";

import { GmSelectComponent } from "./select.component";

interface Country {
  id: number;
  name: string;
}

const countries: Country[] = [
  { id: 1, name: "Lebanon" },
  { id: 2, name: "Jordan" },
  { id: 3, name: "United Arab Emirates" },
  { id: 4, name: "Egypt" },
  { id: 5, name: "Saudi Arabia" },
  { id: 6, name: "Qatar" },
];

const manyCountries: Country[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `Country ${i + 1}`,
}));

const longLabelOptions: Country[] = [
  { id: 1, name: "Doctor" },
  { id: 2, name: "Radiologist" },
  {
    id: 3,
    name: "Profession within the health care sector focused on the care of individuals",
  },
  {
    id: 4,
    name: "Doctor - A medical practitioner including Physician and Surgeon",
  },
  { id: 5, name: "Pharmaceutical" },
];

const meta: Meta<GmSelectComponent> = {
  title: "Components/Select",
  component: GmSelectComponent,
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule] }),
    applicationConfig({
      providers: [importProvidersFrom(ReactiveFormsModule)],
    }),
  ],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<GmSelectComponent>;

export const Default: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select country"
          [options]="countries"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const WithValue: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(2),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          [options]="countries"
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
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Search and select"
          [options]="countries"
          optionLabel="name"
          optionValue="id"
          [filter]="true"
          filterPlaceholder="Type to filter..."
        />
      </div>
    `,
  }),
};

export const Clearable: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(1),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          [options]="countries"
          optionLabel="name"
          optionValue="id"
          [clearable]="true"
        />
      </div>
    `,
  }),
};

export const Required: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select country"
          [required]="true"
          [options]="countries"
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
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select country"
          hint="Choose your billing country"
          [options]="countries"
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
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select country"
          error="Country is required"
          [options]="countries"
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
      control: new FormControl<number | null>(null),
      countries,
      showError: false,
      toggle(this: { showError: boolean }) {
        this.showError = !this.showError;
      },
    },
    template: `
      <div style="max-width: 320px">
        <button type="button" (click)="toggle()" style="margin-bottom: 16px">
          Toggle error
        </button>
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select country"
          [error]="showError ? 'Country is required' : ''"
          [options]="countries"
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
      control: new FormControl<number | null>(null),
      longLabelOptions,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
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
      control: new FormControl<number | null>({ value: 2, disabled: true }),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          [options]="countries"
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
      control: new FormControl<number | null>(3),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          [readonly]="true"
          [options]="countries"
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
      control: new FormControl<number | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Loading options..."
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
      control: new FormControl<number | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select country"
          [options]="[]"
          emptyMessage="No countries configured"
        />
      </div>
    `,
  }),
};

export const Primitives: Story = {
  render: () => ({
    props: {
      control: new FormControl<string | null>(null),
      statuses: ["Active", "Draft", "Inactive"],
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Status"
          placeholder="Pick a status"
          [options]="statuses"
        />
      </div>
    `,
  }),
};

export const VirtualScroll: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(null),
      manyCountries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          [formControl]="control"
          label="Country"
          placeholder="Select from 200 options"
          [options]="manyCountries"
          optionLabel="name"
          optionValue="id"
          [filter]="true"
          [virtualScroll]="true"
        />
      </div>
    `,
  }),
};

export const SizeSmall: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          class="gm-field-host--small"
          [formControl]="control"
          label="Country (small)"
          [options]="countries"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const SizeLarge: Story = {
  render: () => ({
    props: {
      control: new FormControl<number | null>(null),
      countries,
    },
    template: `
      <div style="max-width: 320px">
        <gm-select
          class="gm-field-host--large"
          [formControl]="control"
          label="Country (large)"
          [options]="countries"
          optionLabel="name"
          optionValue="id"
        />
      </div>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    props: {
      empty: new FormControl<number | null>(null),
      filled: new FormControl<number | null>(1),
      error: new FormControl<number | null>(null),
      disabled: new FormControl<number | null>({ value: 2, disabled: true }),
      toggleable: new FormControl<number | null>(null),
      wrapping: new FormControl<number | null>(null),
      countries,
      longLabelOptions,
      showError: false,
      toggle(this: { showError: boolean }) {
        this.showError = !this.showError;
      },
    },
    template: `
      <div style="display:flex; flex-direction:column; gap:16px; max-width: 320px">
        <gm-select [formControl]="filled" label="With value" [options]="countries" optionLabel="name" optionValue="id" />
        <gm-select [formControl]="empty" label="Default" placeholder="Select country" [options]="countries" optionLabel="name" optionValue="id" />
        <gm-select [formControl]="error" label="With error" error="This field is required" [options]="countries" optionLabel="name" optionValue="id" />
        <gm-select [formControl]="disabled" label="Disabled" [options]="countries" optionLabel="name" optionValue="id" />

        <div>
          <button type="button" (click)="toggle()" style="margin-bottom: 8px">Toggle error</button>
          <gm-select
            [formControl]="toggleable"
            label="Error toggles without shifting layout"
            placeholder="Select country"
            [error]="showError ? 'Country is required' : ''"
            [options]="countries"
            optionLabel="name"
            optionValue="id"
          />
        </div>

        <gm-select
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
