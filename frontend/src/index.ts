// frontend/src/index.ts - Main entry point
import "./app";
import "./auth";
import "./game";
import "./match";
import "./tournament";
import "./profile";
import "./leaderboard";
import "./chat";
import "./blockchain";
import "./error-tracker";

import roomGlb from "../assets/Room/Room.glb";

// Import CSS
import "../css/style.css";

import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import { ArcRotateCamera, Color4 } from "@babylonjs/core";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Scene } from "@babylonjs/core/scene.js";
import { HtmlMeshRenderer, HtmlMesh, FitStrategy } from "@babylonjs/addons";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#root")!;
  const app = document.querySelector<HTMLDivElement>("#app")!;
  const canvas = document.createElement("canvas");
  canvas.style.height = `100vh`;
  canvas.style.width = `100vw`;
  canvas.style.zIndex = "-1";
  root.append(canvas);

  // Associate a Babylon Engine to it.
  const engine = new Engine(canvas);

  // Create our first scene.
  const scene = new Scene(engine);

  // Create and position a free camera (non-mesh)
  const camera = new ArcRotateCamera(
    "camera",
    0,
    0,
    1,
    new Vector3(0, 0, 0.5),
    scene
  );

  // Attach the camera to the canvas

  camera.fov = 0.25;

  // Creates a light pointing to the sky
  const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

  // Reduce intensity
  light.intensity = 0.7;

  // Make scene transparent
  scene.clearColor = new Color4(0.05, 0.1, 0.15, 0);

  // The SAUCE (Setup HTMLMesh)
  const htmlMeshRenderer = new HtmlMeshRenderer(scene);
  let htmlMesh = new HtmlMesh(scene, "htmlMesh", {
    captureOnPointerEnter: true,
    isCanvasOverlay: false,
    fitStrategy: FitStrategy.CONTAIN,
  });

  ImportMeshAsync(roomGlb, scene).then((res) => {
    htmlMesh.setContent(app as HTMLElement, 0.3, 0.25);
    htmlMesh.rotation.y = Math.PI / 2;
    // htmlMesh.scalingDeterminant = 0.075;

    res.meshes.forEach((mesh) => {
      if (mesh.name == "Monitor_Screen") {
        htmlMesh.position = mesh.position;
        htmlMesh.position.x -= 0.17;
        // htmlMesh.position.y += 0.1;
        mesh.isVisible = false;
        // camera.setTarget(mesh.position, true, false);
      }
    });
    camera.setTarget(htmlMesh.position, true, false);
  });

  let mouseX = innerWidth / 2;
  let mouseY = innerHeight / 2;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Render every frame
  engine.runRenderLoop(() => {
    // Normalize mouse position to a range of -1 to 1
    const normalizedX =
      (mouseX - window.innerWidth / 2) / (window.innerWidth / 2);
    const normalizedY =
      (mouseY - window.innerHeight / 2) / (window.innerHeight / 2);

    // Adjust camera rotation based on normalized mouse position
    // You can change the sensitivity to control the speed
    const sensitivity = 0.1;
    camera.alpha = Math.PI - normalizedX * sensitivity;
    // We add Math.PI / 2 to center the camera vertically
    camera.beta = Math.PI / 2 - normalizedY * sensitivity;

    scene.render();
  });
});
