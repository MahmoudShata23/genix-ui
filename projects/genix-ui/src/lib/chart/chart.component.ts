import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';

import {
  GM_CHART_ENGINE,
  GmChartInstance,
  GmChartType,
} from './chart.types';

/**
 * Canvas chart, drawn by the engine given to `provideGmChart` — Chart.js in
 * practice.
 *
 * ```html
 * <gm-chart type="bar" [data]="data" [options]="options" />
 * ```
 *
 * A wrapper and nothing more: it owns the canvas, its size and the instance's
 * life cycle, and forwards `data` and `options` untouched. Everything about
 * what a chart *looks* like stays Chart.js's own documented configuration, so
 * there is no second API to learn and nothing to keep in step with it.
 *
 * `data` and `options` are typed `unknown` for the same reason the engine is
 * injected: naming Chart.js's types would make this package depend on them.
 * Keep your own `ChartData` / `ChartOptions` annotations at the call site.
 *
 * Both are compared by identity, so pass a new object to redraw — mutating the
 * one you passed in place is not a change the component can see. A new `type`
 * rebuilds the chart, since no engine converts a bar into a pie.
 */
@Component({
  selector: 'gm-chart',
  standalone: true,
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'gm-chart' },
})
export class GmChartComponent {
  readonly type = input.required<GmChartType>();

  /** Chart.js `ChartData`. Forwarded as given. */
  readonly data = input.required<unknown>();

  /** Chart.js `ChartOptions`. Merged over the responsive defaults. */
  readonly options = input<unknown>();

  /**
   * Height of the canvas frame. A responsive chart takes its size from this
   * box, so it needs a real one — a bare canvas would collapse.
   */
  readonly height = input('20rem');

  /** A canvas is opaque to assistive technology; this names it. */
  readonly ariaLabel = input<string>();

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly engine = inject(GM_CHART_ENGINE, { optional: true });

  private chart: GmChartInstance | null = null;

  /** Type the live chart was built with, to spot a type change. */
  private renderedType: GmChartType | null = null;

  /** The live chart, for the odd call the wrapper does not cover. */
  get instance(): GmChartInstance | null {
    return this.chart;
  }

  constructor() {
    effect(() => {
      // Tracked: the canvas plus every input the chart is built from.
      const canvas = this.canvasRef().nativeElement;
      const type = this.type();
      const data = this.data();
      const options = this.options();

      // Untracked: drawing reads nothing else, and this keeps the engine's own
      // signal reads (if it ever had any) out of this effect's dependencies.
      untracked(() => this.render(canvas, type, data, options));
    });

    // The canvas outlives Angular's teardown unless the chart lets go of it —
    // this is what keeps a destroyed view from leaking its listeners.
    inject(DestroyRef).onDestroy(() => this.destroyChart());
  }

  private render(
    canvas: HTMLCanvasElement,
    type: GmChartType,
    data: unknown,
    options: unknown,
  ): void {
    const engine = this.engine;
    if (!engine) {
      throw new Error(
        'gm-chart has no charting engine. Add `provideGmChart(Chart)` to your ' +
          'application providers, with Chart imported from `chart.js/auto`.',
      );
    }

    // Responsive by default, and free of the 2:1 aspect ratio Chart.js would
    // otherwise impose, so the chart fills the frame's height. Both stay
    // overridable through `options`.
    const merged: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: false,
      ...((options as Record<string, unknown> | undefined) ?? {}),
    };

    if (this.chart && this.renderedType === type) {
      this.chart.data = data;
      this.chart.options = merged;
      this.chart.update();
      return;
    }

    this.destroyChart();
    this.chart = new engine(canvas, { type, data, options: merged });
    this.renderedType = type;
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
    this.renderedType = null;
  }
}
