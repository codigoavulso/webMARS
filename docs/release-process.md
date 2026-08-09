# Release process and version compatibility

webMARS ships as a static site. A release has two complementary artefacts: a
reproducible deployment tree, and the tagged source tree containing the citation
metadata and generated evidence that describe exactly what was deployed.

## Versioning

The application version is a single `MAJOR.MINOR.PATCH` string. It is not
semantic versioning of a library API - there is no importable package - it
identifies a build, and every published claim is anchored to it.

Several independent things carry their own version, deliberately:

| Version | Declared in | Changes when |
| --- | --- | --- |
| Application version | `package.json`, `assets/js/app-version.js` | Every release |
| Tool API version | `tools/tools.json` (`apiVersion`) | An existing tool contract is removed or repurposed |
| Pipeline Lab model version | `tools/pipeline-lab.js` (`MODEL_VERSION`) | The timing model's structure changes |
| Pipeline profile versions | `tools/pipeline-lab.js` (`PROFILES`) | A profile's timing changes |
| Pipeline report schema | `webmars.pipeline-report/1` | The exported report's shape changes |
| Lab set version | `docs/labs/labs.json` | A lab's programs, configuration or expected results change |

They move independently on purpose. A patch release does not invalidate an
exported pipeline report; a profile timing change does, whatever the
application version is.

### What a version bump promises

- **Patch** - fixes and documentation. Existing projects, saved sessions and
  exported state load unchanged.
- **Minor** - new capability. Existing projects, saved sessions and exported
  state still load. Published measurements taken on an earlier minor may no
  longer be reproducible: check the profile and model versions in the report.
- **Major** - not yet used.

The functional runtime's compatibility with existing projects is a hard
constraint at every level. Storage format changes must be able to read what the
previous version wrote.

## Cutting a release

### 1. Set the version everywhere

```bash
npm run version:set -- 0.5.6
npm run version:set -- 0.5.6 --check   # verify without writing
```

The version is declared in eleven places: `package.json`, `package-lock.json`
(twice), `assets/js/app-version.js` (`APP_VERSION`), the two cache-busting
query strings in `index.html`, the title and highlights heading in `README.md`,
`CITATION.cff`, `tests/release-readiness.test.mjs`, and the three hand-written
documents that state which build they describe (`docs/code-architecture.md`,
`docs/portability.md`, `docs/technical-summary.md`).

A browser cannot read `package.json`, so `app-version.js` cannot import it and
the duplication cannot be removed outright — but it is written by one command
with one argument, and a file whose declaration stops matching is reported
rather than skipped. `tests/release-readiness.test.mjs` still checks the
coherence, so the step is verified as well as automated.

Everything else derives from these rather than repeating them:

- the evidence generators stamp their reports from `package.json`;
- the help pages that state the current version use the
  `__WEBMARS_APP_VERSION__` token, substituted at runtime by `app-version.js`;
- changelog headings are left alone, because `0.5.4 — MARS-OS desktop` is a
  historical record and not a statement about this build.

### 2. Regenerate the evidence documents

```bash
npm run docs:matrix
npm run coverage
npm run mutation
npm run fetch:mars && npm run differential
npm run benchmark
npm run audit:a11y
```

They write `docs/comparison-matrix.md`, `docs/coverage-report.md`,
`docs/mutation-report.md` and `docs/mars-conformance.md`, each stamped with the
version it describes. Commit the results.

The differential step needs the reference MARS 4.5 jar and a JVM. `npm run
fetch:mars` downloads the jar and refuses any build whose checksum does not
match the pinned one; without a JVM the differential suite skips rather than
fails, which is fine for a routine build but not for a release - a release must
publish a conformance report produced on the same commit. `tests/evidence-package.test.mjs` fails if the matrix is stale, so
a release cannot ship documentation that describes a different commit.

A surviving mutant or a coverage threshold failure blocks the release. Fix the
gap by writing the missing test; never by lowering a floor or deleting a mutant.

### 3. Update the changelog in every language

The changelog lives under `help/<lang>/changelog.html` for all twenty
languages. English first, then the rest.

Work that has landed but is not yet released sits in a section marked
`<h2 data-unreleased="true">`, above the newest release. The attribute exists
because the heading text is translated; `tests/release-readiness.test.mjs`
skips it and checks that the first *released* entry names the version being
shipped, and fails if there is more than one unreleased section or if it sits
below a release.

When cutting a release, write the English section first — the lead sentence,
the heading and the new bullets — then propagate it:

```bash
npm run changelog:cut -- 0.5.6
npm run changelog:cut -- 0.5.6 --check
```

This replaces the `data-unreleased` heading with the version in all nineteen
other languages, rewrites the lead sentence, and translates the bullets English
gained since the last release; bullets already carried in the unreleased section
keep the translation they had. Spanish and Portuguese are restructured but their
new prose is left in English and reported, because they are reviewed by a person
and machine output does not belong in a hand-corrected catalog. Write those two
by hand before committing.

Do not leave an unreleased section in a cut release.

Locale note: `scripts/generate-locales.mjs` regenerates seventeen of the
nineteen non-English catalogs. Spanish and Portuguese are hand-maintained. A
full generator run also rewrites `help/`, replacing good existing translations
with fresh machine output - so add the new keys rather than committing a whole
regeneration.

### 4. Run the full gate

```bash
npm test
npm run build
npm run validate
```

`npm run build` validates the static release tree; `npm run validate` runs the
broader project checks. All three must pass with no failures - "known failing"
is not a release state.

### 5. Verify by hand what tests cannot

- Load the served application and assemble, run, step and backstep a program.
- Check desktop and a narrow mobile layout.
- Switch to a right-to-left language and confirm the layout survives.
- Open the Pipeline Lab and confirm it reports its profile and model version.

### 6. Package

```bash
npm run package:release
```

This assembles the deployment-only tree `dist/webmars-<version>/` from an
explicit allowlist - development files, citation metadata and evidence reports
are never copied implicitly - and writes `webmars-<version>.zip` alongside a
`.sha256` checksum. The tagged source archive is the companion evidence and
citation artefact; the deployment ZIP is intentionally only the runnable site.

Verify reproducibility by running it twice from a clean tree and comparing the
checksums. A difference means something non-deterministic reached the package.

### 7. Tag and publish

Commit, tag the release, and publish the packaged tree. The archive is
self-contained: it needs an HTTP server and nothing else. No backend, no
database, no build step at the destination.

## Release checklist

- [ ] `npm run version:set -- <version> --check` reports every declaration in agreement
- [ ] `npm run changelog:cut -- <version> --check` reports nothing left to cut, and Spanish and Portuguese written by hand
- [ ] `npm run docs:matrix`, `npm run coverage`, `npm run mutation`, `npm run differential`, `npm run benchmark` and `npm run audit:a11y` rerun and committed
- [ ] No surviving mutants; no coverage threshold below its floor
- [ ] No unexplained differences from MARS 4.5; every declared one still occurs
- [ ] No accessibility failure among the automatically checked criteria
- [ ] `docs/portability.md` updated with what was actually verified this cycle
- [ ] Pipeline profile versions bumped if any timing changed
- [ ] Lab set version bumped if any lab program or expected result changed
- [ ] Changelog updated in every supported language
- [ ] `npm test`, `npm run build` and `npm run validate` all pass
- [ ] Desktop, mobile and one RTL language checked by hand
- [ ] `npm run package:release` produces a reproducible archive and checksum
- [ ] Tag pushed and the archive published

## Archiving a citable release

`CITATION.cff` carries the title, version, licence, repository and the MARS 4.5
reference the project targets. For a release intended to be cited:

1. Confirm `CITATION.cff` names the version being archived.
2. Replace the repository handle in `authors` with legal names - a DOI record
   should not carry a username.
3. Deposit the source archive produced from the release tag, which contains
   `CITATION.cff` and `docs/`; attach the deployment ZIP as a companion artefact
   when the service supports multiple files.
4. Record the DOI in `CITATION.cff` and in `README.md`.

Do not mint a DOI for a release whose evidence documents were not regenerated in
the same commit: the point of a citable archive is that a third party can
reproduce what it claims.
