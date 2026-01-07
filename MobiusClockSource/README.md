# Mobius Clock

A 3D Mobius strip adapted to work as a clock face, created by Charles L Wallace.

## Features
- **3D Visualization**: A Mobius strip rendered in Three.js.
- **Unique Timekeeping**: 24-hour time displayed on a 12-hour face geometry.
- **Mobile Optimized**: Fully responsive layout for Portrait and Landscape modes.
- **Fullscreen Mode**: Immersive experience with a dedicated fullscreen toggle on mobile devices.
- **Interactive Controls**:
    - **Rotate**: rotate the view (default off).
    - **Fast Mode**: Speed up time for demonstration.
    - **Hide/Show Hours**: Toggle hour number visibility (shown by default).
        When the strip is rotating, hours numbers are counter-rotated to remain readable.
- **Customizable Indicators**: Individual shape selection for each time indicator:
    - **Hours**: Sphere, Disc, Ring, or **Outer Ring** (default)
    - **Minutes**: Sphere, Disc, or Ring (default)
    - **Seconds**: Sphere (default) or Disc
- **Outer Ring Animation**: When the hour indicator is set to "Outer Ring", it rotates around its contact point with the strip during ±1 minute from each hour:
    - **Normal Mode**: One rotation every 2 seconds when near the hour.  
    - **Fast Mode**: One rotation per second, with the ring pausing at each hour for approximately 1 second
- **Tick Mark Styles**: Multiple schemes including Standard (default),  Minimal, Alternating Colors, and Alternating hours and minutes (extra nifty).

## URL Parameters
You can configure the initial state of the clock using URL hash parameters. Combine them with `&`.

**Example:** `index.html#timeStyle=24&shapeHours=sphere&zen=true`

| Parameter | Values | Description |
| :--- | :--- | :--- |
| `timeStyle` | `ampm` (default), `24` | Sets the time display format. |
| `shapeHours` | `outer-ring` (default), `ring`, `disc`, `sphere` | Sets the shape of the hour indicator. |
| `shapeMinutes` | `ring` (default), `disc`, `sphere` | Sets the shape of the minute indicator. |
| `shapeSeconds` | `sphere` (default), `disc` | Sets the shape of the second indicator. |
| `tickScheme` | `standard` (default), `minimal`, `alternating`, `alternating_ticks` | Sets the style of the tick marks. |
| `rotation` | `true`, `false` (default) | Enables or disables rotation on load. |
| `showHours` | `true` (default), `false` | Sets the initial visibility of hour numbers. |
| `zen` | `true`, `false` (default) | Starts the clock in Zen Mode (minimal interface). |

## Google Analytics
This project uses Google Analytics (GA4) to track usage.
- **Measurement ID**: `G-ML3R0Z6E6B`
- **Status**: Active

## Deployment
Deployment is automated via a Git `post-commit` hook.
