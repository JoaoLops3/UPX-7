const { withInfoPlist } = require('@expo/config-plugins');

/** Permite o iPhone achar o Metro no Mac (evita tela branca em build Debug no aparelho). */
function withIosLocalNetworkMetro(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocalNetworkUsageDescription =
      cfg.modResults.NSLocalNetworkUsageDescription ??
      'O UPX 7 usa a rede local para carregar o app em desenvolvimento a partir do seu Mac.';
    const existing = cfg.modResults.NSBonjourServices ?? [];
    const services = new Set([...existing, '_metro._tcp', '_http._tcp']);
    cfg.modResults.NSBonjourServices = [...services];
    return cfg;
  });
}

module.exports = withIosLocalNetworkMetro;
