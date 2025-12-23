import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4, AbstractMesh } from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { HtmlMeshRenderer, HtmlMesh, FitStrategy } from "@babylonjs/addons";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";

export class BabylonWrapper {
    private static instance: BabylonWrapper;
    private engine: Engine;
    private scene: Scene;
    private htmlMesh: HtmlMesh | null = null;

    private constructor() {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0.1, 0.1, 0.1, 0);

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
        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 3, Vector3.Zero(), this.scene);
        camera.attachControl(document.getElementById("renderCanvas"), true);
        camera.lowerRadiusLimit = 0.5;
        camera.upperRadiusLimit = 20;
        camera.wheelPrecision = 100;

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
            console.log("Loading model using AppendSceneAsync...");
            await AppendSceneAsync("/assets/models/low_poly_90s_office_cubicle.glb", this.scene);
            console.log("Model loaded. Meshes found:", this.scene.meshes.length);
            this.scene.meshes.forEach(m => console.log("Mesh:", m.name));

            // Find the monitor screen mesh - checking both keys
            const screenKeywords = ["glowing screen", "monitor_screen"];
            let screenMesh = this.scene.meshes.find(m => screenKeywords.some(k => m.name.toLowerCase().includes(k)));

            if (!screenMesh) {
                console.warn("Monitor screen mesh not found, using fallback plane.");
                this.createHtmlMesh(null);
            } else {
                console.log("Found screen mesh:", screenMesh.name);

                // Hide original and make unpickable
                screenMesh.isVisible = false;
                screenMesh.isPickable = false;

                this.createHtmlMesh(screenMesh);

                const camera = this.scene.activeCamera as ArcRotateCamera;
                if (camera) {
                    camera.setTarget(screenMesh.getAbsolutePosition());
                    camera.radius = 2.5;
                }
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
            isCanvasOverlay: true,
            fitStrategy: FitStrategy.STRETCH
        });

        // Set content size (World Units)
        this.htmlMesh.setContent(appElement, 4, 3);

        if (parentMesh) {
            this.htmlMesh.parent = parentMesh;

            // Reset local transforms
            this.htmlMesh.position = Vector3.Zero();
            this.htmlMesh.rotation = Vector3.Zero();

            // Rotate 180 degrees because default plane faces +Z (inside the monitor)
            this.htmlMesh.rotation.y = Math.PI;

            // Pull it slightly forward
            this.htmlMesh.position.z += 0.01;

            // Hide the original mesh to avoid z-fighting
            parentMesh.isVisible = false;
        } else {
            this.htmlMesh.position = new Vector3(0, 1.5, 0);
        }

        // Hide the 3D plane part of the HtmlMesh
        this.htmlMesh.visibility = 0;
    }
}
