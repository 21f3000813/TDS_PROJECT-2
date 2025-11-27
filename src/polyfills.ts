const undici = require('undici') as { File?: typeof globalThis.File };

// Provide File global for Node 18 runtimes where it is missing.
if (typeof globalThis.File === 'undefined' && undici.File) {
  (globalThis as typeof globalThis & { File?: typeof undici.File }).File = undici.File;
}
