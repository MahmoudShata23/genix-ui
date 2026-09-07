# @mahmoudshata23/genix-ui

Angular 19 component library for GlobeMed apps. Native HTML first, Angular CDK
only where the platform is insufficient, **no PrimeNG / Material dependency**.

> **About the scope.** The package is published under the personal scope
> `@mahmoudshata23` because GitHub Packages requires the npm scope to equal the
> account that owns it, and no `globemed` GitHub organisation exists. The
> production home is the company Gitea registry, where it is `@globemed/genix-ui`.
> Consumers can already import it under the `@globemed` name today — see
> [Installing](#installing).

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
npm i @globemed/genix-ui@npm:@mahmoudshata23/genix-ui@^0.2.0
```

npm installs it to `node_modules/@globemed/genix-ui`, so imports, editor
resolution and the build all behave as if the package were natively scoped that
way. When the package moves to Gitea, drop the alias — that one line in
`package.json` is the entire migration.

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

`gm-button` · `gm-input` · `gm-textarea` · `gm-checkbox` · `gm-radio` ·
`gm-select` · `gm-multiselect` · `gm-datepicker` · `gm-card` · `gm-badge` ·
`gm-chip` · `gm-spinner` · `gm-tabs` / `gm-tab` · `gm-accordion` ·
`gm-pagination` · `gm-table` · `[gmTooltip]`

Form controls implement `ControlValueAccessor`, so they bind with
`formControlName` / `[(ngModel)]` and pick up validity state from the control.

## Developing and releasing

See the [workspace README](../../README.md).
