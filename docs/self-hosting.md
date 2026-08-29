# Self-hosting webMARS and BackMars

webMARS is static and remains fully usable for editing, assembly, execution,
tools and local projects without an account. BackMars is the optional Flask +
SQLite service for accounts, Cloud projects, password recovery and the public
library. A university or teacher can operate both under their own domain.

## 1. Choose one installation identity

Accounts and first-come public names belong to one BackMars instance. Do not
silently switch an existing deployment to a different service. Set the public,
non-secret values in `webmars-config.js`:

| Field | Meaning |
| --- | --- |
| `instanceName` | Name shown in Welcome and account/public-library messages. |
| `appBasePath` | URL path ending in `/`; normally `/`, or `/mips/` below a subdirectory. |
| `publicBaseUrl` | Canonical absolute base used to copy stable `/e` and `/p` links. |
| `backMarsApiBase` | Absolute or same-origin BackMars API ending in `/api`. |
| `allowBackMarsOverride` | Keep `false` for a coherent institutional identity. |
| `manualUrl` | URL of the independently deployable Manual. |
| `supportUrl` | Institution support/issue URL; blank hides deployment-specific support. |

This file is public. Never place an SMTP password, session key or other secret
in it. For a subdirectory deployment also change `<base href="/">` in
`index.html` to the same base path.

## 2. Serve the static application

Publish the isolated output produced by `npm run package:release`. Configure
normal static 404 behavior plus a narrow SPA fallback for valid stable links:

```nginx
root /var/www/webmars;
index index.html;

location ~ ^/(?:e/[a-z0-9][a-z0-9-]{0,79}|p/[a-z0-9]+(?:-[a-z0-9]+)*(?:@[1-9][0-9]*)?)/?$ {
    try_files /index.html =404;
}

location / {
    try_files $uri $uri/ =404;
}
```

Prefix both locations for `appBasePath != "/"`. Do not use a catch-all fallback
for every missing path: a missing JavaScript file must fail as 404, not receive
HTML. Serve `.js` and `.mjs` as JavaScript, JSON as JSON and Assembly/C sources
as UTF-8 text.

## 3. Configure BackMars securely

Use an absolute database path outside the code checkout, such as
`/var/lib/backmars/app.db`. The directory must be owned by the service account
with mode `0700`; the database and backups must be `0600`.

Store configuration in `/etc/backmars/backmars.env`, owned by root and mode
`0600`. Generate two independent random values for `SECRET_KEY` and
`BACKMARS_ACCOUNT_CODE_PEPPER`. Never commit or paste them into a browser file.

Minimum production values:

```dotenv
WEBMARS_USERS_ENV=production
SECRET_KEY=<random-session-secret>
BACKMARS_ACCOUNT_CODE_PEPPER=<different-random-secret>
BACKMARS_DATABASE=/var/lib/backmars/app.db
WEBMARS_PUBLIC_URL=https://mips.example.edu
WEBMARS_USERS_ALLOWED_ORIGINS=https://mips.example.edu
WEBMARS_USERS_TRUSTED_PROXIES=1
SESSION_COOKIE_SECURE=1
SESSION_COOKIE_SAMESITE=Lax
```

If the app and API are genuinely cross-site, cookies require `SameSite=None`,
`Secure`, exact CORS origins and HTTPS at both ends. Keeping them under the same
site is simpler and safer.

## 4. Gmail transactional mail

A normal Gmail mailbox is enough for a small non-commercial installation. Turn
on Google two-step verification, create an App Password and enter that App
Password directly in the root-only server environment file—not in this
repository or a chat transcript:

```dotenv
BACKMARS_MAIL_ENABLED=1
BACKMARS_MAIL_FROM=webmars.noreply@gmail.com
BACKMARS_MAIL_FROM_NAME=webMARS
BACKMARS_SMTP_HOST=smtp.gmail.com
BACKMARS_SMTP_PORT=587
BACKMARS_SMTP_SECURITY=starttls
BACKMARS_SMTP_USERNAME=webmars.noreply@gmail.com
BACKMARS_SMTP_PASSWORD=<Google App Password>
BACKMARS_MAIL_SEND_ASYNC=1
BACKMARS_REQUIRE_VERIFIED_EMAIL_FOR_PUBLISH=1
```

BackMars refuses insecure/unknown SMTP modes in production. Six-digit codes are
short-lived, one-use and stored only as keyed digests. Resetting a password
revokes older sessions. Gmail sending limits still apply; larger deployments
should use an institutional SMTP relay or transactional provider without
changing the application protocol.

## 5. Reverse proxy and service

Run BackMars as an unprivileged service behind HTTPS (for example Gunicorn via
systemd). Proxy `/api/` to it, cap request bodies consistently with BackMars
(4 MiB by default), forward one trusted client-address hop and do not expose the
Gunicorn socket publicly. Keep the code read-only to the service account; only
the database/runtime directories need write permission.

## 6. Upgrade and backup

1. Stop writes or enter a short maintenance window.
2. Make a consistent SQLite backup (`sqlite3 app.db '.backup ...'`) and copy the
   environment/service configuration without printing secrets.
3. Deploy code to a new release directory and install pinned Python packages.
4. Start one process so additive migrations finish, then start normal workers.
5. Verify `/api/health`, registration/email delivery, password reset, login,
   Cloud save/sync, public-name claim, latest link and pinned revision.
6. Keep the previous code and database backup until smoke tests pass.

Rotating `SECRET_KEY` signs everybody out. Rotating the account-code pepper
invalidates outstanding email codes but does not affect passwords.

## 7. Operational checks

- Back up SQLite regularly and test restoration.
- Monitor mail failures and rate-limit responses without logging codes,
  passwords, cookies or complete private projects.
- Keep stable-link entry requests in visit analytics; the supplied Nginx map
  counts `/`, `/index.html`, `/e/...` and `/p/...`.
- Publish an operator contact, privacy/retention policy and exceptional takedown
  process for public material.
- Validate both projects before release: `npm run validate` in webMARS and the
  BackMars unit suite in its virtual environment.
