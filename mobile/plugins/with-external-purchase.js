// Adds Apple's "StoreKit External Purchases or Offers" entitlement (EU link-out to the
// garix.ie Stripe checkout via ExternalPurchaseCustomLink).
//
// Only enabled when GARIX_IOS_EXTERNAL_PURCHASE=1 at build time: Apple must approve the
// entitlement first, otherwise the provisioning profile lacks it and signing fails.
const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

// EU storefronts (ISO 3166-1 alpha-2, lower case). Garix serves Ireland; the list covers
// the EU so the eligibility check, not the build, decides where buying is offered.
const EU_REGIONS = [
  'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de', 'gr', 'hu', 'ie',
  'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se',
];

module.exports = function withExternalPurchase(config) {
  if (process.env.GARIX_IOS_EXTERNAL_PURCHASE !== '1') return config;
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.storekit.custom-purchase-link.allowed-regions'] = EU_REGIONS;
    return c;
  });
  return withInfoPlist(config, (c) => {
    c.modResults.SKExternalPurchaseCustomLinkRegions = EU_REGIONS;
    return c;
  });
};
