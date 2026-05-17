const { withEntitlementsPlist, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** Remove Push Notifications entitlement — Personal Team não suporta; usamos só alertas locais. */
function withLocalNotificationsOnly(config) {
  let next = withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });

  next = withDangerousMod(next, [
    'ios',
    async (cfg) => {
      const entitlementsPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'UPX7',
        'UPX7.entitlements',
      );
      if (fs.existsSync(entitlementsPath)) {
        let xml = fs.readFileSync(entitlementsPath, 'utf8');
        if (xml.includes('aps-environment')) {
          xml = xml.replace(/\s*<key>aps-environment<\/key>\s*<string>[^<]*<\/string>/g, '');
          if (!xml.match(/<dict>\s*<\/dict>/)) {
            xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict/>
</plist>
`;
          }
          fs.writeFileSync(entitlementsPath, xml);
        }
      }
      return cfg;
    },
  ]);

  return next;
}

module.exports = withLocalNotificationsOnly;
