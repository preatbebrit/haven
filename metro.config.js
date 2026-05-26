// Enables `import Foo from './foo.svg'` returning a React component, via
// react-native-svg-transformer. Source-extension list mirrors Expo's default
// minus 'svg', which moves to sourceExts so it is parsed as JSX/TS.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = config;
