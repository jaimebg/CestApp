import { useRef, useState, useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Rect } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import {
  type ZoneDefinition,
  type ZoneType,
  type NormalizedBoundingBox,
  ZONE_COLORS,
} from '../../types/zones';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface MoveState {
  zoneId: string;
  startBoundingBox: NormalizedBoundingBox;
  startTouchX: number;
  startTouchY: number;
}

interface ZoneSelectionCanvasProps {
  imageUri: string;
  zones: ZoneDefinition[];
  onZonesChange: (zones: ZoneDefinition[]) => void;
  activeZoneType: ZoneType;
  mode: 'draw' | 'select' | 'delete';
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  imageDimensions: { width: number; height: number };
}

export function ZoneSelectionCanvas({
  imageUri,
  zones,
  onZonesChange,
  activeZoneType,
  mode,
  selectedZoneId,
  onSelectZone,
  imageDimensions,
}: ZoneSelectionCanvasProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerRef = useRef<View>(null);
  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  const aspectRatio = imageDimensions.width / imageDimensions.height;
  const displayWidth = screenWidth - 32;
  const displayHeight = displayWidth / aspectRatio;

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const currentX = useSharedValue(0);
  const currentY = useSharedValue(0);
  const isDrawing = useSharedValue(false);

  const [tempZone, setTempZone] = useState<NormalizedBoundingBox | null>(null);
  const [moveState, setMoveState] = useState<MoveState | null>(null);
  const [movingZonePosition, setMovingZonePosition] = useState<NormalizedBoundingBox | null>(null);

  const normalizeCoordinates = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      if (!containerLayout) return { x: 0, y: 0 };
      const normalizedX = Math.max(0, Math.min(1, x / containerLayout.width));
      const normalizedY = Math.max(0, Math.min(1, y / containerLayout.height));
      return { x: normalizedX, y: normalizedY };
    },
    [containerLayout]
  );

  const updateTempZone = useCallback(
    (sX: number, sY: number, cX: number, cY: number) => {
      const start = normalizeCoordinates(sX, sY);
      const end = normalizeCoordinates(cX, cY);

      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      if (width > 0.02 && height > 0.02) {
        setTempZone({ x, y, width, height });
      }
    },
    [normalizeCoordinates]
  );

  const finishDrawing = useCallback(
    (sX: number, sY: number, cX: number, cY: number) => {
      const start = normalizeCoordinates(sX, sY);
      const end = normalizeCoordinates(cX, cY);

      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      if (width > 0.02 && height > 0.02) {
        const newZone: ZoneDefinition = {
          id: generateId(),
          type: activeZoneType,
          boundingBox: { x, y, width, height },
          isRequired: false,
        };
        onZonesChange([...zones, newZone]);
      }

      setTempZone(null);
    },
    [normalizeCoordinates, activeZoneType, zones, onZonesChange]
  );

  const handleZoneTap = useCallback(
    (zoneId: string) => {
      if (mode === 'delete') {
        onZonesChange(zones.filter((z) => z.id !== zoneId));
        onSelectZone(null);
      } else if (mode === 'select') {
        onSelectZone(selectedZoneId === zoneId ? null : zoneId);
      }
    },
    [mode, zones, onZonesChange, onSelectZone, selectedZoneId]
  );

  const handleTap = useCallback(
    (eventX: number, eventY: number) => {
      if (!containerLayout) return;
      const tapX = Math.max(0, Math.min(1, eventX / containerLayout.width));
      const tapY = Math.max(0, Math.min(1, eventY / containerLayout.height));

      for (const zone of zones) {
        const bb = zone.boundingBox;
        if (tapX >= bb.x && tapX <= bb.x + bb.width && tapY >= bb.y && tapY <= bb.y + bb.height) {
          handleZoneTap(zone.id);
          return;
        }
      }
      onSelectZone(null);
    },
    [containerLayout, zones, handleZoneTap, onSelectZone]
  );

  // Start moving a zone
  const startMoveZone = useCallback(
    (eventX: number, eventY: number) => {
      if (!containerLayout || !selectedZoneId) return false;

      const selectedZone = zones.find((z) => z.id === selectedZoneId);
      if (!selectedZone) return false;

      const touchX = eventX / containerLayout.width;
      const touchY = eventY / containerLayout.height;
      const bb = selectedZone.boundingBox;

      // Check if touch is inside the selected zone
      if (
        touchX >= bb.x &&
        touchX <= bb.x + bb.width &&
        touchY >= bb.y &&
        touchY <= bb.y + bb.height
      ) {
        setMoveState({
          zoneId: selectedZoneId,
          startBoundingBox: { ...bb },
          startTouchX: touchX,
          startTouchY: touchY,
        });
        setMovingZonePosition({ ...bb });
        return true;
      }
      return false;
    },
    [containerLayout, selectedZoneId, zones]
  );

  // Update zone position while moving
  const updateMoveZone = useCallback(
    (eventX: number, eventY: number) => {
      if (!containerLayout || !moveState) return;

      const touchX = eventX / containerLayout.width;
      const touchY = eventY / containerLayout.height;

      const deltaX = touchX - moveState.startTouchX;
      const deltaY = touchY - moveState.startTouchY;

      // Calculate new position, clamping to canvas bounds
      const newX = Math.max(
        0,
        Math.min(1 - moveState.startBoundingBox.width, moveState.startBoundingBox.x + deltaX)
      );
      const newY = Math.max(
        0,
        Math.min(1 - moveState.startBoundingBox.height, moveState.startBoundingBox.y + deltaY)
      );

      setMovingZonePosition({
        x: newX,
        y: newY,
        width: moveState.startBoundingBox.width,
        height: moveState.startBoundingBox.height,
      });
    },
    [containerLayout, moveState]
  );

  // Finish moving a zone
  const finishMoveZone = useCallback(() => {
    if (!moveState || !movingZonePosition) {
      setMoveState(null);
      setMovingZonePosition(null);
      return;
    }

    // Update the zone with new position
    onZonesChange(
      zones.map((z) => (z.id === moveState.zoneId ? { ...z, boundingBox: movingZonePosition } : z))
    );

    setMoveState(null);
    setMovingZonePosition(null);
  }, [moveState, movingZonePosition, zones, onZonesChange]);

  // Pan gesture for drawing new zones
  const drawPanGesture = Gesture.Pan()
    .enabled(mode === 'draw')
    .onStart((event) => {
      startX.value = event.x;
      startY.value = event.y;
      currentX.value = event.x;
      currentY.value = event.y;
      isDrawing.value = true;
    })
    .onUpdate((event) => {
      currentX.value = event.x;
      currentY.value = event.y;
      runOnJS(updateTempZone)(startX.value, startY.value, currentX.value, currentY.value);
    })
    .onEnd(() => {
      isDrawing.value = false;
      runOnJS(finishDrawing)(startX.value, startY.value, currentX.value, currentY.value);
    });

  // Helper to start move and set the shared value
  const tryStartMove = useCallback(
    (eventX: number, eventY: number) => {
      return startMoveZone(eventX, eventY);
    },
    [startMoveZone]
  );

  // Pan gesture for moving selected zones
  const movePanGesture = Gesture.Pan()
    .enabled(mode === 'select' && selectedZoneId !== null)
    .onStart((event) => {
      runOnJS(tryStartMove)(event.x, event.y);
    })
    .onUpdate((event) => {
      runOnJS(updateMoveZone)(event.x, event.y);
    })
    .onEnd(() => {
      runOnJS(finishMoveZone)();
    });

  const tapGesture = Gesture.Tap()
    .enabled(mode === 'select' || mode === 'delete')
    .onEnd((event) => {
      runOnJS(handleTap)(event.x, event.y);
    });

  // Use Race to allow either tap or pan in select mode
  const composedGesture = Gesture.Race(drawPanGesture, movePanGesture, tapGesture);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="items-center">
        <GestureDetector gesture={composedGesture}>
          <View
            ref={containerRef}
            style={{ width: displayWidth, height: displayHeight }}
            onLayout={(event) => {
              const { width, height, x, y } = event.nativeEvent.layout;
              setContainerLayout({ width, height, x, y });
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: displayWidth, height: displayHeight }}
              contentFit="fill"
            />

            <Svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: displayWidth,
                height: displayHeight,
              }}
            >
              {zones.map((zone) => {
                // Use moving position if this zone is being moved
                const isBeingMoved = moveState?.zoneId === zone.id && movingZonePosition;
                const bb = isBeingMoved ? movingZonePosition : zone.boundingBox;
                const isSelected = selectedZoneId === zone.id;
                return (
                  <Rect
                    key={zone.id}
                    x={bb.x * displayWidth}
                    y={bb.y * displayHeight}
                    width={bb.width * displayWidth}
                    height={bb.height * displayHeight}
                    fill={`${ZONE_COLORS[zone.type]}${isBeingMoved ? '60' : '40'}`}
                    stroke={ZONE_COLORS[zone.type]}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isSelected ? '5,3' : '0'}
                  />
                );
              })}

              {tempZone && (
                <Rect
                  x={tempZone.x * displayWidth}
                  y={tempZone.y * displayHeight}
                  width={tempZone.width * displayWidth}
                  height={tempZone.height * displayHeight}
                  fill={`${ZONE_COLORS[activeZoneType]}40`}
                  stroke={ZONE_COLORS[activeZoneType]}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
              )}
            </Svg>
          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}
