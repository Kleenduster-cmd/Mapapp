package com.example.ui.world

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.GridMap
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import com.example.data.repository.MapRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WorldMapUiState(
    val worldMap: WorldMap? = null,
    val connectedMaps: Map<Long, GridMap> = emptyMap(),
    val allAvailableMaps: List<GridMap> = emptyList(),
    val selectedSector: Pair<Int, Int>? = null,
    val showSectorBorders: Boolean = true,
    val isSeamlessMode: Boolean = false,
    val isColorOnlyMode: Boolean = false,
    val showLegendDialog: Boolean = false,
    val zoom: Float = 1f,
    val isLoading: Boolean = false
)

class WorldMapViewModel(
    private val repository: MapRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorldMapUiState())
    val uiState: StateFlow<WorldMapUiState> = _uiState.asStateFlow()

    fun loadWorldMap(worldMapId: Long) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val world = repository.getWorldMap(worldMapId)
            if (world != null) {
                val mapIds = world.slots.values.toList()
                val loadedMaps = repository.getMapsByIds(mapIds).associateBy { it.id }

                _uiState.update {
                    it.copy(
                        worldMap = world,
                        connectedMaps = loadedMaps,
                        isLoading = false
                    )
                }
            } else {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    fun loadAvailableMaps() {
        viewModelScope.launch {
            repository.allMaps.collect { maps ->
                _uiState.update { it.copy(allAvailableMaps = maps) }
            }
        }
    }

    fun selectSector(col: Int, row: Int) {
        _uiState.update { it.copy(selectedSector = Pair(col, row)) }
    }

    fun clearSectorSelection() {
        _uiState.update { it.copy(selectedSector = null) }
    }

    fun linkMapToSector(col: Int, row: Int, mapId: Long) {
        val currentWorld = _uiState.value.worldMap ?: return
        viewModelScope.launch {
            val updated = currentWorld.withSlotLinked(col, row, mapId)
            repository.saveWorldMap(updated)
            val map = repository.getMap(mapId)
            val newConnected = _uiState.value.connectedMaps.toMutableMap()
            if (map != null) newConnected[mapId] = map

            _uiState.update {
                it.copy(
                    worldMap = updated,
                    connectedMaps = newConnected,
                    selectedSector = null
                )
            }
        }
    }

    fun unlinkSector(col: Int, row: Int) {
        val currentWorld = _uiState.value.worldMap ?: return
        viewModelScope.launch {
            val updated = currentWorld.withSlotUnlinked(col, row)
            repository.saveWorldMap(updated)
            _uiState.update {
                it.copy(worldMap = updated, selectedSector = null)
            }
        }
    }

    fun createAndLinkNewMap(
        col: Int,
        row: Int,
        name: String,
        width: Int = 16,
        height: Int = 16,
        defaultTerrain: TerrainType,
        onCreated: (Long) -> Unit
    ) {
        val currentWorld = _uiState.value.worldMap ?: return
        viewModelScope.launch {
            val newMap = GridMap.createEmpty(name = name, width = width, height = height, defaultTerrain = defaultTerrain)
            val newMapId = repository.saveMap(newMap)
            val updatedWorld = currentWorld.withSlotLinked(col, row, newMapId)
            repository.saveWorldMap(updatedWorld)

            val newConnected = _uiState.value.connectedMaps.toMutableMap()
            val savedMap = repository.getMap(newMapId)
            if (savedMap != null) newConnected[newMapId] = savedMap

            _uiState.update {
                it.copy(
                    worldMap = updatedWorld,
                    connectedMaps = newConnected,
                    selectedSector = null
                )
            }
            onCreated(newMapId)
        }
    }

    fun toggleColorOnlyMode() {
        _uiState.update { it.copy(isColorOnlyMode = !it.isColorOnlyMode) }
    }

    fun setShowLegendDialog(show: Boolean) {
        _uiState.update { it.copy(showLegendDialog = show) }
    }

    fun toggleSeamlessMode() {
        _uiState.update { it.copy(isSeamlessMode = !it.isSeamlessMode) }
    }

    fun toggleBorders() {
        _uiState.update { it.copy(showSectorBorders = !it.showSectorBorders) }
    }

    fun renameWorld(newName: String) {
        val currentWorld = _uiState.value.worldMap ?: return
        if (newName.isNotBlank()) {
            val updated = currentWorld.copy(name = newName.trim(), updatedAt = System.currentTimeMillis())
            viewModelScope.launch {
                repository.saveWorldMap(updated)
                _uiState.update { it.copy(worldMap = updated) }
            }
        }
    }

    fun resizeWorldGrid(newCols: Int, newRows: Int) {
        val currentWorld = _uiState.value.worldMap ?: return
        if (newCols <= 0 || newRows <= 0) return

        val newSlots = currentWorld.slots.filterKeys { key ->
            val parts = key.split("_")
            val c = parts.getOrNull(0)?.toIntOrNull() ?: 0
            val r = parts.getOrNull(1)?.toIntOrNull() ?: 0
            c < newCols && r < newRows
        }

        val updated = currentWorld.copy(
            gridCols = newCols,
            gridRows = newRows,
            slots = newSlots,
            updatedAt = System.currentTimeMillis()
        )
        viewModelScope.launch {
            repository.saveWorldMap(updated)
            _uiState.update { it.copy(worldMap = updated) }
        }
    }
}
