import { useEffect, useRef, useState, useCallback } from "react";

export type MovementState =
  | "idle"
  | "walking"
  | "running"
  | "sprinting"
  | "sliding"
  | "wallrunning"
  | "airborne"
  | "grounded";

export interface MovementData {
  velocity: { x: number; y: number; z: number };
  speed: number;
  maxSpeed: number;
  momentum: number;
  state: MovementState;
  isGrounded: boolean;
  slopeAngle: number;
  heading: number;
  timestamp: number;
}

interface MovementTrackerOptions {
  smoothing?: number;
  maxHistory?: number;
}

function useSimulatedMovement(): MovementData {
  const [data, setData] = useState<MovementData>(() => ({
    velocity: { x: 0, y: 0, z: 0 },
    speed: 0,
    maxSpeed: 0,
    momentum: 0,
    state: "idle" as MovementState,
    isGrounded: true,
    slopeAngle: 0,
    heading: 0,
    timestamp: Date.now(),
  }));

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const targetSpeed = Math.random() > 0.7 ? 8 + Math.random() * 12 : Math.random() * 3;
    const targetState: MovementState =
      targetSpeed > 12
        ? "sprinting"
        : targetSpeed > 5
          ? "running"
          : targetSpeed > 1
            ? "walking"
            : "idle";

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setData((prev) => {
        const speedDelta = (targetSpeed - prev.speed) * deltaTime * 3;
        const newSpeed = Math.max(0, Math.min(25, prev.speed + speedDelta));

        // Calculate momentum (mass * velocity, simplified to just speed for demo)
        const momentum = newSpeed * 1.5;

        // Determine state based on speed
        let state: MovementState = "idle";
        if (newSpeed > 12) state = "sprinting";
        else if (newSpeed > 5) state = "running";
        else if (newSpeed > 1) state = "walking";

        // Add some velocity variation
        const velocityX = Math.sin(currentTime / 1000) * newSpeed * 0.3;
        const velocityZ = Math.cos(currentTime / 1000) * newSpeed * 0.3;

        return {
          velocity: { x: velocityX, y: 0, z: velocityZ },
          speed: newSpeed,
          maxSpeed: Math.max(prev.maxSpeed, newSpeed),
          momentum,
          state,
          isGrounded: true,
          slopeAngle: Math.sin(currentTime / 2000) * 5,
          heading: (currentTime / 100) % 360,
          timestamp: currentTime,
        };
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return data;
}

/** Hook to track device movement and physics data for HUD display */
export function useMovementTracker(options: MovementTrackerOptions = {}): MovementData & {
  history: MovementData[];
  toggleDebug: () => void;
  debugEnabled: boolean;
} {
  const { smoothing = 0.8, maxHistory = 100 } = options;

  const [debugEnabled, setDebugEnabled] = useState(false);
  const [smoothedData, setSmoothedData] = useState<MovementData | null>(null);
  const historyRef = useRef<MovementData[]>([]);

  // Get simulated or real movement data
  const rawData = useSimulatedMovement();

  const toggleDebug = useCallback(() => {
    setDebugEnabled((prev) => !prev);
  }, []);

  // Initialize smoothed data with raw data on first render
  useEffect(() => {
    if (!smoothedData) {
      setSmoothedData(rawData);
    }
  }, [rawData, smoothedData]);

  useEffect(() => {
    if (!rawData) return;

    // Apply smoothing
    setSmoothedData((prev) => {
      if (!prev) return rawData;

      const smoothed = {
        velocity: {
          x: prev.velocity.x * smoothing + rawData.velocity.x * (1 - smoothing),
          y: prev.velocity.y * smoothing + rawData.velocity.y * (1 - smoothing),
          z: prev.velocity.z * smoothing + rawData.velocity.z * (1 - smoothing),
        },
        speed: prev.speed * smoothing + rawData.speed * (1 - smoothing),
        maxSpeed: rawData.maxSpeed,
        momentum: prev.momentum * smoothing + rawData.momentum * (1 - smoothing),
        state: rawData.state,
        isGrounded: rawData.isGrounded,
        slopeAngle: rawData.slopeAngle,
        heading: rawData.heading,
        timestamp: rawData.timestamp,
      };

      return smoothed;
    });

    // Add to history
    historyRef.current.push(rawData);
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }
  }, [rawData, smoothing, maxHistory]);

  // Return rawData on first render before smoothing, then smoothed data
  const currentData = smoothedData ?? rawData;

  return {
    ...currentData,
    history: [...historyRef.current],
    toggleDebug,
    debugEnabled,
  };
}
