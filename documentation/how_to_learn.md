# How to Learn and Understand the Codebase

This guideline will help you learn the basics and understand each line of code in the FT_TRANSCENDENCE frontend project.

---

## 1. Understand the Project Structure
- Review the folder and file organization (`src/`, `managers/`, `core/`, etc.).
- Read the `README.md` for an overview of features and architecture.

## 2. Learn the Language and Tools
- Study **TypeScript** basics: types, classes, interfaces, modules.
- Learn about **Vite** (build tool), **WebSocket** (real-time communication), and **HTML5 Canvas** (graphics).

## 3. Start With Entry Points
- Begin with `main.ts` and `app.ts` to see how the app is initialized and the main class (`App`) is constructed.

## 4. Explore Core Classes
- Read through the `App` and `GameManager` classes.
- Identify properties, methods, and how they interact with the DOM and other modules.

## 5. Follow the Flow
- Trace how user actions (clicks, form submissions) trigger methods.
- See how game modes are switched and how the UI updates.

## 6. Understand DOM Manipulation
- Look for code that uses `document.getElementById`, `querySelector`, etc.
- See how elements are created, updated, and events are handled.

## 7. Study Event Handling
- Review how event listeners are set up for buttons, forms, and keyboard shortcuts.

## 8. Review Game Logic
- Examine how game settings are managed and passed to the game engine.
- See how the game starts, pauses, and stops.

## 9. Check Real-Time Features
- Look for WebSocket usage in `game.ts` for multiplayer synchronization.

## 10. Read Comments and Logs
- Pay attention to inline comments and `console.log` statements for explanations.

## 11. Experiment and Debug
- Run the app, interact with the UI, and use browser dev tools to inspect elements and debug code.

## 12. Ask Questions
- If you don’t understand a line, search for documentation or ask for an explanation.

---

**Tip:**  
Go step-by-step, focusing on one file or feature at a time. Use the IDE’s “Go to Definition” and “Find References” to trace how functions and variables are used.