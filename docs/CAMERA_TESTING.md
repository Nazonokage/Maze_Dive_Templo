# Camera investigation - 2026-10-10

**Update:** the user confirmed the setting enabled the working transition. The current UI has an explicit Smooth camera switch, on by default; Auto is removed and legacy Auto values migrate to Smooth. The measurements below remain the investigation record.

## What was confirmed

Two code defects were identified, not a proven single cause for every reported desktop environment:

1. `Maze Dive_Templo.html` was an obsolete standalone copy. In installed Brave, its skip action changed blend from about 0.994 to 0.34 and jumped about 44.86 world units. `index.html` kept the same position on skip. The legacy file now redirects to the current game, preserving the query and hash.
2. The blend update treated equality with the target as descent. While waiting at full overhead it oscillated between 1 and a slightly lower value every other frame. A real-time trace exposed this because the apparent transition included the entire hold interval. The update now leaves blend unchanged at the target.

The user subsequently confirmed the transition works when the setting is enabled. Neither defect alone proves the cause of that particular report.

## Run the checks

The existing optional Playwright setup is documented in README.md. Set `BROWSER_EXECUTABLE` to the installed browser executable to test Brave; otherwise `test:camera` uses Edge (or `BROWSER_CHANNEL`).

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
npm run check
npm run test:camera
npm run test:browser
```

`test:camera` starts its own localhost HTTP server on an available port, uses fresh browser contexts and the actual animation loop, then closes its browser/server. It checks redirects, stationary overhead holds, many intermediate frames over real elapsed time, Smooth overriding reduced motion, and HUD/held-map sequencing. It tests desktop and touch-emulated viewports. It does not control the user's browser profile or emulate the VS Code host.

Set `CAMERA_REPORT_DIR` to a local folder to save full traces and a summary. Traces are otherwise kept only in the test process. The regression suite also covers the separately fixed yaw-wrap/input issue, help/cursor controls and resource cleanup.

## Verify the original desktop failure

1. Run `npm run dev` or the VS Code local server. Open `index.html` or the old filename (which should redirect).
2. Open F1 and verify **Build 1.2.0-settings-20261010**. Close help, open the pre-game **Settings** modal, turn **Smooth camera** on, choose **Done**, and start a Purist game with a fixed seed and guardian off.
3. Confirm the opening hold is stationary, descent lasts about 3.2 seconds, and controls return after landing. Press B; full overhead should hold still and return over about 2.2 seconds. The hand should appear only afterward.
4. Repeat in Brave and the VS Code preview, recording browser/editor versions and the exact URL/entry point. Repeat on physical mobile Chrome.

## Capture a failing run

Append `debugCamera=1` to the URL, for example:

`http://127.0.0.1:4173/index.html?seed=desktop-test&mode=purist&guard=0&debugCamera=1`

After reproducing, use the browser's developer console to inspect or copy:

```js
JSON.stringify(window.mazeCameraDiagnostics.snapshot(), null, 2)
```

The report contains a build identifier, entry filename, browser user agent, effective camera setting/reduced-motion request, render pixel ratio, up to 2,400 presented game-frame samples, and up to 100 visibility/focus/pointer-lock events. Reload for a fresh trace. It sends nothing to a server and excludes unrelated storage. Diagnostics are absent unless the URL explicitly enables them.

Capture a screen recording too: valid intermediate camera values alone do not prove that the user's browser visibly presented every frame. If the build label is old, investigate the loaded entry and cache before changing interpolation again.

## Verified results

2026-10-10, Windows, installed Brave engine 155.0.8059.40, fresh headless contexts, local HTTP; Smooth selected through the settings UI:

| Profile | Intermediate intro frames | Intro duration | Intermediate return frames | Return duration |
| --- | ---: | ---: | ---: | ---: |
| Desktop 1280x800 | 527 | 3.188 s | 366 | 2.212 s |
| Desktop with reduced-motion request | 528 | 3.194 s | 366 | 2.212 s |
| Touch emulation 390x844 | 528 | 3.194 s | 366 | 2.212 s |

Both full-overhead holds stayed exactly at blend 1. Legacy query/hash preservation, HUD restoration and delayed held-map display passed. The complete gameplay/browser regression suite, syntax check and Git whitespace check passed as well. No page or shader errors were reported. These are headless frame samples, not a physical display FPS benchmark or proof of the user's VS Code preview behavior.
