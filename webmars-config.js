/*
 * Deployment identity for this webMARS installation.
 *
 * Keep credentials out of this public file.  A self-hosted installation may
 * change these URLs and labels without rebuilding the application bundle.
 */
(function configureWebMars(scope) {
  const host = String(scope.location?.hostname || "").toLowerCase();
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  const official = host === "webmars.nfiles.top";
  const origin = String(scope.location?.origin || "").replace(/\/+$/, "");
  const localApiHost = host === "::1" ? "[::1]" : (host || "localhost");
  const localApiProtocol = String(scope.location?.protocol || "http:");
  scope.WebMarsConfig = Object.freeze({
    instanceName: official ? "webMARS" : (host || "webMARS local"),
    appBasePath: "/",
    publicBaseUrl: origin,
    backMarsApiBase: local
      ? `${localApiProtocol}//${localApiHost}:5000/api`
      : (official ? "https://backmars.nfiles.top/api" : `${origin}/api`),
    allowBackMarsOverride: false,
    manualUrl: `${origin}/manual/`,
    supportUrl: "",
    // Automatic first-party statistics, documented in Help/About privacy.
    // Custom deployments explicitly configure their own collector.
    metrics: Object.freeze({ enabled: official, context: local ? "test" : "public", endpoint: `${origin}/_metrics/events`, publicEndpoint: `${origin}/_metrics/public` }),
    // Automatic duration-only ping on the official installation. Install the
    // collector and Nginx snippet before deploying this configuration there.
    heartbeat: Object.freeze({ enabled: official, endpoint: `${origin}/_metrics/heartbeat` })
  });
})(window);
