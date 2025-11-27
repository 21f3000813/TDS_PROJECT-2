// Minimal WHATWG File implementation for Node 18 runtimes.
type FileBits = BlobPart[];
type FileInit = {
  lastModified?: number;
  type?: string;
};

if (typeof globalThis.File === 'undefined' && typeof Blob !== 'undefined') {
  class FilePolyfill extends Blob {
    readonly name: string;
    readonly lastModified: number;
    readonly webkitRelativePath = '';

    constructor(fileBits: FileBits, fileName: string, options: FileInit = {}) {
      if (!fileName) {
        throw new TypeError('File name must be provided');
      }
      super(fileBits, { type: options.type });
      this.name = String(fileName);
      this.lastModified = options.lastModified ?? Date.now();
    }

    get [Symbol.toStringTag]() {
      return 'File';
    }
  }

  (globalThis as typeof globalThis & { File?: typeof FilePolyfill }).File = FilePolyfill;
}
