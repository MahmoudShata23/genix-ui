# @mahmoudshata23/genix-ui

Angular 19 component library for GlobeMed apps. Native HTML first, Angular CDK
only where the platform is insufficient, **no PrimeNG / Material dependency**.

> **About the scope.** GitHub Packages requires the npm scope to equal the
> account that owns the package, so this is published as `@mahmoudshata23/`
> rather than `@globemed/`. It is only a registry constraint, not a rename you
> have to adopt: install it under whatever name your project already imports
> using an npm alias — see [below](#importing-it-as-globemedgenix-ui).

## Installing

```bash
# 1. point the scope at GitHub Packages (safe to commit — no secret)
echo "@mahmoudshata23:registry=https://npm.pkg.github.com" >> .npmrc

# 2. authenticate in your USER-level ~/.npmrc, never in a tracked file:
#    //npm.pkg.github.com/:_authToken=<PAT with read:packages>

# 3. install, plus the CDK peer dependency
npm i @mahmoudshata23/genix-ui @angular/cdk
```

`@angular/cdk` is a peer dependency — the overlay-based components (select,
multiselect, datepicker, tooltip) need it.

### Importing it as `@globemed/genix-ui`

If your project already imports `@globemed/genix-ui` — as Genix Portal's does,
in dozens of files — install it under that name with an npm alias instead of
rewriting every import:

```bash
npm i @globemed/genix-ui@npm:@mahmoudshata23/genix-ui@^0.3.0
```

npm installs it to `node_modules/@globemed/genix-ui`, so imports, editor
resolution and the build all behave as if the package were natively scoped that
way, and `npm ls` still shows what is really installed underneath.

This is the intended steady state, not a stopgap. If a `globemed` GitHub
organisation is ever created the package can be natively scoped that way, and
consumers just drop the alias — one line in `package.json`.

## Styling contract

Components style themselves **exclusively** through the design system's
`--gm-*` CSS custom properties, and the package **ships those tokens**, so it
works in a project that has no design system of its own. Load the sheet once,
globally:

```jsonc
// angular.json → projects.<app>.architect.build.options.styles
"styles": [
  "node_modules/@mahmoudshata23/genix-ui/styles/tokens.css",
  "src/styles.scss"
]
```

...or from the app's global stylesheet:

```scss
/* src/styles.scss */
@use "@mahmoudshata23/genix-ui/styles/tokens.css";
```

Without it the components render unstyled — the compiled component CSS resolves
`var(--gm-*)` at runtime. To re-theme, redefine any token on `:root` *after*
the sheet loads.

A few components also render icons through `primeicons` class names of their
own — the toast severity marks, the dialog's and the file list's close
buttons, the stepper's completed tick, the order list's grip and chevrons.
That font is not bundled either, so load it alongside the tokens:

```jsonc
"styles": [
  "node_modules/primeicons/primeicons.css",
  "node_modules/@mahmoudshata23/genix-ui/styles/tokens.css",
  "src/styles.scss"
]
```

Nothing breaks without it: the glyph slots render empty and the controls stay
operable, since each one carries its own `aria-label`. The `icon` inputs on
`gm-button`, `gm-chip` and `GmMenuItem` take any icon class, so an app on a
different icon set passes its own and only the handful above are affected.

The shipped sheet is the kit token layer only. App-shell geometry
(`--gm-app-*`, `--gm-z-app-*`) and nav-rail surface tokens are excluded — those
belong to an application's shell, not to a component library. Genix Portal
loads its own full design system via `public/assets/layout/layout.scss`, so it
does not need this file.

## Usage

```ts
import { GmButtonComponent, GmSelectComponent } from '@mahmoudshata23/genix-ui';
```

```html
<gm-button label="Save" severity="primary" (onClick)="save()" />

<gm-select
  formControlName="country"
  label="Country"
  [options]="countries"
  optionLabel="name"
  optionValue="code"
  filter
  clearable
/>
```

Every component is standalone — import the ones you use directly into a
component's `imports` array. There is no `NgModule` to register.

## What's in it

`gm-button` · `gm-input` · `gm-input-number` · `gm-textarea` ·
`gm-checkbox` · `gm-radio` · `gm-toggle-switch` · `gm-select` ·
`gm-multiselect` · `gm-select-button` · `gm-autocomplete` ·
`gm-datepicker` · `gm-file-upload` · `gm-card` · `gm-badge` · `gm-chip` ·
`gm-message` · `gm-spinner` · `gm-tabs` / `gm-tab` · `gm-accordion` ·
`gm-stepper` / `gm-step` · `gm-pagination` · `gm-table` · `gm-menu` ·
`gm-popover` · `gm-order-list` · `gm-chart` · `[gmTooltip]`

`gm-input` carries `iconStart` / `iconEnd` for an icon inside the field box
(a search box, a clear affordance); the side follows the writing direction, so
RTL needs no override.

Plus `GmToastService` for notifications (`success` / `info` / `warning` /
`error`, or `show({ severity, summary, detail })`) — it creates its own host on
the first toast, so there is nothing to add to a template.

And `GmDialogService`, which opens any component as a modal dialog — the
component injects its own `GmDialogRef` / `GmDialogConfig`, reads `config.data`
and returns a result through `ref.close(result)`:

```ts
const ref = this.dialogService.open(EditUserComponent, {
  header: 'Edit User',
  data: user,
  width: '600px',
});

ref.onClose.subscribe((result) => { … });
```

`gm-select` also takes custom row and trigger templates, and virtualises long
lists:

```html
<gm-select [options]="users" optionLabel="name" optionValue="id"
           [virtualScroll]="true" [virtualItemSize]="40">
  <ng-template gmSelectOption let-option let-selected="selected">
    <strong>{{ option.name }}</strong> <span>{{ option.email }}</span>
  </ng-template>
</gm-select>
```

Templates change presentation only — selection still resolves through
`optionValue` against the real option object.

`gm-multiselect` shares that virtual scroller and adds `selectionLimit`, which
blocks additions only — an existing selection stays valid and removable, and
select-all fills the remaining slots rather than overshooting:

```html
<gm-multiselect formControlName="roles" [options]="roles" optionLabel="name"
                optionValue="id" [selectionLimit]="3" [virtualScroll]="true" />
```

`gm-datepicker` covers a single date, a date with a time, a time on its own,
and a range:

```html
<gm-datepicker formControlName="appointment" [showTime]="true" [hourFormat]="12" />
<gm-datepicker formControlName="startTime" [timeOnly]="true" />
<gm-datepicker formControlName="period" selectionMode="range" />
```

The value is a `Date` in every single-date mode and a `[start, end]` tuple in
range mode. Dates are always built from explicit local parts, so nothing
shifts timezone.


Also in the package: `gm-popover` and `gm-menu` (both on the shared overlay
engine, anchored to whatever opened them), `gm-toggle-switch`,
`gm-input-number`, `gm-select-button` and `gm-autocomplete`.

`gm-autocomplete` never fetches anything — typing emits `search` and the
application answers by updating `suggestions`:

```html
<gm-autocomplete formControlName="user" [suggestions]="users"
                 optionLabel="name" (search)="searchUsers($event)" />
```


`gm-file-upload` picks files and nothing else — no request, no progress, no
retry. It emits the whole current selection as native `File` objects and the
application posts them with its own service:

```html
<gm-file-upload [multiple]="true" accept=".pdf,.jpg,.png"
                [maxFileSize]="5000000"
                (filesSelected)="onFilesSelected($event)"
                (rejected)="onRejected($event)" />
```

`gm-stepper` / `gm-step` is movement, not workflow: `next()` and `previous()`
skip disabled steps and stop at the ends, and whether the user may advance
stays the application’s call — gate it with `[nextDisabled]`, or turn off
`showNavigation` and drive the stepper from your own buttons.

```html
<gm-stepper [(activeStep)]="activeStep" [nextDisabled]="form.invalid">
  <gm-step label="Details">…</gm-step>
  <gm-step label="Documents">…</gm-step>
</gm-stepper>
```

`gm-order-list` reorders with CDK drag and drop, and with a Move up / Move
down button on every row so the list is reachable from the keyboard. It is
controlled: it never mutates `items`, it emits a reordered copy — assign that
back, or the list springs to the order it was given, which is what you want
when the application rejects the move.

```html
<gm-order-list [items]="items" itemLabel="name" (orderChange)="items = $event" />
```

`gm-chart` is a thin wrapper over Chart.js. The package does not depend on
Chart.js: it has one entry point, so a static import here would land in the
bundle every consumer pulls and force the dependency on applications that draw
nothing. The application installs `chart.js` and passes the constructor in
once:

```ts
import Chart from 'chart.js/auto';

bootstrapApplication(AppComponent, {
  providers: [provideGmChart(Chart)],
});
```

```html
<gm-chart type="bar" [data]="data" [options]="options" height="20rem" />
```

`data` and `options` are Chart.js’s own — forwarded untouched, and typed
`unknown` so this package never re-declares them. Both are compared by
identity, so pass a new object to redraw; a new `type` rebuilds the chart, and
the instance is destroyed with the view.

### Deliberately not built

Some PrimeNG pieces have no Genix component because they need none:

- `pRipple` — decoration. The buttons and list rows here use `:hover` and
  `:focus-visible` states from the design tokens instead.
- `pStyleClass` — a directive for toggling classes on another element.
  Angular's own `[class.x]` / `[ngClass]` and a signal do the same thing.
- `pInputTextarea`, `p-tabView`, `p-dropdown` and the other legacy aliases —
  they are older names for things that already exist here as `gm-textarea`,
  `gm-tabs` and `gm-select`. No alias exports are published for them.

Form controls implement `ControlValueAccessor`, so they bind with
`formControlName` / `[(ngModel)]` and pick up validity state from the control.

## Developing and releasing

See the [workspace README](../../README.md).
