import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4, AbstractMesh } from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { HtmlMeshRenderer, HtmlMesh, FitStrategy } from "@babylonjs/addons";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";

export class BabylonWrapper {
    private static instance: BabylonWrapper;
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private htmlMesh: HtmlMesh | null = null;

    private constructor() {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.05, 0.1, 0.15, 0);
        const camera = new ArcRotateCamera("camera", -Math.PI * 1.2, Math.PI / 2.75, 5, Vector3.Zero(), this.scene);
        camera.fov = 0.1;
        camera.attachControl(document.getElementById("renderCanvas"), true);
        camera.lowerRadiusLimit = 0.5;
        camera.upperRadiusLimit = 20;
        camera.wheelPrecision = 100;
        this.camera = camera;
        // Register loaders dynamically (recommended approach)
        registerBuiltInLoaders();

        this.setupScene();
    }

    public static getInstance(): BabylonWrapper {
        if (!BabylonWrapper.instance) {
            BabylonWrapper.instance = new BabylonWrapper();
        }
        return BabylonWrapper.instance;
    }

    private setupScene(): void {
        const light = new HemisphericLight("light1", new Vector3(0, 1, 0.2), this.scene);
        light.intensity = 0.8;

        const light2 = new HemisphericLight("light2", new Vector3(0.5, -1, 0), this.scene);
        light2.intensity = 0.3;

        new HtmlMeshRenderer(this.scene);

        this.loadModel();

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private async loadModel(): Promise<void> {
        try {
            console.log("Loading model low_poly_90s_office_cubicle.glb...");
            await AppendSceneAsync("/assets/models/low_poly_90s_office_cubicle.glb", this.scene);

            // Find the glowing screen mesh
            const screenMesh = this.scene.meshes.find(m => m.name.toLowerCase().includes("glowing screen"));

            if (!screenMesh) {
                console.warn("'glowing screen' mesh not found, trying fallback.");
                this.createHtmlMesh(null);
            } else {
                console.log("Found glowing screen mesh:", screenMesh.name);
                this.createHtmlMesh(screenMesh);
            }
        } catch (error) {
            console.error("Failed to load model:", error);
            this.createHtmlMesh(null);
        }
    }

    private createHtmlMesh(parentMesh: AbstractMesh | null): void {
        const appElement = document.getElementById("app");
        if (!appElement) return;

        this.htmlMesh = new HtmlMesh(this.scene, "appHtmlMesh", {
            isCanvasOverlay: false,
            fitStrategy: FitStrategy.STRETCH
        });

        if (parentMesh) {
            // Units for glowing screen in cubicle model
            this.htmlMesh.setContent(appElement, 3, 2);
            this.htmlMesh.parent = parentMesh;

            // Reset local transforms
            this.htmlMesh.position = Vector3.Zero();
            this.htmlMesh.rotation = Vector3.Zero();

            // Face forward
            // this.htmlMesh.rotation.y = Math.PI;

            // Offset to avoid clipping/z-fighting
            this.htmlMesh.position.z = -0.02;

            // Hide the original glowing part
            parentMesh.isVisible = false;
        } else {
            // Fallback: floating in front of camera
            this.htmlMesh.setContent(appElement, 4, 3);
            this.htmlMesh.position = new Vector3(0, 1.5, 0);
        }

        // this.htmlMesh.visibility = 1;

        if (!parentMesh) {
            this.camera.setTarget(this.htmlMesh.position);
        } else {
            // Target the monitor
            this.camera.setTarget(parentMesh.absolutePosition);
            this.camera.radius = 50.5; // Closer look at the monitor
        }
    }
}
