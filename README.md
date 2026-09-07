# Genix UI — workspace

Development workspace for **`@mahmoudshata23/genix-ui`**, the Angular 19
component library used by Genix Portal and any other GlobeMed front end.
Native HTML first, Angular CDK only where the platform is insufficient, **no
PrimeNG / Material dependency**.

The published package's own README lives at
[`projects/genix-ui/README.md`](projects/genix-ui/README.md) — that is the one
consumers see on the registry. This file is about working *on* the library.

## Layout

| Path                 | What it is                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| `projects/genix-ui`  | The library. `package.json` here is the **published** manifest.          |
| `projects/playground`| A small app that consumes the built package — the repo's own smoke test. |
| `dist/genix-ui`      | Build output. This directory is what gets published, not the source.     |

## Develop

```bash
npm ci
npm run build          # ng build genix-ui  -> dist/genix-ui
npm test               # library unit specs, headless
npm start              # build the library, then serve the playground
```

`npm run watch` rebuilds the library on change; run `ng serve playground` in a
second terminal to see the result live.

## The playground

`npm start` serves a kitchen-sink page at `http://localhost:4200` — a section
per component, reachable from the sticky nav down the left, covering **every**
export. Each section shows the variants and the states that are easy to get
wrong: sizes, severities, loading, disabled, read-only, error, empty, and
filterable option lists. Form controls are bound to real `FormControl`s, so
what you see is the ControlValueAccessor path rather than a static mock-up.
It is the quickest way to eyeball a change, and the fastest way to review the
API the way a consumer meets it.

The playground deliberately resolves `@mahmoudshata23/genix-ui` to
`dist/genix-ui` (see `paths` in `tsconfig.json`), **not** to `src`. It therefore
type-checks against the generated `.d.ts` and renders from the FESM bundle,
which is what a real consumer gets. A public-API break fails the playground
build before anything reaches the registry.

## Release

Versions are published to **GitHub Packages**. CI does the publishing; you only
push a tag.

```bash
# 1. bump the version in projects/genix-ui/package.json (e.g. 0.2.2 -> 0.2.3)
# 2. commit it
git commit -am "release: 0.2.3"
# 3. tag and push — the tag must match the manifest version or the job fails
git tag v0.2.3
git push origin main --tags
```

`.github/workflows/release.yml` builds, tests, verifies the tag matches
`projects/genix-ui/package.json`, and publishes using the workflow's own
`GITHUB_TOKEN`. No personal access token is stored in the repo.

To publish by hand instead (needs a PAT with `write:packages` in your
**user-level** `~/.npmrc`):

```bash
npm run publish:dry    # build + show exactly what would be published
npm run publish:lib    # build + publish
```

A registry never lets a version be republished — always bump first.

## Where the package lives

GitHub Packages, under the personal account that owns this repository. That is
the permanent home — there is no company registry in the picture.

The one consequence is the scope: GitHub requires the npm scope to equal the
account that owns the package, so it is published as
**`@mahmoudshata23/genix-ui`** rather than `@globemed/genix-ui`. Consuming
projects do not have to live with that name — they install it under whatever
name they already use, via an npm alias. That is what Genix Portal does; see
"Importing it as `@globemed/genix-ui`" in
[the package README](projects/genix-ui/README.md).

Because the package is private, every consumer needs two things:

1. `@mahmoudshata23:registry=https://npm.pkg.github.com` in the project's
   `.npmrc`. Commit it — it is not a secret, and without it a fresh clone
   cannot install.
2. A GitHub PAT with `read:packages` in their **user-level** `~/.npmrc`, never
   in a tracked file.

If a `globemed` GitHub organisation is ever created, the package can move there
and be natively scoped `@globemed/genix-ui`: change `name` here, change the
`.npmrc` scope line, and consumers drop their alias. Nothing else moves.
