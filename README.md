<p align="center">
  <img src="./assets/Avin-logo.png" alt="Avin Logo" width="110" />
</p>

<h1 align="center">Avin — Offline-First Local Music Player</h1>

<p align="center">
  A fast, private, offline-first local music player built with <strong>Expo (SDK 58)</strong>, <strong>React Native</strong>, <strong>TypeScript</strong>, <strong>Expo Audio</strong>, <strong>SQLite + Drizzle ORM</strong>, <strong>Zustand</strong>, and <strong>React Native Reanimated</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK%2058-000020?style=flat-square&logo=expo" alt="Expo SDK 58" />
  <img src="https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Database-SQLite%20%2B%20Drizzle-003B57?style=flat-square&logo=sqlite" alt="SQLite + Drizzle" />
  <img src="https://img.shields.io/badge/Offline-100%25%20On--Device-913DFF?style=flat-square" alt="Offline First" />
</p>

---

## Overview

**Avin** is designed for users who keep their music locally on their device and want a sleek, responsive, zero-tracking player. It requires no accounts, no cloud sync, and no internet connection — every track, playlist, favorite, and playback state lives directly on your device in SQLite.

---

## Features

### Local Music Discovery & Import
- **Full-Device Audio Scanning**: Paginated MediaStore scanning via `expo-media-library` (`500` tracks per page) discovers all audio files across your entire device storage with accurate duration and file modification timestamps.
- **Direct File Import**: Import individual or multiple audio files from any folder using `expo-document-picker` and `expo-file-system`.
- **Smart Metadata Parsing**: Extracts song title, artist, album, folder, and genre information from filenames and paths.

### Audio Engine & Playback (`expo-audio`)
- Play, pause, resume, seek, next/previous track, and live progress scrubbing.
- **Playback Modes**: Shuffle, Repeat Off / Repeat All / Repeat One.
- **Speed & Volume**: Adjustable playback speed (`0.5x` – `2.0x`) and output volume controls.
- **Background Audio & Lock Screen Controls**: Continues playing in the background and integrates with lock screen and Android notification media controls.
- **Animated Waveform Visualizer**: Live reactive visualizer in the full-screen Now Playing view.

### Library Organization & Sorting
- Browse by **All Songs**, **Albums**, **Artists**, **Genres**, **Folders**, and **Recently Added**.
- **Flexible Sorting**: Sort tracks in ascending or descending order by:
  - **Time Added** (Newest / Oldest)
  - **Song Name** (A → Z / Z → A)
  - **Artist Name** (A → Z / Z → A)
  - **Duration** (Longest / Shortest)

### Multi-Select Mode & Batch Actions
- **Long-Press Selection**: Press and hold any song row to enter multi-select mode with haptic feedback and smooth Reanimated spring transitions.
- **Batch Action Dock**: A bottom action bar slides up with **Select All / Deselect All** and 4 quick actions:
  - **Play** — Play all selected tracks immediately as the active queue.
  - **Add** — Add selected tracks to an existing or brand-new playlist.
  - **Share** — Share track info via the native share sheet.
  - **Delete** — Remove selected tracks from the library (or from the current playlist).

### Playlists & Favorites
- Create, rename, and delete custom playlists with automatic artwork previews.
- **Inline Playlist Creation**: Create a new playlist directly from the top of the **Add to Playlist** bottom sheet and add the selected track(s) in one step.
- Reorder tracks inside any playlist and manage a dedicated **Favorites** tab.

### Queue & Global Search
- **Up Next Queue**: View the active queue with current-track indicator, play next, add to queue, reorder, remove individual tracks, shuffle, or clear queue.
- **Debounced Global Search**: Instant SQLite search across songs, artists, albums, playlists, and genres with highlighted matches and persisted search history.

### Mobile-First Dark UI
- Deep OLED black (`#050505`), charcoal elevated cards (`#131317`), and neon purple accents (`#913DFF`).
- Full `SafeAreaProvider` / `useSafeAreaInsets` support across screens, tab bars, bottom sheets, and action docks (including Android 3-button and gesture navigation bars).

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | Expo SDK 58, React Native 0.88, React 19 |
| **Language** | TypeScript (strict mode) |
| **Navigation** | Expo Router (file-based typed routes) |
| **Audio Playback** | `expo-audio` |
| **Media Scanning & Files** | `expo-media-library`, `expo-document-picker`, `expo-file-system` |
| **Database & ORM** | `expo-sqlite` + `drizzle-orm` |
| **State Management** | Zustand |
| **Animations & Gestures** | `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics` |
| **UI & Icons** | `lucide-react-native`, `expo-image`, `expo-linear-gradient` |
| **Validation** | Zod |
| **Testing** | Jest + `ts-jest` |

---

## Project Structure

```text
assets/
  Avin-logo.png                     # App icon & brand logo

src/
  app/
    _layout.tsx                     # Root Stack navigator + DB & store initialization
    (tabs)/
      _layout.tsx                   # Custom bottom tab navigator + MiniPlayer
      index.tsx                     # Home screen (Avin header, Quick Bar, Recents, Playlists)
      library.tsx                   # Library categories, search entry & sort options
      playlists.tsx                 # Playlist grid & playlist creator
      favorites.tsx                 # Favorites list with sorting & multi-select
      settings.tsx                  # Playback, Library, Cache & About settings
    library/
      [category].tsx                # All Songs, Albums, Artists, Genres, Folders, Recently Added
      detail.tsx                    # Tracks filtered by Album, Artist, Genre, or Folder
    playlist/
      [id].tsx                      # Playlist detail, song picker, reorder & multi-select
    settings/
      about.tsx                     # About Avin screen
    player.tsx                      # Full-screen Now Playing modal
    queue.tsx                       # Up Next queue manager modal
    search.tsx                      # Global debounced search screen

  components/
    layout/                         # ScreenContainer, ScreenHeader, BottomTabBar
    music/                          # SongRow, AlbumArtwork, ArtistCard, PlaylistCard,
                                    # SongOptionsSheet, AddToPlaylistSheet,
                                    # SelectionActionBar, SortSheet
    player/                         # MiniPlayer, PlaybackControls, PlaybackProgressBar,
                                    # WaveformVisualizer
    ui/                             # BottomSheet, AppModal, PrimaryButton, IconButton,
                                    # SearchBar, SectionHeader, SettingsRow, EmptyState

  constants/                        # Supported audio extensions, playback speeds, app info
  database/
    client.ts                       # SQLite initialization & transaction helper
    migrations/                     # Schema migrations
    schema/                         # Drizzle tables (songs, albums, artists, playlists,
                                    # playlistSongs, favorites, playbackHistory,
                                    # searchHistory, settings)
    repositories/                   # Typed DB repositories
  hooks/                            # useDebounce, useSongSelection
  services/
    audio/audioEngine.ts            # Expo Audio engine wrapper
    media/mediaScannerService.ts    # Full-device MediaStore scanner & file importer
    metadata/audioMetadataParser.ts # Filename & path metadata extraction
    storage/cacheService.ts         # Cache size calculation & cleanup
  stores/                           # playerStore, libraryStore, playlistStore,
                                    # searchStore, settingsStore
  theme/                            # Design tokens (Colors, Typography, Spacing, Radii, Layout)
  types/                            # TypeScript domain models & Zod schemas
  utils/                            # Queue helpers, formatters, deterministic IDs

__tests__/                          # Jest unit tests
```

---

## Supported Audio Formats

`.mp3` · `.m4a` · `.aac` · `.wav` · `.flac` · `.ogg` · `.opus` · `.wma` · `.alac` · `.aiff`

---

## Getting Started

### Prerequisites
- **Node.js** 20+
- **npm** 10+
- For full-device audio scanning and background playback controls on Android/iOS, use an **Expo Development Build** (Expo Go on Android does not bundle `READ_MEDIA_AUDIO`).

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npx expo start
```

### 3. Run Locally (Native Build)

```bash
# Android (requires Android SDK / emulator or connected device)
npx expo run:android

# iOS (requires macOS + Xcode)
npx expo run:ios
```

---

## Building with EAS (Cloud Builds)

EAS profiles are configured in [`eas.json`](./eas.json):

```bash
# Development build (recommended for testing native audio scanning & background playback)
npx eas-cli@latest build --profile development --platform android

# Internal preview APK
npx eas-cli@latest build --profile preview --platform android

# Standalone production APK
npx eas-cli@latest build --profile production-apk --platform android

# Store production builds (AAB / IPA)
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest build --profile production --platform ios
```

---

## Testing & Verification

```bash
# Strict TypeScript typecheck
npm run typecheck

# Run Jest unit tests
npm test

# Diagnose Expo dependencies and config
npx expo-doctor
```

---

## Required Permissions

- **Android**: `READ_MEDIA_AUDIO` (Android 13+), `READ_EXTERNAL_STORAGE` (Android 12 and below), `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `MODIFY_AUDIO_SETTINGS`.
- **iOS**: `UIBackgroundModes: ["audio"]`, `NSAppleMusicUsageDescription`.

---

## License

This project is licensed under the terms of the [LICENSE](./LICENSE) file.
