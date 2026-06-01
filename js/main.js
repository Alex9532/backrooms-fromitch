import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { GameRenderer } from './engine/renderer.js';
import { InputManager } from './engine/input.js';
import { Player } from './engine/player.js';
import { LevelGenerator } from './engine/levelgen.js';
import { Level2Generator } from './engine/level2gen.js';
import { EntityManager } from './engine/entity.js';
import { UIManager } from './engine/ui.js';
import { AudioManager } from './engine/audio.js';
import { CollisionSystem } from './engine/collision.js';
import { LockerManager } from './engine/locker.js';
import { PuzzleRoomManager } from './engine/puzzlerooms.js';
import { SettingsManager } from './engine/settings.js';
import { ClownEntity } from './engine/clown.js';
import { CarnivalAudio } from './engine/carnival_audio.js';
import { Table } from './engine/table.js';
import { BalloonManager } from './engine/balloon.js';
import { NeedleItem } from './engine/items.js';
import { Level2Logic } from './engine/level2_logic.js';

class Game {
    constructor() {
        this.running = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.currentLevel = 1;

        this.renderer = new GameRenderer();
        this.input = new InputManager();
        this.levelGen = new LevelGenerator();
        this.level2Gen = new Level2Generator();
        this.ui = new UIManager();
        this.audio = new AudioManager();
        this.settings = new SettingsManager();

        this.player = null;
        this.entities = new EntityManager();
        this.lockers = new LockerManager();
        this.puzzleRooms = new PuzzleRoomManager();
        this.collision = null;
        this.levelData = null;
        this.items = [];
        this.exitDoor = null;

        this.eventBus = null;
        this.clownManager = null;
        this.carnivalAudio = null;
        this.tableManager = null;
        this.balloonManager = null;
        this.clownModelData = null;

        this.connectDOM();
    }

    connectDOM() {
        const startBtn = document.getElementById('start-btn');
        const loadingContainer = document.getElementById('loading-container');

        startBtn.addEventListener('click', () => {
            startBtn.style.display = 'none';
            loadingContainer.style.display = 'block';
            this.loadGameStep(0);
        });
    }

    async loadGameStep(step) {
        const loadingText = document.getElementById('loading-text');
        const barFill = document.getElementById('loading-bar-fill');

        const steps = [
            { name: "Initializing Audio Engine..." },
            { name: "Generating Procedural Geometry..." },
            { name: "Building Collision Mesh..." },
            { name: "Preparing Scene & Shaders..." },
            { name: "Loading Boss Asset..." },
            { name: "Spawning Entities..." },
            { name: "Starting Simulation..." }
        ];

        if (step < steps.length) {
            loadingText.innerText = steps[step].name;
            barFill.style.width = `${(step / steps.length) * 100}%`;
            setTimeout(() => this.executeLoadStep(step), 500);
        } else {
            barFill.style.width = "100%";
            setTimeout(() => this.startGameLoop(), 1000);
        }
    }

    async executeLoadStep(step) {
        try {
            switch (step) {
                case 0:
                    await this.audio.init();
                    const s = this.settings.getSettings();
                    this.audio.setMasterVolume(s.masterVolume);
                    this.audio.setMusicVolume(s.musicVolume);
                    this.audio.setSfxVolume(s.sfxVolume);
                    break;
                case 1:
                    const seed = Math.floor(Math.random() * 999999);
                    this.ui.updateSeed(seed);
                    this.levelData = this.levelGen.generate(seed);
                    break;
                case 2:
                    this.collision = new CollisionSystem(this.levelData.grid, this.levelData.cellSize);
                    break;
                case 3:
                    this.renderer.init(this.levelData);
                    this.renderer.applyQualitySettings(this.settings.getSettings());
                    break;
                case 4:
                    const loader = new GLTFLoader();
                    this.bossModelData = await loader.loadAsync('./assets/frenzy_clown_gremlin_rig/Entity1/scene.gltf');
                    break;
                case 5:
                    this.player = new Player(this.renderer.camera, this.input, this.levelData, this.collision);
                    this.player.setPosition(this.levelData.spawnPoint.x, this.levelData.spawnPoint.y, this.levelData.spawnPoint.z);
                    this.renderer.scene.add(this.player.getObject());
                    this.renderer.setPlayer(this.player);

                    this.items = this.levelData.items || [];
                    this.exitDoor = this.levelData.exitDoor;

                    if (this.exitDoor) {
                        const origOpen = this.exitDoor.open;
                        this.exitDoor.open = () => {
                            if (!this.exitDoor.isOpen) {
                                this.exitDoor.isOpen = true;
                                if (this.exitDoor.panel) {
                                    this.exitDoor.panel.rotation.y = -Math.PI / 2;
                                    this.exitDoor.panel.position.x = -0.5;
                                }
                                if (this.audio) this.audio.playDoorOpen();
                                setTimeout(() => this.transitionToLevel2(), 500);
                            }
                        };
                    }

                    this.entities.init(this.renderer.scene, this.levelData, this.player, this.collision, this.audio, this.bossModelData);
                    this.lockers.spawnLockers(this.renderer.scene, this.levelData.grid, this.levelData.cellSize, 8, this.collision, this.levelData.puzzleRooms);
                    this.puzzleRooms.init(this.renderer.scene, this.levelData, this.player);
                    break;
                case 6:
                    this.ui.updateObjective("Find 3 DIGIT puzzles on walls. Collect VHS cassette for DIGIT 3. [Q] to hide.");
                    break;
            }
            this.loadGameStep(step + 1);
        } catch (e) {
            console.error("Loading Error:", e);
            document.getElementById('loading-text').innerText = "Error loading game: " + e.message;
        }
    }


    transitionToLevel2() {
        this.running = false;
        this.currentLevel = 2;

        const overlay = document.getElementById('level2-loading-overlay');
        const loadingText = document.getElementById('level2-loading-text');
        const barFill = document.getElementById('level2-loading-bar-fill');

        if (overlay) overlay.style.display = 'flex';
        if (loadingText) loadingText.innerText = 'Entering Level 2...';
        if (barFill) barFill.style.width = '0%';

        this.cleanupCurrentLevel();
        this.loadLevel2Step(0);
    }

    skipToLevel2() {
        this.currentLevel = 2;
        const startBtn = document.getElementById('start-btn');
        const menuOverlay = document.getElementById('menu-overlay');
        const l2Overlay = document.getElementById('level2-loading-overlay');

        if (startBtn) startBtn.style.display = 'none';
        if (menuOverlay) menuOverlay.style.display = 'none';
        if (l2Overlay) l2Overlay.style.display = 'flex';

        this.loadLevel2Step(0);
    }

    async loadLevel2Step(step) {
        const loadingText = document.getElementById('level2-loading-text');
        const barFill = document.getElementById('level2-loading-bar-fill');

        const steps = [
            { name: "Generating Carnival Room..." },
            { name: "Loading Clown Asset..." },
            { name: "Building Collision Mesh..." },
            { name: "Preparing Carnival Scene..." },
            { name: "Spawning Clowns, Tables & Balloons..." },
            { name: "Starting Carnival Music..." }
        ];

        if (step < steps.length) {
            loadingText.innerText = steps[step].name;
            barFill.style.width = `${(step / steps.length) * 100}%`;
            setTimeout(() => this.executeLevel2Step(step), 500);
        } else {
            barFill.style.width = "100%";
            setTimeout(() => this.startLevel2Loop(), 1000);
        }
    }

    async executeLevel2Step(step) {
        try {
            switch (step) {
                case 0:
                    if (!this.audio.initialized) {
                        await this.audio.init();
                        const s = this.settings.getSettings();
                        this.audio.setMasterVolume(s.masterVolume);
                        this.audio.setMusicVolume(s.musicVolume);
                        this.audio.setSfxVolume(s.sfxVolume);
                    }
                    const seed2 = Math.floor(Math.random() * 999999);
                    this.levelData = this.level2Gen.generate(seed2);
                    break;

                case 1:
                    const loader = new GLTFLoader();
                    this.clownModelData = await loader.loadAsync('./assets/frenzy_clown_gremlin_rig/scene.gltf');
                    break;

                case 2:
                    this.collision = new CollisionSystem(this.levelData.grid, this.levelData.cellSize);
                    break;

                case 3:
                    this.renderer.init(this.levelData);
                    this.renderer.applyQualitySettings(this.settings.getSettings());
                    break;

                case 4:
                    if (!this.player) {
                        this.player = new Player(this.renderer.camera, this.input, this.levelData, this.collision);
                    } else {
                        this.player.collision = this.collision;
                    }

                    this.renderer.scene.add(this.player.getObject());
                    this.player.setPosition(this.levelData.spawnPoint.x, this.levelData.spawnPoint.y, this.levelData.spawnPoint.z);
                    this.renderer.setPlayer(this.player);

                    this.exitDoor = this.levelData.exitDoor;
                    this.items = [];

                    this.balloonManager = new BalloonManager();
                    this.balloonManager.spawnBalloons(this.renderer.scene, this.levelData.balloonPositions || []);

                    if (this.levelData.needlePosition) {
                        const needleItem = new NeedleItem();
                        needleItem.createMesh();
                        needleItem.createHandModel();

                        this.player.equippedItemHolder.add(needleItem.handModel);

                        if (this.clownModelData) {
                            const clonedModel = SkeletonUtils.clone(this.clownModelData.scene);
                            const tempClown = new ClownEntity(new THREE.Vector3(0, 0, 0), 0, this.collision, clonedModel);
                            this.player.equippedItemHolder.add(tempClown.mesh);

                            this.renderer.renderer.compile(this.renderer.scene, this.renderer.camera);
                            this.renderer.renderer.render(this.renderer.scene, this.renderer.camera);

                            this.player.equippedItemHolder.remove(tempClown.mesh);
                        } else {
                            this.renderer.renderer.compile(this.renderer.scene, this.renderer.camera);
                            this.renderer.renderer.render(this.renderer.scene, this.renderer.camera);
                        }

                        this.player.equippedItemHolder.remove(needleItem.handModel);

                        needleItem.mesh.position.copy(this.levelData.needlePosition);
                        this.renderer.scene.add(needleItem.mesh);
                        this.items.push(needleItem);
                    }

                    this.carnivalAudio = new CarnivalAudio(this.audio);

                    this.level2Logic = new Level2Logic(
                        this.renderer.scene,
                        this.player,
                        this.audio,
                        this.carnivalAudio,
                        this.collision,
                        this.renderer
                    );

                    const tables = [];
                    for (const pos of (this.levelData.tablePositions || [])) {
                        const table = new Table(pos);
                        tables.push(table);
                        this.renderer.scene.add(table.mesh);
                        if (this.collision) {
                            this.collision.addObstacle(pos, table.collisionRadius);
                        }
                    }
                    this.level2Logic.setTables(tables);

                    const clowns = [];
                    const spawns = this.levelData.clownSpawns || [];
                    for (let i = 0; i < spawns.length; i++) {
                        const s = spawns[i];
                        const clonedModel = SkeletonUtils.clone(this.clownModelData.scene);
                        clonedModel.animations = this.clownModelData.animations;
                        const clown = new ClownEntity(s.position, s.facing, this.collision, clonedModel);
                        clowns.push(clown);
                        this.renderer.scene.add(clown.mesh);
                    }
                    this.level2Logic.setClowns(clowns);

                    const tableItems = this.level2Logic.getSpawnedItems();
                    for (const item of tableItems) {
                        this.items.push(item);
                    }
                    break;

                case 5:
                    this.ui.updateObjective("Pop all balloons with the needle to unlock the EXIT. Hide under tables when music stops!");
                    break;
            }
            this.loadLevel2Step(step + 1);
        } catch (e) {
            console.error("Level 2 Loading Error:", e);
            document.getElementById('loading-text').innerText = "Error loading Level 2: " + e.message;
        }
    }

    startLevel2Loop() {
        const l2Overlay = document.getElementById('level2-loading-overlay');
        if (l2Overlay) l2Overlay.style.display = 'none';
        document.getElementById('menu-overlay').style.display = 'none';

        if (this.ui) {
            this.ui.showHUD();
            this.ui.updateLevelIndicator(2);
            setTimeout(() => {
                if (this.running) this.ui.showGuideHint();
            }, 1500);
            if (this.balloonManager) {
            }
            this.ui.showCrosshair(false);
        }
        this.input.lockPointer();
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    cleanupCurrentLevel() {
        const toRemove = [];
        this.renderer.scene.children.forEach(child => {
            if (child.type !== 'AmbientLight' && child !== this.renderer.camera) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(c => this.renderer.scene.remove(c));

        if (this.renderer.scene.children.length === 0) {
            this.renderer.scene.add(new THREE.AmbientLight(0xffffff, 0.1));
        }

        this.renderer.pointLights = [];

        if (this.carnivalAudio) { this.carnivalAudio.destroy(); this.carnivalAudio = null; }
        if (this.clownManager) { this.clownManager.destroy(); this.clownManager = null; }
        if (this.eventBus) { this.eventBus.destroy(); this.eventBus = null; }
        this.tableManager = null;
        this.balloonManager = null;
        this.entities = new EntityManager();
        this.lockers = new LockerManager();
        this.items = [];
        this.exitDoor = null;

        if (this.audio) {
            this.audio.stopChaseAmbient();
        }
        if (this.player) {
            this.player.stopChaseStress();
            this.player.isBeingChased = false;
            this.player.resetLevelState();
        }
    }

    startGameLoop() {
        document.getElementById('menu-overlay').style.display = 'none';
        if (this.ui) {
            this.ui.showHUD();
            this.ui.updateLevelIndicator(1);
            setTimeout(() => {
                if (this.running) this.ui.showGuideHint();
            }, 1500);
        }
        this.input.lockPointer();
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    togglePause() {
        if (!this.running) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            if (document.pointerLockElement) document.exitPointerLock();
            this.ui.togglePauseMenu(true);
        } else {
            const canvas = document.querySelector('canvas');
            if (canvas) canvas.requestPointerLock();
            this.ui.togglePauseMenu(false);
            this.lastTime = performance.now();
        }
    }

    loop(time) {
        if (!this.running) return;
        if (this.isPaused) { requestAnimationFrame((t) => this.loop(t)); return; }

        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        const safeDt = Math.min(dt, 0.1);

        this.input.update();

        const activeItems = this.items.filter(i => !i.collected);
        this.player.updateNearbyItems(activeItems);

        if (this.exitDoor && this.exitDoor.canInteract(this.player.position)) {
            this.player.nearbyDoor = this.exitDoor;
        } else {
            this.player.nearbyDoor = null;
        }

        if (this.currentLevel === 1) {
            const nearbyLocker = this.lockers.getNearbyLocker(this.player.position);
            this.player.nearbyLocker = nearbyLocker;
            this.player.nearbySwitch = this.puzzleRooms.getNearbySwitch(this.player.position);
            this.player.nearbyColorPanel = this.puzzleRooms.getNearbyColorPanel(this.player.position);
            this.player.nearbyMazePanel = this.puzzleRooms.getNearbyMazePanel(this.player.position);
            this.player.nearbyRoom3Door = this.puzzleRooms.getRoom3Door();
            this.player.nearbyTV = this.puzzleRooms.getNearbyTV(this.player.position);
        }

        if (this.currentLevel === 2) {
            if (this.level2Logic) {
                this.level2Logic.update(safeDt);
            }
            if (this.balloonManager) {
                this.balloonManager.update(safeDt);
            }

            const equipped = this.player.inventory.getEquippedItem();
            const hasNeedle = equipped && equipped.type === 'needle';
            if (this.ui) this.ui.showCrosshair(hasNeedle);
        }

        if (!this.ui.hasOpenInterface) {
            this.player.update(safeDt);
        }

        if (this.currentLevel === 1) {
            this.puzzleRooms.update(safeDt, this.player);
            this.entities.update(safeDt);
        }

        this.renderer.update(safeDt);
        this.ui.update(safeDt, this.player);

        requestAnimationFrame((t) => this.loop(t));
    }
}

window.game = new Game();
