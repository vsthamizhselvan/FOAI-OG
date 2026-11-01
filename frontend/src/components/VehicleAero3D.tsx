import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VehicleProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  thrustActive?: boolean;
  scale?: number;
  isCrashing?: boolean;
}

export const VehicleAero3D: React.FC<VehicleProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  thrustActive = true,
  scale = 1.0,
  isCrashing = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const thrusterRearRef = useRef<THREE.Mesh>(null);
  const strobeLightRef = useRef<THREE.PointLight>(null);
  const rotorFLRef = useRef<THREE.Group>(null);
  const rotorFRRef = useRef<THREE.Group>(null);
  const rotorRLRef = useRef<THREE.Group>(null);
  const rotorRRRef = useRef<THREE.Group>(null);
  const contrailLeftRef = useRef<THREE.Mesh>(null);
  const contrailRightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotate ducted fan rotors
    if (!isCrashing && thrustActive) {
      const rotSpeed = 40;
      if (rotorFLRef.current) rotorFLRef.current.rotation.y += rotSpeed;
      if (rotorFRRef.current) rotorFRRef.current.rotation.y -= rotSpeed;
      if (rotorRLRef.current) rotorRLRef.current.rotation.y += rotSpeed;
      if (rotorRRRef.current) rotorRRRef.current.rotation.y -= rotSpeed;
    }

    // Engine hover micro-vibration
    if (groupRef.current && thrustActive && !isCrashing) {
      groupRef.current.position.y += Math.sin(t * 12) * 0.015;
    }

    // FAA White Strobe flash (1.2 Hz pulse)
    if (strobeLightRef.current) {
      const strobe = Math.sin(t * 8) > 0.8 ? 2.5 : 0;
      strobeLightRef.current.intensity = isCrashing ? 0 : strobe;
    }

    // Thruster & contrail pulse
    if (thrusterRearRef.current) {
      if (isCrashing) {
        (thrusterRearRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      } else {
        const pulse = 0.8 + Math.sin(t * 16) * 0.2;
        (thrusterRearRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    }

    if (contrailLeftRef.current && contrailRightRef.current) {
      const cPulse = isCrashing ? 0 : 0.6 + Math.sin(t * 20) * 0.2;
      (contrailLeftRef.current.material as THREE.MeshBasicMaterial).opacity = cPulse;
      (contrailRightRef.current.material as THREE.MeshBasicMaterial).opacity = cPulse;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 1. Main Aerodynamic Chassis (Sleek Roadster Aero) */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2.2, 0.52, 4.9]} />
        <meshStandardMaterial
          color={isCrashing ? '#1c1917' : '#18181b'}
          roughness={0.15}
          metalness={0.9}
        />
      </mesh>

      {/* Aerodynamic Carbon Hood & Front Nose */}
      <mesh position={[0, 0.36, 2.7]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[2.0, 0.28, 1.3]} />
        <meshStandardMaterial color="#09090b" roughness={0.1} metalness={0.95} />
      </mesh>

      {/* Front Carbon Ground-Effect Splitter */}
      <mesh position={[0, 0.16, 3.2]}>
        <boxGeometry args={[2.2, 0.06, 0.45]} />
        <meshStandardMaterial color="#27272a" metalness={0.9} />
      </mesh>

      {/* Forward Headlight Projectors */}
      <mesh position={[-0.75, 0.38, 3.2]}>
        <boxGeometry args={[0.35, 0.08, 0.1]} />
        <meshBasicMaterial color={isCrashing ? '#7f1d1d' : '#ffffff'} />
      </mesh>
      <mesh position={[0.75, 0.38, 3.2]}>
        <boxGeometry args={[0.35, 0.08, 0.1]} />
        <meshBasicMaterial color={isCrashing ? '#7f1d1d' : '#ffffff'} />
      </mesh>
      {!isCrashing && (
        <spotLight
          position={[0, 0.4, 3.3]}
          target-position={[0, -4, 30]}
          intensity={2.2}
          distance={50}
          angle={0.45}
          penumbra={0.6}
          color="#ffffff"
        />
      )}

      {/* Cockpit Canopy Glass */}
      <mesh position={[0, 0.82, -0.2]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[1.65, 0.48, 2.3]} />
        <meshStandardMaterial
          color="#050505"
          roughness={0.04}
          metalness={0.98}
          transparent
          opacity={0.88}
        />
      </mesh>
      <pointLight position={[0, 0.72, 0.3]} color={isCrashing ? '#ef4444' : '#38bdf8'} intensity={1.5} distance={2.5} />

      {/* Lateral Gull-Wing Aero Sponsons */}
      <mesh position={[-1.3, 0.35, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.8, 0.14, 3.2]} />
        <meshStandardMaterial color="#18181b" metalness={0.9} />
      </mesh>
      <mesh position={[1.3, 0.35, 0]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.8, 0.14, 3.2]} />
        <meshStandardMaterial color="#18181b" metalness={0.9} />
      </mesh>

      {/* FAA Navigation Lights on Wingtips (Port Red, Starboard Green) */}
      <mesh position={[-1.72, 0.42, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <pointLight position={[-1.72, 0.42, 0]} color="#ef4444" intensity={1.2} distance={3} />

      <mesh position={[1.72, 0.42, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      <pointLight position={[1.72, 0.42, 0]} color="#10b981" intensity={1.2} distance={3} />

      {/* Underbelly White Strobe Beacon */}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight ref={strobeLightRef} position={[0, 0.1, 0]} color="#ffffff" intensity={2.0} distance={10} />

      {/* Quad Ducted Fans with Counter-Rotating Aerodynamic Propellers */}
      {/* Front Left */}
      <group position={[-1.3, 0.24, 1.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.46, 20]} />
          <meshStandardMaterial color="#27272a" metalness={0.9} />
        </mesh>
        <group ref={rotorFLRef} position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Front Right */}
      <group position={[1.3, 0.24, 1.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.46, 20]} />
          <meshStandardMaterial color="#27272a" metalness={0.9} />
        </mesh>
        <group ref={rotorFRRef} position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Rear Left */}
      <group position={[-1.3, 0.24, -1.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.46, 20]} />
          <meshStandardMaterial color="#27272a" metalness={0.9} />
        </mesh>
        <group ref={rotorRLRef} position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Rear Right */}
      <group position={[1.3, 0.24, -1.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 0.46, 20]} />
          <meshStandardMaterial color="#27272a" metalness={0.9} />
        </mesh>
        <group ref={rotorRRRef} position={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
            <boxGeometry args={[0.95, 0.02, 0.12]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Rear Aerodynamic Tail Light Diffuser */}
      <mesh position={[0, 0.46, -2.46]}>
        <boxGeometry args={[1.92, 0.08, 0.08]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Main Plasma Propulsion Nozzle */}
      <mesh ref={thrusterRearRef} position={[0, 0.35, -2.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.08, 0.65, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>

      {/* Jet Contrails / Vapor Trails behind vehicle */}
      {!isCrashing && (
        <group>
          <mesh ref={contrailLeftRef} position={[-0.8, 0.3, -4.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.14, 3.8, 8]} />
            <meshBasicMaterial color="#e4e4e7" transparent opacity={0.5} />
          </mesh>
          <mesh ref={contrailRightRef} position={[0.8, 0.3, -4.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.14, 3.8, 8]} />
            <meshBasicMaterial color="#e4e4e7" transparent opacity={0.5} />
          </mesh>
        </group>
      )}

      {/* Emergency Failure Fire and Black Smoke */}
      {isCrashing && (
        <group position={[0, 0.5, -0.6]}>
          <mesh position={[0, 0.5, -0.9]}>
            <sphereGeometry args={[0.9, 12, 12]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0.5, 0.8, -1.6]}>
            <sphereGeometry args={[1.3, 12, 12]} />
            <meshBasicMaterial color="#7f1d1d" transparent opacity={0.88} />
          </mesh>
          <mesh position={[-0.4, 1.1, -2.4]}>
            <sphereGeometry args={[1.7, 12, 12]} />
            <meshBasicMaterial color="#09090b" transparent opacity={0.92} />
          </mesh>
          <pointLight position={[0, 0.8, -1.2]} color="#ef4444" intensity={6.0} distance={15} />
        </group>
      )}
    </group>
  );
};
