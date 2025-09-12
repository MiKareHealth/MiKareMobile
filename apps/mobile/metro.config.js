const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for resolving local packages
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

// Add support for platform-specific extensions
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Add support for resolving the local mikare-core package
config.resolver.alias = {
  'mikare-core': path.resolve(__dirname, '../../packages/core/src'),
};

// Ensure we can resolve TypeScript files
config.resolver.sourceExts = [
  'js',
  'jsx',
  'json',
  'ts',
  'tsx',
  'cjs',
  ...config.resolver.sourceExts,
];

module.exports = config;
