# Stable links and public-name contract

This document is the compatibility promise for links introduced in webMARS
0.6.0. It applies independently to each webMARS + BackMars installation.

## Built-in examples: `/e/<id>`

- Every built-in example has an explicit lowercase stable ID in
  `examples/examples.json`.
- `examples/stable-ids.json` is the permanent registry. An ID is never renamed,
  deleted or reused for different content.
- If an example is retired, its registry entry becomes a tombstone. The old URL
  must either keep opening the last compatible example or redirect to an
  explicitly recorded replacement.
- File paths, translated labels and menu categories may change without changing
  the public ID.

Example: `/e/lesson01-registers`.

## Public projects: `/p/<name>` and `/p/<name>@<revision>`

Public names are allocated first-come, first-served by one BackMars instance.
They are lowercase ASCII words separated by single hyphens. Once claimed, a
name is never released to another account, including after archive.

- `/p/name` is the convenient **latest** link. Its metadata and project revision
  may change when the owner edits or publishes again. It disappears from public
  access when the owner archives the publication.
- `/p/name@N` is a **pinned revision**. Project content and public metadata are
  snapshotted together, served with immutable caching and remain readable after
  ordinary archive. This is the URL to place in a syllabus, LMS, worksheet or
  assessment.
- A BackMars operator may still apply an exceptional administrative takedown for
  security, privacy or legal reasons. Stability is not a promise to retain
  unlawful or dangerous material forever.

The same public name on two installations is unrelated. Always distribute the
complete origin, for example `https://mips.example.edu/p/week-1@2`.

## Data boundary

Publishing creates an inert snapshot containing only the public project name,
description, supported text files and active-file path. Cloud addresses,
cookies, credentials, local IDs, saved runtime states, preferences, window
layout and timestamps are removed server-side and checked again by the client.
Opening a publication always creates a new independent local copy.

## Hosting requirement

The static host must return `index.html` for syntactically valid `/e/...` and
`/p/...` navigations, while still returning a real 404 for missing assets. The
reference Nginx locations are in
`ops/raspberry-pi/nginx-webmars-routes.conf`; the included Node server implements
the same rule. This behavior and the stable-ID registry are covered by
`tests/public-links.test.mjs`.
