import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  LongPressEvent,
  MapType,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import { UserMarker } from '../../../entities/marker/model/userMarker';
import { Marker3D } from '../../../entities/marker3d/ui/Marker3d';
import globalStyles from '../../../app/styles/globalStyles';

type Props = {
  initialRegion: Region;
  userMarkers: UserMarker[];
  userLocationMarker: { latitude: number; longitude: number } | null;
  onMapLongPress: (event: LongPressEvent) => void;
  onMapPress: () => void;
  onUserMarkerPress: (marker: UserMarker) => void;
  onSystemMarkerPress: (marker: any) => void;
  mapType: MapType;
  mapRef: React.RefObject<MapView>;
  resolvedMarkers: any[];
};

export const MapViewContainer: React.FC<Props> = ({
  initialRegion,
  userMarkers,
  resolvedMarkers,
  userLocationMarker,
  onMapLongPress,
  onMapPress,
  onSystemMarkerPress,
  onUserMarkerPress,
  mapType,
  mapRef,
}) => {

  const [mapLayout, setMapLayout] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [screenCoords, setScreenCoords] = useState<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    const updateScreenCoords = async () => {
      if (!mapRef.current) return;
  
      const newCoords: Record<string, { x: number; y: number }> = {};
      for (const m of resolvedMarkers) {
        try {
          const point = await mapRef.current.pointForCoordinate({
            latitude: m.latitude,
            longitude: m.longitude,
          });
          newCoords[m.key] = {
            x: point.x + mapLayout.x,
            y: point.y + mapLayout.y,
          };          
        } catch (err) {
          console.warn('Ошибка:', err);
        }
      }
      setScreenCoords(newCoords);
    };
  
    updateScreenCoords();
    const interval = setInterval(updateScreenCoords, 500);
    return () => clearInterval(interval);
  }, [resolvedMarkers]);  

  return (
    <View style={globalStyles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        onPress={onMapPress}
        onLongPress={onMapLongPress}
        mapType={mapType}
        zoomEnabled
        zoomControlEnabled
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          setMapLayout({ x, y });
        }}
      >
        {userLocationMarker && (
          <Marker coordinate={userLocationMarker}>
            <Image
              source={require('../../../../assets/user.png')}
              style={{ width: 30, height: 30 }}
            />
          </Marker>
        )}

        {userMarkers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{
              latitude: m.latitude,
              longitude: m.longitude,
            }}
            title={m.title}
            pinColor="#4287f5"
            onPress={() => onUserMarkerPress(m)}
          />
        ))}
      </MapView>

      {Object.entries(screenCoords).map(([key, coords]) => {
        const marker = resolvedMarkers.find(m => m.key === key);
        if (!marker || !coords) return null;

        return (
          <Marker3D
            key={key}
            modelAsset={marker.model}
            screenX={coords.x}
            screenY={coords.y}
            onPress={() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(
                  {
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  },
                  1000
                );
              }
              onSystemMarkerPress(marker);
            }}
          />
        );
      })}
    </View>
  );
};
