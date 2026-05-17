const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# Xcode 26+ fmt consteval workaround';
const PATCH = `
    ${MARKER} (RN 0.76 ships fmt 11.0.2)
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
`;

function withFmtXcodeFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfilePath, 'utf8');
      if (!src.includes(MARKER)) {
        src = src.replace(
          /react_native_post_install\(\n      installer,\n      config\[:reactNativePath\],[\s\S]*?\)\n\n/,
          (match) => `${match}${PATCH}\n`
        );
        fs.writeFileSync(podfilePath, src);
      }
      return cfg;
    },
  ]);
}

module.exports = withFmtXcodeFix;
