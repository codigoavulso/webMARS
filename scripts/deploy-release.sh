#!/usr/bin/env bash
# Publish an intact package for the Nginx layout in docs/self-hosting.md.
set -euo pipefail

cd "$(dirname "$0")/.."
check_only=false
if [[ ${1:-} == --check ]]; then
    check_only=true
    shift
fi
if (( $# > 1 )); then
    echo "Usage: $0 [--check] [packaged-release-directory]" >&2
    exit 2
fi

deploy_host=${WEBMARS_DEPLOY_HOST:-}
release_source=${1:-dist/webmars-$(node -p "require('./package.json').version")}
if [[ ! -f $release_source/build.json || ! -f $release_source/SHA256SUMS ]]; then
    echo "Missing packaged release in $release_source. Run npm run package:release." >&2
    exit 1
fi

release_id=$(node -e '
  const { id } = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) process.exit(1);
  console.log(id);
' "$release_source/build.json")
(
    cd "$release_source"
    sha256sum --quiet --strict -c SHA256SUMS
)
if $check_only; then
    echo "Package verified: $release_id"
    exit 0
fi
if [[ -z $deploy_host ]]; then
    echo "Set WEBMARS_DEPLOY_HOST to the SSH destination before deploying." >&2
    exit 2
fi

remote_script=$(cat <<'REMOTE'
set -euo pipefail
umask 022
root=/var/www/webmars-deploy
id=$1
[[ $id =~ ^[a-f0-9]{64}$ ]]
release="$root/releases/$id"
mkdir -p "$root/releases"
exec 9>"$root/deploy.lock"
flock 9

staging=$(mktemp -d "$root/releases/.staging-$id.XXXXXXXX")
trap 'rm -rf -- "$staging"' EXIT
payload="$staging/payload"
mkdir "$payload"
tar --no-same-owner --no-same-permissions -xzf - -C "$payload"
(
    cd "$payload"
    sha256sum --quiet --strict -c SHA256SUMS
)

if [[ -d $release ]]; then
    cmp "$payload/SHA256SUMS" "$release/SHA256SUMS"
    (
        cd "$release"
        sha256sum --quiet --strict -c SHA256SUMS
    )
else
    chmod 755 "$payload"
    mv -T -- "$payload" "$release"
fi
ln -s -- "$release" "$staging/current"
mv -Tf -- "$staging/current" "$root/current"
printf '%s\n' "Activated webMARS build $id"
REMOTE
)

printf -v quoted_remote_script '%q' "$remote_script"
tar -czf - -C "$release_source" . | ssh -o StrictHostKeyChecking=accept-new -- "$deploy_host" \
    "sudo bash -c $quoted_remote_script -- $release_id"
