"use client";

import { Float } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Cena 3D do hero (R3F). Composição clean e polida:
 *
 *  - Esfera central com material metálico + emissivo (funciona sem GPU avançada)
 *  - 3 anéis toroidais finos em eixos distintos, rotacionando independentemente
 *  - 3 pequenos cubos flutuando ao redor
 *  - Campo de partículas
 *  - Iluminação: hemisphere + 2 spots + point
 *  - Bloom no pós-processamento para dar glow
 *
 * Otimizações:
 *  - DPR clamp [1, 1.5]
 *  - Geometrias leves (icosahedron detail 4, 150 Points)
 *  - Sem OrbitControls, sem noise deformando vértices
 *  - Mouse parallax no group raiz
 */

type SceneProps = { prefersReducedMotion: boolean };

export function Scene({ prefersReducedMotion }: SceneProps) {
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Group>(null);
  const ring2 = useRef<THREE.Group>(null);
  const ring3 = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const particles = useRef<THREE.Points>(null);

  const target = useRef(new THREE.Vector2(0, 0));
  const current = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    gl.setClearColor(0x000000, 0);
  }, [gl]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      target.current.set(x, y);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (prefersReducedMotion) return;

    // Parallax suave do grupo raiz seguindo o mouse
    if (group.current) {
      current.current.lerp(target.current, 0.05);
      group.current.rotation.y = current.current.x * 0.35;
      group.current.rotation.x = current.current.y * 0.18 - 0.05;
    }

    // Esfera gira devagar no próprio eixo
    if (sphere.current) {
      sphere.current.rotation.y = t * 0.15;
      sphere.current.rotation.x = t * 0.05;
    }

    // 3 anéis em eixos diferentes
    if (ring1.current) ring1.current.rotation.z = t * 0.4;
    if (ring2.current) {
      ring2.current.rotation.x = t * 0.3;
      ring2.current.rotation.y = t * 0.2;
    }
    if (ring3.current) {
      ring3.current.rotation.y = -t * 0.25;
      ring3.current.rotation.z = t * 0.18;
    }

    // Partículas em drift lento
    if (particles.current) {
      particles.current.rotation.y = t * 0.04;
    }
  });

  return (
    <Suspense fallback={null}>
      {/* Iluminação */}
      <hemisphereLight args={["#a8e6ff", "#0a0a1a", 0.55]} />
      <ambientLight intensity={0.25} />
      <spotLight position={[5, 6, 5]} angle={0.4} penumbra={0.8} intensity={1.4} color="#ffffff" />
      <spotLight
        position={[-5, -2, 3]}
        angle={0.5}
        penumbra={0.9}
        intensity={0.9}
        color="#22d3ee"
      />
      <pointLight position={[0, 3, 4]} intensity={0.6} color="#a78bfa" />

      <group ref={group}>
        {/* Esfera principal — material Standard (compatível com qualquer GPU) */}
        <mesh ref={sphere}>
          <icosahedronGeometry args={[0.85, 4]} />
          <meshStandardMaterial
            color="#0c4a6e"
            metalness={0.7}
            roughness={0.25}
            emissive="#22d3ee"
            emissiveIntensity={0.35}
          />
        </mesh>

        {/* Anel 1 — horizontal (rotação Z) */}
        <group ref={ring1}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.4, 0.012, 12, 128]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1.2}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
        </group>

        {/* Anel 2 — inclinado */}
        <group ref={ring2}>
          <mesh rotation={[Math.PI / 3, Math.PI / 6, 0]}>
            <torusGeometry args={[1.65, 0.008, 12, 128]} />
            <meshStandardMaterial
              color="#0891b2"
              emissive="#0891b2"
              emissiveIntensity={0.9}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
        </group>

        {/* Anel 3 — outro eixo */}
        <group ref={ring3}>
          <mesh rotation={[Math.PI / 2.5, Math.PI / 3, 0]}>
            <torusGeometry args={[1.85, 0.006, 12, 128]} />
            <meshStandardMaterial
              color="#a78bfa"
              emissive="#a78bfa"
              emissiveIntensity={0.7}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
        </group>

        {/* 3 cubos "dados" orbitando em alturas diferentes */}
        <Float speed={1.6} rotationIntensity={0.6} floatIntensity={0.8}>
          <mesh position={[1.6, 0.8, 0.3]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1.4}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </Float>
        <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.6}>
          <mesh position={[-1.4, -0.6, 0.6]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial
              color="#a78bfa"
              emissive="#a78bfa"
              emissiveIntensity={1.2}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </Float>
        <Float speed={1.4} rotationIntensity={0.7} floatIntensity={0.7}>
          <mesh position={[0.4, 1.3, -0.5]}>
            <boxGeometry args={[0.09, 0.09, 0.09]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#34d399"
              emissiveIntensity={1.3}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </Float>
      </group>

      {/* Partículas de fundo */}
      <points ref={particles}>
        <bufferGeometry>
          <ParticlePositions count={150} />
        </bufferGeometry>
        <pointsMaterial
          size={0.025}
          color="#22d3ee"
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Bloom (glow nas partes emissivas) */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} intensity={0.6} radius={0.6} mipmapBlur />
      </EffectComposer>
    </Suspense>
  );
}

/** Componente cliente que gera o array de posições UMA vez. */
function ParticlePositions({ count }: { count: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  return <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />;
}
