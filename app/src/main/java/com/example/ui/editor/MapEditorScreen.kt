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
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.AllInclusive
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.Colorize
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ColorLens
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FormatColorFill
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.Handyman
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material.icons.filled.ZoomOutMap
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
import androidx.compose.material3.surfaceColorAtElevation
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
import com.example.ui.components.TileLegendDialog
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
    var showLegendDialog by remember { mutableStateOf(false) }
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
                                text = "${map.width}×${map.height} • ${map.tiles.size} tiles" + if (state.isInfiniteCanvas) " • ∞ Infinite" else "",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (state.isInfiniteCanvas) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
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

                    // Infinite Canvas Toggle
                    IconButton(
                        onClick = { viewModel.toggleInfiniteCanvas() },
                        modifier = Modifier.testTag("infinite_canvas_toggle_button")
                    ) {
                        Icon(
                            Icons.Default.AllInclusive,
                            contentDescription = if (state.isInfiniteCanvas) "Infinite Dimension: Enabled" else "Infinite Dimension: Disabled",
                            tint = if (state.isInfiniteCanvas) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Tile Legend Button
                    IconButton(
                        onClick = { showLegendDialog = true },
                        modifier = Modifier.testTag("legend_button")
                    ) {
                        Icon(
                            Icons.Default.Palette,
                            contentDescription = "Tile & Color Legend",
                            tint = if (state.isColorOnlyMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
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
                                text = { Text(if (state.isInfiniteCanvas) "Disable Infinite Dimension" else "Enable Infinite Dimension (∞)") },
                                leadingIcon = { Icon(Icons.Default.AllInclusive, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.toggleInfiniteCanvas()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Expand Canvas (+4 All Sides)") },
                                leadingIcon = { Icon(Icons.Default.ZoomOutMap, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.expandMapDirection(CanvasDirection.ALL_SIDES, 4)
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Tile & Color Legend") },
                                leadingIcon = { Icon(Icons.Default.Palette, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    showLegendDialog = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text(if (state.isColorOnlyMode) "Switch to Texture View" else "Switch to Color-Based View") },
                                leadingIcon = { Icon(Icons.Default.ColorLens, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.toggleColorOnlyMode()
                                }
                            )
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
                    onCellTouchDown = { x, y, cellSize ->
                        hoveredCell = Pair(x, y)
                        viewModel.onTouchDown(x, y, cellSize)
                    },
                    onCellTouchMove = { x, y, cellSize ->
                        hoveredCell = Pair(x, y)
                        viewModel.onTouchMove(x, y, cellSize)
                    },
                    onCellTouchUp = {
                        viewModel.onTouchUp()
                    },
                    onTransform = { zoomDelta, panDelta ->
                        viewModel.updateZoomAndPan(zoomDelta, panDelta)
                    },
                    onExpandDirection = { dir ->
                        viewModel.expandMapDirection(dir)
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
                    // Cell coordinate badge & Legend & Infinite quick access
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
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

                        // Infinite Dimension Quick Pill
                        Surface(
                            color = if (state.isInfiniteCanvas) MaterialTheme.colorScheme.primaryContainer else Color.Black.copy(alpha = 0.65f),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .clickable { viewModel.toggleInfiniteCanvas() }
                                .testTag("canvas_infinite_pill")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.AllInclusive,
                                    contentDescription = "Infinite Dimension Mode",
                                    tint = if (state.isInfiniteCanvas) MaterialTheme.colorScheme.onPrimaryContainer else Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (state.isInfiniteCanvas) "∞ Infinite" else "Fixed",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (state.isInfiniteCanvas) MaterialTheme.colorScheme.onPrimaryContainer else Color.White,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        // Legend & Color View Pill
                        Surface(
                            color = if (state.isColorOnlyMode) MaterialTheme.colorScheme.primaryContainer else Color.Black.copy(alpha = 0.65f),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .clickable { showLegendDialog = true }
                                .testTag("canvas_legend_pill")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Palette,
                                    contentDescription = "Tile Legend",
                                    tint = if (state.isColorOnlyMode) MaterialTheme.colorScheme.onPrimaryContainer else Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (state.isColorOnlyMode) "Color Mode" else "Legend",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (state.isColorOnlyMode) MaterialTheme.colorScheme.onPrimaryContainer else Color.White,
                                    fontWeight = FontWeight.Medium
                                )
                            }
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
    if (showLegendDialog) {
        TileLegendDialog(
            map = map,
            isColorOnlyMode = state.isColorOnlyMode,
            onToggleColorOnlyMode = { viewModel.toggleColorOnlyMode() },
            onSelectTerrain = { viewModel.selectTerrain(it) },
            onDismiss = { showLegendDialog = false }
        )
    }

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
    onCellTouchDown: (Int, Int, Float) -> Unit,
    onCellTouchMove: (Int, Int, Float) -> Unit,
    onCellTouchUp: () -> Unit,
    onTransform: (Float, Offset) -> Unit,
    onExpandDirection: (CanvasDirection) -> Unit = {}
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .testTag("map_canvas_container")
    ) {
        val containerWidth = constraints.maxWidth.toFloat()
        val containerHeight = constraints.maxHeight.toFloat()

        // Base cell size is stabilized per map ID so auto-expansion keeps scale stable
        val baseCellSize = remember(map.id, containerWidth > 0f && containerHeight > 0f) {
            if (containerWidth > 0f && containerHeight > 0f) {
                val fitW = (containerWidth * 0.85f) / maxOf(map.width, 16)
                val fitH = (containerHeight * 0.85f) / maxOf(map.height, 16)
                minOf(fitW, fitH).coerceIn(20f, 56f)
            } else {
                32f
            }
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
                .pointerInput(map, state.isPanMode, state.activeTool, state.zoom, state.panOffset, state.isInfiniteCanvas) {
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
                                val cx = kotlin.math.floor(localX / baseCellSize).toInt()
                                val cy = kotlin.math.floor(localY / baseCellSize).toInt()
                                onCellTouchDown(cx, cy, baseCellSize)
                            },
                            onDrag = { change, _ ->
                                change.consume()
                                val localX = (change.position.x - effectiveOffsetX) / state.zoom
                                val localY = (change.position.y - effectiveOffsetY) / state.zoom
                                val cx = kotlin.math.floor(localX / baseCellSize).toInt()
                                val cy = kotlin.math.floor(localY / baseCellSize).toInt()
                                onCellTouchMove(cx, cy, baseCellSize)
                            },
                            onDragEnd = { onCellTouchUp() },
                            onDragCancel = { onCellTouchUp() }
                        )
                    }
                }
                .pointerInput(map, state.isPanMode, state.zoom, state.panOffset, state.isInfiniteCanvas) {
                    if (!state.isPanMode) {
                        detectTapGestures { offset ->
                            val localX = (offset.x - effectiveOffsetX) / state.zoom
                            val localY = (offset.y - effectiveOffsetY) / state.zoom
                            val cx = kotlin.math.floor(localX / baseCellSize).toInt()
                            val cy = kotlin.math.floor(localY / baseCellSize).toInt()
                            onCellTouchDown(cx, cy, baseCellSize)
                            onCellTouchUp()
                        }
                    }
                }
        ) {
            // Infinite canvas background grid
            if (state.isInfiniteCanvas && state.showGrid && effectiveCellSize >= 8f) {
                val startX = (effectiveOffsetX % effectiveCellSize + effectiveCellSize) % effectiveCellSize
                val startY = (effectiveOffsetY % effectiveCellSize + effectiveCellSize) % effectiveCellSize
                var gx = startX
                while (gx < size.width) {
                    drawLine(
                        color = Color(0x1894A3B8),
                        start = Offset(gx, 0f),
                        end = Offset(gx, size.height),
                        strokeWidth = 1f
                    )
                    gx += effectiveCellSize
                }
                var gy = startY
                while (gy < size.height) {
                    drawLine(
                        color = Color(0x1894A3B8),
                        start = Offset(0f, gy),
                        end = Offset(size.width, gy),
                        strokeWidth = 1f
                    )
                    gy += effectiveCellSize
                }
            }

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
                        showGrid = state.showGrid,
                        colorOnlyMode = state.isColorOnlyMode
                    )
                }
            }

            // Draw outer border around the map
            drawRect(
                color = if (state.isInfiniteCanvas) Color(0xFF818CF8) else Color(0xFF64748B),
                topLeft = Offset(effectiveOffsetX, effectiveOffsetY),
                size = androidx.compose.ui.geometry.Size(map.width * effectiveCellSize, map.height * effectiveCellSize),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = if (state.isInfiniteCanvas) 2.5f else 2f)
            )
        }

        // On-Canvas Directional Expansion Buttons (when Infinite Canvas is active and not panning)
        if (state.isInfiniteCanvas && !state.isPanMode) {
            // North button (Top Center)
            Surface(
                onClick = { onExpandDirection(CanvasDirection.NORTH) },
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp).copy(alpha = 0.9f),
                tonalElevation = 3.dp,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 8.dp)
                    .testTag("expand_north_button")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Expand North", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text("+4 North", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
            }

            // South button (Bottom Center, positioned above the bottom toolbar overlay)
            Surface(
                onClick = { onExpandDirection(CanvasDirection.SOUTH) },
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp).copy(alpha = 0.9f),
                tonalElevation = 3.dp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 54.dp)
                    .testTag("expand_south_button")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Expand South", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text("+4 South", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
            }

            // West button (Center Start)
            Surface(
                onClick = { onExpandDirection(CanvasDirection.WEST) },
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp).copy(alpha = 0.9f),
                tonalElevation = 3.dp,
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 8.dp)
                    .testTag("expand_west_button")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Expand West", modifier = Modifier.size(16.dp))
                    Text("+4W", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
            }

            // East button (Center End)
            Surface(
                onClick = { onExpandDirection(CanvasDirection.EAST) },
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceColorAtElevation(4.dp).copy(alpha = 0.9f),
                tonalElevation = 3.dp,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 8.dp)
                    .testTag("expand_east_button")
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("+4E", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Expand East", modifier = Modifier.size(16.dp))
                }
            }
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
    var width by remember { mutableIntStateOf(currentWidth) }
    var height by remember { mutableIntStateOf(currentHeight) }
    var widthText by remember { mutableStateOf(currentWidth.toString()) }
    var heightText by remember { mutableStateOf(currentHeight.toString()) }

    fun updateWidth(newW: Int) {
        val clamped = newW.coerceIn(2, 256)
        width = clamped
        widthText = clamped.toString()
    }

    fun updateHeight(newH: Int) {
        val clamped = newH.coerceIn(2, 256)
        height = clamped
        heightText = clamped.toString()
    }

    val quickPresets = listOf(
        Pair(8, 8) to "8×8",
        Pair(12, 12) to "12×12",
        Pair(16, 16) to "16×16",
        Pair(24, 24) to "24×24",
        Pair(32, 32) to "32×32",
        Pair(48, 48) to "48×48",
        Pair(64, 64) to "64×64",
        Pair(96, 96) to "96×96"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Handyman,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Custom Grid Dimensions")
            }
        },
        text = {
            Column {
                Text(
                    text = "Adjust map width and height (2 to 256 tiles, or enable Infinite Dimension for auto-expanding canvas). New cells are filled with grass.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Dimensions summary card
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Size: ${width} × ${height}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "${width * height} total tiles",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Width Stepper & Input
                Text("Grid Width (Columns):", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    OutlinedButton(
                        onClick = { updateWidth(width - 5) },
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("-5", fontSize = 12.sp)
                    }
                    IconButton(
                        onClick = { updateWidth(width - 1) },
                        modifier = Modifier.testTag("width_minus_button")
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease width")
                    }
                    OutlinedTextField(
                        value = widthText,
                        onValueChange = {
                            widthText = it
                            it.toIntOrNull()?.let { w ->
                                if (w in 2..256) width = w
                            }
                        },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("width_input"),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    )
                    IconButton(
                        onClick = { updateWidth(width + 1) },
                        modifier = Modifier.testTag("width_plus_button")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Increase width")
                    }
                    OutlinedButton(
                        onClick = { updateWidth(width + 5) },
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("+5", fontSize = 12.sp)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Height Stepper & Input
                Text("Grid Height (Rows):", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    OutlinedButton(
                        onClick = { updateHeight(height - 5) },
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("-5", fontSize = 12.sp)
                    }
                    IconButton(
                        onClick = { updateHeight(height - 1) },
                        modifier = Modifier.testTag("height_minus_button")
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease height")
                    }
                    OutlinedTextField(
                        value = heightText,
                        onValueChange = {
                            heightText = it
                            it.toIntOrNull()?.let { h ->
                                if (h in 2..256) height = h
                            }
                        },
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("height_input"),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    )
                    IconButton(
                        onClick = { updateHeight(height + 1) },
                        modifier = Modifier.testTag("height_plus_button")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Increase height")
                    }
                    OutlinedButton(
                        onClick = { updateHeight(height + 5) },
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("+5", fontSize = 12.sp)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Quick presets
                Text("Quick Presets:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(quickPresets) { (dims, label) ->
                        FilterChip(
                            selected = width == dims.first && height == dims.second,
                            onClick = {
                                updateWidth(dims.first)
                                updateHeight(dims.second)
                            },
                            label = { Text(label, fontSize = 11.sp) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Quick Expansion shortcuts
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    FilterChip(
                        selected = false,
                        onClick = {
                            updateWidth(width + 4)
                            updateHeight(height + 4)
                        },
                        label = { Text("+4 Both Dims", fontSize = 11.sp) }
                    )
                    FilterChip(
                        selected = false,
                        onClick = {
                            updateWidth(width + 8)
                            updateHeight(height + 8)
                        },
                        label = { Text("+8 Both Dims", fontSize = 11.sp) }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(width, height) },
                modifier = Modifier.testTag("confirm_resize_button")
            ) {
                Text("Apply Dimensions")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
