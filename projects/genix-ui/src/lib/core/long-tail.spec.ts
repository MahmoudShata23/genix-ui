import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { GmChartComponent } from '../chart/chart.component';
import {
  GmChartEngine,
  GmChartInstance,
  GmChartType,
  provideGmChart,
} from '../chart/chart.types';
import { GmFileUploadComponent } from '../file-upload/file-upload.component';
import type { GmFileRejection } from '../file-upload/file-upload.types';
import { GmOrderListItemDirective } from '../order-list/order-list-item.directive';
import { GmOrderListComponent } from '../order-list/order-list.component';
import { GmStepComponent } from '../stepper/step.component';
import { GmStepperComponent } from '../stepper/stepper.component';

/* ── Helpers ───────────────────────────────────────────────────────────── */

function makeFile(name: string, type = 'application/pdf', size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

function transferOf(files: File[]): DataTransfer {
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  return transfer;
}

/** Drives the native input the way the file dialog would. */
function pick(input: HTMLInputElement, ...files: File[]): void {
  input.files = transferOf(files).files;
  input.dispatchEvent(new Event('change'));
}

function drop(zone: HTMLElement, ...files: File[]): void {
  zone.dispatchEvent(
    new DragEvent('drop', { dataTransfer: transferOf(files), bubbles: true }),
  );
}

/* ── gm-file-upload ────────────────────────────────────────────────────── */

@Component({
  standalone: true,
  imports: [GmFileUploadComponent],
  template: `
    <gm-file-upload
      class="single"
      accept=".pdf,image/*"
      [maxFileSize]="100"
      label="Attachment"
      (filesSelected)="single = $event"
      (rejected)="rejections = $event"
    />

    <gm-file-upload
      class="multi"
      [multiple]="true"
      [disabled]="locked()"
      (filesSelected)="multi = $event"
      (fileRemoved)="removed = $event"
    />
  `,
})
class UploadHost {
  single: File[] | null = null;
  multi: File[] | null = null;
  removed: File | null = null;
  rejections: GmFileRejection[] | null = null;
  readonly locked = signal(false);
}

describe('gm-file-upload', () => {
  let fixture: ComponentFixture<UploadHost>;
  let host: UploadHost;

  const input = (which: string) =>
    fixture.nativeElement.querySelector(
      `.${which} .gm-file-upload__input`,
    ) as HTMLInputElement;

  const names = (which: string) =>
    Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll(`.${which} .gm-file-upload__name`),
    ).map((node) => node.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UploadHost] }).compileComponents();
    fixture = TestBed.createComponent(UploadHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits the native File objects that were chosen', () => {
    pick(input('single'), makeFile('policy.pdf'));
    fixture.detectChanges();

    expect(host.single?.length).toBe(1);
    expect(host.single?.[0] instanceof File).toBeTrue();
    expect(host.single?.[0].name).toBe('policy.pdf');
  });

  it('passes accept and multiple to the native input', () => {
    expect(input('single').getAttribute('accept')).toBe('.pdf,image/*');
    expect(input('single').multiple).toBeFalse();
    expect(input('multi').multiple).toBeTrue();
  });

  it('keeps one file in single mode and replaces it on the next pick', () => {
    pick(input('single'), makeFile('first.pdf'));
    fixture.detectChanges();
    pick(input('single'), makeFile('second.pdf'));
    fixture.detectChanges();

    expect(host.single?.map((file) => file.name)).toEqual(['second.pdf']);
    expect(names('single')).toEqual(['second.pdf']);
  });

  it('accumulates across picks in multiple mode', () => {
    pick(input('multi'), makeFile('a.pdf'), makeFile('b.pdf'));
    fixture.detectChanges();
    pick(input('multi'), makeFile('c.pdf'));
    fixture.detectChanges();

    expect(host.multi?.map((file) => file.name)).toEqual([
      'a.pdf',
      'b.pdf',
      'c.pdf',
    ]);
  });

  it('rejects a file whose type is outside accept', () => {
    pick(input('single'), makeFile('notes.txt', 'text/plain'));
    fixture.detectChanges();

    expect(host.single).toBeNull();
    expect(host.rejections?.length).toBe(1);
    expect(host.rejections?.[0].reason).toBe('type');
    expect(
      fixture.nativeElement.querySelector('.single .gm-file-upload__errors')
        .textContent,
    ).toContain('notes.txt');
  });

  it('matches a wildcard accept token against the media type', () => {
    pick(input('single'), makeFile('scan.jpeg', 'image/jpeg'));
    fixture.detectChanges();

    expect(host.rejections?.length ?? 0).toBe(0);
    expect(host.single?.[0].name).toBe('scan.jpeg');
  });

  it('rejects a file over maxFileSize and says so', () => {
    pick(input('single'), makeFile('big.pdf', 'application/pdf', 500));
    fixture.detectChanges();

    expect(host.single).toBeNull();
    expect(host.rejections?.[0].reason).toBe('size');
    expect(host.rejections?.[0].message).toContain('big.pdf');
  });

  it('takes a file out and re-emits the remaining selection', () => {
    pick(input('multi'), makeFile('a.pdf'), makeFile('b.pdf'));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('.multi .gm-file-upload__remove button')
      .click();
    fixture.detectChanges();

    expect(host.removed?.name).toBe('a.pdf');
    expect(host.multi?.map((file) => file.name)).toEqual(['b.pdf']);
    expect(names('multi')).toEqual(['b.pdf']);
  });

  it('clears everything and emits an empty selection', () => {
    pick(input('multi'), makeFile('a.pdf'), makeFile('b.pdf'));
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('.multi .gm-file-upload__clear button')
      .click();
    fixture.detectChanges();

    expect(host.multi).toEqual([]);
    expect(names('multi')).toEqual([]);
  });

  it('accepts dropped files', () => {
    const zone = fixture.nativeElement.querySelector(
      '.multi .gm-file-upload__zone',
    ) as HTMLElement;

    drop(zone, makeFile('dropped.pdf'));
    fixture.detectChanges();

    expect(host.multi?.map((file) => file.name)).toEqual(['dropped.pdf']);
  });

  it('ignores a drop while disabled', () => {
    host.locked.set(true);
    fixture.detectChanges();

    drop(
      fixture.nativeElement.querySelector('.multi .gm-file-upload__zone'),
      makeFile('dropped.pdf'),
    );
    fixture.detectChanges();

    expect(host.multi).toBeNull();
    expect(input('multi').disabled).toBeTrue();
  });

  it('names the zone from its label and hides the input from the tab order', () => {
    const zone = fixture.nativeElement.querySelector(
      '.single .gm-file-upload__zone',
    ) as HTMLElement;
    const labelId = fixture.nativeElement.querySelector(
      '.single .gm-file-upload__label',
    ).id;

    expect(zone.getAttribute('aria-labelledby')).toBe(labelId);
    expect(input('single').tabIndex).toBe(-1);
    expect(input('single').getAttribute('aria-hidden')).toBe('true');
  });
});

/* ── gm-stepper ────────────────────────────────────────────────────────── */

@Component({
  standalone: true,
  imports: [GmStepperComponent, GmStepComponent],
  template: `
    <gm-stepper [(activeStep)]="step" [nextDisabled]="blocked()">
      <gm-step label="Details"><p class="one">One</p></gm-step>
      <gm-step label="Documents" [disabled]="skipDocs()">
        <p class="two">Two</p>
      </gm-step>
      <gm-step label="Review" [completed]="reviewDone()">
        <p class="three">Three</p>
      </gm-step>
    </gm-stepper>
  `,
})
class StepperHost {
  step = 0;
  readonly blocked = signal(false);
  readonly skipDocs = signal(false);
  readonly reviewDone = signal<boolean | undefined>(undefined);
}

describe('gm-stepper', () => {
  let fixture: ComponentFixture<StepperHost>;
  let host: StepperHost;

  const headers = () =>
    Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.gm-stepper__button'),
    );

  const nextButton = () =>
    fixture.nativeElement.querySelector(
      '.gm-stepper__next button',
    ) as HTMLButtonElement;

  const backButton = () =>
    fixture.nativeElement.querySelector(
      '.gm-stepper__back button',
    ) as HTMLButtonElement;

  const visible = () =>
    ['one', 'two', 'three'].filter((step) =>
      fixture.nativeElement.querySelector(`.${step}`),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepperHost] }).compileComponents();
    fixture = TestBed.createComponent(StepperHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders one header per step and shows only the active panel', () => {
    expect(headers().map((button) => button.textContent?.trim())).toEqual([
      '1 Details',
      '2 Documents',
      '3 Review',
    ]);
    expect(visible()).toEqual(['one']);
  });

  it('marks the active step with aria-current', () => {
    expect(headers()[0].getAttribute('aria-current')).toBe('step');
    expect(headers()[1].getAttribute('aria-current')).toBeNull();
  });

  it('advances on Next and writes back through the two-way binding', () => {
    nextButton().click();
    fixture.detectChanges();

    expect(host.step).toBe(1);
    expect(visible()).toEqual(['two']);
    expect(headers()[1].getAttribute('aria-current')).toBe('step');
  });

  it('goes back, and disables Back on the first step', () => {
    expect(backButton().disabled).toBeTrue();

    nextButton().click();
    fixture.detectChanges();
    expect(backButton().disabled).toBeFalse();

    backButton().click();
    fixture.detectChanges();
    expect(host.step).toBe(0);
  });

  it('disables Next on the last step', () => {
    host.step = 2;
    fixture.detectChanges();

    expect(nextButton().disabled).toBeTrue();
  });

  it('jumps to a step from its header', () => {
    headers()[2].click();
    fixture.detectChanges();

    expect(host.step).toBe(2);
    expect(visible()).toEqual(['three']);
  });

  it('skips a disabled step and refuses to select it', () => {
    host.skipDocs.set(true);
    fixture.detectChanges();

    expect(headers()[1].disabled).toBeTrue();

    headers()[1].click();
    fixture.detectChanges();
    expect(host.step).toBe(0);

    nextButton().click();
    fixture.detectChanges();
    expect(host.step).toBe(2);
  });

  it('treats the steps behind the active one as completed', () => {
    const completed = () =>
      headers().map((button) =>
        button.parentElement!.classList.contains(
          'gm-stepper__step--completed',
        ),
      );

    expect(completed()).toEqual([false, false, false]);

    host.step = 2;
    fixture.detectChanges();
    expect(completed()).toEqual([true, true, false]);
    expect(
      headers()[0].querySelector('.gm-stepper__marker .pi-check'),
    ).not.toBeNull();
  });

  it('lets a step force its own completed state', () => {
    host.reviewDone.set(true);
    fixture.detectChanges();

    expect(
      headers()[2].parentElement!.classList.contains(
        'gm-stepper__step--completed',
      ),
    ).toBeTrue();
  });

  it('lets the app block Next without blocking the headers', () => {
    host.blocked.set(true);
    fixture.detectChanges();

    expect(nextButton().disabled).toBeTrue();

    headers()[1].click();
    fixture.detectChanges();
    expect(host.step).toBe(1);
  });
});

/* ── gm-order-list ─────────────────────────────────────────────────────── */

interface Benefit {
  name: string;
}

@Component({
  standalone: true,
  imports: [GmOrderListComponent, GmOrderListItemDirective],
  template: `
    <gm-order-list
      class="bound"
      [items]="items"
      itemLabel="name"
      header="Benefits"
      [disabled]="locked()"
      (orderChange)="reorder($event)"
    />

    <gm-order-list class="loose" [items]="loose" itemLabel="name" (orderChange)="emitted = $event">
      <ng-template gmOrderListItem let-item let-index="index">
        <span class="loose-row">{{ index + 1 }}: {{ item.name }}</span>
      </ng-template>
    </gm-order-list>
  `,
})
class OrderHost {
  items: readonly Benefit[] = [
    { name: 'Dental' },
    { name: 'Optical' },
    { name: 'Maternity' },
  ];
  readonly loose: readonly Benefit[] = [{ name: 'A' }, { name: 'B' }];
  emitted: unknown[] | null = null;
  readonly locked = signal(false);

  reorder(next: unknown[]): void {
    this.items = next as Benefit[];
  }
}

describe('gm-order-list', () => {
  let fixture: ComponentFixture<OrderHost>;
  let host: OrderHost;

  const labels = () =>
    Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.bound .gm-order-list__label'),
    ).map((node) => node.textContent?.trim());

  const up = (row: number) =>
    fixture.nativeElement.querySelectorAll('.bound .gm-order-list__up button')[
      row
    ] as HTMLButtonElement;

  const down = (row: number) =>
    fixture.nativeElement.querySelectorAll(
      '.bound .gm-order-list__down button',
    )[row] as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OrderHost] }).compileComponents();
    fixture = TestBed.createComponent(OrderHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the items in order, read through itemLabel', () => {
    expect(labels()).toEqual(['Dental', 'Optical', 'Maternity']);
  });

  it('moves a row down and emits the new order', () => {
    down(0).click();
    fixture.detectChanges();

    expect(host.items.map((item) => item.name)).toEqual([
      'Optical',
      'Dental',
      'Maternity',
    ]);
    expect(labels()).toEqual(['Optical', 'Dental', 'Maternity']);
  });

  it('moves a row up', () => {
    up(2).click();
    fixture.detectChanges();

    expect(host.items.map((item) => item.name)).toEqual([
      'Dental',
      'Maternity',
      'Optical',
    ]);
  });

  it('disables the move that would leave the list', () => {
    expect(up(0).disabled).toBeTrue();
    expect(down(2).disabled).toBeTrue();
    expect(down(0).disabled).toBeFalse();
  });

  it('emits the order a drag produced', () => {
    const dropList = fixture.debugElement
      .query(By.directive(CdkDropList))
      .injector.get(CdkDropList);

    dropList.dropped.emit({ previousIndex: 0, currentIndex: 2 } as never);
    fixture.detectChanges();

    expect(host.items.map((item) => item.name)).toEqual([
      'Optical',
      'Maternity',
      'Dental',
    ]);
  });

  it('never mutates the array it was given', () => {
    const before = host.loose;

    fixture.nativeElement
      .querySelectorAll('.loose .gm-order-list__down button')[0]
      .click();
    fixture.detectChanges();

    expect(host.emitted).toEqual([{ name: 'B' }, { name: 'A' }]);
    // The caller ignored the event, so the list still shows what it was given.
    expect(host.loose).toBe(before);
    expect(host.loose.map((item) => item.name)).toEqual(['A', 'B']);
    expect(
      Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('.loose .loose-row'),
      ).map((node) => node.textContent?.trim()),
    ).toEqual(['1: A', '2: B']);
  });

  it('stops every move while disabled', () => {
    host.locked.set(true);
    fixture.detectChanges();

    expect(down(0).disabled).toBeTrue();
    expect(up(2).disabled).toBeTrue();

    const dropList = fixture.debugElement
      .query(By.directive(CdkDropList))
      .injector.get(CdkDropList);
    expect(dropList.disabled).toBeTrue();

    dropList.dropped.emit({ previousIndex: 0, currentIndex: 2 } as never);
    fixture.detectChanges();
    expect(host.items.map((item) => item.name)).toEqual([
      'Dental',
      'Optical',
      'Maternity',
    ]);
  });
});

/* ── gm-chart ──────────────────────────────────────────────────────────── */

class FakeChart implements GmChartInstance {
  static created: FakeChart[] = [];

  data: unknown;
  options: unknown;
  updates = 0;
  destroyed = false;

  readonly chartType: string;

  constructor(
    readonly canvas: HTMLCanvasElement,
    config: { type: string; data: unknown; options?: unknown },
  ) {
    this.chartType = config.type;
    this.data = config.data;
    this.options = config.options;
    FakeChart.created.push(this);
  }

  update(): void {
    this.updates++;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

@Component({
  standalone: true,
  imports: [GmChartComponent],
  template: `
    <gm-chart
      [type]="type()"
      [data]="data()"
      [options]="options()"
      [height]="height()"
      [ariaLabel]="ariaLabel()"
    />
  `,
})
class ChartHost {
  readonly type = signal<GmChartType>('bar');
  readonly data = signal<unknown>({ labels: ['A'], datasets: [{ data: [1] }] });
  readonly options = signal<unknown>(undefined);
  readonly height = signal('20rem');
  readonly ariaLabel = signal<string | undefined>(undefined);
}

describe('gm-chart', () => {
  let fixture: ComponentFixture<ChartHost>;
  let host: ChartHost;

  const configs = () =>
    FakeChart.created.map((chart) => chart.options as Record<string, unknown>);

  beforeEach(async () => {
    FakeChart.created = [];
    await TestBed.configureTestingModule({
      imports: [ChartHost],
      providers: [provideGmChart(FakeChart as unknown as GmChartEngine)],
    }).compileComponents();
    fixture = TestBed.createComponent(ChartHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('builds one chart on the canvas it owns', () => {
    const canvas = fixture.nativeElement.querySelector('canvas');

    expect(FakeChart.created.length).toBe(1);
    expect(FakeChart.created[0].canvas).toBe(canvas);
    expect(FakeChart.created[0].data).toBe(host.data());
  });

  it('is responsive by default and lets options override that', () => {
    expect(configs()[0]['responsive']).toBeTrue();
    expect(configs()[0]['maintainAspectRatio']).toBeFalse();

    host.options.set({ maintainAspectRatio: true, plugins: {} });
    fixture.detectChanges();

    const live = FakeChart.created[0].options as Record<string, unknown>;
    expect(live['responsive']).toBeTrue();
    expect(live['maintainAspectRatio']).toBeTrue();
    expect(live['plugins']).toEqual({});
  });

  it('updates the live chart when the data changes', () => {
    const next = { labels: ['A', 'B'], datasets: [{ data: [1, 2] }] };
    host.data.set(next);
    fixture.detectChanges();

    expect(FakeChart.created.length).toBe(1);
    expect(FakeChart.created[0].updates).toBe(1);
    expect(FakeChart.created[0].data).toBe(next);
    expect(FakeChart.created[0].destroyed).toBeFalse();
  });

  it('rebuilds, and disposes the old chart, when the type changes', () => {
    host.type.set('line');
    fixture.detectChanges();

    expect(FakeChart.created.length).toBe(2);
    expect(FakeChart.created.map((chart) => chart.chartType)).toEqual([
      'bar',
      'line',
    ]);
    expect(FakeChart.created[0].destroyed).toBeTrue();
    expect(FakeChart.created[1].destroyed).toBeFalse();
  });

  it('disposes the chart when the view goes away', () => {
    fixture.destroy();

    expect(FakeChart.created[0].destroyed).toBeTrue();
  });

  it('gives the frame a real height, which is what makes it responsive', () => {
    const frame = fixture.nativeElement.querySelector(
      '.gm-chart__frame',
    ) as HTMLElement;
    expect(frame.style.height).toBe('20rem');

    host.height.set('12rem');
    fixture.detectChanges();
    expect(frame.style.height).toBe('12rem');
  });

  it('names the canvas only when there is a label to give it', () => {
    const canvas = fixture.nativeElement.querySelector(
      'canvas',
    ) as HTMLCanvasElement;
    expect(canvas.getAttribute('role')).toBeNull();

    host.ariaLabel.set('Claims per month');
    fixture.detectChanges();

    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Claims per month');
  });

  it('exposes the live instance for the calls the wrapper does not cover', () => {
    const chart = fixture.debugElement.query(By.directive(GmChartComponent))
      .componentInstance as GmChartComponent;

    expect(chart.instance).toBe(FakeChart.created[0]);
  });
});

describe('gm-chart without an engine', () => {
  it('says how to provide one', async () => {
    await TestBed.configureTestingModule({ imports: [ChartHost] }).compileComponents();
    const fixture = TestBed.createComponent(ChartHost);

    expect(() => fixture.detectChanges()).toThrowError(/provideGmChart/);
  });
});
