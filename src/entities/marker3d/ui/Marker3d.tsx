import React, { useEffect, useRef, useState } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer, loadAsync } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { View, TouchableWithoutFeedback } from 'react-native';

type Props = {
  modelAsset: any;
  screenX: number;
  screenY: number;
  onPress: () => void;
};

export const Marker3D: React.FC<Props> = ({ modelAsset, screenX, screenY, onPress }) => {
  const requestRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);

  const originalLog = console.log;
  console.log = (...args) => {
    const suppress = typeof args[0] === 'string' && args[0].includes('EXGL: gl.pixelStorei()');
    if (!suppress) {
      originalLog(...args);
    }
  };  

  const [glKey, setGlKey] = useState(Date.now());
  useEffect(() => {
    setGlKey(Date.now());
  }, [screenX, screenY]);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    glRef.current = gl;

    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 1.2;

    const light = new THREE.AmbientLight(0xffffff);
    scene.add(light);

    const asset = Asset.fromModule(modelAsset);
    await asset.downloadAsync();

    const gltf = await loadAsync(asset.uri);
    const model = gltf.scene;
    model.scale.set(0.1, 0.1, 0.1);
    scene.add(model);
    modelRef.current = model;

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      model.rotation.y += 0.02;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      sceneRef.current?.traverse((child) => {
        if ((child as any).geometry) {
          (child as any).geometry.dispose?.();
        }
        if ((child as any).material) {
          const material = (child as any).material;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose?.());
          } else {
            material.dispose?.();
          }
        }
      });

      rendererRef.current?.dispose?.();
    };
  }, []);

  return (
    <View
      key={glKey}
      style={{
        position: 'absolute',
        top: screenY - 30,
        left: screenX - 30,
        width: 70,
        height: 70,
        zIndex: 10,
      }}
    >
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={{ width: '100%', height: '100%' }}>
          <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};
