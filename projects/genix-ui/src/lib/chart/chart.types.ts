import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';

/** The chart kinds `gm-chart` draws. */
export type GmChartType = 'bar' | 'line' | 'pie' | 'doughnut';

/**
 * The part of a chart object the wrapper touches — assign, redraw, dispose.
 * A Chart.js `Chart` satisfies it without any adapter.
 */
export interface GmChartInstance {
  data: unknown;
  options: unknown;
  update(): void;
  destroy(): void;
}

/**
 * A charting constructor, called as `new Engine(canvas, config)`.
 *
 * Loosely typed on purpose. Naming Chart.js's own `ChartConfiguration` here
 * would make this package depend on Chart.js types, and re-declaring them
 * would mean a real `ChartConfiguration` no longer matched. `any[]` keeps
 * `provideGmChart(Chart)` a plain, error-free call.
 */
export type GmChartEngine = new (...args: any[]) => GmChartInstance;

export const GM_CHART_ENGINE = new InjectionToken<GmChartEngine>(
  'GmChartEngine',
);

/**
 * Hands `gm-chart` the charting library to draw with.
 *
 * ```ts
 * import Chart from 'chart.js/auto';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [provideGmChart(Chart)],
 * });
 * ```
 *
 * Chart.js is injected rather than imported because this package has a single
 * entry point: a static `import` of Chart.js here would land in the one bundle
 * every consumer pulls, forcing the dependency on apps that draw nothing. This
 * way the app that wants charts installs `chart.js` and passes it in, and the
 * apps that do not are untouched.
 *
 * Register the parts you need first — or import `chart.js/auto`, which
 * registers everything, as above.
 */
export function provideGmChart(engine: GmChartEngine): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: GM_CHART_ENGINE, useValue: engine },
  ]);
}
