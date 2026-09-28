import { Component, signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import type { TableModel } from './table-config.types';
import type { GmTableRequest } from './table-request.types';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Beirut Clinic' },
  { id: 2, name: 'Amman Centre' },
];

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [records]="records()"
      [tableConfig]="tableConfig"
      [totalRecords]="records().length"
      (filterChange)="filterRequests.push($event)"
      (searchChange)="searchTerms.push($event)"
    />
  `,
})
class HostComponent {
  readonly records = signal<Row[]>(ROWS);

  readonly filterRequests: GmTableRequest[] = [];
  readonly searchTerms: string[] = [];

  readonly tableConfig: TableModel<Row> = {
    columns: [{ field: 'name', header: 'name' }],
    showSearch: true,
  };
}

describe('gm-table config mode search', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const box = () =>
    fixture.nativeElement.querySelector(
      '.gm-table-toolbar__search input',
    ) as HTMLInputElement | null;

  const type = (value: string) => {
    const input = box()!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the toolbar search box when the config opts in', () => {
    expect(box()).not.toBeNull();
  });

  // `searchChange` is report-only, fired alongside `filterChange` rather than
  // instead of it — the table has already acted on the term by the time
  // either event reaches the host, so nothing here doubles as a second fetch.
  it('fires alongside filterChange, carrying the same term', fakeAsync(() => {
    type('beirut');
    tick(400);

    expect(host.searchTerms).toEqual(['beirut']);
    expect(host.filterRequests[host.filterRequests.length - 1].globalSearch).toBe(
      'beirut',
    );
  }));

  it('reports a cleared box as an empty string', fakeAsync(() => {
    type('beirut');
    tick(400);
    type('');
    tick(400);

    expect(host.searchTerms).toEqual(['beirut', '']);
  }));

  it('reports the settled term once for a run of keystrokes', fakeAsync(() => {
    for (const value of ['b', 'be', 'bei', 'beir']) {
      type(value);
      tick(50);
    }
    tick(400);

    expect(host.searchTerms).toEqual(['beir']);
  }));
});

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `<gm-table [records]="records" [tableConfig]="tableConfig" />`,
})
class DefaultHostComponent {
  readonly records: Row[] = ROWS;

  // No `showSearch` at all — the point of this fixture.
  readonly tableConfig: TableModel<Row> = {
    columns: [{ field: 'name', header: 'name' }],
  };
}

describe('gm-table config mode search — default', () => {
  it('renders no search box when the config omits showSearch', async () => {
    await TestBed.configureTestingModule({
      imports: [DefaultHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(DefaultHostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.gm-table-toolbar__search input'),
    ).toBeNull();
  });
});
