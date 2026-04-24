const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite ships a WebAssembly worker for the web target. Metro needs
// `.wasm` added to its asset resolver list to bundle it.
config.resolver.assetExts.push('wasm');

// wa-sqlite's worker requires cross-origin isolation headers. Set them
// on the dev server so local `npm run web` works end-to-end.
config.server = config.server ?? {};
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, server)
    : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return enhanced(req, res, next);
  };
};

module.exports = config;
