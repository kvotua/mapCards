import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, Animated } from 'react-native';
import MapView, {
  Marker,
  LongPressEvent,
  MapType,
  Region,
  PanDragEvent,
} from 'react-native-maps';
import { UserMarker } from '../../../entities/marker/model/userMarker';
import { Marker3D } from '../../../entities/marker3d/ui/Marker3d';
import globalStyles from '../../../app/styles/globalStyles';

interface Point { x: number; y: number }

type Props = {
  initialRegion: Region;
  userMarkers: UserMarker[];
  userLocationMarker: { latitude: number; longitude: number } | null;
  onMapLongPress: (e: LongPressEvent) => void;
  onUserMarkerPress: (m: UserMarker) => void;
  onSystemMarkerPress: (m: any) => void;
  mapType: MapType;
  mapRef: React.RefObject<MapView>;
  resolvedMarkers: { key: string; latitude: number; longitude: number; model: any }[];
};

export const MapViewContainer: React.FC<Props> = ({
  initialRegion,
  userMarkers,
  userLocationMarker,
  onMapLongPress,
  onUserMarkerPress,
  onSystemMarkerPress,
  mapType,
  mapRef,
  resolvedMarkers,
}) => {
  const [baseCoords, setBaseCoords] = useState<Record<string, Point>>({});
  const [initialCenter, setInitialCenter] = useState<Point | null>(null);
  const [mapOffset, setMapOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [markersReady, setMarkersReady] = useState(false);
  const [modelsVisible, setModelsVisible] = useState(true);

  const recalcBase = async () => {
    if (!mapRef.current) return;
    try {
      setMarkersReady(false);

      const centerP = await mapRef.current.pointForCoordinate({
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
      });
      setInitialCenter(centerP);

      const coords: Record<string, Point> = {};
      for (const m of resolvedMarkers) {
        const p = await mapRef.current.pointForCoordinate({
          latitude: m.latitude,
          longitude: m.longitude,
        });
        coords[m.key] = p;
      }

      setBaseCoords(coords);
      setMapOffset({ x: 0, y: 0 });
      setMarkersReady(true);
    } catch (err) {
      setMarkersReady(true);
    }
  };

  useEffect(() => {
    recalcBase();
  }, [resolvedMarkers]);

  const panStart = useRef<Point | null>(null);

  const handlePanDrag = (e: PanDragEvent) => {
    const { x, y } = e.nativeEvent.position;
    const current = { x, y };

    if (!panStart.current) {
      panStart.current = current;
      return;
    }

    const dx = (current.x - panStart.current.x) * 0.35;
    const dy = (current.y - panStart.current.y) * 0.35;

    setMapOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    panStart.current = current;
  };

  const handleRegionChangeComplete = () => {
    setMapOffset({ x: 0, y: 0 });
    panStart.current = null;
    recalcBase();
  };

  const animateToRegionAsync = (region: Region, duration: number): Promise<void> => {
    return new Promise(resolve => {
      mapRef.current?.animateToRegion(region, duration);
      setTimeout(resolve, duration);
    });
  };

  return (
    <View style={globalStyles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType={mapType}
        zoomEnabled
        zoomControlEnabled
        onLongPress={onMapLongPress}
        onPanDrag={handlePanDrag}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {userLocationMarker && (
          <Marker coordinate={userLocationMarker}>
            <Image
              source={require('../../../../assets/user.png')}
              style={{ width: 30, height: 30 }}
            />
          </Marker>
        )}

        {userMarkers.map(m => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            pinColor="#4287f5"
            onPress={() => onUserMarkerPress(m)}
          />
        ))}
      </MapView>

      {initialCenter && markersReady && modelsVisible && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [
                { translateX: mapOffset.x },
                { translateY: mapOffset.y },
              ],
            },
          ]}
        >
          {Object.entries(baseCoords).map(([key, { x, y }]) => {
            const m = resolvedMarkers.find(r => r.key === key);
            if (!m) return null;
            return (
              <Marker3D
                key={key}
                modelAsset={m.model}
                screenX={x}
                screenY={y}
                onPress={() => {
                  setModelsVisible(false);
                  animateToRegionAsync(
                    {
                      latitude: m.latitude,
                      longitude: m.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    },
                    800
                  ).then(() => {
                    setModelsVisible(true);
                    onSystemMarkerPress(m);
                  });
                }}
              />
            );
          })}
        </Animated.View>
      )}
    </View>
  );
};
