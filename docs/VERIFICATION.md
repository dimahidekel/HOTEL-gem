# Verification — 2026-11-25

- Eight Node tests PASS: input validation, exact text preservation, source bytes/hash checks, immutable requests, stale-writer rejection and multipart completeness/tamper failures.
- Fifteen existing Python tests PASS using TypeScript 7.0.2; runner repaired for Windows and explicit TS7 configuration.
- Real-size synthetic transfer: 60 MiB presentation bytes + 50 MiB spreadsheet bytes + text produced two packages. Independent Python zipfile CRC, complete inventory, byte sizes and SHA-256 verification PASS for every source. These are synthetic byte fixtures, not valid authored Office documents or evidence of semantic extraction.
- Browser: familiar navy sidebar/teal controls restored; existing synthetic deal, persisted text/source, ES request and numbered download control verified. Earlier tests covered deal creation, source intake, download, reload and returned-PDF download with identical bytes.
- Static build, JavaScript syntax and git diff whitespace checks PASS.
- Native PDF preview remained blank in the in-app browser; download fallback works. No canonical rendered report was generated in this task.

Limits: up to 500 source files, 100 MiB each, 2 GiB/deal subject to browser quota. Each package holds at most 100 MiB source payload plus metadata (hard output cap 110 MiB). Files are never split, converted or executed. Packages are generated on demand individually. Large source files above the cap require the canonical Drive folder route. Browser storage is not a durable backup; quota failures abort the transaction rather than dropping selected files. Original duplicate content/name selections are deduplicated; distinct filenames and identities remain in the inventory.

Not verified: ChatGPT host execution, receiving-surface upload limits/ZIP extraction, automatic Drive writes/readback, 10/19-section document acceptance, approved first-page visual parity, independent XLSX recalculation and actual full PDF/XLSX release gate. A complete transfer inventory enables completeness checks but does not prove receiving-host compliance. Full ChatGPT parity remains blocked/unverified. No production deployment or merge was performed.
