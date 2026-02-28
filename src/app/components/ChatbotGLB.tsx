'use client';

import { Suspense, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import type { Group } from 'three';
import * as THREE from 'three';

/** Forces canvas to re-render on mount - fixes blank canvas until scroll issue */
function InvalidateOnMount() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const t1 = requestAnimationFrame(() => invalidate());
    const t2 = setTimeout(invalidate, 150);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
    };
  }, [invalidate]);
  return null;
}

interface GLBModelProps {
  url?: string;
  /** When provided, cycles through these URLs every few seconds (looping). */
  urls?: string[];
  /** When set, run this many full cycles then call onLoopComplete. Omit for infinite loop. */
  loopCount?: number;
  /** Called when loopCount cycles finish (if loopCount is set). */
  onLoopComplete?: () => void;
  scale?: number;
  className?: string;
  compact?: boolean;
}

function Model({ url, scale = 1 }: { url: string; scale?: number }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, scene);

  // Play embedded animation (walking, running, etc.) if present
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    const firstAction = Object.values(actions)[0];
    if (firstAction) {
      firstAction.reset().fadeIn(0.3).play();
      return () => {
        firstAction.fadeOut(0.2);
        firstAction.stop();
      };
    }
  }, [actions]);

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

  // Subtle mouse-follow: character tilts a bit toward cursor (like heilcheng/website)
  // No 360° rotation – only a small, smooth movement
  useFrame((state) => {
    if (group.current) {
      const targetRotY = state.mouse.x * 0.5;
      const targetRotX = -state.mouse.y * 0.5;
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.1);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.1);
    }
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

export function ChatbotGLB({
  url = '/chatbot.glb',
  urls,
  loopCount,
  onLoopComplete,
  scale = 1,
  className = '',
  compact = false,
}: GLBModelProps) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const displayUrls = urls?.length ? urls : [url || '/chatbot.glb'];
  const currentUrl = displayUrls[currentIndex % displayUrls.length];
  const cycleTickRef = useRef(0);
  const onLoopCompleteRef = useRef(onLoopComplete);
  onLoopCompleteRef.current = onLoopComplete;

  // Reset to first model when urls change
  const urlsKey = displayUrls.join('|');
  useEffect(() => {
    setCurrentIndex(0);
    cycleTickRef.current = 0;
  }, [urlsKey]);

  // Loop through models every 5 seconds when urls/displayUrls has multiple entries
  useEffect(() => {
    if (displayUrls.length <= 1) return;
    const totalTicks = loopCount != null ? loopCount * displayUrls.length : Infinity;
    const len = displayUrls.length;
    const id = setInterval(() => {
      cycleTickRef.current += 1;
      if (cycleTickRef.current >= totalTicks) {
        clearInterval(id);
        onLoopCompleteRef.current?.();
        return;
      }
      setCurrentIndex((i) => (i + 1) % len);
    }, 5000);
    return () => {
      clearInterval(id);
      cycleTickRef.current = 0;
    };
  }, [urlsKey, loopCount]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function check() {
      try {
        // Try HEAD first (small), but some servers may not support it — fall back to GET.
        let res = await fetch(currentUrl, { method: 'HEAD', signal: controller.signal });
        if (!res.ok) {
          res = await fetch(currentUrl, { method: 'GET', signal: controller.signal });
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
  }, [currentUrl]);

  // Preload all models when looping
  useEffect(() => {
    displayUrls.forEach((u) => {
      try {
        // @ts-ignore - useGLTF.preload is available at runtime from drei
        useGLTF.preload && useGLTF.preload(u);
      } catch (e) {
        // ignore preload errors silently
      }
    });
  }, [displayUrls]);

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
              and update the `url` prop (currently <strong>{currentUrl}</strong>).
            </div>
          </div>
        </div>
      ) : (
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          frameloop="always"
          resize={{ debounce: 0, scroll: true }}
          style={{ display: 'block' }}
        >
          <InvalidateOnMount />
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
            <Model key={currentUrl} url={currentUrl} scale={scale} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
