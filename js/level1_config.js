// Configuration for Level 1

const LEVEL1_CONFIG = {
    // Scale modifier for the Level 1 Boss 3D Entity
    bossScale: 0.8,

    // Distance of the face from the camera during the jumpscare sequence
    bossJumpscareFaceDistance: 1.5,
    // Vertical offset to frame the face perfectly
    bossJumpscareFaceHeightOffset: -0.2,

    // How intense the camera shake is during the screamer
    bossJumpscareShakeIntensity: 0.5,

    // Field of view modification during the screamer for a zooming effect
    bossJumpscareFov: 80
};

// Make accessible to window
if (typeof window !== 'undefined') {
    window.LEVEL1_CONFIG = LEVEL1_CONFIG;
}
