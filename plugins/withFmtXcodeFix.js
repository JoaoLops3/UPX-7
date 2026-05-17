const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# Xcode 26+ fmt consteval workaround';
const PATCH = `
    ${MARKER} (RN 0.76 ships fmt 11.0.2)
    fmt_base = File.join(__dir__, 'Pods/fmt/include/fmt/base.h')
    if File.exist?(fmt_base)
      fmt_src = File.read(fmt_base)
      fmt_marker = 'UPX7_FMT_CONSTEVAL_FIX'
      unless fmt_src.include?(fmt_marker)
        fmt_patched = fmt_src.gsub(
          '#  define FMT_USE_CONSTEVAL 1',
          "#  define FMT_USE_CONSTEVAL 0  // UPX7_FMT_CONSTEVAL_FIX Xcode 26+",
        )
        if fmt_patched != fmt_src
          File.chmod(0o644, fmt_base)
          File.write(fmt_base, fmt_patched)
        end
      end
    end
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        defs = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || '$(inherited)'
        defs = [defs] unless defs.is_a?(Array)
        defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
      end
    end
`;

function withFmtXcodeFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfilePath, 'utf8');
      if (!src.includes('UPX7_FMT_CONSTEVAL_FIX')) {
        if (src.includes(MARKER)) {
          src = src.replace(
            /    # Xcode 26\+ fmt consteval workaround[\s\S]*?(?=\n    # This is necessary for Xcode 14)/,
            `${PATCH}\n`,
          );
        } else {
          src = src.replace(
            /react_native_post_install\(\n      installer,\n      config\[:reactNativePath\],[\s\S]*?\)\n\n/,
            (match) => `${match}${PATCH}\n`,
          );
        }
        fs.writeFileSync(podfilePath, src);
      }
      return cfg;
    },
  ]);
}

module.exports = withFmtXcodeFix;
