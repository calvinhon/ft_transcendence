import { HtmlMesh, HtmlMeshRenderer } from "@babylonjs/addons";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
  Color4,
} from "@babylonjs/core";
import gameCanvas from "./game";

let engine: Engine;
let scene: Scene;

const createScene = () => {
  const renderCanvas = document.querySelector(
    "#renderCanvas"
  ) as HTMLCanvasElement;
  engine = new Engine(renderCanvas, true);

  // keep high-DPR rendering to avoid pixelation of the 3D view
  engine.setHardwareScalingLevel(1 / Math.max(1, window.devicePixelRatio || 1));

  scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0); // transparent background

  // create a simple plane that will act as the monitor screen
  // const screen = MeshBuilder.CreatePlane(
  //   "gameScreen",
  //   { width: 1, height: 1 },
  //   scene
  // );

  // compute aspect from the exported 2D canvas and scale plane to match
  const canvasEl = gameCanvas.canvas;
  const cw = canvasEl?.width || window.innerWidth;
  const ch = canvasEl?.height || window.innerHeight;
  const aspect = cw / Math.max(1, ch);
  const baseHeight = 1.0; // visible size in world units; tweak to taste
  // screen.scaling.x = aspect * baseHeight;
  // screen.scaling.y = baseHeight;

  // attach HtmlMesh content (game canvas) to the plane so it displays on it
  const htmlMeshRenderer = new HtmlMeshRenderer(scene);
  const htmlMesh = new HtmlMesh(scene, "html-game");
  if (canvasEl && canvasEl.width && canvasEl.height) {
    htmlMesh.setContent(canvasEl, canvasEl.width, canvasEl.height);
  } else {
    htmlMesh.setContentSizePx(window.innerWidth, window.innerHeight);
  }
  // htmlMesh.parent = screen;
  htmlMesh.position = new Vector3(0, 0, 2000); // tiny forward offset so it's in front of the plane

  // simple camera that points at the plane
  const camera = new ArcRotateCamera(
    "cam",
    -Math.PI / 2,
    Math.PI / 2,
    10,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(renderCanvas, true);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 20;

  // light
  new HemisphericLight("light", new Vector3(0, 1, 0), scene);

  return scene;
};

const startRenderLoop = () => {
  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
};

createScene();
startRenderLoop();
