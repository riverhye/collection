// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Drizzle: allow importing generated .sql migration files
config.resolver.sourceExts.push("sql");

module.exports = withNativewind(config, { input: "./src/global.css" });
