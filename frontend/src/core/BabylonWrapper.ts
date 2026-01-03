import { Engine, Scene, ArcRotateCamera, Vector3, Color4, Animation, EasingFunction, GlowLayer, PointLight, Color3, PointerEventTypes, CreateBox, HemisphericLight, CubicEase, SSAO2RenderingPipeline, LensRenderingPipeline, QuarticEase } from "@babylonjs/core";
import { AbstractMesh, AppendSceneAsync } from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import { HtmlMeshRenderer, HtmlMesh, FitStrategy } from "@babylonjs/addons";
import { WebGLService } from "../services/WebGLService";

export class BabylonWrapper {
    private static instance: BabylonWrapper;
    private engine: Engine;
    private scene: Scene;
    private camera: ArcRotateCamera;
    private htmlMesh: HtmlMesh | null = null;
    private glowLayer: GlowLayer | null = null;
    private screenLight: PointLight | null = null;
    private isLoreView: boolean = false;
    private active2DGame: boolean = false;
    private defaultCameraState: { radius: number, alpha: number, beta: number, target: Vector3 } | null = null;
    private loreCameraState: { radius: number, alpha: number, beta: number, target: Vector3 } | null = null;
    private isAnimating: boolean = false;
    private isGameMode: boolean = false;

    // Camera Zoom Limits
    private readonly ZOOM_MIN = 0.4;
    private readonly ZOOM_MAX = 1.25;

    private constructor() {
        const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        this.engine = new Engine(canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0);
        this.camera = new ArcRotateCamera("camera", -Math.PI * 1.5, Math.PI * 0.2, 2, Vector3.Zero(), this.scene);

        // Ambient Occlusion (contact shadows)
        new SSAO2RenderingPipeline("ssaoPipeline", this.scene, {
            ssaoRatio: 0.8,
            blurRatio: 1,
            combineRatio: 1.0
        });
        this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssaoPipeline", this.camera);

        // Depth of field
        var parameters = {
            edge_blur: 1.0,
            chromatic_aberration: 1.0,
            distortion: 1.0,
            grain_amount: 1.0,
            dof_focus_distance: 0.5,
            dof_aperture: 1.0,
            dof_pentagon: true,
            dof_gain: 1.0,
            dof_threshold: 1.0,
            dof_darken: 0.01
        };
        new LensRenderingPipeline("lensEffect", parameters, this.scene, 1.0);
        this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("lensEffect", this.camera);

        // Fog
        this.scene.fogMode = Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.1;
        this.scene.fogColor = new Color3(0, 0, 0);

        this.camera.lowerRadiusLimit = this.ZOOM_MIN;
        this.camera.upperRadiusLimit = this.ZOOM_MAX;
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

    /**
     * Returns the instance only if 3D mode is enabled.
     * Creates the instance if it doesn't exist and 3D mode is enabled.
     * Returns null if 3D mode is disabled.
     */
    public static getInstanceIfEnabled(): BabylonWrapper | null {
        if (!WebGLService.getInstance().is3DModeEnabled()) {
            return null;
        }
        return BabylonWrapper.getInstance();
    }

    /**
     * Destroys the BabylonJS instance and cleans up resources
     */
    public destroy(): void {
        // Stop render loop
        this.engine.stopRenderLoop();

        // Dispose of HtmlMesh
        if (this.htmlMesh) {
            this.htmlMesh.dispose();
            this.htmlMesh = null;
        }

        // Dispose of glow layer
        if (this.glowLayer) {
            this.glowLayer.dispose();
            this.glowLayer = null;
        }

        // Dispose of screen light
        if (this.screenLight) {
            this.screenLight.dispose();
            this.screenLight = null;
        }

        // Dispose scene and engine
        this.scene.dispose();
        this.engine.dispose();

        // Remove canvas
        const canvas = document.getElementById("renderCanvas");
        if (canvas) {
            canvas.remove();
        }

        // Clear singleton
        BabylonWrapper.instance = null as any;
    }

    private setupScene(): void {
        new HtmlMeshRenderer(this.scene);

        // Create Camera hotspots (hotspots for left/right navigation)
        const leftTrigger = CreateBox("leftInteractionTrigger", { width: 0.4, height: 0.6, depth: 0.05 }, this.scene);
        leftTrigger.parent = this.camera;
        leftTrigger.position = new Vector3(-0.4, 0, 0.5);
        leftTrigger.visibility = 0;
        leftTrigger.isPickable = true;

        // Right Trigger
        const rightTrigger = CreateBox("rightInteractionTrigger", { width: 0.4, height: 0.6, depth: 0.05 }, this.scene);
        rightTrigger.parent = this.camera;
        rightTrigger.position = new Vector3(0.4, 0, 0.5);
        rightTrigger.visibility = 0;
        rightTrigger.isPickable = true;

        this.loadModel();

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // Dynamic Lighting Animation (Breathing Glow + CRT Flicker)
        let time = 0;
        this.scene.onBeforeRenderObservable.add(() => {
            time += this.engine.getDeltaTime() * 0.001;

            if (this.screenLight) {
                const flicker = (Math.random() - 0.5) * 0.1;
                this.screenLight.intensity = 0.8 + Math.sin(time * 8) * 0.05 + flicker;
            }
        });

        this.setupInteractions();
    }

    private setupInteractions(): void {
        const canvas = this.engine.getRenderingCanvas();
        if (!canvas) return;

        // Global wheel listener for zoom (works over HtmlMesh too)
        window.addEventListener("wheel", (e) => {
            if (this.isGameMode || this.isAnimating) return; // Disable zoom in game mode

            const sensitivity = 0.001;
            const delta = e.deltaY;

            const targetRadius = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, this.camera.radius + delta * sensitivity));
            const quarticEase = new QuarticEase();
            quarticEase.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
            Animation.CreateAndStartAnimation(
                "cameraZoom",
                this.camera,
                "radius",
                60,
                20,
                this.camera.radius,
                targetRadius,
                Animation.ANIMATIONLOOPMODE_CONSTANT,
                quarticEase,
            );

            // Manual Clamp
            if (this.camera.radius < this.camera.lowerRadiusLimit!) {
                this.camera.radius = this.camera.lowerRadiusLimit!;
            }
            if (this.camera.radius > this.camera.upperRadiusLimit!) {
                this.camera.radius = this.camera.upperRadiusLimit!;
            }
            const currentState = this.isLoreView ? this.loreCameraState : this.defaultCameraState;
            if (currentState) {
                currentState.radius = this.camera.radius;
            }


        });

        let targetAlpha = this.camera.alpha;
        let targetBeta = this.camera.beta;

        window.addEventListener("mousemove", (e) => {
            if (this.isGameMode || this.active2DGame || this.isAnimating) return;
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            const minRadius = 0.1;
            const maxRadius = 1.5;
            const minTilt = 0.01;
            const maxTilt = 0.5;

            const currentRadius = Math.max(minRadius, Math.min(maxRadius, this.camera.radius));
            const t = (currentRadius - minRadius) / (maxRadius - minRadius);
            const tiltIntensity = maxTilt * (1 - t) + minTilt * t;

            const currentState = this.isLoreView ? this.loreCameraState : this.defaultCameraState;
            if (currentState) {
                targetAlpha = currentState.alpha + x * -tiltIntensity;
                targetBeta = currentState.beta + y * -tiltIntensity;
            }
            this.camera.alpha += (targetAlpha - this.camera.alpha) * 0.5;
            this.camera.beta += (targetBeta - this.camera.beta) * 0.5;
        });

        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const pickInfo = pointerInfo.pickInfo;
                if (pickInfo?.hit && pickInfo.pickedMesh) {
                    const meshName = pickInfo.pickedMesh.name;

                    if (meshName === "leftInteractionTrigger" && !this.isLoreView) {
                        this.panToLore();
                    } else if (meshName === "rightInteractionTrigger" && this.isLoreView) {
                        this.panToMonitor();
                    }
                }
            }
        });
    }

    public async panToLore(): Promise<void> {
        const newspaper = this.scene.getMeshByName("NEWS_NEWS_0");
        if (!newspaper) {
            console.warn("NEWS_NEWS_0 mesh not found");
            return;
        }

        this.isLoreView = true;

        const targetPos = newspaper.getAbsolutePosition();
        const targetRadius = 0.6;
        const targetFov = 0.6;
        this.loreCameraState = {
            radius: targetRadius,
            alpha: -Math.PI * 1.25,
            beta: Math.PI * 0.5,
            target: targetPos
        };

        this.animateCameraTo(targetRadius, targetPos, targetFov, this.loreCameraState.alpha, this.loreCameraState.beta, 1500);
    }

    public async panToMonitor(): Promise<void> {
        if (!this.defaultCameraState) return;

        this.isLoreView = false;
        this.animateCameraTo(
            this.defaultCameraState.radius,
            this.defaultCameraState.target,
            this.camera.fov,
            this.defaultCameraState.alpha,
            this.defaultCameraState.beta,
            1500
        );
    }

    public set2DGameActive(active: boolean): void {
        this.active2DGame = active;
    }

    public enterGameMode(): void {
        this.isGameMode = true;

        // Hide Office Environment
        this.scene.meshes.forEach(m => {
            if (!m.name.startsWith("game_")) {
                m.isVisible = false;
            }
        });

        // Top Down Camera Position for Game
        const targetPos = Vector3.Zero();

        // Save current state to restore later
        if (!this.defaultCameraState) {
            this.defaultCameraState = {
                radius: this.camera.radius,
                alpha: this.camera.alpha,
                beta: this.camera.beta,
                target: this.camera.target.clone()
            };
        }

        // Stop existing animations
        this.scene.stopAnimation(this.camera);
        this.camera.detachControl();
        this.camera.lowerRadiusLimit = null;
        this.camera.upperRadiusLimit = null;
        this.camera.lowerBetaLimit = null;
        this.camera.upperBetaLimit = null;

        // Ensure Up vector is correct
        this.camera.upVector = new Vector3(0, 1, 0);

        // Animate to Game View
        this.animateCameraTo(
            14,
            targetPos,
            0.6,
            -Math.PI / 2,
            0.01,
            1500,
            () => {
                this.camera.radius = 14;
                this.camera.alpha = -Math.PI / 2;
                this.camera.beta = 0.01;
                this.camera.target = Vector3.Zero();
            }
        );

        // Adjust Lighting
        if (this.screenLight) this.screenLight.setEnabled(false);

        // Add Game Light if needed
        let gameLight = this.scene.getLightByName("gameLight");
        if (!gameLight) {
            gameLight = new HemisphericLight("gameLight", new Vector3(0, 1, 0), this.scene);
            gameLight.intensity = 0.4;
        }
        gameLight.setEnabled(true);
    }

    public exitGameMode(): void {
        this.isGameMode = false;
        // Restore Office Environment
        this.scene.meshes.forEach(m => {
            // Don't show game meshes
            if (!m.name.startsWith("game_")) {
                m.isVisible = true;
            }
            // Specific hides from loadModel
            if (m.name.toLowerCase().includes("glowing screen")) m.isVisible = false;
            // Triggers are invisible by default
            if (m.name.includes("Trigger")) m.visibility = 0;
        });

        // Show HTML Mesh
        if (this.htmlMesh) {
            this.htmlMesh.setEnabled(true);
        }

        // Restore Lighting
        if (this.screenLight) this.screenLight.setEnabled(true);
        const gameLight = this.scene.getLightByName("gameLight");
        if (gameLight) gameLight.setEnabled(false);

        // Turn off Game Meshes (cleanup should handle this, but safety net)
        this.scene.meshes.forEach(m => {
            if (m.name.startsWith("game_")) {
                m.dispose();
            }
        });

        // Animate back to Monitor
        if (this.defaultCameraState) {
            this.animateCameraTo(
                this.defaultCameraState.radius,
                this.defaultCameraState.target,
                0.6,
                this.defaultCameraState.alpha,
                this.defaultCameraState.beta,
                1500
            );
        }
    }

    public getScene(): Scene {
        return this.scene;
    }

    public getCamera(): ArcRotateCamera {
        return this.camera;
    }

    private async loadModel(): Promise<void> {
        try {
            await AppendSceneAsync("/assets/models/low_poly_90s_office_cubicle.glb", this.scene);

            // Find the glowing screen mesh
            const screenMesh = this.scene.meshes.find(m => m.name.toLowerCase().includes("monitor_mesh"));
            this.scene.meshes.find(m => (m.name.toLowerCase().includes("glowing screen")))!.isVisible = false;
            if (!screenMesh) {
                console.warn("'glowing screen' mesh not found, trying fallback.");
                this.createHtmlMesh(null);
            } else {
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
            fitStrategy: FitStrategy.CONTAIN,
        });

        if (parentMesh) {
            // Firefox fix: Apply CSS backface-visibility and vertical flip
            appElement.style.backfaceVisibility = 'visible';
            appElement.style.transform = 'scaleY(-1)';

            this.htmlMesh.setContent(appElement, 4.38, 3.395);
            // Firefox fix: Use +Math.PI/2 instead of -Math.PI/2 to show front face
            this.htmlMesh.rotate(new Vector3(1, 0, 0), +Math.PI / 2);
            this.htmlMesh.scalingDeterminant = 1 / 11;
            this.htmlMesh.parent = parentMesh;
            this.htmlMesh.position.x -= 0.01;
            this.htmlMesh.position.z -= 0.005;
            this.htmlMesh.position.y += 0.0001;

            // Hide the original part
            parentMesh.isVisible = false;

            // Add screen glow spill light
            this.screenLight = new PointLight("screenLight", new Vector3(0, 0, -4), this.scene);
            this.screenLight.parent = this.htmlMesh;
            this.screenLight.diffuse = Color3.FromHexString("#29b6f6");
            this.screenLight.intensity = 0.8;
            this.screenLight.range = 0.6;
        } else {
            // Fallback: floating in front of camera
            this.htmlMesh.setContent(appElement, 1, 1);
            this.camera.setTarget(this.htmlMesh.position);
        }

        if (!parentMesh) {
            this.camera.setTarget(this.htmlMesh.position);
        } else {
            // Target the monitor but start from a distance and animate in
            const finalRadius = 0.7;
            const targetPos = this.htmlMesh.absolutePosition.clone();

            // Set initial state
            this.camera.setTarget(targetPos);
            this.camera.minZ = 0;

            // Store default state for returning
            this.defaultCameraState = {
                radius: finalRadius,
                alpha: this.camera.alpha,
                beta: this.camera.beta,
                target: targetPos.clone()
            };

            // Animate zoom
            this.animateCameraTo(finalRadius, targetPos, 0.6, this.defaultCameraState.alpha, this.defaultCameraState.beta, 2500);
        }
    }

    /**
     * Smoothly animates the camera to a new radius, target position, and rotation (alpha/beta).
     * Useful for cinematic transitions and cutscenes.
     */
    public animateCameraTo(targetRadius: number, targetPos: Vector3, targetFov: number, targetAlpha: number, targetBeta: number, duration: number = 2000, onComplete?: () => void) {
        const ease = new CubicEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

        const frames = 60;
        const totalFrames = (duration / 1000) * frames;

        // Radius Animation
        const radiusAnim = new Animation("radiusAnim", "radius", frames, Animation.ANIMATIONTYPE_FLOAT);
        radiusAnim.setKeys([
            { frame: 0, value: this.camera.radius },
            { frame: totalFrames, value: targetRadius }
        ]);
        radiusAnim.setEasingFunction(ease);

        // Alpha (Rotation) Animation
        const alphaAnim = new Animation("alphaAnim", "alpha", frames, Animation.ANIMATIONTYPE_FLOAT);
        alphaAnim.setKeys([
            { frame: 0, value: this.camera.alpha },
            { frame: totalFrames, value: targetAlpha }
        ]);
        alphaAnim.setEasingFunction(ease);

        // Beta (Rotation) Animation
        const betaAnim = new Animation("betaAnim", "beta", frames, Animation.ANIMATIONTYPE_FLOAT);
        betaAnim.setKeys([
            { frame: 0, value: this.camera.beta },
            { frame: totalFrames, value: targetBeta }
        ]);
        betaAnim.setEasingFunction(ease);

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

        this.isAnimating = true;
        this.scene.beginDirectAnimation(this.camera, [radiusAnim, alphaAnim, betaAnim, targetAnim, fovAnim], 0, totalFrames, false, 1, () => {
            this.isAnimating = false;
            onComplete?.();
        });
    }
}
