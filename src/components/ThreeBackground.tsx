import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";

function Stars() {
  const pointsRef = useRef<THREE.Points>(null);
  const mouse = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 8 * Math.random() + 2; // radius range
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions.set([x, y, z], i * 3);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0xffffff),
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    return mat;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.02 + mouse.current.x * 0.1;
      pointsRef.current.rotation.x = t * 0.01 + mouse.current.y * 0.1;
    }
  });

  return (
    <group
      onPointerMove={(e) => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5);
        mouse.current.y = (e.clientY / window.innerHeight - 0.5);
      }}
    >
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
}

const ThreeBackground = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 gradient-primary opacity-80" />
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
        <color attach="background" args={["transparent"]} />
        <Stars />
      </Canvas>
    </div>
  );
};

export default ThreeBackground;
