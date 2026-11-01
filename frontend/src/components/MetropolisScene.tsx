import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { VehicleAero3D } from './VehicleAero3D';
import { Waypoint, FlightCorridor, RestrictedZone, WeatherZone, Building, RouteLeg } from '../types';

export type AirspaceMapId = 'METROPOLIS_CORE' | 'COASTAL_HARBOR' | 'MOUNTAIN_GORGE';

interface MetropolisSceneProps {
  waypoints: Waypoint[];
  corridors: FlightCorridor[];
  restrictedZones: RestrictedZone[];
  weatherZones: WeatherZone[];
  buildings: Building[];
  selectedRouteWpIds: string[];
  routeLegs?: RouteLeg[];
  simProgress?: number; // 0.0 to 1.0 along the route
  cameraMode?: 'ORBIT' | 'CHASE' | 'TOP_DOWN';
  onSelectWaypoint?: (wp: Waypoint) => void;
  theme?: 'light' | 'dark';
  mapSector?: AirspaceMapId;
  isCrashing?: boolean;
  crashProgress?: number; // 0.0 to 1.0 descent to ground
}

// Coordinate scaling for 3D viewport (scale down 1800m city to ~90 Three.js units)
const SCALE = 0.04;
const to3D = (x: number, y: number, z: number): [number, number, number] => [
  (x - 900) * SCALE,
  z * SCALE,
  (y - 450) * SCALE
];

// Camera controller with chase interpolation, top-down mode, and crash screen shake
const CameraRig: React.FC<{
  mode: 'ORBIT' | 'CHASE' | 'TOP_DOWN';
  vehiclePos: [number, number, number];
  vehicleYaw: number;
  isCrashing?: boolean;
}> = ({ mode, vehiclePos, vehicleYaw, isCrashing }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (mode === 'CHASE') {
      const dist = isCrashing ? 8.5 : 5.8;
      const height = isCrashing ? 3.8 : 2.2;
      const targetCamX = vehiclePos[0] - Math.sin(vehicleYaw) * dist;
      const targetCamZ = vehiclePos[2] - Math.cos(vehicleYaw) * dist;
      const targetCamY = Math.max(1.5, vehiclePos[1] + height);

      camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), isCrashing ? 0.06 : 0.12);
      camera.lookAt(vehiclePos[0], Math.max(0.4, vehiclePos[1] + 0.7), vehiclePos[2]);
      if (controlsRef.current) controlsRef.current.target.set(vehiclePos[0], Math.max(0.4, vehiclePos[1]), vehiclePos[2]);
    } else if (mode === 'TOP_DOWN') {
      camera.position.lerp(new THREE.Vector3(vehiclePos[0], 55, vehiclePos[2]), 0.08);
      camera.lookAt(vehiclePos[0], 0, vehiclePos[2]);
      if (controlsRef.current) controlsRef.current.target.set(vehiclePos[0], 0, vehiclePos[2]);
    }

    // High-impact Camera Shake during catastrophic crash
    if (isCrashing) {
      const shakeAmt = 0.12;
      camera.position.x += (Math.random() - 0.5) * shakeAmt;
      camera.position.y += (Math.random() - 0.5) * shakeAmt;
      camera.position.z += (Math.random() - 0.5) * shakeAmt;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={4}
      maxDistance={140}
    />
  );
};

// Living Ground Highway Traffic light pulses
const CityTrafficStreams: React.FC<{ isLight: boolean }> = ({ isLight }) => {
  const trafficRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (trafficRef.current) {
      // Loop traffic positions along avenues
      trafficRef.current.children.forEach((mesh, idx) => {
        const speed = (idx % 2 === 0 ? 1 : -1) * (6 + (idx % 3) * 2);
        mesh.position.z = ((mesh.position.z + speed * 0.03 + 80) % 160) - 80;
      });
    }
  });

  const vehicles = useMemo(() => {
    const items = [];
    const avenues = [-30, -15, 0, 15, 30];
    for (let i = 0; i < 20; i++) {
      const ave = avenues[i % avenues.length];
      const z = (i * 8 - 80);
      const isRed = i % 2 === 0;
      items.push({ x: ave + (isRed ? 0.8 : -0.8), z, isRed });
    }
    return items;
  }, []);

  return (
    <group ref={trafficRef} position={[0, 0.1, 0]}>
      {vehicles.map((v, i) => (
        <mesh key={i} position={[v.x, 0, v.z]}>
          <boxGeometry args={[0.3, 0.15, 0.8]} />
          <meshBasicMaterial color={v.isRed ? '#ef4444' : isLight ? '#09090b' : '#fafafa'} />
        </mesh>
      ))}
    </group>
  );
};

// Atmospheric Drifting Clouds
const AtmosphericClouds: React.FC<{ isLight: boolean }> = ({ isLight }) => {
  const cloudGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (cloudGroupRef.current) {
      cloudGroupRef.current.position.x = Math.sin(t * 0.05) * 8;
      cloudGroupRef.current.position.z = Math.cos(t * 0.04) * 6;
    }
  });

  const cloudColor = isLight ? '#e4e4e7' : '#27272a';

  return (
    <group ref={cloudGroupRef} position={[0, 24, 0]}>
      <mesh position={[-15, 0, 10]}>
        <sphereGeometry args={[7, 12, 12]} />
        <meshStandardMaterial color={cloudColor} transparent opacity={0.25} roughness={1} />
      </mesh>
      <mesh position={[18, 2, -15]}>
        <sphereGeometry args={[9, 12, 12]} />
        <meshStandardMaterial color={cloudColor} transparent opacity={0.22} roughness={1} />
      </mesh>
      <mesh position={[-25, -2, -25]}>
        <sphereGeometry args={[11, 12, 12]} />
        <meshStandardMaterial color={cloudColor} transparent opacity={0.2} roughness={1} />
      </mesh>
    </group>
  );
};

export const MetropolisScene: React.FC<MetropolisSceneProps> = ({
  waypoints,
  corridors,
  restrictedZones,
  weatherZones,
  buildings,
  selectedRouteWpIds,
  simProgress = 0.0,
  cameraMode = 'ORBIT',
  onSelectWaypoint,
  theme = 'light',
  mapSector = 'METROPOLIS_CORE',
  isCrashing = false,
  crashProgress = 0.0
}) => {
  const isLight = theme === 'light';

  // Build continuous 3D CatmullRom spline through the selected route waypoints
  const routeCurve = useMemo(() => {
    if (!selectedRouteWpIds || selectedRouteWpIds.length < 2) return null;

    const points: THREE.Vector3[] = [];
    for (const wpId of selectedRouteWpIds) {
      const wp = waypoints.find((w) => w.id === wpId);
      if (wp) {
        const [x, y, z] = to3D(wp.position.x, wp.position.y, wp.position.z);
        points.push(new THREE.Vector3(x, y, z));
      }
    }
    if (points.length < 2) return null;
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  }, [waypoints, selectedRouteWpIds]);

  // Compute Holographic Navigational Tunnel Rings along corridor
  const tunnelRings = useMemo(() => {
    if (!routeCurve) return [];
    const rings = [];
    const count = 14;
    for (let i = 1; i < count; i++) {
      const t = i / count;
      const pt = routeCurve.getPointAt(t);
      const tangent = routeCurve.getTangentAt(t).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      const rot = new THREE.Euler().setFromQuaternion(quat);

      rings.push({
        position: [pt.x, pt.y, pt.z] as [number, number, number],
        rotation: [rot.x, rot.y, rot.z] as [number, number, number],
        index: i
      });
    }
    return rings;
  }, [routeCurve]);

  // Compute vehicle position and attitude along route curve (or in freefall crash)
  const { currentPos, currentYaw, currentPitch, currentRoll } = useMemo(() => {
    let basePos: [number, number, number] = [0, 4, 0];
    let baseYaw = 0;
    let basePitch = 0;
    let baseRoll = 0;

    if (routeCurve) {
      const t = Math.max(0, Math.min(1, simProgress));
      const pt = routeCurve.getPointAt(t);
      const tangent = routeCurve.getTangentAt(t).normalize();

      basePos = [pt.x, pt.y, pt.z];
      baseYaw = Math.atan2(tangent.x, tangent.z);
      basePitch = -Math.asin(tangent.y);
      baseRoll = Math.sin(t * Math.PI * 4) * 0.15;
    } else {
      const startWp = waypoints.find((w) => w.id === selectedRouteWpIds[0]) || waypoints[0];
      if (startWp) {
        basePos = to3D(startWp.position.x, startWp.position.y, startWp.position.z);
      }
    }

    // Realistic Freefall Crash Physics
    if (isCrashing) {
      const fallDistance = basePos[1] - 0.4;
      const fallenY = Math.max(0.4, basePos[1] - (crashProgress * crashProgress * fallDistance));
      const spinRoll = crashProgress * Math.PI * 4;
      const noseDivePitch = Math.min(Math.PI / 2.2, basePitch + crashProgress * 1.4);

      return {
        currentPos: [basePos[0], fallenY, basePos[2]] as [number, number, number],
        currentYaw: baseYaw + crashProgress * 0.8,
        currentPitch: noseDivePitch,
        currentRoll: spinRoll
      };
    }

    return {
      currentPos: basePos,
      currentYaw: baseYaw,
      currentPitch: basePitch,
      currentRoll: baseRoll
    };
  }, [routeCurve, simProgress, waypoints, selectedRouteWpIds, isCrashing, crashProgress]);

  const bgColor = isLight ? '#f4f4f5' : '#09090b';
  const gridCellColor = isLight ? '#e4e4e7' : '#27272a';
  const gridSectionColor = isLight ? '#a1a1aa' : '#3f3f46';
  const buildingColor = isLight ? '#27272a' : '#18181b';
  const buildingTrimColor = isLight ? '#3f3f46' : '#27272a';
  const routeColor = isCrashing ? '#ef4444' : isLight ? '#09090b' : '#fafafa';
  const corridorColor = isLight ? '#d4d4d8' : '#27272a';
  const waypointColor = isLight ? '#09090b' : '#fafafa';

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        camera={{ position: [0, 35, 45], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 45, 150]} />

        {/* Ambient & Realistic Sun Lighting */}
        <ambientLight intensity={isLight ? 0.9 : 0.6} />
        <directionalLight position={[40, 70, 30]} intensity={isLight ? 1.6 : 1.2} color="#ffffff" castShadow />
        <directionalLight position={[-40, 25, -40]} intensity={0.4} color="#ffffff" />

        {/* Realistic Digital Ground Grid with Road Markings */}
        <Grid
          position={[0, 0, 0]}
          args={[180, 180]}
          cellSize={2.5}
          cellThickness={0.6}
          cellColor={gridCellColor}
          sectionSize={12.5}
          sectionThickness={1.4}
          sectionColor={gridSectionColor}
          fadeDistance={110}
        />

        {/* Moving City Highway Ground Traffic */}
        <CityTrafficStreams isLight={isLight} />

        {/* Drifting Atmospheric Clouds Layer */}
        <AtmosphericClouds isLight={isLight} />

        {/* Map Sector Feature: Coastal Ocean Plane for Harbor map */}
        {mapSector === 'COASTAL_HARBOR' && (
          <mesh position={[25, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[70, 160]} />
            <meshStandardMaterial
              color={isLight ? '#38bdf8' : '#0369a1'}
              roughness={0.1}
              metalness={0.8}
              transparent
              opacity={0.65}
            />
          </mesh>
        )}

        {/* Map Sector Feature: Mountain Ridges for Mountain map */}
        {mapSector === 'MOUNTAIN_GORGE' && (
          <group position={[-25, 0, -10]}>
            <mesh position={[0, 8, 0]}>
              <coneGeometry args={[14, 16, 6]} />
              <meshStandardMaterial color={isLight ? '#52525b' : '#27272a'} roughness={0.9} />
            </mesh>
            <mesh position={[12, 11, -12]}>
              <coneGeometry args={[16, 22, 6]} />
              <meshStandardMaterial color={isLight ? '#3f3f46' : '#1c1917'} roughness={0.9} />
            </mesh>
          </group>
        )}

        {/* 1. Realistic 3D City Buildings with Lit Windows & Helipads */}
        {buildings.map((b, idx) => {
          const [bx, by, bz] = to3D(b.x, b.y, b.z / 2);
          const height = b.z * SCALE;
          const width = b.width * SCALE;
          const depth = b.depth * SCALE;
          const hasHelipad = idx % 3 === 0;

          return (
            <group key={b.id} position={[bx, height / 2, bz]}>
              <mesh>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial
                  color={buildingColor}
                  roughness={0.5}
                  metalness={0.3}
                />
              </mesh>

              {/* Roof Trim */}
              <mesh position={[0, height / 2 + 0.05, 0]}>
                <boxGeometry args={[width * 0.96, 0.1, depth * 0.96]} />
                <meshBasicMaterial color={buildingTrimColor} />
              </mesh>

              {/* Rooftop Helipad with "H" & Aviation Warning Beacon */}
              {hasHelipad && (
                <group position={[0, height / 2 + 0.12, 0]}>
                  <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[Math.min(width, depth) * 0.35, 24]} />
                    <meshBasicMaterial color={isLight ? '#18181b' : '#3f3f46'} side={THREE.DoubleSide} />
                  </mesh>
                  {/* Flashing Red Rooftop Beacon */}
                  <mesh position={[0, 0.25, 0]}>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshBasicMaterial color="#ef4444" />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}

        {/* 2. Waypoint Beacons & Landing Vertipads with Touchdown Rings */}
        {waypoints.map((wp) => {
          const [wx, wy, wz] = to3D(wp.position.x, wp.position.y, wp.position.z);
          const isSelected = selectedRouteWpIds.includes(wp.id);
          const isDest = wp.id === 'WP_DESTINATION';
          const isEmergency = wp.is_emergency_pad;

          let color = waypointColor;
          if (isEmergency) color = '#f59e0b';
          else if (isDest) color = isLight ? '#000000' : '#ffffff';

          return (
            <group
              key={wp.id}
              position={[wx, wy, wz]}
              onClick={() => onSelectWaypoint && onSelectWaypoint(wp)}
            >
              {/* Vertical Laser Guidance Light */}
              <mesh position={[0, -wy / 2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, wy, 8]} />
                <meshBasicMaterial color={color} transparent opacity={isSelected ? 0.6 : 0.2} />
              </mesh>

              {/* Landing Deck Outer Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.7, 0.95, 32]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} />
              </mesh>

              {/* Touchdown Core Dot */}
              <mesh>
                <sphereGeometry args={[0.26, 16, 16]} />
                <meshBasicMaterial color={color} />
              </mesh>

              {/* Waypoint Label */}
              <Text
                position={[0, 1.3, 0]}
                fontSize={0.65}
                color={color}
                anchorX="center"
                anchorY="middle"
              >
                {wp.name}
              </Text>
            </group>
          );
        })}

        {/* 3. Flight Corridors Network */}
        {corridors.map((cor) => {
          const src = waypoints.find((w) => w.id === cor.source_id);
          const tgt = waypoints.find((w) => w.id === cor.target_id);
          if (!src || !tgt) return null;

          const p1 = to3D(src.position.x, src.position.y, src.position.z);
          const p2 = to3D(tgt.position.x, tgt.position.y, tgt.position.z);

          const isLegInSelected =
            selectedRouteWpIds.indexOf(cor.source_id) !== -1 &&
            selectedRouteWpIds.indexOf(cor.target_id) === selectedRouteWpIds.indexOf(cor.source_id) + 1;

          if (isLegInSelected) return null;

          const mid: [number, number, number] = [
            (p1[0] + p2[0]) / 2,
            (p1[1] + p2[1]) / 2,
            (p1[2] + p2[2]) / 2
          ];

          return (
            <group key={cor.id} position={mid}>
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[new Float32Array([...p1, ...p2]), 3]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={cor.is_blocked ? '#ef4444' : corridorColor}
                  transparent
                  opacity={cor.is_blocked ? 0.8 : 0.4}
                />
              </line>
            </group>
          );
        })}

        {/* 4. Selected Optimal AO* Flight Trajectory Ribbon */}
        {routeCurve && (
          <mesh>
            <tubeGeometry args={[routeCurve, 64, 0.18, 8, false]} />
            <meshStandardMaterial
              color={routeColor}
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
        )}

        {/* 5. Navigational Corridor Tunnel Rings */}
        {tunnelRings.map((ring, i) => (
          <group key={`ring-${i}`} position={ring.position} rotation={ring.rotation}>
            <mesh>
              <torusGeometry args={[1.5, 0.05, 8, 24]} />
              <meshBasicMaterial
                color={isCrashing ? '#ef4444' : isLight ? '#18181b' : '#38bdf8'}
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>
        ))}

        {/* 6. Restricted Airspace Cylinders */}
        {restrictedZones.map((rz) => {
          if (!rz.active) return null;
          const [rx, _, rzPos] = to3D(rz.center.x, rz.center.y, 0);
          const radius = rz.radius * SCALE;
          const height = (rz.max_altitude - rz.min_altitude) * SCALE;
          const centerY = (rz.max_altitude + rz.min_altitude) * SCALE * 0.5;

          return (
            <group key={rz.id} position={[rx, centerY, rzPos]}>
              <mesh>
                <cylinderGeometry args={[radius, radius, height, 24]} />
                <meshStandardMaterial
                  color="#ef4444"
                  transparent
                  opacity={0.15}
                  roughness={0.1}
                />
              </mesh>
              <mesh>
                <cylinderGeometry args={[radius, radius, height, 16]} />
                <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.3} />
              </mesh>
              <Text
                position={[0, height / 2 + 0.8, 0]}
                fontSize={0.7}
                color="#ef4444"
                anchorX="center"
              >
                PROHIBITED AIRSPACE
              </Text>
            </group>
          );
        })}

        {/* 7. Weather Storm Zones */}
        {weatherZones.map((wz) => {
          const [wx, wy, wzPos] = to3D(wz.center.x, wz.center.y, wz.center.z);
          const radius = wz.radius * SCALE;
          return (
            <group key={wz.id} position={[wx, wy, wzPos]}>
              <mesh>
                <sphereGeometry args={[radius, 16, 16]} />
                <meshStandardMaterial
                  color={isLight ? '#71717a' : '#52525b'}
                  transparent
                  opacity={0.16}
                  roughness={0.9}
                />
              </mesh>
              <Text position={[0, radius + 0.6, 0]} fontSize={0.6} color={isLight ? '#52525b' : '#a1a1aa'} anchorX="center">
                {wz.name} ({wz.wind_speed_mps} m/s)
              </Text>
            </group>
          );
        })}

        {/* 8. The Animated Tesla Roadster Aero Vehicle */}
        <VehicleAero3D
          position={currentPos}
          rotation={[currentPitch, currentYaw, currentRoll]}
          thrustActive={!isCrashing}
          scale={0.42}
          isCrashing={isCrashing}
        />

        {/* Ground Impact Explosion / Debris Ring when vehicle hits ground */}
        {isCrashing && currentPos[1] <= 0.6 && (
          <group position={[currentPos[0], 0.2, currentPos[2]]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 3.2, 24]} />
              <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <sphereGeometry args={[1.5, 12, 12]} />
              <meshBasicMaterial color="#7f1d1d" transparent opacity={0.8} />
            </mesh>
            <pointLight position={[0, 1, 0]} color="#ef4444" intensity={6.0} distance={15} />
          </group>
        )}

        {/* Camera Control Rig */}
        <CameraRig
          mode={cameraMode}
          vehiclePos={currentPos}
          vehicleYaw={currentYaw}
          isCrashing={isCrashing}
        />
      </Canvas>
    </div>
  );
};
