
import {
    Scene, Vector3, MeshBuilder, StandardMaterial, Color3,
    GlowLayer, PointLight, TrailMesh, Mesh
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
    private arenaMesh!: Mesh;
    private glowLayer: GlowLayer;

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
        const existingGlow = this.scene.effectLayers.find(e => e instanceof GlowLayer);
        if (existingGlow) {
            this.glowLayer = existingGlow as GlowLayer;
            this.glowLayer.intensity = 0.6;
        } else {
            this.glowLayer = new GlowLayer("gameGlow", this.scene);
            this.glowLayer.intensity = 0.6;
        }
    }

    private createArena(): void {
        // Floor
        const ground = MeshBuilder.CreateGround("game_ground", { width: ARENA_WIDTH, height: ARENA_HEIGHT }, this.scene);
        const groundMat = new StandardMaterial("game_groundMat", this.scene);
        groundMat.diffuseColor = Color3.Black();
        groundMat.emissiveColor = new Color3(0.05, 0.05, 0.1);
        ground.material = groundMat;
        this.arenaMesh = ground;

        // Boundaries (Top/Bottom)
        const borderMat = new StandardMaterial("game_borderMat", this.scene);
        borderMat.emissiveColor = Color3.FromHexString("#77e6ff");

        const topBorder = MeshBuilder.CreateBox("game_borderTop", { width: ARENA_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
        topBorder.position.z = ARENA_HEIGHT / 2;
        topBorder.material = borderMat;

        const bottomBorder = MeshBuilder.CreateBox("game_borderBot", { width: ARENA_WIDTH, height: 0.1, depth: 0.1 }, this.scene);
        bottomBorder.position.z = -ARENA_HEIGHT / 2;
        bottomBorder.material = borderMat;

        // Center Line
        const centerLine = MeshBuilder.CreateGround("game_centerLine", { width: 0.05, height: ARENA_HEIGHT }, this.scene);
        centerLine.position.y = 0.01; // Slightly above ground
        const centerMat = new StandardMaterial("game_centerMat", this.scene);
        centerMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
        centerLine.material = centerMat;
    }

    private createBall(): void {
        this.ballMesh = MeshBuilder.CreateSphere("game_ball", { diameter: BALL_SIZE_3D }, this.scene);
        const mat = new StandardMaterial("game_ballMat", this.scene);
        mat.emissiveColor = Color3.White();
        this.ballMesh.material = mat;

        // Light attached to ball
        const light = new PointLight("game_ballLight", new Vector3(0, 0.5, 0), this.scene);
        light.parent = this.ballMesh;
        light.intensity = 0.5;
        light.diffuse = Color3.White();
        light.range = 3;

        // Trail
        this.ballTrail = new TrailMesh("game_ballTrail", this.ballMesh, this.scene, 0.1, 20, true);
        const trailMat = new StandardMaterial("game_trailMat", this.scene);
        trailMat.emissiveColor = Color3.FromHexString("#77e6ff");
        trailMat.alpha = 0.5;
        this.ballTrail.material = trailMat;
    }

    private createPowerup(): void {
        this.powerupMesh = MeshBuilder.CreateTorus("game_powerup", { diameter: 0.8, thickness: 0.2 }, this.scene);
        const mat = new StandardMaterial("game_powerupMat", this.scene);
        mat.emissiveColor = Color3.Yellow();
        this.powerupMesh.material = mat;
        this.powerupMesh.isVisible = false;

        // Pulse animation handled in update
    }



    public render(gameState: any, _gameMode: string = 'campaign'): void {
        if (!this.ballMesh) return;

        // Update Ball
        // Map 2D (0,0 top-left) to 3D (0,0 center)
        // X: 0..800 -> -5..5
        // Y: 0..600 -> 3.75..-3.75
        const params = gameState.ball || { x: 400, y: 300 };
        const bx = (params.x / GAME_WIDTH) * ARENA_WIDTH - ARENA_WIDTH / 2;
        const bz = -((params.y / GAME_HEIGHT) * ARENA_HEIGHT - ARENA_HEIGHT / 2);

        this.ballMesh.position.x = bx;
        this.ballMesh.position.z = bz;

        // Update Paddles
        // Logic copied from GameRenderer 2D loops
        const paddles = gameState.paddles || {};
        const activeIds = new Set<string>();

        const processPaddle = (p: any, key: string, color: string) => {
            // We need to recreate logic for height scaling
            // We'll CreateBox with depth: 1, then scale Z to matches expected worldHeight

            let mesh = this.paddleMeshes.get(key);
            const worldH = (p.height || 100) / GAME_HEIGHT * ARENA_HEIGHT;
            const worldX = (p.x / GAME_WIDTH) * ARENA_WIDTH - ARENA_WIDTH / 2 + (PADDLE_WIDTH_3D * 1.5); // Offset slightly
            // Y (2D) is Top-Left corner of paddle. 
            // Z (3D) Center = (Y + H/2) mapped
            const centerY2D = p.y + (p.height || 100) / 2;
            const worldZ = -((centerY2D / GAME_HEIGHT) * ARENA_HEIGHT - ARENA_HEIGHT / 2);

            if (!mesh) {
                mesh = MeshBuilder.CreateBox("game_paddle_" + key, { width: PADDLE_WIDTH_3D, height: 0.2, depth: 1 }, this.scene);
                const mat = new StandardMaterial("game_paddleMat_" + key, this.scene);
                mat.emissiveColor = Color3.FromHexString(color);
                mesh.material = mat;
                this.paddleMeshes.set(key, mesh);
            }

            mesh.position.x = worldX;
            mesh.position.z = worldZ;
            mesh.scaling.z = worldH; // Since initial depth is 1

            activeIds.add(key);
        };

        if (paddles.team1 && paddles.team1.length > 0) {
            paddles.team1.forEach((p: any, i: number) => {
                const colors = ['#77e6ff', '#77ff77', '#ffff77'];
                processPaddle(p, `t1-${i}`, colors[i % 3]);
            });
        } else if (paddles.player1) {
            processPaddle(paddles.player1, 'p1', '#77e6ff');
        }

        if (paddles.team2 && paddles.team2.length > 0) {
            paddles.team2.forEach((p: any, i: number) => {
                const colors = ['#ff7777', '#ff77e6', '#aa77ff'];
                processPaddle(p, `t2-${i}`, colors[i % 3]);
            });
        } else if (paddles.player2) {
            processPaddle(paddles.player2, 'p2', '#ff77e6');
        }

        // Cleanup inactive paddles (e.g. if player leaves?) - mostly for safety
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
        } else {
            this.powerupMesh.isVisible = false;
        }
    }

    public resize(): void {
        // Handled by engine
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

        // Clean up internal materials if needed, but they get GC'd usually 
    }
}
