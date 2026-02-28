'use client';

import { Suspense, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

interface GLBModelProps {
  url?: string;
  scale?: number;
  className?: string;
  compact?: boolean;
}

function Model({ url, scale = 1 }: { url: string; scale?: number }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(url);

  // Center and scale model to fit in view (so any GLB size is visible)
  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    scene.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    // Reduce automatic fit scale so models appear a bit smaller by default.
    scene.scale.multiplyScalar(1.2 / maxDim);
  }, [scene]);

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

export function ChatbotGLB({
  url = '/chatbot.glb',
  scale = 1,
  className = '',
  compact = false,
}: GLBModelProps) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function check() {
      try {
        // Try HEAD first (small), but some servers may not support it — fall back to GET.
        let res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        if (!res.ok) {
          res = await fetch(url, { method: 'GET', signal: controller.signal });
        }
        if (!mounted) return;
        setExists(res.ok);
      } catch (e) {
        if (!mounted) return;
        setExists(false);
      }
    }
    check();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [url]);

  // Preload the model to improve perceived loading on first render
  useEffect(() => {
    try {
      // @ts-ignore - useGLTF.preload is available at runtime from drei
      useGLTF.preload && useGLTF.preload(url);
    } catch (e) {
      // ignore preload errors silently
    }
  }, [url]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: compact ? 64 : 200,
        background: 'transparent',
      }}
    >
      {exists === false ? (
        <div style={{
          width: '100%',
          height: '100%',
          minHeight: compact ? 64 : 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(90deg,#0f172a,#0b1220)',
          color: '#fff',
          padding: 12,
          borderRadius: 8,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>3D model not found</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Place your GLB file in the `public/` folder (for example `public/model.glb`)
              and update the `url` prop (currently <strong>{url}</strong>).
            </div>
          </div>
        </div>
      ) : (
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={1} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, -5, 5]} intensity={0.5} />
          <Suspense
            fallback={
              <mesh>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="#ffb347" wireframe />
              </mesh>
            }
          >
            <Model url={url} scale={scale} />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
