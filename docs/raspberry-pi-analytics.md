# Raspberry Pi access-log analytics

The production Raspberry Pi keeps dedicated structured logs for
`webmars.nfiles.top` under `/var/log/nginx/webmars/`.

The reproducible server configuration and installer are stored in
`ops/raspberry-pi/`. Run `sudo`-capable deployment through the installer after
copying that directory to the server.

## Files

- `access.json`: every HTTPS request for webMARS, one JSON object per line.
- `visits.json`: only `GET` and `HEAD` requests for `/` or `/index.html`.
- `error.log`: the site-specific Nginx error log.
- `legacy/`: the combined-format webMARS logs that existed before structured
  logging was enabled.

Logs rotate daily, are compressed after one rotation, and are retained for 365
rotations with a 370-day age ceiling. Rotation is managed by
`/etc/logrotate.d/webmars`.

The visit log records the local ISO timestamp, request ID, source address,
method, normalized URI (without query parameters), status, byte counts,
request duration, content type, referrer, browser user agent, accepted
languages, Fetch Metadata headers and a heuristic bot flag.

## Reports

Daily summary for the last 30 days:

```bash
sudo webmars-visits
```

Hourly summary for the last seven days:

```bash
sudo webmars-visits --days 7 --hourly
```

`human-like` excludes user agents matched by the configured bot heuristic.
`browser-nav` counts new-format requests whose browser reports a document
navigation through the `Sec-Fetch-Dest` header; legacy combined logs cannot
provide this field. It is a useful stricter signal, but clients are not obliged
to send it.
`approx-clients` counts distinct source-address and user-agent pairs. Neither
value is a definitive count of people: bots can disguise themselves, several
people can share an address, and one person can use several browsers.

The raw logs contain IP addresses and user-agent strings. Access should remain
restricted to administrators, and the retention policy should be disclosed in
the site's privacy information before these figures are used beyond internal
operations.
