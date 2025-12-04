// App entry point and initialization
import "@fortawesome/fontawesome-free/css/all.css";
import "../css/style.css";
// Imports from old index.ts for side effects
import "./blockchain";
import { Router } from "./router";
import { handleHostLogin, handleHostRegister } from "./host-auth";
import { setupLocalPlayerRegisterModal } from "./local-player";
import { AuthManager } from "./auth";
import { GameManager } from "./game";
import { ProfileManager } from "./profile";
import { TournamentManager } from "./tournament";



// Imports for 3D scene
// import roomGlb from "../assets/Room/Room.glb";
// import "@babylonjs/loaders/glTF/2.0/glTFLoader";
// import { ArcRotateCamera, Color4 } from "@babylonjs/core";
// import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
// import { Engine } from "@babylonjs/core/Engines/engine.js";
// import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
// import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
// import { Scene } from "@babylonjs/core/scene.js";
// import { HtmlMeshRenderer, HtmlMesh, FitStrategy } from "@babylonjs/addons";

console.log("🚀 [MAIN] main.ts executing... BUILD VERSION 3.0 - PROFILE FIX");

// GUARD: Prevent multiple initializations
if ((window as any).__appInitialized) {
  console.error(
    "⚠️⚠️⚠️ main.ts already executed! Preventing duplicate initialization."
  );
  throw new Error("Application already initialized");
}
(window as any).__appInitialized = true;

// Initialize managers - SINGLETON pattern
if (!(window as any).authManager) {
  console.log("✅ [MAIN] Creating AuthManager");
  (window as any).authManager = new AuthManager();
} else {
  console.warn("⚠️ [MAIN] AuthManager already exists, skipping");
}

if (!(window as any).gameManager) {
  console.log("✅ [MAIN] Creating GameManager");
  (window as any).gameManager = new GameManager();
} else {
  console.warn("⚠️ [MAIN] GameManager already exists, skipping");
}

if (!(window as any).profileManager) {
  console.log("✅ [MAIN] Creating ProfileManager");
  (window as any).profileManager = new ProfileManager();
} else {
  console.warn("⚠️ [MAIN] ProfileManager already exists, skipping");
}

if (!(window as any).tournamentManager) {
  console.log("✅ [MAIN] Creating TournamentManager");
  (window as any).tournamentManager = new TournamentManager();
} else {
  console.warn("⚠️ [MAIN] TournamentManager already exists, skipping");
}

// ...initialize app, bind UI, etc...
import { App } from "./app";

// FORCE recreation if window.app exists but is not a valid App instance
const existingApp = (window as any).app;
if (
  existingApp &&
  existingApp.constructor &&
  existingApp.constructor.name === "App"
) {
  console.log("✅ [MAIN] Valid App instance already exists, skipping");
} else {
  if (existingApp) {
    console.warn('⚠️ [MAIN] Invalid window.app detected (likely from development tools), clearing and recreating...');
    console.warn('Type:', typeof existingApp);
    console.warn('Constructor:', existingApp?.constructor?.name);
    // Clear the invalid app reference
    delete (window as any).app;
  } else {
    console.log("✅ [MAIN] Creating App");
  }
  const app = new App();
  (window as any).app = app;
  setupLocalPlayerRegisterModal(app);
}

console.log("🏁 [MAIN] main.ts initialization complete");

// 3D Scene Logic from old index.ts
// document.addEventListener("DOMContentLoaded", () => {
//   const root = document.querySelector("#root")!;
//   const app = document.querySelector<HTMLDivElement>("#app")!;
//   app.style.backgroundColor = "red";
//   const canvas = document.createElement("canvas");
//   canvas.style.height = `100vh`;
//   canvas.style.width = `100vw`;
//   canvas.style.zIndex = "-1";
//   root.append(canvas);

//   // Associate a Babylon Engine to it.
//   const engine = new Engine(canvas);

//   // Create our first scene.
//   const scene = new Scene(engine);

//   // Create and position a free camera (non-mesh)
//   const camera = new ArcRotateCamera(
//     "camera",
//     0,
//     0,
//     1,
//     new Vector3(0, 0, 0.5),
//     scene
//   );

//   // Attach the camera to the canvas

//   const minFov = 0.15;
//   const maxFov = 0.4;
//   const initialFov = 0.25;
//   camera.fov = initialFov;

//   // Creates a light pointing to the sky
//   const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

//   // Reduce intensity
//   light.intensity = 0.7;

//   // Make scene transparent
//   scene.clearColor = new Color4(0.05, 0.1, 0.15, 0);

//   // The SAUCE (Setup HTMLMesh)
//   const htmlMeshRenderer = new HtmlMeshRenderer(scene);
//   let htmlMesh = new HtmlMesh(scene, "htmlMesh", {
//     captureOnPointerEnter: true,
//     isCanvasOverlay: false,
//     fitStrategy: FitStrategy.CONTAIN,
//   });

//   ImportMeshAsync(roomGlb, scene).then((res) => {
//     htmlMesh.setContent(app as HTMLElement, 0.3, 0.25);
//     htmlMesh.rotation.y = Math.PI / 2;
//     // htmlMesh.scalingDeterminant = 0.075;

//     res.meshes.forEach((mesh) => {
//       if (mesh.name == "Monitor_Screen") {
//         htmlMesh.position = mesh.position;
//         htmlMesh.position.x -= 0.17;
//         // htmlMesh.position.y += 0.1;
//         mesh.isVisible = false;
//         // camera.setTarget(mesh.position, true, false);
//       }
//     });
//     camera.setTarget(htmlMesh.position, true, false);
//   });

//   let mouseX = innerWidth / 2;
//   let mouseY = innerHeight / 2;

//   document.addEventListener("mousemove", (e) => {
//     mouseX = e.clientX;
//     mouseY = e.clientY;
//   });

//   document.addEventListener("wheel", (e) => {
//     const zoomSensitivity = 0.0005;
//     camera.fov += e.deltaY * zoomSensitivity;
//     camera.fov = Math.max(minFov, Math.min(maxFov, camera.fov));
//   });

//   document.addEventListener("keydown", (e) => {
//     if (e.ctrlKey || e.metaKey) {
//       const zoomStep = 0.05;
//       switch (e.key) {
//         case "=":
//         case "+":
//           e.preventDefault();
//           camera.fov -= zoomStep;
//           break;
//         case "-":
//           e.preventDefault();
//           camera.fov += zoomStep;
//           break;
//         case "0":
//           e.preventDefault();
//           camera.fov = initialFov;
//           break;
//       }
//       camera.fov = Math.max(minFov, Math.min(maxFov, camera.fov));
//     }
//   });

//   // Render every frame
//   engine.runRenderLoop(() => {
//     // Normalize mouse position to a range of -1 to 1
//     const normalizedX =
//       (mouseX - window.innerWidth / 2) / (window.innerWidth / 2);
//     const normalizedY =
//       (mouseY - window.innerHeight / 2) / (window.innerHeight / 2);

//     // Adjust camera rotation based on normalized mouse position
//     // You can change the sensitivity to control the speed
//     const sensitivity = 0.1;
//     camera.alpha = Math.PI - normalizedX * sensitivity;
//     // We add Math.PI / 2 to center the camera vertically
//     camera.beta = Math.PI / 2 - normalizedY * sensitivity;

//     scene.render();
//   });
// });
