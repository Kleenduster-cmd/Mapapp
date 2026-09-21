package com.example.ui.editor

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.Colorize
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FormatColorFill
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.Handyman
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.MapObjectType
import com.example.data.model.TerrainType
import com.example.ui.components.ExportMapDialog
import com.example.ui.components.TileRenderer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapEditorScreen(
    viewModel: MapEditorViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToWorldMap: ((Long) -> Unit)? = null
) {
    val state by viewModel.uiState.collectAsState()
    val map = state.map ?: return

    var showExportDialog by remember { mutableStateOf(false) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var showResizeDialog by remember { mutableStateOf(false) }
    var showOverflowMenu by remember { mutableStateOf(false) }
    var hoveredCell by remember { mutableStateOf<Pair<Int, Int>?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { showRenameDialog = true }
                            .padding(horizontal = 6.dp, vertical = 4.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = map.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.Default.Edit,
                                    contentDescription = "Rename",
                                    modifier = Modifier.size(14.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "${map.width}×${map.height} • ${map.tiles.size} tiles",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            if (state.worldMapIdContext != null && onNavigateToWorldMap != null) {
                                onNavigateToWorldMap(state.worldMapIdContext!!)
                            } else {
                                onNavigateBack()
                            }
                        },
                        modifier = Modifier.testTag("back_button")
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = if (state.worldMapIdContext != null) "Return to World" else "Back"
                        )
                    }
                },
                actions = {
                    // Undo
                    IconButton(
                        onClick = { viewModel.undo() },
                        enabled = state.canUndo,
                        modifier = Modifier.testTag("undo_button")
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = "Undo")
                    }

                    // Redo
                    IconButton(
                        onClick = { viewModel.redo() },
                        enabled = state.canRedo,
                        modifier = Modifier.testTag("redo_button")
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Redo, contentDescription = "Redo")
                    }

                    // Grid Toggle
                    IconButton(
                        onClick = { viewModel.toggleGrid() },
                        modifier = Modifier.testTag("grid_toggle_button")
                    ) {
                        Icon(
                            Icons.Default.GridOn,
                            contentDescription = "Toggle Grid",
                            tint = if (state.showGrid) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Export Button
                    IconButton(
                        onClick = { showExportDialog = true },
                        modifier = Modifier.testTag("export_button")
                    ) {
                        Icon(Icons.Default.Share, contentDescription = "Export Map")
                    }

                    // Overflow Menu
                    Box {
                        IconButton(onClick = { showOverflowMenu = true }, modifier = Modifier.testTag("overflow_menu_button")) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More options")
                        }
                        DropdownMenu(
                            expanded = showOverflowMenu,
                            onDismissRequest = { showOverflowMenu = false }
                        ) {
                            if (state.worldMapIdContext != null && onNavigateToWorldMap != null) {
                                DropdownMenuItem(
                                    text = { Text("Return to World Map") },
                                    leadingIcon = { Icon(Icons.Default.Public, contentDescription = null) },
                                    onClick = {
                                        showOverflowMenu = false
                                        onNavigateToWorldMap(state.worldMapIdContext!!)
                                    }
                                )
                            }
                            DropdownMenuItem(
                                text = { Text("Rename Map") },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    showRenameDialog = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Resize Grid") },
                                leadingIcon = { Icon(Icons.Default.Handyman, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    showResizeDialog = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Reset View / Zoom") },
                                leadingIcon = { Icon(Icons.Default.CenterFocusStrong, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.resetView()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Fill All with ${state.selectedTerrain.title}") },
                                leadingIcon = { Icon(Icons.Default.FormatColorFill, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.fillAllWithSelectedTerrain()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Clear All Objects & Markers") },
                                leadingIcon = { Icon(Icons.Default.DeleteSweep, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.clearAllObjects()
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Interactive Map Grid View
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(0.dp))
                    .background(Color(0xFF141923))
            ) {
                MapCanvas(
                    map = map,
                    state = state,
                    onCellTouchDown = { x, y ->
                        hoveredCell = Pair(x, y)
                        viewModel.onTouchDown(x, y)
                    },
                    onCellTouchMove = { x, y ->
                        hoveredCell = Pair(x, y)
                        viewModel.onTouchMove(x, y)
                    },
                    onCellTouchUp = {
                        viewModel.onTouchUp()
                    },
                    onTransform = { zoomDelta, panDelta ->
                        viewModel.updateZoomAndPan(zoomDelta, panDelta)
                    }
                )

                // Overlay Controls: Mode Switcher (Draw vs Pan) & Info Badge
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                        .align(Alignment.BottomCenter),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Cell coordinate badge
                    Surface(
                        color = Color.Black.copy(alpha = 0.65f),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val coordText = hoveredCell?.let { "X: ${it.first}, Y: ${it.second}" } ?: "Zoom: ${(state.zoom * 100).toInt()}%"
                            Text(
                                text = coordText,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White
                            )
                        }
                    }

                    // Mode pill: Draw vs Pan
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(20.dp),
                        tonalElevation = 4.dp
                    ) {
                        Row(
                            modifier = Modifier.padding(4.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            FilterChip(
                                selected = !state.isPanMode,
                                onClick = { if (state.isPanMode) viewModel.togglePanMode() },
                                label = { Text("Draw") },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp)) },
                                modifier = Modifier.testTag("mode_draw_chip")
                            )
                            FilterChip(
                                selected = state.isPanMode,
                                onClick = { if (!state.isPanMode) viewModel.togglePanMode() },
                                label = { Text("Pan & Zoom") },
                                leadingIcon = { Icon(Icons.Default.PanTool, contentDescription = null, modifier = Modifier.size(16.dp)) },
                                modifier = Modifier.testTag("mode_pan_chip")
                            )
                        }
                    }
                }
            }

            // Bottom Palette & Tool Controller
            EditorBottomBar(
                state = state,
                onSelectTool = { viewModel.setTool(it) },
                onSelectBrushSize = { viewModel.setBrushSize(it) },
                onSelectPaletteTab = { viewModel.setPaletteTab(it) },
                onSelectTerrain = { viewModel.selectTerrain(it) },
                onSelectObject = { viewModel.selectObject(it) }
            )
        }
    }

    // Dialogs
    if (showExportDialog) {
        ExportMapDialog(
            map = map,
            onDismiss = { showExportDialog = false }
        )
    }

    if (showRenameDialog) {
        RenameMapDialog(
            currentName = map.name,
            onConfirm = {
                viewModel.renameMap(it)
                showRenameDialog = false
            },
            onDismiss = { showRenameDialog = false }
        )
    }

    if (showResizeDialog) {
        ResizeGridDialog(
            currentWidth = map.width,
            currentHeight = map.height,
            onConfirm = { w, h ->
                viewModel.resizeMap(w, h)
                showResizeDialog = false
            },
            onDismiss = { showResizeDialog = false }
        )
    }
}

@Composable
fun MapCanvas(
    map: GridMap,
    state: EditorUiState,
    onCellTouchDown: (Int, Int) -> Unit,
    onCellTouchMove: (Int, Int) -> Unit,
    onCellTouchUp: () -> Unit,
    onTransform: (Float, Offset) -> Unit
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .testTag("map_canvas_container")
    ) {
        val containerWidth = constraints.maxWidth.toFloat()
        val containerHeight = constraints.maxHeight.toFloat()

        // Base cell size to fit nicely in container
        val baseCellSize = remember(map.width, map.height, containerWidth, containerHeight) {
            val fitW = (containerWidth * 0.9f) / map.width
            val fitH = (containerHeight * 0.9f) / map.height
            minOf(fitW, fitH).coerceIn(16f, 64f)
        }

        val mapPixelW = map.width * baseCellSize
        val mapPixelH = map.height * baseCellSize

        // Center offset
        val centerOffsetX = (containerWidth - mapPixelW) / 2f
        val centerOffsetY = (containerHeight - mapPixelH) / 2f

        val effectiveOffsetX = centerOffsetX + state.panOffset.x
        val effectiveOffsetY = centerOffsetY + state.panOffset.y
        val effectiveCellSize = baseCellSize * state.zoom

        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .testTag("map_canvas")
                .pointerInput(map, state.isPanMode, state.activeTool, state.zoom, state.panOffset) {
                    if (state.isPanMode) {
                        detectTransformGestures { _, pan, zoomDelta, _ ->
                            onTransform(zoomDelta, pan)
                        }
                    } else {
                        // In draw mode, tap or drag draws tiles
                        detectDragGestures(
                            onDragStart = { offset ->
                                val localX = (offset.x - effectiveOffsetX) / state.zoom
                                val localY = (offset.y - effectiveOffsetY) / state.zoom
                                val cx = (localX / baseCellSize).toInt()
                                val cy = (localY / baseCellSize).toInt()
                                onCellTouchDown(cx, cy)
                            },
                            onDrag = { change, _ ->
                                change.consume()
                                val localX = (change.position.x - effectiveOffsetX) / state.zoom
                                val localY = (change.position.y - effectiveOffsetY) / state.zoom
                                val cx = (localX / baseCellSize).toInt()
                                val cy = (localY / baseCellSize).toInt()
                                onCellTouchMove(cx, cy)
                            },
                            onDragEnd = { onCellTouchUp() },
                            onDragCancel = { onCellTouchUp() }
                        )
                    }
                }
                .pointerInput(map, state.isPanMode, state.zoom, state.panOffset) {
                    if (!state.isPanMode) {
                        detectTapGestures { offset ->
                            val localX = (offset.x - effectiveOffsetX) / state.zoom
                            val localY = (offset.y - effectiveOffsetY) / state.zoom
                            val cx = (localX / baseCellSize).toInt()
                            val cy = (localY / baseCellSize).toInt()
                            onCellTouchDown(cx, cy)
                            onCellTouchUp()
                        }
                    }
                }
        ) {
            // Draw all tiles
            for (y in 0 until map.height) {
                for (x in 0 until map.width) {
                    val tile = map.getTile(x, y)
                    val drawX = effectiveOffsetX + x * effectiveCellSize
                    val drawY = effectiveOffsetY + y * effectiveCellSize

                    // Frustum culling
                    if (drawX + effectiveCellSize < 0 || drawX > size.width ||
                        drawY + effectiveCellSize < 0 || drawY > size.height) {
                        continue
                    }

                    TileRenderer.drawTile(
                        drawScope = this,
                        tile = tile,
                        x = drawX,
                        y = drawY,
                        cellSize = effectiveCellSize,
                        showGrid = state.showGrid
                    )
                }
            }

            // Draw outer border around the map
            drawRect(
                color = Color(0xFF64748B),
                topLeft = Offset(effectiveOffsetX, effectiveOffsetY),
                size = androidx.compose.ui.geometry.Size(map.width * effectiveCellSize, map.height * effectiveCellSize),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2f)
            )
        }
    }
}

@Composable
fun EditorBottomBar(
    state: EditorUiState,
    onSelectTool: (EditorTool) -> Unit,
    onSelectBrushSize: (Int) -> Unit,
    onSelectPaletteTab: (Int) -> Unit,
    onSelectTerrain: (TerrainType) -> Unit,
    onSelectObject: (MapObjectType) -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 6.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)) {
            // Row 1: Tools & Brush Size
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tool Buttons
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(
                        onClick = { onSelectTool(EditorTool.BRUSH) },
                        modifier = Modifier
                            .background(
                                if (state.activeTool == EditorTool.BRUSH) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                CircleShape
                            )
                            .testTag("tool_brush")
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Pencil Brush",
                            tint = if (state.activeTool == EditorTool.BRUSH) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                        )
                    }

                    IconButton(
                        onClick = { onSelectTool(EditorTool.FILL_BUCKET) },
                        modifier = Modifier
                            .background(
                                if (state.activeTool == EditorTool.FILL_BUCKET) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                CircleShape
                            )
                            .testTag("tool_fill")
                    ) {
                        Icon(
                            Icons.Default.FormatColorFill,
                            contentDescription = "Flood Fill",
                            tint = if (state.activeTool == EditorTool.FILL_BUCKET) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                        )
                    }

                    IconButton(
                        onClick = { onSelectTool(EditorTool.ERASER) },
                        modifier = Modifier
                            .background(
                                if (state.activeTool == EditorTool.ERASER) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                CircleShape
                            )
                            .testTag("tool_eraser")
                    ) {
                        Icon(
                            Icons.Default.DeleteSweep,
                            contentDescription = "Eraser",
                            tint = if (state.activeTool == EditorTool.ERASER) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                        )
                    }

                    IconButton(
                        onClick = { onSelectTool(EditorTool.EYEDROPPER) },
                        modifier = Modifier
                            .background(
                                if (state.activeTool == EditorTool.EYEDROPPER) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                CircleShape
                            )
                            .testTag("tool_eyedropper")
                    ) {
                        Icon(
                            Icons.Default.Colorize,
                            contentDescription = "Eyedropper",
                            tint = if (state.activeTool == EditorTool.EYEDROPPER) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Brush Size (1x1, 2x2, 3x3)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("Size:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    listOf(1 to "1×1", 2 to "2×2", 3 to "3×3").forEach { (sz, label) ->
                        FilterChip(
                            selected = state.brushSize == sz,
                            onClick = { onSelectBrushSize(sz) },
                            label = { Text(label, fontSize = 11.sp) },
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Row 2: Category Tabs
            TabRow(
                selectedTabIndex = state.selectedPaletteTab,
                modifier = Modifier.height(36.dp)
            ) {
                Tab(
                    selected = state.selectedPaletteTab == 0,
                    onClick = { onSelectPaletteTab(0) },
                    text = { Text("Terrains & Biomes", fontSize = 12.sp) }
                )
                Tab(
                    selected = state.selectedPaletteTab == 1,
                    onClick = { onSelectPaletteTab(1) },
                    text = { Text("Structures & Objects", fontSize = 12.sp) }
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Row 3: Horizontal Carousel of Palette Items
            if (state.selectedPaletteTab == 0) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    items(TerrainType.entries) { terrain ->
                        val isSelected = state.selectedTerrain == terrain && state.selectedObject == MapObjectType.NONE
                        Card(
                            modifier = Modifier
                                .size(width = 86.dp, height = 62.dp)
                                .clickable { onSelectTerrain(terrain) }
                                .border(
                                    width = if (isSelected) 2.5.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                                    shape = RoundedCornerShape(8.dp)
                                ),
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                // Miniature render preview
                                Canvas(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                ) {
                                    TileRenderer.drawTile(
                                        drawScope = this,
                                        tile = GridTile(terrain),
                                        x = 0f,
                                        y = 0f,
                                        cellSize = size.width,
                                        showGrid = false
                                    )
                                }
                                Text(
                                    text = terrain.title.split("/").first().trim(),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            } else {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    items(MapObjectType.entries.filter { it != MapObjectType.NONE }) { obj ->
                        val isSelected = state.selectedObject == obj
                        Card(
                            modifier = Modifier
                                .size(width = 86.dp, height = 62.dp)
                                .clickable { onSelectObject(obj) }
                                .border(
                                    width = if (isSelected) 2.5.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                                    shape = RoundedCornerShape(8.dp)
                                ),
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = obj.iconEmoji, fontSize = 22.sp)
                                Text(
                                    text = obj.title.split("/").first().trim(),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RenameMapDialog(
    currentName: String,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var text by remember { mutableStateOf(currentName) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename Map") },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text("Map Name") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("rename_map_input")
            )
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(text) },
                enabled = text.isNotBlank(),
                modifier = Modifier.testTag("save_rename_button")
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun ResizeGridDialog(
    currentWidth: Int,
    currentHeight: Int,
    onConfirm: (Int, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedPreset by remember { mutableStateOf(Pair(currentWidth, currentHeight)) }
    val presets = listOf(
        Pair(10, 10) to "Small (10×10)",
        Pair(16, 16) to "Standard (16×16)",
        Pair(20, 20) to "Large (20×20)",
        Pair(24, 24) to "Epic (24×24)",
        Pair(32, 32) to "Massive (32×32)"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Resize Grid Dimensions") },
        text = {
            Column {
                Text(
                    text = "Existing content outside the new dimensions will be cropped. New cells will be filled with grass.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                presets.forEach { (dims, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedPreset = dims }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        FilterChip(
                            selected = selectedPreset == dims,
                            onClick = { selectedPreset = dims },
                            label = { Text(label) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(selectedPreset.first, selectedPreset.second) },
                modifier = Modifier.testTag("confirm_resize_button")
            ) {
                Text("Apply Resize")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
