import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GridMap, GridTile, EditorTool, ElevationMode } from '../types';
import { getTerrain, getMapObject } from '../constants/tiles';
import {
  Grid,
  RotateCw,
  Maximize2,
  Mountain,
  Camera,
  Compass,
} from 'lucide-react';

interface ThreeTopDownCanvasProps {
  map: GridMap;
  activeTool: EditorTool;
  elevationMode: ElevationMode;
  targetElevation: number;
  selectedTerrain: string;
  selectedObject: string;
  brushSize: number;
  showGrid: boolean;
  showElevation: boolean;
  showLabels: boolean;
  isColorOnlyMode: boolean;
  isPanMode: boolean;
  hoverCoord: { x: number; y: number } | null;
  onTilePointerDown: (x: number, y: number, e: React.PointerEvent<HTMLDivElement>) => void;
  onTilePointerMove: (x: number, y: number, e: React.PointerEvent<HTMLDivElement>) => void;
  onTilePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onHoverCoordChange: (coord: { x: number; y: number } | null) => void;
  onContextMenuTile: (x: number, y: number) => void;
  onToggleGrid?: () => void;
  onToggleElevation?: () => void;
}

// Helpers for color management
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex.startsWith('#') ? hex : `#${hex}`);
}

function adjustHexBrightness(hex: string, percent: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Helper to generate a sprite for emojis/objects
function createObjectSprite(emoji: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.font = '72px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtle circular soft backplate
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillText(emoji, 64, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.9, 0.9, 1);
  return sprite;
}

// Helper to generate a sprite for elevation badges
function createElevationBadgeSprite(elev: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const text = elev > 0 ? `+${elev}` : `${elev}`;
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Rounded pill background
  ctx.fillStyle = elev > 0 ? 'rgba(16, 185, 129, 0.92)' : elev < 0 ? 'rgba(14, 165, 233, 0.92)' : 'rgba(51, 65, 85, 0.85)';
  ctx.beginPath();
  ctx.roundRect(14, 10, 100, 44, 12);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, 64, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.65, 0.32, 1);
  return sprite;
}

// Helper to generate a sprite for tile labels
function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dark badge pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 48, 12);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#38BDF8';
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  // Truncate if long
  const truncated = text.length > 14 ? text.slice(0, 13) + '…' : text;
  ctx.fillText(truncated, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

export const ThreeTopDownCanvas: React.FC<ThreeTopDownCanvasProps> = ({
  map,
  showGrid,
  showElevation,
  showLabels,
  isPanMode,
  onTilePointerDown,
  onTilePointerMove,
  onTilePointerUp,
  onHoverCoordChange,
  onContextMenuTile,
  onToggleGrid,
  onToggleElevation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mapGroupRef = useRef<THREE.Group | null>(null);
  const hoverHighlightRef = useRef<THREE.Mesh | null>(null);
  const gridLinesGroupRef = useRef<THREE.Group | null>(null);
  const tileMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameIdRef = useRef<number>(0);

  // Camera settings: Top-down with 2.5D tilt & rotation
  // Tilt: 60° (standard 2.5D top-down) vs 90° (pure overhead top-down)
  const [tiltAngleDeg, setTiltAngleDeg] = useState<number>(60);
  const [rotationDeg, setRotationDeg] = useState<number>(0); // 0, 90, 180, 270
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Panning interaction state
  const isDraggingPanRef = useRef<boolean>(false);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPaintingRef = useRef<boolean>(false);

  // Raycaster for tile picking
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseNdcRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Setup Three.js Scene once
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070B14');
    sceneRef.current = scene;

    // 2. Orthographic Camera for Top-Down 2.5D view
    const aspect = width / height;
    const frustumSize = Math.max(map.width, map.height) * 1.35;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      -100,
      200
    );
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lighting
    // Directional light from top-left for crisp 2.5D cliff shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
    dirLight.position.set(-15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    const d = Math.max(map.width, map.height) * 1.5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Ambient light
    const ambLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambLight);

    // Hemisphere light for subtle blue sky / warm ground bounce
    const hemiLight = new THREE.HemisphereLight(0xecf2fa, 0x1e293b, 0.4);
    scene.add(hemiLight);

    // 5. Map Group
    const mapGroup = new THREE.Group();
    scene.add(mapGroup);
    mapGroupRef.current = mapGroup;

    // 6. Hover Highlight Box
    const hoverGeo = new THREE.BoxGeometry(1.02, 0.08, 1.02);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
    hoverMesh.visible = false;
    scene.add(hoverMesh);
    hoverHighlightRef.current = hoverMesh;

    // 7. Render Loop
    const renderLoop = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Resize Observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(w, h);
          const newAspect = w / h;
          const fSize = (Math.max(map.width, map.height) * 1.35) / zoomLevel;
          cameraRef.current.left = (-fSize * newAspect) / 2;
          cameraRef.current.right = (fSize * newAspect) / 2;
          cameraRef.current.top = fSize / 2;
          cameraRef.current.bottom = -fSize / 2;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Camera Positioning based on tiltAngleDeg, rotationDeg, zoomLevel, and panOffset
  const updateCamera = useCallback(() => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const aspect = width / height;

    const baseFrustum = Math.max(map.width, map.height) * 1.35;
    const fSize = baseFrustum / zoomLevel;

    camera.left = (-fSize * aspect) / 2;
    camera.right = (fSize * aspect) / 2;
    camera.top = fSize / 2;
    camera.bottom = -fSize / 2;
    camera.updateProjectionMatrix();

    // Calculate camera position in spherical coords looking at map center
    const tiltRad = THREE.MathUtils.degToRad(tiltAngleDeg); // 60° - 90°
    const rotRad = THREE.MathUtils.degToRad(rotationDeg);

    const distance = 50;
    // When tilt is 90°: directly overhead (x=0, y=distance, z=0)
    // When tilt is 60°: looking down from the front-side (2.5D Top-Down)
    const yPos = distance * Math.sin(tiltRad);
    const groundDist = distance * Math.cos(tiltRad);
    const xPos = groundDist * Math.sin(rotRad) + panOffsetRef.current.x;
    const zPos = groundDist * Math.cos(rotRad) + panOffsetRef.current.y;

    camera.position.set(xPos, yPos, zPos);
    camera.lookAt(panOffsetRef.current.x, 0, panOffsetRef.current.y);
  }, [map.width, map.height, zoomLevel, tiltAngleDeg, rotationDeg]);

  useEffect(() => {
    updateCamera();
  }, [updateCamera]);

  // Rebuild 3D Map Tiles when map data, grid, elevation, or labels change
  useEffect(() => {
    const mapGroup = mapGroupRef.current;
    if (!mapGroup) return;

    // Clear previous objects
    while (mapGroup.children.length > 0) {
      const obj = mapGroup.children[0];
      mapGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    tileMeshesRef.current = [];

    const gridLinesGroup = new THREE.Group();
    gridLinesGroupRef.current = gridLinesGroup;

    // Dimensions
    const halfW = map.width / 2;
    const halfH = map.height / 2;
    const baseHeight = 0.5;
    const elevStep = 0.35;

    // Cache materials by color for performance
    const materialCache = new Map<string, THREE.Material[]>();

    const getMaterialsForTile = (terrainColor: string, isWater: boolean) => {
      const key = `${terrainColor}_${isWater}`;
      if (materialCache.has(key)) return materialCache.get(key)!;

      const topColor = hexToThreeColor(terrainColor);
      // Darker cliff color for sides
      const sideHex = adjustHexBrightness(terrainColor, -35);
      const sideColor = hexToThreeColor(sideHex);

      const topMat = new THREE.MeshStandardMaterial({
        color: topColor,
        roughness: isWater ? 0.2 : 0.75,
        metalness: isWater ? 0.3 : 0.05,
      });

      const sideMat = new THREE.MeshStandardMaterial({
        color: sideColor,
        roughness: 0.9,
        metalness: 0.1,
      });

      // Materials order in BoxGeometry: [right, left, top, bottom, front, back]
      const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      materialCache.set(key, mats);
      return mats;
    };

    // Shared geometry for grid line borders on top face
    const linePoints = [
      new THREE.Vector3(-0.498, 0, -0.498),
      new THREE.Vector3(0.498, 0, -0.498),
      new THREE.Vector3(0.498, 0, 0.498),
      new THREE.Vector3(-0.498, 0, 0.498),
      new THREE.Vector3(-0.498, 0, -0.498),
    ];
    const gridLineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const gridLineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthTest: true,
    });

    // Create a 3D Block for each tile
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const idx = y * map.width + x;
        const tile: GridTile = map.tiles[idx] || { terrain: 'grass', obj: '' };
        const terrain = getTerrain(tile.terrain);
        const elev = tile.elevation ?? 0;

        // Tile height extruded from elevation
        const totalHeight = Math.max(0.12, baseHeight + elev * elevStep);
        const posX = x - halfW + 0.5;
        const posZ = y - halfH + 0.5;
        const posY = totalHeight / 2; // block sits on ground plane Y=0

        const isWater = tile.terrain.includes('water');
        const mats = getMaterialsForTile(terrain.baseColor, isWater);

        const geo = new THREE.BoxGeometry(1, totalHeight, 1);
        const mesh = new THREE.Mesh(geo, mats);
        mesh.position.set(posX, posY, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Custom metadata for raycasting
        mesh.userData = { gridX: x, gridY: y, elev, terrain: tile.terrain, obj: tile.obj };
        mapGroup.add(mesh);
        tileMeshesRef.current.push(mesh);

        // Top face Y
        const topY = totalHeight;

        // Grid lines overlay on top of tile
        if (showGrid) {
          const lines = new THREE.Line(gridLineGeo, gridLineMat);
          lines.position.set(posX, topY + 0.005, posZ);
          gridLinesGroup.add(lines);
        }

        // Map Object (3D billboard sprite)
        if (tile.obj) {
          const objDef = getMapObject(tile.obj);
          if (objDef) {
            const sprite = createObjectSprite(objDef.iconEmoji);
            sprite.position.set(posX, topY + 0.5, posZ);
            mapGroup.add(sprite);
          }
        }

        // Elevation Badge (if enabled & non-zero)
        if (showElevation && elev !== 0) {
          const badgeSprite = createElevationBadgeSprite(elev);
          badgeSprite.position.set(posX, topY + 0.32, posZ);
          mapGroup.add(badgeSprite);
        }

        // Tile Label (if present and enabled)
        if (showLabels && tile.label) {
          const labelSprite = createLabelSprite(tile.label);
          labelSprite.position.set(posX, topY + 0.72, posZ);
          mapGroup.add(labelSprite);
        }
      }
    }

    if (showGrid) {
      mapGroup.add(gridLinesGroup);
    }

    // Outer Map Border Floor / Base Plinth
    const plinthGeo = new THREE.BoxGeometry(map.width + 0.4, 0.2, map.height + 0.4);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // dark slate
      roughness: 0.9,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(0, -0.1, 0);
    plinth.receiveShadow = true;
    mapGroup.add(plinth);
  }, [map, showGrid, showElevation, showLabels]);

  // Raycast screen coordinates to grid tile
  const raycastGrid = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current || !cameraRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -(((clientY - rect.top) / rect.height) * 2 - 1);

    mouseNdcRef.current.set(mouseX, mouseY);
    raycasterRef.current.setFromCamera(mouseNdcRef.current, cameraRef.current);

    const intersects = raycasterRef.current.intersectObjects(tileMeshesRef.current, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData && typeof hit.userData.gridX === 'number') {
        return { x: hit.userData.gridX, y: hit.userData.gridY };
      }
    }
    return null;
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If middle click or pan mode active or space pressed: start pan
    if (e.button === 1 || e.button === 2 || isPanMode) {
      isDraggingPanRef.current = true;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      const coord = raycastGrid(e.clientX, e.clientY);
      if (coord) {
        isPaintingRef.current = true;
        onTilePointerDown(coord.x, coord.y, e);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Handle pan dragging
    if (isDraggingPanRef.current) {
      const dx = e.clientX - lastPointerPosRef.current.x;
      const dy = e.clientY - lastPointerPosRef.current.y;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

      const panSpeed = 0.04 / zoomLevel;
      // Pan according to rotation
      const rotRad = THREE.MathUtils.degToRad(rotationDeg);
      panOffsetRef.current.x -= (dx * Math.cos(rotRad) - dy * Math.sin(rotRad)) * panSpeed;
      panOffsetRef.current.y -= (dx * Math.sin(rotRad) + dy * Math.cos(rotRad)) * panSpeed;
      updateCamera();
      return;
    }

    const coord = raycastGrid(e.clientX, e.clientY);
    onHoverCoordChange(coord);

    // Update 3D hover highlight mesh
    if (hoverHighlightRef.current) {
      if (coord && coord.x >= 0 && coord.x < map.width && coord.y >= 0 && coord.y < map.height) {
        const halfW = map.width / 2;
        const halfH = map.height / 2;
        const tile = map.tiles[coord.y * map.width + coord.x] || { elevation: 0 };
        const elev = tile.elevation ?? 0;
        const totalHeight = Math.max(0.12, 0.5 + elev * 0.35);

        hoverHighlightRef.current.position.set(
          coord.x - halfW + 0.5,
          totalHeight + 0.04,
          coord.y - halfH + 0.5
        );
        hoverHighlightRef.current.visible = true;
      } else {
        hoverHighlightRef.current.visible = false;
      }
    }

    // Paint if drawing active
    if (isPaintingRef.current && coord) {
      onTilePointerMove(coord.x, coord.y, e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingPanRef.current = false;
    isPaintingRef.current = false;
    onTilePointerUp(e);
  };

  // Zoom via wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoomLevel(prev => Math.min(4.0, Math.max(0.3, prev * zoomFactor)));
  };

  // Right-click to name/inspect tile
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const coord = raycastGrid(e.clientX, e.clientY);
    if (coord) {
      onContextMenuTile(coord.x, coord.y);
    }
  };

  // Reset camera view
  const handleResetCamera = () => {
    panOffsetRef.current = { x: 0, y: 0 };
    setZoomLevel(1);
    setTiltAngleDeg(60);
    setRotationDeg(0);
  };

  // Rotate camera 90°
  const handleRotateCw = () => {
    setRotationDeg(prev => (prev + 90) % 360);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      className="flex-1 relative overflow-hidden cursor-crosshair select-none touch-none w-full h-full"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Floating 2.5D Top-Down Camera Controls Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center bg-slate-900/95 border border-slate-800 rounded-xl p-1 shadow-xl backdrop-blur-md gap-1">
        {/* Tilt Mode Toggle: 60° (2.5D Top-Down) vs 90° (Overhead) */}
        <button
          id="three-tilt-toggle-btn"
          onClick={() => setTiltAngleDeg(prev => (prev === 60 ? 90 : 60))}
          title={tiltAngleDeg === 60 ? 'Switch to Pure 90° Overhead Top-Down' : 'Switch to 60° Tilted 2.5D Top-Down'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tiltAngleDeg === 60
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{tiltAngleDeg === 60 ? '2.5D Tilt (60°)' : 'Overhead (90°)'}</span>
        </button>

        {/* Rotate 90° */}
        <button
          id="three-rotate-btn"
          onClick={handleRotateCw}
          title="Rotate Diorama 90° Clockwise"
          className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono">{rotationDeg}°</span>
        </button>

        {/* Reset Camera */}
        <button
          id="three-reset-camera-btn"
          onClick={handleResetCamera}
          title="Reset Camera & Center Map"
          className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Grid Toggle in 3D */}
        {onToggleGrid && (
          <button
            id="three-toggle-grid-btn"
            onClick={onToggleGrid}
            title={showGrid ? 'Hide 3D Grid Lines (G)' : 'Show 3D Grid Lines (G)'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showGrid
                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Elevation Badges Toggle */}
        {onToggleElevation && (
          <button
            id="three-toggle-elevation-btn"
            onClick={onToggleElevation}
            title={showElevation ? 'Hide Elevation Badges (H)' : 'Show Elevation Badges (H)'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showElevation
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2.5D Top-Down Mode Indicator Pill */}
      <div className="absolute top-4 left-36 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-sky-300 shadow-md backdrop-blur-md">
        <Compass className="w-3.5 h-3.5 text-sky-400" />
        <span>Three.js 2.5D Top-Down</span>
      </div>
    </div>
  );
};
