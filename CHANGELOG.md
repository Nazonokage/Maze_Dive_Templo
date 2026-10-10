# Changelog

## 1.2.0 - 2026-10-10

### Added

- Pre-game Settings button and modal, with larger text, saved preferences, keyboard focus containment, and Done, Escape, close-button and backdrop dismissal.
- Held parchment map with illustrated hand and a static snapshot that fades over 24 seconds after Eagle Sight returns to first person.
- Overhead-only facing arrow, procedural stars and an open-air temple.
- M to show/stow the map, Left Alt for cursor control, R to center the view, N to mute and F1 for the controls guide.
- Saved rendering quality, steady lighting and a Smooth camera switch, on by default.
- Optional local camera diagnostics and browser regression suites for gameplay, settings and real-time camera transitions.

### Changed

- Redesign setup and pause/settings with larger text, grouped controls, accessible switches and responsive layouts.
- Remove the camera Auto option; migrate legacy Auto to Smooth while preserving explicit saved Off.
- Hide inventory, HUD and touch controls throughout overhead views and camera transitions. Show the held map only after landing.
- Improve intro and Eagle Sight easing, prevent skip teleports and lock movement/look during cinematic travel.
- Cap mobile rendering resolution, share assets, instance handprints and hints, dispose level resources, and avoid unnecessary paused/background rendering.
- Replace random lighting flashes with steady or gently varying torchlight.
- Remove continuously pulsing UI effects; retain short feedback transitions and reduced-motion support for decorative effects.

### Fixed

- Redirect the obsolete standalone entry point to the current game while preserving URL parameters and fragments.
- Keep the camera stationary at its full overhead target instead of oscillating between frames.
- Prevent desktop yaw-wrap camera swings and restore gameplay controls and HUD after landing.
- Clarify camera settings following user confirmation that Smooth resolves the reported instant transition.

### Validation and follow-up

- JavaScript syntax, Git whitespace checks, installed-Brave gameplay/settings checks and real-time camera tests passed.
- Desktop, desktop reduced-motion override and touch-emulated camera cases retain intermediate frames across the roughly 3.2-second intro and 2.2-second return.
- Desktop and phone-sized UI screenshots were inspected. Physical-phone performance and the user's exact browser/editor environment remain manual checks; see TODO.md and docs/CAMERA_TESTING.md.

## 1.1 - Previous release

- Split the game into static CSS/JavaScript assets, added background music and mouseless controls, and polished the UI and Vercel setup.
