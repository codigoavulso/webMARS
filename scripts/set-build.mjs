// Stamp once before publishing; serving and packaging never change the build.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function formatBuildNumber(date = new Date(), timeZone = "Europe/Lisbon") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return ["year", "month", "day", "hour", "minute"].map((key) => fields[key]).join("");
}

export async function stampBuild(date = new Date()) {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/js/app-version.js");
  const source = await readFile(path, "utf8");
  if (!/const APP_BUILD = "\d{12}";/.test(source)) throw new Error("Missing APP_BUILD declaration");
  const build = formatBuildNumber(date);
  await writeFile(path, source.replace(/const APP_BUILD = "\d{12}";/, `const APP_BUILD = "${build}";`), "utf8");
  return build;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Build ${await stampBuild()}`);
}
