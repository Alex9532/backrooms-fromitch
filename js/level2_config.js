export const LEVEL2_CONFIG = {
    minMusicDelay: 5,
    maxMusicDelay: 10,

    pathRecalcIntervalMs: 500,
    arrivalThreshold: 0.5,
    avoidanceRadius: 0.3,
    stuckCheckTime: 0.6,
    stuckMinDist: 0.15,

    pursueSpeed: 3.0,
    returnSpeed: 2.0,
    returnThreshold: 0.5,

    directSteerDistance: 3.0,
    facePlayerDistance: 2.0,
    orientationLerpSpeed: 6.0,

    contactDistance: 0.8,
    screamerCooldown: 1.0,

    clownScale: 1.25,

    // Offset for the camera attached to the head bone during the jumpscare
    // Tweak these values if the camera is clipping inside the mesh.
    // X = Right/Left, Y = Up/Down, Z = Forward/Backward (relative to the bone's local rotation).
    clownJumpscareCamOffsetX: 0,
    clownJumpscareCamOffsetY: 0,
    clownJumpscareCamOffsetZ: 5,

    // Base FOV during the jumpscare (lower value = more zoomed in. Default = 75)
    clownJumpscareFov: 80,

    hideCameraYOffset: -0.65,
    crouchViewHeight: 0.5,
    unhideSafeOffset: 0.8,
    hideInteractRange: 1.5,

    graceDurationAfterMusicResume: 5,

    musicResumeWatchdogMs: 200,

    footstepInterval: 0.4,
    footstepMaxDist: 20,
};
