# Settings and UI polish - 2026-10-10

Implemented at the user's request, after confirmation that smooth camera travel works when enabled.

## Settings contract

- Smooth camera is a native checkbox switch, on by default. On stores `smooth`; Off stores `instant`. There is no Auto camera option.
- Existing `auto` camera values resolve to the new Smooth default. Explicit saved `instant` remains off. No map, torch or quality preference is cleared during migration.
- Setup and pause/settings share the same preference state and synchronize immediately. Their labels report the effective On/Off behavior.
- Device reduced motion still suppresses decorative effects. Camera travel is now a separate explicit user preference.
- Rendering retains its existing internal `auto` value, labeled Balanced in the UI; it is unrelated to camera Auto removal.

- Before play, a dedicated Settings button opens a native dialog. Preferences save immediately; Done, Escape, close and backdrop dismissal return focus to the Settings button. Native modal behavior keeps background controls inert and keyboard focus inside the dialog.

## Visual and motion decisions

- Increase primary control text to 16 px and supporting settings text to 14 px, with larger touch targets and a stacked phone layout. Move comfort controls out of the expedition card into the pre-game modal.
- Preserve the temple identity through a geometric seal, warm gold, jade and display headings; use system text for small copy and controls.
- Group expedition options separately from camera/comfort settings. Use a two-column desktop composition and a scrollable single-column phone layout.
- Remove permanent heading/button glow animations and heavy HUD blur. Use a 240 ms ease-out setup entrance and 160 ms press/switch feedback. Pause/help panels respond immediately to frequent keyboard actions.
- Hover effects are limited to fine pointers. Reduced motion suppresses translation and decorative particles while retaining brief toast opacity feedback.
- Use native buttons, inputs and selects rather than adding a React/UI dependency to a plain HTML/Three.js game. Add selected-state semantics, visible focus, settings keyboard containment and clickable help buttons.

## Verification

- Inspected updated desktop 1440x900 and mobile 390x844 screenshots; no horizontal overflow. The pre-game settings modal fits on screen; the longer phone setup scrolls.
- Browser checks cover pre-game dialog opening, initial focus, Escape dismissal, returned focus, blocked background help shortcuts and Done before starting.
- Brave browser checks cover camera-default migration, stored Off, synchronized controls, Space activation, help access, map behavior, keyboard controls and renderer resource stability.
- Real-time camera tests retain the smooth intro, stationary overhead hold and Eagle Sight return checks.

Related supplied skills: improve-animations (motion audit guidance), animation-vocabulary (terminology), pick-ui-library (dependency assessment). The user explicitly requested implementation, so the audit informed direct changes rather than a planning-only deliverable.
