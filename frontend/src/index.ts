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
import { HtmlMeshRenderer, HtmlMesh } from "@babylonjs/addons";

// Get the canvas element from the DOM.
const app = document.querySelector("#app")!;
app.innerHTML = "";
const canvas = document.createElement("canvas");
// canvas.height = innerHeight;
// canvas.width = innerWidth;
canvas.style.height = `100%`;
canvas.style.width = `100%`;
app.append(canvas);

// Associate a Babylon Engine to it.
const engine = new Engine(canvas);

// Create our first scene.
const scene = new Scene(engine);

// This creates and positions a free camera (non-mesh)
const camera = new ArcRotateCamera(
  "camera",
  0,
  0,
  1,
  new Vector3(-10, 0, 0),
  scene
);

// camera.position = new Vector3(10, 10, 0);

// This targets the camera to scene origin
// camera.setTarget(Vector3.Zero());

// This attaches the camera to the canvas
camera.attachControl(canvas, true);
camera.fov = 0.2;

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
const light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

// Default intensity is 1. Let's dim the light a small amount
light.intensity = 0.7;

scene.clearColor = new Color4(0.05, 0.1, 0.15, 0);

// The SAUCE
const htmlMeshRenderer = new HtmlMeshRenderer(scene);
let htmlMesh = new HtmlMesh(scene, "htmlMesh");

ImportMeshAsync(roomGlb, scene).then((res) => {
  // console.log(res);
  let content = document.createElement("div");
  content.style.height = "100%";
  content.style.width = "100%";
  content.innerHTML = `<h1>Hi</h1> `;
  htmlMesh.setContent(content, 4, 3.8);
  htmlMesh.rotation.y = Math.PI / 2;
  htmlMesh.scalingDeterminant = 0.075;

  res.meshes.forEach((mesh) => {
    if (mesh.name == "Monitor_Screen") {
      htmlMesh.position = mesh.position;
      htmlMesh.position.x -= 0.075;
      htmlMesh.position.y += 0.1;
      mesh.isVisible = false;
    }
  });
  camera.setTarget(htmlMesh.position);
});

// // Render every frame
engine.runRenderLoop(() => {
  scene.render();
});

// console.log('Transcendence Frontend TypeScript initialized');
