const fs = require("fs");
const path = require("path");

// Resolve @expo/config-plugins through the expo package to avoid
// bare-require failures in pnpm strict-resolution environments.
const expoRoot = path.dirname(require.resolve("expo/package.json"));
const { withDangerousMod } = require(
  require.resolve("@expo/config-plugins", { paths: [expoRoot] })
);

const withPrivacyManifest = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const src = path.join(config.modRequest.projectRoot, "PrivacyInfo.xcprivacy");
      const iosDir = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName ?? config.name;
      const dest = path.join(iosDir, projectName, "PrivacyInfo.xcprivacy");

      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      } else {
        console.warn("[withPrivacyManifest] PrivacyInfo.xcprivacy not found at:", src);
      }

      return config;
    },
  ]);
};

module.exports = withPrivacyManifest;
