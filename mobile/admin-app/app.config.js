module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_STAGE !== 'development') return config;
  const android = { ...config.android, package: config.android.package + '.development', intentFilters: [] };
  delete android.googleServicesFile;
  return {
    ...config,
    name: 'AGM Admin Dev',
    scheme: 'agm-admin-dev',
    ios: { ...config.ios, bundleIdentifier: config.ios.bundleIdentifier + '.development', associatedDomains: [] },
    android,
    plugins: (config.plugins || []).filter(p => (Array.isArray(p) ? p[0] : p) !== '@react-native-google-signin/google-signin'),
  };
};
