import { bootstrapApplication } from '@angular/platform-browser';
import { provideGmChart } from '@mahmoudshata23/genix-ui';
import Chart from 'chart.js/auto';

import { AppComponent } from './app/app.component';

// The one line a consuming app adds to draw charts: the library never
// imports Chart.js itself, so apps that show none do not carry it.
bootstrapApplication(AppComponent, {
  providers: [provideGmChart(Chart)],
}).catch((err) => console.error(err));
