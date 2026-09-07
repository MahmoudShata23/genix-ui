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

The playground deliberately resolves `@mahmoudshata23/genix-ui` to
`dist/genix-ui` (see `paths` in `tsconfig.json`), **not** to `src`. It therefore
type-checks against the generated `.d.ts` and renders from the FESM bundle,
which is what a real consumer gets. A public-API break fails the playground
build before anything reaches the registry.

## Release

Versions are published to **GitHub Packages**. CI does the publishing; you only
push a tag.

```bash
# 1. bump the version in projects/genix-ui/package.json (e.g. 0.2.0 -> 0.2.1)
# 2. commit it
git commit -am "release: 0.2.1"
# 3. tag and push — the tag must match the manifest version or the job fails
git tag v0.2.1
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

## Moving the package to the company Gitea registry

The package is on GitHub Packages under a personal scope for one reason:
GitHub requires the npm scope to equal the account that owns it, and there is
no `globemed` GitHub organisation. The company Gitea at
`http://192.168.237.68:8021` has a built-in npm registry that has no such rule,
so the production home for this package is:

```jsonc
// projects/genix-ui/package.json
"name": "@globemed/genix-ui",
"publishConfig": {
  "registry": "http://192.168.237.68:8021/api/packages/GlobemedGroup/npm/"
}
```

Then update the `paths` entry in `tsconfig.json`, the import in
`projects/playground/src/app/app.component.ts`, and the `.npmrc` scope line.
Consumers that used the npm alias (see the package README) change one line and
nothing else.
