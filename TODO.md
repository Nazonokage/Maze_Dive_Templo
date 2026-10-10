# TODO

## Desktop camera transition - user-confirmed working; settings clarified

Updated 2026-10-10. The user confirmed that the transition works and that the setting was the problem. At their request, Auto was removed: Smooth camera is now an explicit on/off switch, defaults on, and migrates old Auto values to Smooth. Explicit saved Off remains off.

### Confirmed defects and fixes

- [x] Reproduce the stale standalone entry point in installed Brave: skipping its intro moved the camera about 44.86 world units immediately; the current entry point moved zero units for the same action.
- [x] Replace `Maze Dive_Templo.html` with a redirect to authoritative `index.html`, retaining query parameters and fragment. Old bookmarks and Live Server launches no longer run a separate old game.
- [x] Fix the equality case in camera blending. At full overhead, the old update alternated between `1` and slightly below `1`; it now holds exactly at its target until descent begins.
- [x] Add versioned CSS/JavaScript URLs and an F1 build label (`1.2.0-settings-20261010`) to identify the loaded revision.
- [x] Add opt-in, bounded local camera diagnostics with effective camera preference, reduced motion, raw frame intervals, camera pose, blend, intro/Eagle timers and visibility/pointer-lock events. No upload or unrelated saved data.
- [x] Add a real-time HTTP browser suite using the installed Brave executable, canonical/legacy entry points, desktop, reduced-motion override and touch-emulated profiles.

### Release follow-up

- [x] User confirmed the camera transition works with the setting enabled on 2026-10-10.
- [x] Replace the ambiguous three-way camera selector with a clear saved Smooth camera toggle.
- [ ] If a desktop browser or editor preview jumps again, capture the opt-in trace and a screen recording using `docs/CAMERA_TESTING.md`; record browser/editor versions, hardware acceleration and display refresh rate.
- [ ] If a regression occurs, compare its desktop trace with physical mobile Chrome. Touch emulation is not physical-device confirmation.
- [x] Record user confirmation; retain the diagnostic procedure for any future regression.

### Preserve during follow-up

- [x] HUD, inventory and touch controls stay hidden throughout overhead views/transitions, with gear access retained.
- [x] Held map stays hidden until first person, then starts its 24-second fade.
- [x] Heading arrow is overhead-only; held map keeps a position dot.
- [x] Regression coverage retains keyboard shortcuts, map charges, saved preferences, pause behavior and reduced-motion override.
- [ ] Confirm physical mobile Chrome remains unaffected in user testing.

Release target: v1.2.0. The remaining items are manual regression and physical-device checks, not known blockers to the user-confirmed camera behavior.
