import React, { useEffect, useRef, useState } from 'react';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { View, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Marker3DProps } from '../model/marker3dProps';

export const Marker3D: React.FC<Marker3DProps> = ({ modelAsset, screenX, screenY, onPress }) => {
  
  const requestRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

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
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(1, 1, 2);
    scene.add(dirLight);

    try {
      const asset = Asset.fromModule(modelAsset);
      await asset.downloadAsync();

      const modelUri = typeof asset.localUri === 'string'
        ? asset.localUri.trim()
        : typeof asset.uri === 'string'
          ? asset.uri.trim()
          : null;

      if (!modelUri) {
        console.error('Некорректный URI модели:', asset.localUri, asset.uri);
        return;
      }

      const loader = new GLTFLoader();
      loader.load(
        modelUri,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.6, 0.6, 0.6);
          scene.add(model);
          modelRef.current = model;

          setIsModelReady(true);

          const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            model.rotation.y += 0.02;
            renderer.render(scene, camera);
            gl.endFrameEXP();
          };

          animate();
        },
        undefined,
        (error) => {
          console.error('Ошибка загрузки GLB модели:', error);
        }
      );
    } catch (e) {
      console.error('Ошибка при загрузке модели:', e);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);

      if (modelRef.current) {
        sceneRef.current?.remove(modelRef.current);
        modelRef.current.traverse((child) => {
          if ((child as THREE.Mesh).geometry) {
            (child as THREE.Mesh).geometry.dispose?.();
          }

          const material = (child as THREE.Mesh).material;
          const disposeMaterial = (mat: THREE.Material) => {
            for (const key in mat) {
              const val = (mat as any)[key];
              if (val?.isTexture) val.dispose?.();
            }
            mat.dispose?.();
          };
          Array.isArray(material)
            ? material.forEach(disposeMaterial)
            : material && disposeMaterial(material);
        });
      }

      sceneRef.current?.clear?.();
      sceneRef.current = null;

      rendererRef.current?.dispose?.();
      rendererRef.current = null;

      glRef.current = null;
      modelRef.current = null;
    };
  }, []);

  const isOffscreen = (
    x: number,
    y: number,
    width: number,
    height: number,
    padding = 100
  ) => (
    x < -padding || x > width + padding || y < -padding || y > height + padding
  );

  if (isOffscreen(screenX, screenY, screenWidth, screenHeight)) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: screenY - 42,
        left: screenX - 42,
        width: 70,
        height: 70,
      }}
    >
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={{ width: '100%', height: '100%' }}>
          <GLView
            style={{ flex: 1 }}
            onContextCreate={onContextCreate}
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};
