# Third-Party Notices

Musomo Tracker includes third-party software components. Each component is
governed by its own license. This file summarizes the principal components
**distributed with or bundled into** the application.

Musomo Tracker itself is proprietary software. See [LICENSE](LICENSE).

License information for Rust dependencies was verified with `cargo license`
(2026-03-23). JavaScript vendor libraries were verified from bundled file headers.

---

## Application framework

### Tauri 2

- **Use:** Desktop application shell (Rust + system webview)
- **License:** Apache-2.0 OR MIT
- **Project:** https://github.com/tauri-apps/tauri
- **Version (direct dependency):** 2.x (see `src-tauri/Cargo.lock`)

### tauri-build 2

- **Use:** Build tooling for Tauri
- **License:** Apache-2.0 OR MIT (typical Tauri ecosystem; see Cargo.lock)
- **Project:** https://github.com/tauri-apps/tauri

### tauri-plugin-dialog 2

- **Use:** Native file dialogs
- **License:** Apache-2.0 OR MIT (typical Tauri plugin; see Cargo.lock)
- **Project:** https://github.com/tauri-apps/plugins-workspace

---

## Database

### rusqlite 0.32

- **Use:** SQLite database access from Rust
- **License:** MIT
- **Project:** https://github.com/rusqlite/rusqlite

### libsqlite3-sys (bundled SQLite)

- **Use:** Native SQLite bindings (bundled with rusqlite `bundled` feature)
- **License:** MIT (Rust bindings); **SQLite library: Public Domain**
- **Project:** https://github.com/rusqlite/rusqlite
- **SQLite:** https://www.sqlite.org/copyright.html

---

## Rust dependencies (direct)

| Component | Version | License | Project |
|-----------|---------|---------|---------|
| serde | 1.0.x | Apache-2.0 OR MIT | https://github.com/serde-rs/serde |
| serde_json | 1.0.x | Apache-2.0 OR MIT | https://github.com/serde-rs/json |
| dirs | 6.x | Apache-2.0 OR MIT | https://github.com/soc/dirs-rs |
| image | 0.25.x | Apache-2.0 OR MIT | https://github.com/image-rs/image |
| base64 | 0.22.x | Apache-2.0 OR MIT | https://github.com/marshallpierce/rust-base64 |

---

## JavaScript (bundled in app frontend)

### html2canvas 1.4.1

- **Path:** `src/vendor/html2canvas.min.js`
- **Use:** Report preview capture for PDF export
- **License:** MIT
- **Project:** https://html2canvas.hertzen.com
- **Copyright:** Niklas von Hertzen

### jsPDF 2.5.1

- **Path:** `src/vendor/jspdf.umd.min.js`
- **Use:** PDF report generation
- **License:** MIT
- **Project:** https://github.com/parallax/jsPDF

---

## Fonts

### Inter Variable

- **Path:** `src/tracker-studio/fonts/InterVariable.woff2`
- **Use:** Application UI typography
- **License:** SIL Open Font License 1.1 (OFL-1.1)
- **Project:** https://github.com/rsms/inter

---

## Development tools (not distributed in the app binary)

### @tauri-apps/cli 2

- **Use:** Development and build CLI
- **License:** Apache-2.0 OR MIT
- **Project:** https://github.com/tauri-apps/tauri

---

## Transitive Rust dependencies

The release binary includes additional transitive Rust crates (WebView bindings,
platform APIs, compression, parsing, etc.). A full machine-readable list can
be regenerated from the project root:

```bash
cd src-tauri && cargo license
```

Or inspect `src-tauri/Cargo.lock` for exact resolved versions.

---

## Attribution

To the authors of the open-source components listed above: thank you for making
your work available under permissive licenses.

If you believe a component or license notice is missing or incorrect, please
contact Musomo via https://musomo.net/musomo-tracker/
