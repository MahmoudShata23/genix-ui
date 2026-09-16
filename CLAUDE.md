# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Angular 19 workspace whose only publishable artifact is `projects/genix-ui` — the `@mahmoudshata23/genix-ui` component library (prefix `gm-`). Native HTML first, Angular CDK only where the platform is insufficient, **no PrimeNG / Material dependency**. `projects/playground` is a kitchen-sink app that exists to consume the built package.

## Commands

```bash
npm run build          # ng build genix-ui -> dist/genix-ui (ng-packagr, production by default)
npm run watch          # rebuild the library on change (development config)
npm test               # library specs, ChromeHeadless, single run
npm run test:watch     # specs in watch mode
npm start              # build the library, then serve the playground on :4300
npm run build:playground
npm run publish:dry    # build + show exactly what a publish would contain
```

Run a single spec file:

```bash
npx ng test genix-ui --watch=false --browsers=ChromeHeadless --include='**/select.component.spec.ts'
```

There is **no linter and no formatter** in this workspace — don't invent an `npm run lint`.

## The build-output boundary

`tsconfig.json` maps `@mahmoudshata23/genix-ui` to `dist/genix-ui`, **not** to source. The playground therefore type-checks against the generated `.d.ts` and renders from the FESM bundle, exactly as a real consumer would.

Consequence: **`npm run build` must run before serving or building the playground.** After changing library source, rebuild — otherwise the playground is compiling against a stale public API. CI enforces this ordering (`build` → `test` → `ng build playground` → `npm publish --dry-run` → `npm pack`), so a public-API or template break fails there before it reaches the registry.

Anything added to a component must be re-exported through `src/public-api.ts` (one `export *` per component folder) or consumers cannot see it.

## Architecture

### Component folder shape

Each component lives in `projects/genix-ui/src/lib/<name>/` as `<name>.component.{ts,html,scss}` + `<name>.types.ts` + `index.ts` that re-exports both. Types live beside their component so a consumer imports both from the package root.

Every component is **standalone**, `ChangeDetectionStrategy.OnPush`, and signal-based: `input()` / `output()` / `computed()` / `signal()`, with `booleanAttribute` / `numberAttribute` transforms on the inputs that need them. No `NgModule` is published.

### The three shared bases in `src/lib/core/`

Most of the library's real complexity is here, and it is inherited rather than duplicated:

- **`form-field-base.ts` — `GmFormFieldBase<T>`**: the ControlValueAccessor plumbing plus label/hint/error a11y wiring for every form control. Two details matter. (1) It registers the accessor by assigning `ngControl.valueAccessor` in the constructor rather than providing `NG_VALUE_ACCESSOR` — that is what lets a component read its own `NgControl` for validity without a circular dependency. (2) `AbstractControl` exposes no signal, so it subscribes to `control.events` in `ngOnInit` and bumps a revision signal to make validity recompute under OnPush. Subclasses implement `generateId()` and call `commit(next)` to write a value.
- **`dropdown-base.ts` — `GmDropdownBase<T>`** (extends the above): overlay lifecycle, option label/value reading, filtering, roving keyboard highlight, virtual scrolling. `gm-select` and `gm-multiselect` supply only `isSelected` and `commitActive` plus a `#panel` template.
- **`overlay-panel.ts` — `gmOverlayPanel()`**: the single CDK overlay engine behind select, multiselect, datepicker, popover and menu. Construct it from a **field initialiser** so the injection context is live. It filters trigger clicks out of "outside" clicks (the CDK counts them as outside, which would otherwise race the trigger's own toggle) and deliberately does **not** subscribe to `keydownEvents()` — callers handle keys on the trigger and on the panel.

Also in `core/`: `option-reader.ts` (`gmOptionLabel` / `gmOptionValue` / `gmReadOption` — options are typed `unknown` so any interface array assigns), `unique-id.ts` (`gmUniqueId`), `types.ts` (`GmSeverity`, `GmSize`).

Reaching into a rendered overlay panel needs `overlayPanel.panelElement.querySelector(...)`, not a view query — the panel is an embedded view the portal created.

### Styling contract

Components style themselves **exclusively** through `--gm-*` CSS custom properties. No hard-coded colours or geometry, no PrimeNG selectors. The pattern: a severity/size class sets local slots (`--gm-btn-*`) and one shared rule consumes them, so a severity is a handful of lines rather than a block per severity × variant pair.

The package ships `projects/genix-ui/styles/tokens.css` (an ng-packagr asset, exported as `./styles/*`); consumers load it globally or the components render unstyled. Shared SCSS mixins live in `core/styles/` (`_field.scss`, `_choice.scss`, `_dropdown.scss`) and are `@include`d by each component's own stylesheet so rules stay inside that component's encapsulation.

Icons come from `primeicons` class names in a handful of places, but the font is not bundled and nothing breaks without it — every such control carries its own `aria-label`. Use logical properties (`margin-inline-start`) so RTL needs no override.

### Injection-token pattern for one-way imports

`GmToastService` names the container class in order to attach it, so the container must not import the service back. It receives `GM_TOAST_HOST` through a per-host injector instead. `GmDialogService` uses the same shape for `GmDialogRef` / `GmDialogConfig`.

`gm-chart` never imports Chart.js — a static import in a single-entry-point package would land in every consumer's bundle. The application passes the constructor in via `provideGmChart(Chart)`, and `data` / `options` are typed `unknown` and forwarded untouched.

## Deliberate API boundaries

These are design decisions, not gaps — don't "fix" them without asking:

- `gm-autocomplete` never fetches; typing emits `search` and the app updates `suggestions`.
- `gm-file-upload` selects files and emits `File` objects — no request, progress or retry.
- `gm-order-list` is controlled: it never mutates `items`, it emits a reordered copy.
- `gm-stepper` is movement, not workflow; whether the user may advance is the app's call via `[nextDisabled]`.
- `GmFormFieldBase.errorText` renders only the explicit `error` input — mapping `ValidationErrors` to human text needs the app's i18n layer.
- `filterChange` is not emitted when closing clears the term, so a consumer fetching on it doesn't re-fetch the unfiltered list on every close.
- No `pRipple` / `pStyleClass` / legacy PrimeNG aliases are published.
- `gm-datepicker` builds dates from explicit local parts so nothing shifts timezone.

## Tests

Jasmine + Karma, `*.spec.ts` beside the component. The convention is a **standalone host component** driving the real thing through a `FormControl` (so the CVA path is exercised), then querying the DOM — overlay content via `document.querySelector('.cdk-overlay-container ...')`, since it renders outside the fixture. Smaller components are grouped into shared specs (`core/small-components.spec.ts`, `core/long-tail.spec.ts`, `card/presentation.component.spec.ts`).

`tsconfig.json` mirrors Genix Portal's strictness on purpose (`strict`, `noPropertyAccessFromIndexSignature`, `strictTemplates`, …) — a rule relaxed here surfaces as a build break there.

## Releasing

CI publishes on a **published GitHub Release**, not on a tag push. Bump `version` in `projects/genix-ui/package.json`, commit (`release: X.Y.Z`), push to `main`, then draft and publish a release tagged `vX.Y.Z`. The workflow fails if the tag and the manifest version disagree. Semver: PATCH for a fix, MINOR for a new component or backward-compatible input, MAJOR for a breaking API change. A registry never allows republishing a version.
