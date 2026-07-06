# Jumpy Ball - Agency Context

This project is a canvas-based game where the user controls a red bird flying through gaps in moving pipes while avoiding collisions and staying within vertical boundaries.

## Architecture & Key Components
- **Main Loop:** The entire logic resides in `script.js`. The `update()` function (lines 116-228) is the engine, running via `requestAnimationFrame`.
- **Rendering Order:**
    1. `drawBackground()`: Full canvas reset and ground/cloud drawing.
    2. `drawPipes()`: Pipe rendering.
    3. `drawBird()`: The player character.
    4. `drawUI()`: Time display and any other overlays.
- **State Management:** The game state (position of items, current level, etc.) is managed locally within the script using global constants and arrays (`pipes`, `clouds`).

## Interaction & Input
- **Keyboard Controls:** Use `ArrowUp` or `Space` to jump. Arrow keys also handle horizontal scrolling if added in future iterations.
- **Touch Support:** The game listens for `touchstart` to allow mobile interaction.
- **Game Loop logic:** 
  - Gravity affects `bird.velocity`.
  - Collision is checked against both the `pipeWidth` and vertical gap coordinates.

## Development & Verification
- **Development Environment:** The app requires an environment with a `<canvas>` element with id `gameCanvas`.
- **Testing:** Verified by running the script and checking for successful collision detection and requested visual changes (like overlapping elements).
- **Progression Logic:** Difficulty scales every 20 seconds (`currentLevel`). For each level increase, the gap between pipes is narrowed.

## Guidelines
- **Maintain Frame Consistency:** Ensure all drawing functions are called in correct order within `update()`.
- **Coordinate System:** The ground height (100px) must be considered for boundary collision checks.

## Editing Guidelines
1. In search and replace operations take at least 2-3 code lines before and after the designated line as context in oldString.
2. If you change code, replace never only single lines. Replace always the whole function, method or class.
3. Absolute precision is required when outputting the code to be replaced (oldString).
    1. You must never use ellipses (such as ...) to abbreviate or skip code.
    2. The oldString must match the target file exactly, character for character, including all original indentation.
    3. Do not omit any blank lines that are present in the original code.

