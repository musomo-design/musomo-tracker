# Musomo Tracker — Privacy Policy

**Last updated:** August 2026  
**Product:** Musomo Tracker  
**Publisher:** Musomo  
**Website:** https://tracker.musomo.net/

This policy describes how Musomo Tracker handles information based on the
current behavior of the application (version 1.0.20). It reflects what the
software actually does today, not planned future features.

## Summary

Musomo Tracker is a **local-first** desktop application. It does **not** use
cloud accounts, analytics, telemetry, or automatic data collection. The app
does **not** automatically send your data to Musomo or to third-party
servers.

## Data stored on your device

All operational data you enter or generate in Musomo Tracker is stored **locally**
on your computer.

### SQLite database

The main database file is:

| Platform | Location |
|----------|----------|
| **macOS** | `~/Library/Application Support/musomo-tracker/tracker.db` |
| **Windows** | `%APPDATA%\musomo-tracker\tracker.db` |

The database may contain:

- **Clients** — company name, contact name, email, phone, website, VAT/tax ID,
  address, notes, hourly rate, status, tags, currency, and related fields you enter
- **Projects** — name, status, progress, deadlines, categories, and links to clients
- **Tasks** — board task titles, columns, priorities, hours, and deadlines
- **Time sessions** — dates, start/end times, break duration, descriptions,
  hourly rates, costs, and links to clients/projects
- **Settings** — studio profile (company name, display name, default rate, report
  footer, currency), and internal app settings such as open timer state

### Brand assets and backups

| Data | Location |
|------|----------|
| **Logos and avatar files** | `{data_dir}/musomo-tracker/assets/` (e.g. `print-logo.png`, `avatar.png`) |
| **Automatic database backups** | `{data_dir}/musomo-tracker/archives/tracker-backup-*.db` |

On macOS, `{data_dir}` is typically `~/Library/Application Support`.  
On Windows, `{data_dir}` is typically `%APPDATA%`.

### Browser storage (app webview)

Musomo Tracker uses **localStorage** (not HTTP cookies) for:

- **Language preference** — key `musomo-tracker:locale`
- **Timer sync fallback** (main window only) — key `tracker-studio-timer`

This data stays on your device and is not transmitted over the network by the app.

## Exports

When you export reports:

- **PDF** and **Excel** files are saved to your **Downloads** folder via a local
  save operation
- Files remain on your device unless you move or share them yourself

## Email (Send Report)

On **macOS**, the **Send Report** feature opens the **Mail** application with
a pre-filled message and attachment. **No email is sent automatically** by
Musomo Tracker. Sending only occurs if you review and confirm the message in
Mail.

On platforms where Mail integration is not supported, this feature displays an
error and does not send email.

## Network activity

Based on the current application code:

- Musomo Tracker **does not** perform automatic network requests to Musomo or
  third-party analytics services
- Musomo Tracker **does not** collect usage telemetry
- Musomo Tracker **does not** require an internet connection to operate

When you choose to open an external link (for example the Musomo website or
Support page from About or Help), your operating system opens the URL in your
default browser. That action is **initiated by you**.

## Your responsibilities

You are responsible for:

- The personal data you enter about your clients and projects
- Securing backups and exports you create
- Compliance with applicable privacy laws when storing client information
- Removing local data when uninstalling or disposing of a device (delete the
  folders listed above if you no longer need the data)

## Changes

If data handling changes in a future version, this policy and the in-app Privacy
information will be updated accordingly.

## Contact

Musomo — https://tracker.musomo.net/
