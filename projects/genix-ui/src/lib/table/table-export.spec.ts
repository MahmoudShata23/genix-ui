import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GmTableComponent } from './table.component';
import { gmBuildCsv, gmCsvEscape, gmCsvValue } from './table-export';
import type { GmTableColumn } from './table.types';

interface Row {
  id: number;
  name: string;
  note: string;
  active: boolean;
  joined: Date | null;
}

describe('CSV value formatting', () => {
  it('renders each primitive predictably', () => {
    expect(gmCsvValue(null)).toBe('');
    expect(gmCsvValue(undefined)).toBe('');
    expect(gmCsvValue('')).toBe('');
    expect(gmCsvValue(0)).toBe('0');
    expect(gmCsvValue(12.5)).toBe('12.5');
    expect(gmCsvValue(false)).toBe('false');
    expect(gmCsvValue(true)).toBe('true');
    expect(gmCsvValue('plain')).toBe('plain');
  });

  it('renders a date as a local calendar day, not a shifted UTC one', () => {
    // 1 Jan 00:30 local would be 31 Dec under toISOString east of UTC.
    expect(gmCsvValue(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });

  it('renders an invalid date as empty rather than "Invalid Date"', () => {
    expect(gmCsvValue(new Date('nonsense'))).toBe('');
  });

  it('escapes only what needs escaping', () => {
    expect(gmCsvEscape('Shata', ',')).toBe('Shata');
    expect(gmCsvEscape('Mahmoud, Shata', ',')).toBe('"Mahmoud, Shata"');
    expect(gmCsvEscape('say "hi"', ',')).toBe('"say ""hi"""');
    expect(gmCsvEscape('line\nbreak', ',')).toBe('"line\nbreak"');
    expect(gmCsvEscape('carriage\rreturn', ',')).toBe('"carriage\rreturn"');
  });

  it('builds a header line plus one line per row', () => {
    const columns: GmTableColumn<{ a: string; b: number }>[] = [
      { field: 'a', header: 'Alpha' },
      { field: 'b', header: 'Beta' },
    ];
    const csv = gmBuildCsv([{ a: 'x', b: 1 }], columns);
    expect(csv).toBe('Alpha,Beta\r\nx,1');
  });

  it('quotes a header that contains a comma', () => {
    const csv = gmBuildCsv([], [{ field: 'a', header: 'Last, First' }]);
    expect(csv).toBe('"Last, First"');
  });
});

@Component({
  standalone: true,
  imports: [GmTableComponent],
  template: `
    <gm-table
      [data]="rows"
      [columns]="columns"
      rowKey="id"
      filterMode="client"
      selectionMode="multiple"
      [(selection)]="selected"
      [globalSearch]="search()"
    />
  `,
})
class Host {
  readonly rows: Row[] = [
    { id: 1, name: 'Mahmoud, Shata', note: 'says "hi"', active: true, joined: new Date(2026, 0, 1) },
    { id: 2, name: 'Alan', note: '', active: false, joined: null },
  ];
  selected: Row[] = [];
  readonly search = signal('');

  readonly columns: GmTableColumn<Row>[] = [
    { field: 'name', header: 'Name' },
    { field: 'note', header: 'Note' },
    { field: 'active', header: 'Active' },
    { field: 'joined', header: 'Joined' },
    // Utility column: rendered, never exported.
    { field: 'actions', header: 'Actions', exportable: false },
  ];
}

describe('gm-table exportCsv', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let table: GmTableComponent<Row>;
  let downloaded: { name: string; text: string } | null;
  let revoked: boolean;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    table = fixture.debugElement.children[0].componentInstance;

    downloaded = null;
    revoked = false;
    let captured: Blob | null = null;

    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob | MediaSource) => {
      captured = blob as Blob;
      return 'blob:stub';
    });
    spyOn(URL, 'revokeObjectURL').and.callFake(() => {
      revoked = true;
    });
    // Intercept the anchor click so the browser never actually navigates.
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (
      this: HTMLAnchorElement,
    ) {
      downloaded = { name: this.download, text: '' };
      if (captured) {
        // FileReader is async; the text is asserted via the captured blob below.
        (downloaded as { blob?: Blob }).blob = captured;
      }
    });
  });

  const csvText = async (): Promise<string> =>
    await ((downloaded as unknown as { blob: Blob }).blob as Blob).text();

  it('downloads a .csv named from the options', () => {
    table.exportCsv({ fileName: 'users' });
    expect(downloaded!.name).toBe('users.csv');
  });

  it('defaults the file name and never doubles the extension', () => {
    table.exportCsv();
    expect(downloaded!.name).toBe('export.csv');

    table.exportCsv({ fileName: 'already.csv' });
    expect(downloaded!.name).toBe('already.csv');
  });

  it('releases the object URL', () => {
    table.exportCsv();
    expect(revoked).toBeTrue();
  });

  it('prefixes a UTF-8 BOM so Excel decodes accents correctly', async () => {
    table.exportCsv();
    const bytes = new Uint8Array(
      await ((downloaded as unknown as { blob: Blob }).blob as Blob).arrayBuffer(),
    );
    // `Blob.text()` decodes the BOM away, so the raw bytes are the only proof.
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('leaves no anchor behind in the document', () => {
    table.exportCsv();
    expect(document.querySelectorAll('a[download]').length).toBe(0);
  });

  it('writes escaped values and skips the utility column', async () => {
    table.exportCsv();
    const text = await csvText();

    const lines = text.split('\r\n');
    expect(lines[0]).toBe('Name,Note,Active,Joined');
    expect(lines[1]).toBe('"Mahmoud, Shata","says ""hi""",true,2026-01-01');
    expect(lines[2]).toBe('Alan,,false,');
  });

  it('exports only the selected rows when asked', async () => {
    host.selected = [host.rows[1]];
    fixture.detectChanges();

    table.exportCsv({ selectionOnly: true });
    const lines = (await csvText()).split('\r\n');
    expect(lines.length).toBe(2);
    expect(lines[1]).toBe('Alan,,false,');
  });

  it('exports what is on screen, so a search narrows the file', async () => {
    host.search.set('alan');
    fixture.detectChanges();

    table.exportCsv();
    const lines = (await csvText()).split('\r\n');
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain('Alan');
  });
});
