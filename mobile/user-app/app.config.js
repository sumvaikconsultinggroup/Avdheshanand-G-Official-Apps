module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_STAGE !== 'development') return config;
  const android = { ...config.android, package: config.android.package + '.development', intentFilters: [] };
  delete android.googleServicesFile;
  return {
    ...config,
    name: 'AGM Public Dev',
    scheme: 'agm-public-dev',
    ios: { ...config.ios, bundleIdentifier: config.ios.bundleIdentifier + '.development', associatedDomains: [] },
    android,
    plugins: [
      ...(config.plugins || []).filter(p => !['@react-native-google-signin/google-signin', 'expo-build-properties'].includes(Array.isArray(p) ? p[0] : p)),
      ['expo-build-properties', { ios: { extraPods: [
        { name: 'GoogleUtilities', modular_headers: true },
        { name: 'RecaptchaInterop', modular_headers: true },
      ] } }],
    ],
  };
};
