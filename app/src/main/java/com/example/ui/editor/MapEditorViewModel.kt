package com.example.ui.editor

import androidx.compose.ui.geometry.Offset
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.MapObjectType
import com.example.data.model.TerrainType
import com.example.data.repository.MapRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.LinkedList

enum class EditorTool {
    BRUSH,
    FILL_BUCKET,
    ERASER,
    EYEDROPPER
}

enum class CanvasDirection {
    NORTH,
    SOUTH,
    EAST,
    WEST,
    ALL_SIDES
}

data class TileMutation(
    val index: Int,
    val oldTile: GridTile,
    val newTile: GridTile
)

data class EditorUiState(
    val map: GridMap? = null,
    val activeTool: EditorTool = EditorTool.BRUSH,
    val selectedTerrain: TerrainType = TerrainType.GRASS,
    val selectedObject: MapObjectType = MapObjectType.NONE,
    val brushSize: Int = 1, // 1, 2, 3
    val showGrid: Boolean = true,
    val isPanMode: Boolean = false,
    val isInfiniteCanvas: Boolean = true,
    val zoom: Float = 1f,
    val panOffset: Offset = Offset.Zero,
    val canUndo: Boolean = false,
    val canRedo: Boolean = false,
    val selectedPaletteTab: Int = 0, // 0 = Terrains, 1 = Objects
    val isSaved: Boolean = true,
    val worldMapIdContext: Long? = null,
    val isColorOnlyMode: Boolean = false,
    val showLegendDialog: Boolean = false
)

class MapEditorViewModel(
    private val repository: MapRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditorUiState())
    val uiState: StateFlow<EditorUiState> = _uiState.asStateFlow()

    private val undoStack = LinkedList<List<TileMutation>>()
    private val redoStack = LinkedList<List<TileMutation>>()
    private val currentStrokeMutations = mutableMapOf<Int, TileMutation>()

    fun loadMap(mapId: Long, worldMapContext: Long? = null) {
        viewModelScope.launch {
            val map = repository.getMap(mapId)
            if (map != null) {
                undoStack.clear()
                redoStack.clear()
                _uiState.update {
                    it.copy(
                        map = map,
                        canUndo = false,
                        canRedo = false,
                        worldMapIdContext = worldMapContext,
                        zoom = 1f,
                        panOffset = Offset.Zero
                    )
                }
            }
        }
    }

    fun setTool(tool: EditorTool) {
        _uiState.update { it.copy(activeTool = tool, isPanMode = false) }
    }

    fun setBrushSize(size: Int) {
        _uiState.update { it.copy(brushSize = size.coerceIn(1, 3)) }
    }

    fun selectTerrain(terrain: TerrainType) {
        _uiState.update {
            it.copy(
                selectedTerrain = terrain,
                selectedObject = MapObjectType.NONE,
                activeTool = EditorTool.BRUSH
            )
        }
    }

    fun selectObject(obj: MapObjectType) {
        _uiState.update {
            it.copy(
                selectedObject = obj,
                activeTool = EditorTool.BRUSH
            )
        }
    }

    fun setPaletteTab(tab: Int) {
        _uiState.update { it.copy(selectedPaletteTab = tab) }
    }

    fun toggleGrid() {
        _uiState.update { it.copy(showGrid = !it.showGrid) }
    }

    fun togglePanMode() {
        _uiState.update { it.copy(isPanMode = !it.isPanMode) }
    }

    fun updateZoomAndPan(zoomDelta: Float, panDelta: Offset) {
        _uiState.update { state ->
            val newZoom = (state.zoom * zoomDelta).coerceIn(0.4f, 4.0f)
            val newPan = state.panOffset + panDelta
            state.copy(zoom = newZoom, panOffset = newPan)
        }
    }

    fun resetView() {
        _uiState.update { it.copy(zoom = 1f, panOffset = Offset.Zero) }
    }

    // Touch event handling
    fun onTouchDown(cellX: Int, cellY: Int, baseCellSize: Float = 32f) {
        currentStrokeMutations.clear()
        applyToolAt(cellX, cellY, baseCellSize)
    }

    fun onTouchMove(cellX: Int, cellY: Int, baseCellSize: Float = 32f) {
        if (_uiState.value.activeTool == EditorTool.BRUSH || _uiState.value.activeTool == EditorTool.ERASER) {
            applyToolAt(cellX, cellY, baseCellSize)
        }
    }

    fun onTouchUp() {
        if (currentStrokeMutations.isNotEmpty()) {
            val mutationsList = currentStrokeMutations.values.toList()
            undoStack.push(mutationsList)
            if (undoStack.size > 50) undoStack.removeLast()
            redoStack.clear()
            _uiState.update { it.copy(canUndo = true, canRedo = false, isSaved = false) }
            currentStrokeMutations.clear()
            autoSave()
        }
    }

    private fun applyToolAt(targetCx: Int, targetCy: Int, baseCellSize: Float = 32f) {
        var currentMap = _uiState.value.map ?: return
        var cx = targetCx
        var cy = targetCy

        if (_uiState.value.isInfiniteCanvas) {
            if (cx !in 0 until currentMap.width || cy !in 0 until currentMap.height) {
                val chunk = 4
                val maxDim = 512
                val addLeft = if (cx < 0) maxOf(chunk, -cx).coerceAtMost(maxDim - currentMap.width) else 0
                val addRight = if (cx >= currentMap.width) maxOf(chunk, cx - currentMap.width + 1).coerceAtMost(maxDim - currentMap.width) else 0
                val addTop = if (cy < 0) maxOf(chunk, -cy).coerceAtMost(maxDim - currentMap.height) else 0
                val addBottom = if (cy >= currentMap.height) maxOf(chunk, cy - currentMap.height + 1).coerceAtMost(maxDim - currentMap.height) else 0

                if (addLeft > 0 || addRight > 0 || addTop > 0 || addBottom > 0) {
                    val fillTerrain = currentMap.tiles.firstOrNull()?.terrain ?: TerrainType.GRASS
                    val expandedMap = currentMap.expandMap(addLeft, addTop, addRight, addBottom, fillTerrain)

                    if (currentStrokeMutations.isNotEmpty()) {
                        val shifted = mutableMapOf<Int, TileMutation>()
                        for ((oldIdx, mut) in currentStrokeMutations) {
                            val oldX = oldIdx % currentMap.width
                            val oldY = oldIdx / currentMap.width
                            val newX = oldX + addLeft
                            val newY = oldY + addTop
                            val newIdx = newY * expandedMap.width + newX
                            shifted[newIdx] = mut.copy(index = newIdx)
                        }
                        currentStrokeMutations.clear()
                        currentStrokeMutations.putAll(shifted)
                    }

                    val deltaW = (addLeft + addRight) * baseCellSize
                    val deltaH = (addTop + addBottom) * baseCellSize
                    val newPanX = _uiState.value.panOffset.x + (deltaW / 2f) - (addLeft * baseCellSize * _uiState.value.zoom)
                    val newPanY = _uiState.value.panOffset.y + (deltaH / 2f) - (addTop * baseCellSize * _uiState.value.zoom)

                    cx += addLeft
                    cy += addTop
                    currentMap = expandedMap

                    _uiState.update {
                        it.copy(
                            map = expandedMap,
                            panOffset = Offset(newPanX, newPanY),
                            isSaved = false
                        )
                    }
                }
            }
        }

        if (cx !in 0 until currentMap.width || cy !in 0 until currentMap.height) return

        when (_uiState.value.activeTool) {
            EditorTool.BRUSH -> {
                val size = _uiState.value.brushSize
                val offset = (size - 1) / 2
                val updates = mutableMapOf<Int, GridTile>()

                for (dy in 0 until size) {
                    for (dx in 0 until size) {
                        val tx = cx - offset + dx
                        val ty = cy - offset + dy
                        if (tx in 0 until currentMap.width && ty in 0 until currentMap.height) {
                            val idx = ty * currentMap.width + tx
                            val oldTile = currentMap.tiles[idx]
                            val newTile = if (_uiState.value.selectedObject != MapObjectType.NONE) {
                                oldTile.copy(obj = _uiState.value.selectedObject)
                            } else {
                                oldTile.copy(terrain = _uiState.value.selectedTerrain)
                            }
                            if (oldTile != newTile && !currentStrokeMutations.containsKey(idx)) {
                                currentStrokeMutations[idx] = TileMutation(idx, oldTile, newTile)
                            }
                            updates[idx] = newTile
                        }
                    }
                }

                if (updates.isNotEmpty()) {
                    _uiState.update { it.copy(map = currentMap.withTilesUpdated(updates)) }
                }
            }
            EditorTool.ERASER -> {
                val size = _uiState.value.brushSize
                val offset = (size - 1) / 2
                val updates = mutableMapOf<Int, GridTile>()

                for (dy in 0 until size) {
                    for (dx in 0 until size) {
                        val tx = cx - offset + dx
                        val ty = cy - offset + dy
                        if (tx in 0 until currentMap.width && ty in 0 until currentMap.height) {
                            val idx = ty * currentMap.width + tx
                            val oldTile = currentMap.tiles[idx]
                            // If it has an object, clear object first. If no object, reset to default plains/grass
                            val newTile = if (oldTile.obj != MapObjectType.NONE) {
                                oldTile.copy(obj = MapObjectType.NONE)
                            } else {
                                GridTile(TerrainType.GRASS, MapObjectType.NONE)
                            }
                            if (oldTile != newTile && !currentStrokeMutations.containsKey(idx)) {
                                currentStrokeMutations[idx] = TileMutation(idx, oldTile, newTile)
                            }
                            updates[idx] = newTile
                        }
                    }
                }

                if (updates.isNotEmpty()) {
                    _uiState.update { it.copy(map = currentMap.withTilesUpdated(updates)) }
                }
            }
            EditorTool.FILL_BUCKET -> {
                performFloodFill(cx, cy)
            }
            EditorTool.EYEDROPPER -> {
                val tile = currentMap.getTile(cx, cy)
                if (tile.obj != MapObjectType.NONE) {
                    _uiState.update {
                        it.copy(
                            selectedObject = tile.obj,
                            selectedPaletteTab = 1,
                            activeTool = EditorTool.BRUSH
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            selectedTerrain = tile.terrain,
                            selectedObject = MapObjectType.NONE,
                            selectedPaletteTab = 0,
                            activeTool = EditorTool.BRUSH
                        )
                    }
                }
            }
        }
    }

    private fun performFloodFill(startX: Int, startY: Int) {
        val currentMap = _uiState.value.map ?: return
        val startIdx = startY * currentMap.width + startX
        val targetTerrain = currentMap.tiles[startIdx].terrain
        val fillTerrain = _uiState.value.selectedTerrain

        if (targetTerrain == fillTerrain) return

        val width = currentMap.width
        val height = currentMap.height
        val visited = BooleanArray(width * height)
        val queue = LinkedList<Pair<Int, Int>>()
        val mutations = mutableListOf<TileMutation>()
        val updates = mutableMapOf<Int, GridTile>()

        queue.add(Pair(startX, startY))
        visited[startIdx] = true

        while (queue.isNotEmpty()) {
            val (x, y) = queue.poll()
            val idx = y * width + x
            val oldTile = currentMap.tiles[idx]
            val newTile = oldTile.copy(terrain = fillTerrain)

            mutations.add(TileMutation(idx, oldTile, newTile))
            updates[idx] = newTile

            val neighbors = listOf(
                Pair(x + 1, y),
                Pair(x - 1, y),
                Pair(x, y + 1),
                Pair(x, y - 1)
            )

            for ((nx, ny) in neighbors) {
                if (nx in 0 until width && ny in 0 until height) {
                    val nIdx = ny * width + nx
                    if (!visited[nIdx] && currentMap.tiles[nIdx].terrain == targetTerrain) {
                        visited[nIdx] = true
                        queue.add(Pair(nx, ny))
                    }
                }
            }
        }

        if (updates.isNotEmpty()) {
            undoStack.push(mutations)
            redoStack.clear()
            _uiState.update {
                it.copy(
                    map = currentMap.withTilesUpdated(updates),
                    canUndo = true,
                    canRedo = false,
                    isSaved = false
                )
            }
            autoSave()
        }
    }

    fun undo() {
        val currentMap = _uiState.value.map ?: return
        if (undoStack.isEmpty()) return

        val mutations = undoStack.pop()
        val updates = mutableMapOf<Int, GridTile>()
        for (m in mutations) {
            updates[m.index] = m.oldTile
        }

        redoStack.push(mutations)
        _uiState.update {
            it.copy(
                map = currentMap.withTilesUpdated(updates),
                canUndo = undoStack.isNotEmpty(),
                canRedo = true,
                isSaved = false
            )
        }
        autoSave()
    }

    fun redo() {
        val currentMap = _uiState.value.map ?: return
        if (redoStack.isEmpty()) return

        val mutations = redoStack.pop()
        val updates = mutableMapOf<Int, GridTile>()
        for (m in mutations) {
            updates[m.index] = m.newTile
        }

        undoStack.push(mutations)
        _uiState.update {
            it.copy(
                map = currentMap.withTilesUpdated(updates),
                canUndo = true,
                canRedo = redoStack.isNotEmpty(),
                isSaved = false
            )
        }
        autoSave()
    }

    fun fillAllWithSelectedTerrain() {
        val currentMap = _uiState.value.map ?: return
        val terrain = _uiState.value.selectedTerrain
        val mutations = mutableListOf<TileMutation>()
        val updates = mutableMapOf<Int, GridTile>()

        currentMap.tiles.forEachIndexed { idx, oldTile ->
            val newTile = oldTile.copy(terrain = terrain)
            if (oldTile != newTile) {
                mutations.add(TileMutation(idx, oldTile, newTile))
                updates[idx] = newTile
            }
        }

        if (updates.isNotEmpty()) {
            undoStack.push(mutations)
            redoStack.clear()
            _uiState.update {
                it.copy(
                    map = currentMap.withTilesUpdated(updates),
                    canUndo = true,
                    canRedo = false,
                    isSaved = false
                )
            }
            autoSave()
        }
    }

    fun clearAllObjects() {
        val currentMap = _uiState.value.map ?: return
        val mutations = mutableListOf<TileMutation>()
        val updates = mutableMapOf<Int, GridTile>()

        currentMap.tiles.forEachIndexed { idx, oldTile ->
            if (oldTile.obj != MapObjectType.NONE) {
                val newTile = oldTile.copy(obj = MapObjectType.NONE)
                mutations.add(TileMutation(idx, oldTile, newTile))
                updates[idx] = newTile
            }
        }

        if (updates.isNotEmpty()) {
            undoStack.push(mutations)
            redoStack.clear()
            _uiState.update {
                it.copy(
                    map = currentMap.withTilesUpdated(updates),
                    canUndo = true,
                    canRedo = false,
                    isSaved = false
                )
            }
            autoSave()
        }
    }

    fun toggleInfiniteCanvas() {
        _uiState.update { it.copy(isInfiniteCanvas = !it.isInfiniteCanvas) }
    }

    fun setInfiniteCanvas(enabled: Boolean) {
        _uiState.update { it.copy(isInfiniteCanvas = enabled) }
    }

    fun expandMapDirection(direction: CanvasDirection, count: Int = 4, baseCellSize: Float = 32f) {
        val currentMap = _uiState.value.map ?: return
        val fillTerrain = _uiState.value.selectedTerrain

        var addLeft = 0
        var addTop = 0
        var addRight = 0
        var addBottom = 0

        when (direction) {
            CanvasDirection.NORTH -> addTop = count
            CanvasDirection.SOUTH -> addBottom = count
            CanvasDirection.WEST -> addLeft = count
            CanvasDirection.EAST -> addRight = count
            CanvasDirection.ALL_SIDES -> {
                addLeft = count
                addTop = count
                addRight = count
                addBottom = count
            }
        }

        val expandedMap = currentMap.expandMap(addLeft, addTop, addRight, addBottom, fillTerrain)

        val deltaW = (addLeft + addRight) * baseCellSize
        val deltaH = (addTop + addBottom) * baseCellSize
        val newPanX = _uiState.value.panOffset.x + (deltaW / 2f) - (addLeft * baseCellSize * _uiState.value.zoom)
        val newPanY = _uiState.value.panOffset.y + (deltaH / 2f) - (addTop * baseCellSize * _uiState.value.zoom)

        undoStack.clear()
        redoStack.clear()
        _uiState.update {
            it.copy(
                map = expandedMap,
                panOffset = Offset(newPanX, newPanY),
                canUndo = false,
                canRedo = false,
                isSaved = false
            )
        }
        autoSave()
    }

    fun toggleColorOnlyMode() {
        _uiState.update { it.copy(isColorOnlyMode = !it.isColorOnlyMode) }
    }

    fun setShowLegendDialog(show: Boolean) {
        _uiState.update { it.copy(showLegendDialog = show) }
    }

    fun renameMap(newName: String) {
        val currentMap = _uiState.value.map ?: return
        if (newName.isNotBlank()) {
            val updated = currentMap.copy(name = newName.trim())
            _uiState.update { it.copy(map = updated, isSaved = false) }
            autoSave()
        }
    }

    fun resizeMap(newWidth: Int, newHeight: Int) {
        val currentMap = _uiState.value.map ?: return
        if (newWidth <= 0 || newHeight <= 0) return

        val newTiles = mutableListOf<GridTile>()
        for (y in 0 until newHeight) {
            for (x in 0 until newWidth) {
                if (x < currentMap.width && y < currentMap.height) {
                    newTiles.add(currentMap.getTile(x, y))
                } else {
                    newTiles.add(GridTile(TerrainType.GRASS))
                }
            }
        }

        val updated = currentMap.copy(
            width = newWidth,
            height = newHeight,
            tiles = newTiles
        )
        undoStack.clear()
        redoStack.clear()
        _uiState.update {
            it.copy(
                map = updated,
                canUndo = false,
                canRedo = false,
                isSaved = false
            )
        }
        autoSave()
    }

    private fun autoSave() {
        val currentMap = _uiState.value.map ?: return
        viewModelScope.launch {
            repository.saveMap(currentMap)
            _uiState.update { it.copy(isSaved = true) }
        }
    }
}
