import { importProvidersFrom } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import type { Meta, StoryObj } from "@storybook/angular";
import { applicationConfig, moduleMetadata } from "@storybook/angular";

import { GmDatepickerComponent } from "./datepicker.component";
import type { GmDateRange } from "./datepicker.types";

const meta: Meta<GmDatepickerComponent> = {
  title: "Components/Datepicker",
  component: GmDatepickerComponent,
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule] }),
    applicationConfig({
      providers: [importProvidersFrom(ReactiveFormsModule)],
    }),
  ],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<GmDatepickerComponent>;

export const Default: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          placeholder="Select date"
        />
      </div>
    `,
  }),
};

export const WithValue: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(new Date(2026, 5, 15)),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker [formControl]="control" label="Start Date" />
      </div>
    `,
  }),
};

export const CustomFormat: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(new Date(2026, 5, 15)),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          dateFormat="yyyy-MM-dd"
        />
      </div>
    `,
  }),
};

export const Clearable: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(new Date(2026, 5, 15)),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          [clearable]="true"
        />
      </div>
    `,
  }),
};

export const WithButtonBar: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          [showButtonBar]="true"
        />
      </div>
    `,
  }),
};

export const MinMaxDate: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
      minDate: new Date(2026, 5, 1),
      maxDate: new Date(2026, 5, 20),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          [minDate]="minDate"
          [maxDate]="maxDate"
        />
      </div>
    `,
  }),
};

export const WithTime: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Appointment"
          [showTime]="true"
        />
      </div>
    `,
  }),
};

export const TimeOnly: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Time"
          [timeOnly]="true"
        />
      </div>
    `,
  }),
};

export const TwelveHourFormat: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Appointment"
          [showTime]="true"
          hourFormat="12"
        />
      </div>
    `,
  }),
};

export const Range: Story = {
  render: () => ({
    props: {
      control: new FormControl<GmDateRange>([null, null]),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Period"
          selectionMode="range"
        />
      </div>
    `,
  }),
};

export const Required: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          placeholder="Select date"
          [required]="true"
        />
      </div>
    `,
  }),
};

export const WithHint: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          placeholder="Select date"
          hint="Format: dd/MM/yyyy"
        />
      </div>
    `,
  }),
};

export const WithError: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(null),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker
          [formControl]="control"
          label="Start Date"
          placeholder="Select date"
          error="Start date is required"
        />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(
        { value: new Date(2026, 5, 15), disabled: true },
      ),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker [formControl]="control" label="Start Date" />
      </div>
    `,
  }),
};

export const ReadOnly: Story = {
  render: () => ({
    props: {
      control: new FormControl<Date | null>(new Date(2026, 5, 15)),
    },
    template: `
      <div style="max-width: 320px">
        <gm-datepicker [formControl]="control" label="Start Date" [readonly]="true" />
      </div>
    `,
  }),
};

export const AllStates: Story = {
  render: () => ({
    props: {
      empty: new FormControl<Date | null>(null),
      filled: new FormControl<Date | null>(new Date(2026, 5, 15)),
      error: new FormControl<Date | null>(null),
      disabled: new FormControl<Date | null>(
        { value: new Date(2026, 5, 15), disabled: true },
      ),
      range: new FormControl<GmDateRange>([null, null]),
      time: new FormControl<Date | null>(null),
    },
    template: `
      <div style="display:flex; flex-direction:column; gap:16px; max-width: 320px">
        <gm-datepicker [formControl]="filled" label="With value" />
        <gm-datepicker [formControl]="empty" label="Default" placeholder="Select date" />
        <gm-datepicker [formControl]="error" label="With error" error="Start date is required" />
        <gm-datepicker [formControl]="disabled" label="Disabled" />
        <gm-datepicker [formControl]="range" label="Range" selectionMode="range" />
        <gm-datepicker [formControl]="time" label="With time" [showTime]="true" />
      </div>
    `,
  }),
};
