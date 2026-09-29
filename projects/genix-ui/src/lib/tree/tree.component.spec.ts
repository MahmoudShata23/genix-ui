import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { GmTreeComponent } from './tree.component';
import {
  GmTreeIconDirective,
  GmTreeNodeDirective,
} from './tree-templates.directive';
import type {
  GmTreeFilterEvent,
  GmTreeFilterMode,
  GmTreeNode,
  GmTreeNodeEvent,
  GmTreeSelectionMode,
} from './tree.types';

function buildNodes(): GmTreeNode[] {
  return [
    {
      key: 'docs',
      label: 'Documents',
      type: 'folder',
      children: [
        {
          key: 'work',
          label: 'Work',
          type: 'folder',
          children: [
            { key: 'cv', label: 'CV.doc' },
            { key: 'expenses', label: 'Expenses.doc' },
          ],
        },
        {
          key: 'home',
          label: 'Home',
          type: 'folder',
          children: [{ key: 'invoices', label: 'Invoices.txt' }],
        },
      ],
    },
    {
      key: 'pics',
      label: 'Pictures',
      children: [
        { key: 'barca', label: 'barcelona.jpg' },
        { key: 'logo', label: 'logo.png', selectable: false },
      ],
    },
    { key: 'movies', label: 'Movies', leaf: false },
  ];
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmTreeComponent, GmTreeNodeDirective],
  template: `
    <gm-tree
      #tree
      class="main"
      selectionMode="checkbox"
      label="Files"
      [formControl]="control"
      [nodes]="nodes()"
      [filter]="true"
      [filterMode]="filterMode()"
      [optionValue]="optionValue()"
      [propagateSelectionUp]="up()"
      [propagateSelectionDown]="down()"
      [readonly]="readonly()"
      (nodeExpand)="expanded.push($event)"
      (nodeCollapse)="collapsed.push($event)"
      (nodeSelect)="selected.push($event)"
      (nodeUnselect)="unselected.push($event)"
      (filterChange)="filters.push($event)"
    />

    <gm-tree class="typed" ariaLabel="Typed" [nodes]="nodes()">
      <ng-template gmTreeNode let-node>
        <i class="plain">{{ node.label }}</i>
      </ng-template>
      <ng-template gmTreeNode="folder" let-node let-level="level">
        <b class="folder">{{ node.label }}-{{ level }}</b>
      </ng-template>
    </gm-tree>
  `,
})
class HostComponent {
  readonly tree = viewChild.required<GmTreeComponent>('tree');
  readonly nodes = signal<GmTreeNode[]>(buildNodes());
  readonly filterMode = signal<GmTreeFilterMode>('lenient');
  readonly optionValue = signal<string | undefined>(undefined);
  readonly up = signal(true);
  readonly down = signal(true);
  readonly readonly = signal(false);
  readonly control = new FormControl<unknown[] | null>(null);
  readonly expanded: GmTreeNodeEvent[] = [];
  readonly collapsed: GmTreeNodeEvent[] = [];
  readonly selected: GmTreeNodeEvent[] = [];
  readonly unselected: GmTreeNodeEvent[] = [];
  readonly filters: GmTreeFilterEvent[] = [];
}

describe('gm-tree checkbox mode', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const root = (sel = '.main') =>
    fixture.nativeElement.querySelector(sel) as HTMLElement;
  const treeEl = () => root().querySelector('[role="tree"]') as HTMLElement;
  const rowEls = (sel = '.main') =>
    Array.from(root(sel).querySelectorAll<HTMLElement>('[role="treeitem"]'));
  const labels = () =>
    rowEls().map((row) =>
      row.querySelector('.gm-tree__text')!.textContent!.trim(),
    );
  const row = (label: string) => {
    const found = rowEls().find(
      (el) =>
        el.querySelector('.gm-tree__text')?.textContent?.trim() === label,
    );
    if (!found) {
      throw new Error(`No row "${label}" in [${labels().join(', ')}]`);
    }
    return found;
  };
  const toggler = (label: string) =>
    row(label).querySelector('.gm-tree__toggler') as HTMLElement;
  const keys = () =>
    (host.control.value ?? []).map((item) =>
      typeof item === 'object' ? (item as GmTreeNode).key : item,
    );

  const expand = (...path: string[]) => {
    for (const label of path) {
      toggler(label).click();
      fixture.detectChanges();
    }
  };
  const click = (label: string) => {
    row(label).click();
    fixture.detectChanges();
  };
  const press = (key: string) => {
    treeEl().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  const focusTree = () => {
    treeEl().dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
  };
  const activeLabel = () => {
    const id = treeEl().getAttribute('aria-activedescendant');
    return id
      ? root()
          .querySelector(`#${CSS.escape(id)} .gm-tree__text`)
          ?.textContent?.trim()
      : null;
  };
  const search = (text: string) => {
    const input = root().querySelector(
      '.gm-tree__filter-input',
    ) as HTMLInputElement;
    input.value = text;
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

  // ── Structure & ARIA ──────────────────────────────────────────────────

  it('renders the roots collapsed, as a labelled tree', () => {
    expect(labels()).toEqual(['Documents', 'Pictures', 'Movies']);
    expect(treeEl().getAttribute('aria-multiselectable')).toBe('true');
    const labelId = treeEl().getAttribute('aria-labelledby')!;
    expect(root().querySelector(`#${labelId}`)!.textContent).toContain('Files');
    expect(row('Documents').getAttribute('aria-expanded')).toBe('false');
    expect(row('Documents').getAttribute('aria-level')).toBe('1');
    expect(row('Pictures').getAttribute('aria-posinset')).toBe('2');
    expect(row('Pictures').getAttribute('aria-setsize')).toBe('3');
  });

  it('shows a toggler on a lazy node (leaf: false) and none on a leaf', () => {
    expect(row('Movies').getAttribute('aria-expanded')).toBe('false');
    expand('Pictures');
    expect(row('barcelona.jpg').hasAttribute('aria-expanded')).toBeFalse();
    expect(
      toggler('barcelona.jpg').classList.contains('gm-tree__toggler--leaf'),
    ).toBeTrue();
  });

  it('expands and collapses from the toggler without checking', () => {
    expand('Documents');
    expect(labels()).toEqual(['Documents', 'Work', 'Home', 'Pictures', 'Movies']);
    expect(row('Work').getAttribute('aria-level')).toBe('2');
    expect(host.expanded.map((e) => e.node.key)).toEqual(['docs']);
    expect(host.control.value).toBeNull();

    expand('Documents');
    expect(labels()).toEqual(['Documents', 'Pictures', 'Movies']);
    expect(host.collapsed.map((e) => e.node.key)).toEqual(['docs']);
  });

  it('seeds expansion from the nodes’ own `expanded` flag', () => {
    const nodes = buildNodes();
    nodes[1].expanded = true;
    host.nodes.set(nodes);
    fixture.detectChanges();
    expect(labels()).toContain('barcelona.jpg');
  });

  // ── Value semantics (PrimeNG) ─────────────────────────────────────────

  it('holds every fully checked node; a partial parent is mixed and left out', () => {
    expand('Documents', 'Work');
    click('Work');

    expect(keys()).toEqual(['work', 'cv', 'expenses']);
    expect(row('Work').getAttribute('aria-checked')).toBe('true');
    expect(row('Documents').getAttribute('aria-checked')).toBe('mixed');
    expect(host.selected.map((e) => e.node.key)).toEqual(['work']);
  });

  it('stores the node objects themselves by default', () => {
    expand('Documents', 'Work');
    click('CV.doc');
    expect(host.control.value![0]).toBe(host.nodes()[0].children![0].children![0]);
  });

  it('checks a parent once all its children are checked', () => {
    expand('Documents');
    click('Work');
    click('Home');
    expect(keys()).toEqual(['docs', 'work', 'cv', 'expenses', 'home', 'invoices']);
    expect(row('Documents').getAttribute('aria-checked')).toBe('true');
  });

  it('checks a partial parent fully on click, then unchecks the subtree', () => {
    expand('Documents', 'Work');
    click('CV.doc');
    expect(row('Documents').getAttribute('aria-checked')).toBe('mixed');

    click('Documents');
    expect(keys()).toEqual(['docs', 'work', 'cv', 'expenses', 'home', 'invoices']);

    click('Documents');
    expect(keys()).toEqual([]);
    expect(host.unselected.map((e) => e.node.key)).toEqual(['docs']);
  });

  it('shows a value naming only a parent as a fully checked subtree', () => {
    host.optionValue.set('key');
    host.control.setValue(['docs']);
    fixture.detectChanges();
    expand('Documents', 'Work');
    expect(row('CV.doc').getAttribute('aria-checked')).toBe('true');

    // The next toggle writes the value out in full, minus what was unchecked.
    click('CV.doc');
    expect(keys()).toEqual(['expenses', 'home', 'invoices']);
    expect(row('Documents').getAttribute('aria-checked')).toBe('mixed');
  });

  it('stores `optionValue` of each node with that input set', () => {
    host.optionValue.set('key');
    fixture.detectChanges();
    expand('Documents');
    click('Work');
    expect(host.control.value).toEqual(['work', 'cv', 'expenses']);
  });

  it('keeps values it cannot place in the tree', () => {
    host.optionValue.set('key');
    host.control.setValue(['not-loaded-yet']);
    fixture.detectChanges();
    expand('Pictures');
    click('barcelona.jpg');
    expect(host.control.value).toEqual(['pics', 'barca', 'not-loaded-yet']);
  });

  it('treats a null control value as nothing checked', () => {
    expand('Documents');
    click('Work');
    host.control.setValue(null);
    fixture.detectChanges();
    expect(row('Work').getAttribute('aria-checked')).toBe('false');
  });

  it('with propagateSelectionDown off, checks only the clicked node', () => {
    host.down.set(false);
    fixture.detectChanges();
    expand('Documents');
    click('Documents');
    expect(keys()).toEqual(['docs']);
    expect(row('Work').getAttribute('aria-checked')).toBe('false');
  });

  it('with propagateSelectionUp off, never checks a parent for its children', () => {
    host.up.set(false);
    fixture.detectChanges();
    expand('Documents', 'Work');
    click('CV.doc');
    click('Expenses.doc');
    expect(keys()).toEqual(['cv', 'expenses']);
    expect(row('Work').getAttribute('aria-checked')).toBe('false');
  });

  it('skips a non-selectable node, in clicks and in the cascade', () => {
    expand('Pictures');
    expect(row('logo.png').getAttribute('aria-disabled')).toBe('true');

    click('logo.png');
    expect(host.control.value).toBeNull();

    click('Pictures');
    expect(keys()).toEqual(['pics', 'barca']);
    expect(row('logo.png').getAttribute('aria-checked')).toBe('false');
  });

  it('marks the control touched on the first toggle', () => {
    expand('Pictures');
    click('barcelona.jpg');
    expect(host.control.touched).toBeTrue();
  });

  // ── Locked states ─────────────────────────────────────────────────────

  it('does not check while read-only, but still expands', () => {
    host.readonly.set(true);
    fixture.detectChanges();
    expand('Pictures');
    click('barcelona.jpg');
    expect(labels()).toContain('barcelona.jpg');
    expect(host.control.value).toBeNull();
  });

  it('does nothing while disabled, and leaves the tab order', () => {
    host.control.disable();
    fixture.detectChanges();
    expect(treeEl().getAttribute('tabindex')).toBe('-1');
    expect(treeEl().getAttribute('aria-disabled')).toBe('true');
    expand('Pictures');
    expect(labels()).toEqual(['Documents', 'Pictures', 'Movies']);
    click('Pictures');
    expect(host.control.value).toBeNull();
  });

  // ── Lazy loading ──────────────────────────────────────────────────────

  it('emits nodeExpand for a lazy node and shows children the app supplies', () => {
    expand('Movies');
    expect(host.expanded.map((e) => e.node.key)).toEqual(['movies']);

    // The app answers with a new array; the key keeps the node expanded.
    const nodes = buildNodes();
    nodes[2] = {
      ...nodes[2],
      leaf: true,
      children: [{ key: 'm1', label: 'Casablanca' }],
    };
    host.nodes.set(nodes);
    fixture.detectChanges();
    expect(labels()).toEqual(['Documents', 'Pictures', 'Movies', 'Casablanca']);
  });

  it('shows a spinner in place of the toggler for a loading node', () => {
    const nodes = buildNodes();
    nodes[2].loading = true;
    host.nodes.set(nodes);
    fixture.detectChanges();
    expect(toggler('Movies').querySelector('gm-spinner')).not.toBeNull();
  });

  // ── Public API ────────────────────────────────────────────────────────

  it('expandAll / collapseAll', () => {
    host.tree().expandAll();
    fixture.detectChanges();
    expect(labels().length).toBe(10);

    host.tree().collapseAll();
    fixture.detectChanges();
    expect(labels()).toEqual(['Documents', 'Pictures', 'Movies']);
  });

  // ── Search ────────────────────────────────────────────────────────────

  it('lenient search keeps a match’s subtree and the path to it, opened', () => {
    search('work');
    expect(labels()).toEqual(['Documents', 'Work', 'CV.doc', 'Expenses.doc']);
    expect(row('Work').querySelector('mark')!.textContent).toBe('Work');
  });

  it('strict search keeps only matches and their paths', () => {
    host.filterMode.set('strict');
    fixture.detectChanges();
    search('doc');
    // "Documents" matches, but strict mode still prunes its children.
    expect(labels()).toEqual(['Documents', 'Work', 'CV.doc', 'Expenses.doc']);

    host.filterMode.set('lenient');
    fixture.detectChanges();
    expect(labels()).toEqual([
      'Documents',
      'Work',
      'CV.doc',
      'Expenses.doc',
      'Home',
      'Invoices.txt',
    ]);
  });

  it('highlights every occurrence of the term, case-insensitively', () => {
    search('o');
    const marks = Array.from(row('logo.png').querySelectorAll('mark')).map(
      (mark) => mark.textContent,
    );
    expect(marks).toEqual(['o', 'o']);
    expect(row('logo.png').querySelector('.gm-tree__text')!.textContent).toBe(
      'logo.png',
    );
  });

  it('emits filterChange with the filtered tree, leaving nodes untouched', () => {
    search('cv');
    const event = host.filters[0];
    expect(event.filter).toBe('cv');
    const docs = event.filteredValue[0] as GmTreeNode;
    expect(docs.key).toBe('docs');
    expect(docs.children!.map((child) => child.key)).toEqual(['work']);
    expect(docs.children![0].children!.map((child) => child.key)).toEqual(['cv']);
    expect(host.nodes()[0].children!.length).toBe(2);
  });

  it('shows the empty-filter message when nothing matches', () => {
    search('zzz');
    expect(rowEls().length).toBe(0);
    expect(root().querySelector('.gm-tree__empty')!.textContent).toContain(
      'No results found',
    );
  });

  it('restores the previous expansion once the term is cleared', () => {
    expand('Pictures');
    search('cv');
    expect(labels()).not.toContain('barcelona.jpg');
    search('');
    expect(labels()).toEqual([
      'Documents',
      'Pictures',
      'barcelona.jpg',
      'logo.png',
      'Movies',
    ]);
  });

  it('checking a filtered parent still checks its hidden children', () => {
    search('cv');
    click('Work');
    expect(keys()).toEqual(['work', 'cv', 'expenses']);
  });

  it('resetFilter() clears the term without emitting', () => {
    search('cv');
    host.tree().resetFilter();
    fixture.detectChanges();
    expect(labels()).toEqual(['Documents', 'Pictures', 'Movies']);
    expect(host.filters.length).toBe(1);
  });

  // ── Keyboard ──────────────────────────────────────────────────────────

  it('starts on the first row on focus and moves with the arrows', () => {
    focusTree();
    expect(activeLabel()).toBe('Documents');
    press('ArrowDown');
    expect(activeLabel()).toBe('Pictures');
    press('End');
    expect(activeLabel()).toBe('Movies');
    press('Home');
    expect(activeLabel()).toBe('Documents');
  });

  it('starts on the first checked row when there is one', () => {
    host.optionValue.set('key');
    host.control.setValue(['pics']);
    fixture.detectChanges();
    focusTree();
    expect(activeLabel()).toBe('Pictures');
  });

  it('ArrowRight opens then enters; ArrowLeft leaves then closes', () => {
    focusTree();
    press('ArrowRight');
    expect(row('Documents').getAttribute('aria-expanded')).toBe('true');
    expect(activeLabel()).toBe('Documents');

    press('ArrowRight');
    expect(activeLabel()).toBe('Work');

    press('ArrowLeft');
    expect(activeLabel()).toBe('Documents');

    press('ArrowLeft');
    expect(row('Documents').getAttribute('aria-expanded')).toBe('false');
  });

  it('Space and Enter toggle the active row', () => {
    focusTree();
    press('ArrowDown');
    press(' ');
    expect(keys()).toEqual(['pics', 'barca']);
    press('Enter');
    expect(keys()).toEqual([]);
  });

  it('* expands every sibling of the active row', () => {
    focusTree();
    press('*');
    expect(row('Documents').getAttribute('aria-expanded')).toBe('true');
    expect(row('Pictures').getAttribute('aria-expanded')).toBe('true');
    expect(row('Movies').getAttribute('aria-expanded')).toBe('true');
  });

  describe('type-ahead', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('jumps to the next row starting with the typed letter', () => {
      focusTree();
      press('m');
      expect(activeLabel()).toBe('Movies');

      jasmine.clock().tick(600);
      press('d');
      expect(activeLabel()).toBe('Documents');
    });

    it('matches a longer prefix typed in quick succession', () => {
      host.tree().expandAll();
      fixture.detectChanges();
      focusTree();
      press('e');
      press('x');
      expect(activeLabel()).toBe('Expenses.doc');
    });
  });

  // ── Templates ─────────────────────────────────────────────────────────

  it('renders a node with the template for its type, else the default one', () => {
    const typed = root('.typed');
    expect(typed.querySelector('.folder')!.textContent).toBe('Documents-1');
    expect(
      Array.from(typed.querySelectorAll('.plain')).map((el) => el.textContent),
    ).toEqual(['Pictures', 'Movies']);
    expect(typed.querySelector('.gm-tree__text')).toBeNull();
    expect(typed.querySelector('[role="tree"]')!.getAttribute('aria-label')).toBe(
      'Typed',
    );
  });
});

@Component({
  standalone: true,
  imports: [GmTreeComponent],
  template: `
    <gm-tree
      ariaLabel="Big"
      [nodes]="nodes"
      [virtualScroll]="true"
      [virtualItemSize]="30"
      scrollHeight="300px"
    />
  `,
})
class VirtualHostComponent {
  readonly nodes = Array.from({ length: 2000 }, (_, i) => ({
    key: `n${i}`,
    label: `Node ${i}`,
  }));
}

/**
 * Real async rather than `fakeAsync`: virtualisation depends on the browser
 * firing `scroll` and on the CDK measuring across animation frames.
 */
describe('gm-tree virtual scroll', () => {
  let fixture: ComponentFixture<VirtualHostComponent>;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();
  }

  const viewport = () =>
    fixture.nativeElement.querySelector('[role="tree"]') as HTMLElement;
  const rendered = () =>
    fixture.nativeElement.querySelectorAll('[role="treeitem"]').length;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(VirtualHostComponent);
    await settle();
  });

  it('renders only the rows in view', () => {
    expect(rendered()).toBeGreaterThan(0);
    expect(rendered()).toBeLessThan(100);
  });

  it('scrolls the active row into view from the keyboard', async () => {
    viewport().dispatchEvent(new FocusEvent('focus'));
    viewport().dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await settle();
    expect(viewport().scrollTop).toBeGreaterThan(0);

    // The CDK renders the new range a frame or two after the scroll lands.
    const id = viewport().getAttribute('aria-activedescendant')!;
    const activeRow = () =>
      fixture.nativeElement.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !activeRow(); attempt++) {
      await settle();
    }
    expect(activeRow()?.textContent).toContain('Node 1999');
  });
});

/** A question/answer outline, shaped like the medical-scoring mockup. */
function buildOutline(): GmTreeNode[] {
  return [
    {
      key: 'q1',
      label: 'Untitled question',
      data: { kind: 'question' },
      children: [
        {
          key: 'a1',
          label: '21 to 4132',
          data: { kind: 'answer' },
          children: [
            {
              key: 'q2',
              label: 'Nested question',
              data: { kind: 'question' },
              children: [
                { key: 'a2', label: 'From to To', data: { kind: 'answer' } },
                { key: 'a3', label: 'Other range', data: { kind: 'answer' } },
              ],
            },
          ],
        },
        { key: 'a4', label: 'Last answer', data: { kind: 'answer' } },
      ],
    },
  ];
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, GmTreeComponent, GmTreeIconDirective],
  template: `
    <gm-tree
      ariaLabel="Outline"
      [formControl]="control"
      [nodes]="nodes"
      optionValue="key"
      [selectionMode]="mode()"
      [metaKeySelection]="metaKey()"
      [collapsible]="collapsible()"
      [showLines]="true"
      (nodeSelect)="selected.push($event.node.key)"
      (nodeUnselect)="unselected.push($event.node.key)"
    >
      <ng-template gmTreeIcon let-node let-selected="selected">
        <i class="kind" [attr.data-selected]="selected">{{ node.data.kind === 'question' ? 'Q' : 'A' }}</i>
      </ng-template>
    </gm-tree>
  `,
})
class ModesHostComponent {
  readonly nodes = buildOutline();
  readonly mode = signal<GmTreeSelectionMode>('none');
  readonly metaKey = signal(false);
  readonly collapsible = signal(false);
  readonly control = new FormControl<unknown>(null);
  readonly selected: unknown[] = [];
  readonly unselected: unknown[] = [];
}

describe('gm-tree selection modes & outline options', () => {
  let fixture: ComponentFixture<ModesHostComponent>;
  let host: ModesHostComponent;

  const treeEl = () =>
    fixture.nativeElement.querySelector('[role="tree"]') as HTMLElement;
  const rowEls = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('[role="treeitem"]'),
    ) as HTMLElement[];
  const row = (label: string) =>
    rowEls().find(
      (el) => el.querySelector('.gm-tree__text')?.textContent === label,
    )!;
  const click = (label: string, init: MouseEventInit = {}) => {
    row(label).dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
    fixture.detectChanges();
  };
  const setMode = (mode: GmTreeSelectionMode) => {
    host.mode.set(mode);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModesHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ModesHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── none ──────────────────────────────────────────────────────────────

  it('none: draws no checkbox, carries no selection state, writes no value', () => {
    expect(fixture.nativeElement.querySelector('.gm-tree__tick')).toBeNull();
    expect(treeEl().hasAttribute('aria-multiselectable')).toBeFalse();
    expect(row('21 to 4132').hasAttribute('aria-checked')).toBeFalse();
    expect(row('21 to 4132').hasAttribute('aria-selected')).toBeFalse();
    click('21 to 4132');
    expect(host.control.value).toBeNull();
  });

  // ── single ────────────────────────────────────────────────────────────

  it('single: selects one node, highlights it, and replaces on the next pick', () => {
    setMode('single');
    click('Nested question');
    expect(host.control.value).toBe('q2');
    expect(row('Nested question').getAttribute('aria-selected')).toBe('true');
    expect(row('Nested question').classList).toContain('gm-tree__row--selected');
    expect(row('From to To').getAttribute('aria-selected')).toBe('false');

    click('From to To');
    expect(host.control.value).toBe('a2');
    expect(row('Nested question').getAttribute('aria-selected')).toBe('false');
    expect(host.selected).toEqual(['q2', 'a2']);
  });

  it('single: picking the selected node again keeps it selected', () => {
    setMode('single');
    click('Last answer');
    click('Last answer');
    expect(host.control.value).toBe('a4');
    expect(host.selected).toEqual(['a4']);
    expect(host.unselected).toEqual([]);
  });

  it('single: shows a value written by the form', () => {
    setMode('single');
    host.control.setValue('a3');
    fixture.detectChanges();
    expect(row('Other range').getAttribute('aria-selected')).toBe('true');
    expect(treeEl().hasAttribute('aria-multiselectable')).toBeFalse();
  });

  it('single: Space selects the active row', () => {
    setMode('single');
    treeEl().dispatchEvent(new FocusEvent('focus'));
    treeEl().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    treeEl().dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    fixture.detectChanges();
    expect(host.control.value).toBe('a1');
  });

  // ── multiple ──────────────────────────────────────────────────────────

  it('multiple: every click toggles, with no cascade', () => {
    setMode('multiple');
    click('Nested question');
    click('Last answer');
    expect(host.control.value).toEqual(['q2', 'a4']);
    expect(row('From to To').getAttribute('aria-selected')).toBe('false');
    expect(treeEl().getAttribute('aria-multiselectable')).toBe('true');

    click('Nested question');
    expect(host.control.value).toEqual(['a4']);
    expect(host.unselected).toEqual(['q2']);
  });

  it('multiple + metaKeySelection: a click replaces, Ctrl-click adds', () => {
    setMode('multiple');
    host.metaKey.set(true);
    fixture.detectChanges();
    click('Nested question');
    click('Last answer');
    expect(host.control.value).toEqual(['a4']);

    click('From to To', { ctrlKey: true });
    expect(host.control.value).toEqual(['a4', 'a2']);
  });

  // ── collapsible / lines / icons ───────────────────────────────────────

  it('collapsible off: every node is open and no toggler is drawn', () => {
    expect(rowEls().length).toBe(6);
    expect(fixture.nativeElement.querySelector('.gm-tree__toggler')).toBeNull();
    expect(row('Untitled question').hasAttribute('aria-expanded')).toBeFalse();
  });

  it('collapsible off: ArrowLeft steps to the parent instead of collapsing', () => {
    treeEl().dispatchEvent(new FocusEvent('focus'));
    treeEl().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    treeEl().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(rowEls().length).toBe(6);
    const id = treeEl().getAttribute('aria-activedescendant')!;
    expect(fixture.nativeElement.querySelector(`#${id}`).textContent).toContain(
      'Untitled question',
    );
  });

  it('collapsible on: shows togglers and honours the nodes own expansion', () => {
    host.collapsible.set(true);
    fixture.detectChanges();
    expect(rowEls().length).toBe(1);
    expect(fixture.nativeElement.querySelector('.gm-tree__toggler')).not.toBeNull();
  });

  it('draws guide lines: continuing ancestors, and a stopped branch for a last child', () => {
    const guides = (label: string) =>
      Array.from(row(label).querySelectorAll('.gm-tree__guide')) as HTMLElement[];

    // Level 1: no lines.
    expect(row('Untitled question').querySelector('.gm-tree__guides')).toBeNull();

    // "21 to 4132" has a later sibling, so its branch runs on.
    expect(guides('21 to 4132').length).toBe(1);
    expect(guides('21 to 4132')[0].classList).not.toContain('gm-tree__guide--end');

    // Level 4 under a continuing level-2 answer: that column passes through,
    // plus its own branch; the last child's branch stops at the turn.
    const deep = guides('Other range');
    expect(deep.length).toBe(2);
    expect(deep[1].classList).toContain('gm-tree__guide--end');
    expect(row('Other range').querySelector('.gm-tree__elbow')).not.toBeNull();

    expect(guides('Last answer')[0].classList).toContain('gm-tree__guide--end');
  });

  it('renders the gmTreeIcon template with the node and its selection', () => {
    setMode('single');
    click('Untitled question');
    const icons = Array.from(
      fixture.nativeElement.querySelectorAll('.kind'),
    ) as HTMLElement[];
    expect(icons.map((icon) => icon.textContent)).toEqual([
      'Q',
      'A',
      'Q',
      'A',
      'A',
      'A',
    ]);
    expect(icons[0].getAttribute('data-selected')).toBe('true');
    expect(icons[1].getAttribute('data-selected')).toBe('false');
  });
});
