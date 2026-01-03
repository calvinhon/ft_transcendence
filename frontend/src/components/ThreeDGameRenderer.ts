import {
    Scene, Vector3, MeshBuilder, StandardMaterial, Color3,
    GlowLayer, PointLight, TrailMesh, Mesh, DynamicTexture
} from "@babylonjs/core";
import { BabylonWrapper } from "../core/BabylonWrapper";

// Coordinate Mapping Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const ARENA_WIDTH = 10;
const ARENA_HEIGHT = (GAME_HEIGHT / GAME_WIDTH) * ARENA_WIDTH; // Maintain aspect ratio
const PADDLE_WIDTH_3D = 0.2; // Visual width in 3D
const BALL_SIZE_3D = 0.2;

export class ThreeDGameRenderer {
    private scene: Scene;
    private ballMesh!: Mesh;
    private paddleMeshes: Map<string, Mesh> = new Map();
    private powerupMesh!: Mesh;
    private powerupLight!: PointLight;
    private arenaMesh!: Mesh;
    private glowLayer: GlowLayer;
    private countdownEl: HTMLElement | null = null;

    // Trail cache
    private ballTrail: TrailMesh | null = null;

    constructor() {
        const wrapper = BabylonWrapper.getInstance();
        wrapper.enterGameMode();
        this.scene = wrapper.getScene();

        this.createArena();
        this.createBall();
        this.createPowerup();

        // Add global glow
        // Check if one already exists to avoid duplication errors
        this.glowLayer = this.scene.effectLayers.find(e => e instanceof GlowLayer) || new GlowLayer("gameGlow", this.scene);
        this.glowLayer.intensity = 0.4;
        this.resize();
    }

    private createArena(): void {
        // Floor with Dynamic Grid Texture
        const ground = MeshBuilder.CreateGround("game_ground", { width: ARENA_WIDTH, height: ARENA_HEIGHT }, this.scene);
        const groundMat = new StandardMaterial("game_groundMat", this.scene);

        // Create Grid Texture
        const resolution = 1024;
        const gridTexture = new DynamicTexture("gridTexture", resolution, this.scene, false);
        const ctx = gridTexture.getContext();

        // Background Black
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, resolution, resolution);

        // Draw Grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"; // Very faint white lines
        ctx.lineWidth = 2;
        const gridCount = 20;
        const step = resolution / gridCount;

        ctx.beginPath();
        for (let i = 0; i <= gridCount; i++) {
            const p = i * step;
            ctx.moveTo(p, 0); ctx.lineTo(p, resolution);
            ctx.moveTo(0, p); ctx.lineTo(resolution, p);
        }
        ctx.stroke();
        gridTexture.update();

        // Material Config: Only show texture where lit
        groundMat.diffuseTexture = gridTexture;
        groundMat.diffuseColor = Color3.White(); // Base color white effectively multiplies texture color
        groundMat.emissiveColor = Color3.Black(); // No self-emission, needs light
        groundMat.specularColor = new Color3(0.5, 0.5, 0.5); // Reflective

        ground.material = groundMat;
        this.arenaMesh = ground;

        // Boundaries (Top/Bottom)
        const borderMat = new StandardMaterial("game_borderMat", this.scene);
        borderMat.emissiveColor = Color3.FromHexString("#111111");

        const topBorder = MeshBuilder.CreateBox("game_borderTop", { width: ARENA_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
        topBorder.position.z = ARENA_HEIGHT / 2 + 0.05; // Offset by half depth to align inner face
        topBorder.material = borderMat;

        const bottomBorder = MeshBuilder.CreateBox("game_borderBot", { width: ARENA_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
        bottomBorder.position.z = -ARENA_HEIGHT / 2 - 0.05; // Offset by half depth to align inner face
        bottomBorder.material = borderMat;

        // Center Line
        const centerLine = MeshBuilder.CreateGround("game_centerLine", { width: 0.05, height: ARENA_HEIGHT }, this.scene);
        centerLine.position.y = 0.01; // Slightly above ground
        const centerMat = new StandardMaterial("game_centerMat", this.scene);
        centerMat.emissiveColor = new Color3(0.1, 0.1, 0.1);
        centerLine.material = centerMat;

        // Lighting Exclusions:
        // Ensure ground ONLY receives light from the ball (PointLights) and NOT the global env light
        const globalLight = this.scene.getLightByName("gameLight");
        if (globalLight) {
            globalLight.excludedMeshes.push(ground);
        }
    }

    private createBall(): void {
        this.ballMesh = MeshBuilder.CreateSphere("game_ball", { diameter: BALL_SIZE_3D }, this.scene);
        const mat = new StandardMaterial("game_ballMat", this.scene);
        mat.emissiveColor = Color3.White();
        this.ballMesh.material = mat;

        // Light attached to ball
        const light = new PointLight("game_ballLight", new Vector3(0, 0.5, 0), this.scene);
        light.parent = this.ballMesh;
        light.intensity = 2; // Brighter
        light.diffuse = Color3.White();
        light.range = 4; // Wider range to light up grid

        // Trail
        this.ballTrail = new TrailMesh("game_ballTrail", this.ballMesh, this.scene, 0.1, 20, true);
        const trailMat = new StandardMaterial("game_trailMat", this.scene);
        trailMat.emissiveColor = Color3.FromHexString("#77e6ff");
        trailMat.alpha = 0.5;
        this.ballTrail.material = trailMat;
    }

    private createPowerup(): void {
        this.powerupMesh = MeshBuilder.CreateSphere("game_powerup", { diameter: 0.5 }, this.scene);
        const mat = new StandardMaterial("game_powerupMat", this.scene);
        mat.emissiveColor = Color3.Yellow();
        this.powerupMesh.material = mat;
        this.powerupMesh.isVisible = false;

        // Add Light
        this.powerupLight = new PointLight("game_powerupLight", new Vector3(0, 0.5, 0), this.scene);
        this.powerupLight.parent = this.powerupMesh;
        this.powerupLight.intensity = 1.0;
        this.powerupLight.diffuse = Color3.Yellow();
        this.powerupLight.range = 8; // Wider range

        // Pulse animation handled in update
    }

    public render(gameState: any, _gameMode: string = 'campaign'): void {
        if (!this.ballMesh) return;

        // Update Ball
        // Map 2D (0,0 top-left) to 3D (0,0 center)
        const params = gameState.ball || { x: 400, y: 300 };
        const bx = (params.x / GAME_WIDTH) * ARENA_WIDTH - ARENA_WIDTH / 2;
        const bz = -((params.y / GAME_HEIGHT) * ARENA_HEIGHT - ARENA_HEIGHT / 2);

        this.ballMesh.position.x = bx;
        this.ballMesh.position.z = bz;

        // Update Paddles
        const paddles = gameState.paddles || {};
        const activeIds = new Set<string>();

        const processPaddle = (p: any, key: string, color: string) => {
            let mesh = this.paddleMeshes.get(key);
            const worldH = (p.height || 100) / GAME_HEIGHT * ARENA_HEIGHT;

            // Calculate Center X of the backend paddle (Backend sends Top-Left X)
            const paddleW = p.width || 10;
            const centerX = p.x + paddleW / 2;

            // Map 2D Center X to 3D World X
            const worldX = (centerX / GAME_WIDTH) * ARENA_WIDTH - ARENA_WIDTH / 2;

            // Y (2D) is Top-Left corner of paddle. 
            // Z (3D) Center = (Y + H/2) mapped
            const centerY2D = p.y + (p.height || 100) / 2;
            let worldZ = -((centerY2D / GAME_HEIGHT) * ARENA_HEIGHT - ARENA_HEIGHT / 2);

            if (!mesh) {
                mesh = MeshBuilder.CreateBox("game_paddle_" + key, { width: PADDLE_WIDTH_3D, height: 0.2, depth: 1 }, this.scene);
                const mat = new StandardMaterial("game_paddleMat_" + key, this.scene);

                const pColor = Color3.FromHexString(color);
                mat.emissiveColor = pColor;
                mat.diffuseColor = pColor;
                mesh.material = mat;

                this.paddleMeshes.set(key, mesh);
            }

            mesh.position.x = worldX;
            mesh.position.x = worldX;
            // mesh.position.z = worldZ; // Moved after clamping

            // Dynamic Scaling for Powerups:
            // Backend width/height (2D) -> 3D Scaling
            // Initial depth was 1. So worldH gives exactly the scale factor needed.
            // Dynamic Scaling
            if (mesh.scaling.z !== worldH) {
                mesh.scaling.z = worldH;
            }

            // Clamp Position to avoid clipping details
            const halfH = worldH / 2;
            const limit = ARENA_HEIGHT / 2;

            if (worldZ + halfH > limit) {
                worldZ = limit - halfH;
            } else if (worldZ - halfH < -limit) {
                worldZ = -limit + halfH;
            }
            mesh.position.z = worldZ;
            activeIds.add(key);
        };

        if (paddles.team1 && paddles.team1.length > 0) {
            paddles.team1.forEach((p: any, i: number) => {
                const colors = ['#77e6ff', '#77ff77', '#ffff77'];
                processPaddle(p, `t1 - ${i} `, colors[i % 3]);
            });
        } else if (paddles.player1) {
            processPaddle(paddles.player1, 'p1', '#77e6ff');
        }

        if (paddles.team2 && paddles.team2.length > 0) {
            paddles.team2.forEach((p: any, i: number) => {
                const colors = ['#ff7777', '#ff77e6', '#aa77ff'];
                processPaddle(p, `t2 - ${i} `, colors[i % 3]);
            });
        } else if (paddles.player2) {
            processPaddle(paddles.player2, 'p2', '#ff77e6');
        }

        // Cleanup inactive paddles
        for (const [key, mesh] of this.paddleMeshes) {
            if (!activeIds.has(key)) {
                mesh.dispose();
                this.paddleMeshes.delete(key);
            }
        }

        // Powerup
        const powerup = gameState.powerup;
        if (powerup && powerup.active) {
            this.powerupMesh.isVisible = true;
            const px = (powerup.x / GAME_WIDTH) * ARENA_WIDTH - ARENA_WIDTH / 2;
            const pz = -((powerup.y / GAME_HEIGHT) * ARENA_HEIGHT - ARENA_HEIGHT / 2);
            this.powerupMesh.position.x = px;
            this.powerupMesh.position.z = pz;

            // Pulse
            const scale = 1 + Math.sin(Date.now() / 200) * 0.2;
            this.powerupMesh.scaling.setAll(scale);
            this.powerupLight.setEnabled(true);
        } else {
            this.powerupMesh.isVisible = false;
            if (this.powerupLight) this.powerupLight.setEnabled(false);
        }

        // Countdown Overlay
        if (gameState.gameState === 'countdown' && gameState.countdownValue !== undefined) {
            if (!this.countdownEl) {
                this.countdownEl = document.createElement('div');
                this.countdownEl.style.cssText = `
                     position: fixed;
                     top: 50%;
                     left: 50%;
                     transform: translate(-50%, -50%);
                     font-family: 'VCR OSD Mono', monospace;
                     font-size: 120px;
                     color: white;
                     text-shadow: 0 0 20px white;
                     color: white;
                     text-shadow: 0 0 20px white;
                     z-index: 2000;
                     pointer-events: none;
                 `;
                document.body.appendChild(this.countdownEl);
            }
            const text = gameState.countdownValue > 0 ? gameState.countdownValue.toString() : 'GO!';
            this.countdownEl.innerText = text;
        } else {
            if (this.countdownEl) {
                this.countdownEl.remove();
                this.countdownEl = null;
            }
        }
    }

    public resize(): void {
        // Calculate camera radius to make ARENA_WIDTH fill the screen width
        // tan(FOV/2) = (VisibleHeight / 2) / Distance
        // VisibleHeight = Distance * 2 * tan(FOV/2)
        // AspectRatio = VisibleWidth / VisibleHeight
        // VisibleWidth = AspectRatio * VisibleHeight
        // We want VisibleWidth >= ARENA_WIDTH + padding

        if (!this.scene.activeCamera) return;

        const engine = this.scene.getEngine();
        const aspectRatio = engine.getAspectRatio(this.scene.activeCamera);
        const fov = 0.6; // We use fixed FOV
        const padding = 1.5; // Increased padding for visibility

        // Required Visible Height if limited by Width
        // VisibleWidth = ARENA_WIDTH * padding
        // VisibleHeight = VisibleWidth / aspectRatio
        // Distance = VisibleHeight / (2 * tan(fov/2))

        // However, we also need to check if height is the limiting factor (ARENA_HEIGHT)
        // We want the whole arena visible.

        const requiredWidth = ARENA_WIDTH * padding;
        const requiredHeight = ARENA_HEIGHT * padding;

        const distForWidth = (requiredWidth / aspectRatio) / (2 * Math.tan(fov / 2));
        const distForHeight = requiredHeight / (2 * Math.tan(fov / 2));

        const distance = Math.max(distForWidth, distForHeight);

        // Update Camera Radius
        // We need to access the camera. In standalone, we might need a reference or find it.
        const camera = this.scene.activeCamera as any;
        if (camera && camera.radius) {
            camera.radius = distance;
            // Ensure strict top-down
            camera.beta = 0.01;
            camera.alpha = -Math.PI / 2;
        }
    }


    public dispose(): void {
        const wrapper = BabylonWrapper.getInstance();
        wrapper.exitGameMode();

        // Remove meshes
        this.ballMesh.dispose();
        this.arenaMesh.dispose();
        this.paddleMeshes.forEach(m => m.dispose());
        this.powerupMesh.dispose();
        if (this.ballTrail) this.ballTrail.dispose();
        if (this.glowLayer) this.glowLayer.dispose();
        if (this.countdownEl) {
            this.countdownEl.remove();
            this.countdownEl = null;
        }
    }
}