const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On Windows Metro has no recursive native watcher, so it falls back to one
// fs.watch per directory (metro-file-map's FallbackWatcher). When a watched
// directory is deleted, Node hands the watcher a `\\?\`-prefixed absolute path
// instead of a relative filename; the watcher joins it onto the directory and
// lstats the resulting garbage path, which fails with UNKNOWN rather than
// ENOENT. FallbackWatcher only tolerates ENOENT/EPERM, so it emits an unhandled
// 'error' and kills the dev server.
//
// These scopes hold optional, platform-gated wasm/native bindings and CLI-only
// helpers that npm prunes and restores on most installs, so they are the
// directories that actually vanish mid-session. No app code imports them, so
// keeping them out of the file map costs nothing and stops the crash.
config.resolver.blockList = [
  ...config.resolver.blockList,
  /[\\/]node_modules[\\/]@(?:tybys|emnapi|napi-rs|unrs|sindresorhus|szmarczak)(?:[\\/]|$)/,
];

module.exports = config;
