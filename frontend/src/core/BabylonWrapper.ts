import { Engine, Scene, ArcRotateCamera, Vector3, Color4, Animation, EasingFunction, PowerEase } from "@babylonjs/core";
import { AbstractMesh, AppendSceneAsync } from "@babylonjs/core";
// import { CreateBox } from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { HtmlMeshRenderer, HtmlMesh, FitStrategy } from "@babylonjs/addons";

export class BabylonWrapper {
    private static instance: BabylonWrapper;
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private htmlMesh: HtmlMesh | null = null;

    private constructor() {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        this.engine = new Engine(canvas);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0);
        this.scene.createDefaultLight();
        const camera = new ArcRotateCamera("camera", -Math.PI * 1.5, Math.PI * 0.3, 2, Vector3.Zero(), this.scene);
        camera.attachControl(canvas);
        camera.lowerRadiusLimit = 0.5;
        camera.upperRadiusLimit = 20;
        camera.wheelPrecision = 100;
        this.camera = camera;
        (window as any).scene = this.scene;

        // Register loaders dynamically to support importing mesh later
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
            const screenMesh = this.scene.meshes.find(m => m.name.toLowerCase().includes("monitorscreenmeshapplied"));
            this.scene.meshes.find(m => (m.name == "MonitorScreenMeshNonApplied" || m.name.toLowerCase().includes("glowing screen")))!.isVisible = false;
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
        console.log(appElement);
        if (!appElement) return;

        this.htmlMesh = new HtmlMesh(this.scene, "appHtmlMesh", {
            isCanvasOverlay: false,
            fitStrategy: FitStrategy.CONTAIN,
        });

        if (parentMesh) {
            // this.htmlMesh.setContent(appElement, 2.7, 2.2);
            this.htmlMesh.setContent(appElement, 4, 3.12);
            this.htmlMesh.scalingDeterminant = 1 / 10;
            this.htmlMesh.parent = parentMesh;
            this.htmlMesh.position.x -= 0.015;
            this.htmlMesh.position.y += 0.005;
            // this.htmlMesh.position.z -= 0.1;

            // Hide the original part
            parentMesh.isVisible = false;
        } else {
            // Fallback: floating in front of camera
            this.htmlMesh.setContent(appElement, 1, 1);
            this.camera.setTarget(this.htmlMesh.position);
        }

        if (!parentMesh) {
            this.camera.setTarget(this.htmlMesh.position);
        } else {
            // Target the monitor but start from a distance and animate in
            const finalRadius = 0.5;
            // const targetPos = parentMesh.absolutePosition.clone();
            const targetPos = this.htmlMesh.absolutePosition.clone();

            // Set initial state
            this.camera.setTarget(targetPos);
            this.camera.minZ = 0;

            // Animate zoom
            this.animateCameraTo(finalRadius, targetPos, 0.6, 2500);
        }
    }

    /**
     * Smoothly animates the camera to a new radius and target position.
     * Useful for cinematic transitions and cutscenes.
     */
    public animateCameraTo(targetRadius: number, targetPos: Vector3, targetFov: number, duration: number = 2000) {
        const ease = new PowerEase(15);
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

        const frames = 60;
        const totalFrames = (duration / 1000) * frames;

        // Radius Animation
        const radiusAnim = new Animation("radiusAnim", "radius", frames, Animation.ANIMATIONTYPE_FLOAT);
        radiusAnim.setKeys([
            { frame: 0, value: this.camera.radius },
            { frame: totalFrames, value: targetRadius }
        ]);
        radiusAnim.setEasingFunction(ease);

        // Target (Position) Animation
        const targetAnim = new Animation("targetAnim", "target", frames, Animation.ANIMATIONTYPE_VECTOR3);
        targetAnim.setKeys([
            { frame: 0, value: this.camera.target.clone() },
            { frame: totalFrames, value: targetPos }
        ]);
        targetAnim.setEasingFunction(ease);

        const fovAnim = new Animation("fovAnim", "fov", frames, Animation.ANIMATIONTYPE_FLOAT);
        fovAnim.setKeys([
            { frame: 0, value: this.camera.fov },
            { frame: totalFrames, value: targetFov }
        ]);
        fovAnim.setEasingFunction(ease);

        this.scene.beginDirectAnimation(this.camera, [radiusAnim, targetAnim, fovAnim], 0, totalFrames, false);
    }
}
