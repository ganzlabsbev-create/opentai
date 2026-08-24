// Intentionally unused: `core/parsers` runs synchronously on the main
// thread (see FilesProvider.addFiles). At the enforced MAX_PARSEABLE_BYTES
// (5 MB) ceiling for text/code files, parsing is fast enough (regex/JSON.parse
// over a few MB of text) that moving it off-thread wasn't worth the added
// complexity of message-passing FileParser results back to IndexedDB/OPFS
// writes, which themselves have to happen on the main thread anyway. Kept
// as a placeholder in case a future large-file/CSV-heavy workload needs it.
export {};
