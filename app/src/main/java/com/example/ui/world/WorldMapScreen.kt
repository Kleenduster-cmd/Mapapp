package com.example.ui.world

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Grid3x3
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ViewCompact
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import com.example.ui.components.ExportWorldMapDialog
import com.example.ui.components.TileRenderer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorldMapScreen(
    viewModel: WorldMapViewModel,
    worldMapId: Long,
    onNavigateBack: () -> Unit,
    onOpenMapEditor: (Long, Long) -> Unit // mapId, worldMapId
) {
    LaunchedEffect(worldMapId) {
        viewModel.loadWorldMap(worldMapId)
        viewModel.loadAvailableMaps()
    }

    val state by viewModel.uiState.collectAsState()
    val world = state.worldMap ?: return

    var showExportDialog by remember { mutableStateOf(false) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var showResizeDialog by remember { mutableStateOf(false) }
    var showOverflowMenu by remember { mutableStateOf(false) }
    var showCreateNewMapDialog by remember { mutableStateOf(false) }
    var showLinkMapPickerSheet by remember { mutableStateOf(false) }

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
                                    text = world.name,
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
                                text = "${world.gridCols}×${world.gridRows} Sectors • ${world.slots.size} Connected",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack, modifier = Modifier.testTag("world_back_button")) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to Library")
                    }
                },
                actions = {
                    // Seamless Mode Toggle
                    IconButton(
                        onClick = { viewModel.toggleSeamlessMode() },
                        modifier = Modifier.testTag("seamless_toggle_button")
                    ) {
                        Icon(
                            if (state.isSeamlessMode) Icons.Default.Public else Icons.Default.Grid3x3,
                            contentDescription = "Toggle Seamless World View",
                            tint = if (state.isSeamlessMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Export World Map
                    IconButton(
                        onClick = { showExportDialog = true },
                        modifier = Modifier.testTag("export_world_button")
                    ) {
                        Icon(Icons.Default.Share, contentDescription = "Export World Map")
                    }

                    // Overflow
                    Box {
                        IconButton(onClick = { showOverflowMenu = true }, modifier = Modifier.testTag("world_overflow_button")) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More")
                        }
                        DropdownMenu(
                            expanded = showOverflowMenu,
                            onDismissRequest = { showOverflowMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Rename World Map") },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    showRenameDialog = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Resize World Grid") },
                                leadingIcon = { Icon(Icons.Default.GridOn, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    showResizeDialog = true
                                }
                            )
                            DropdownMenuItem(
                                text = { Text(if (state.showSectorBorders) "Hide Sector Borders" else "Show Sector Borders") },
                                leadingIcon = { Icon(Icons.Default.ViewCompact, contentDescription = null) },
                                onClick = {
                                    showOverflowMenu = false
                                    viewModel.toggleBorders()
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
            // Mode Banner
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (state.isSeamlessMode) "Seamless Stitched World View" else "Sector Grid Map Connector",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(
                            selected = !state.isSeamlessMode,
                            onClick = { if (state.isSeamlessMode) viewModel.toggleSeamlessMode() },
                            label = { Text("Sectors", fontSize = 11.sp) },
                            modifier = Modifier.height(28.dp)
                        )
                        FilterChip(
                            selected = state.isSeamlessMode,
                            onClick = { if (!state.isSeamlessMode) viewModel.toggleSeamlessMode() },
                            label = { Text("Unified", fontSize = 11.sp) },
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }
            }

            // Central World Display
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(8.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF101520))
            ) {
                if (state.isSeamlessMode) {
                    // Unified continuous canvas rendering all sectors stitched together
                    SeamlessWorldCanvas(
                        worldMap = world,
                        connectedMaps = state.connectedMaps,
                        showSectorBorders = state.showSectorBorders,
                        onSectorClicked = { c, r -> viewModel.selectSector(c, r) }
                    )
                } else {
                    // Sector Grid with Cards
                    SectorGridLayout(
                        worldMap = world,
                        connectedMaps = state.connectedMaps,
                        onSectorClicked = { c, r -> viewModel.selectSector(c, r) },
                        onQuickOpenEditor = { mapId -> onOpenMapEditor(mapId, world.id) }
                    )
                }
            }
        }
    }

    // Sector Management Bottom Sheet
    if (state.selectedSector != null) {
        val (col, row) = state.selectedSector!!
        val currentMapId = world.getMapId(col, row)
        val currentMap = currentMapId?.let { state.connectedMaps[it] }

        ModalBottomSheet(
            onDismissRequest = { viewModel.clearSectorSelection() },
            modifier = Modifier.testTag("sector_management_sheet")
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Sector (${col + 1}, ${row + 1})",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (currentMap != null) "Connected: ${currentMap.name}" else "Uncharted / Empty Sector",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = { viewModel.clearSectorSelection() }) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (currentMap != null) {
                    // Map preview card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Canvas(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(8.dp))
                            ) {
                                val cs = size.width / currentMap.width
                                for (y in 0 until currentMap.height) {
                                    for (x in 0 until currentMap.width) {
                                        TileRenderer.drawTile(
                                            drawScope = this,
                                            tile = currentMap.getTile(x, y),
                                            x = x * cs,
                                            y = y * cs,
                                            cellSize = cs,
                                            showGrid = false
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = currentMap.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "${currentMap.width}×${currentMap.height} Grid Map",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Action: Open in Map Editor
                    Button(
                        onClick = {
                            val mapId = currentMap.id
                            viewModel.clearSectorSelection()
                            onOpenMapEditor(mapId, world.id)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("open_sector_editor_button")
                    ) {
                        Icon(Icons.Default.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Open & Edit Sector Map")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Action: Change Linked Map
                    OutlinedButton(
                        onClick = { showLinkMapPickerSheet = true },
                        modifier = Modifier.fillMaxWidth().testTag("change_linked_map_button")
                    ) {
                        Icon(Icons.Default.Link, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Change Linked Map")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Action: Unlink Map
                    OutlinedButton(
                        onClick = { viewModel.unlinkSector(col, row) },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth().testTag("unlink_sector_button")
                    ) {
                        Icon(Icons.Default.LinkOff, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Disconnect Map from Sector")
                    }
                } else {
                    // Empty sector actions
                    Text(
                        text = "Connect a local grid map into this sector position to expand your world map.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { showCreateNewMapDialog = true },
                        modifier = Modifier.fillMaxWidth().testTag("create_map_for_sector_button")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Create New Map for this Sector")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedButton(
                        onClick = { showLinkMapPickerSheet = true },
                        modifier = Modifier.fillMaxWidth().testTag("link_existing_map_button")
                    ) {
                        Icon(Icons.Default.Link, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Link Existing Map")
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }

    // Link Map Picker Sheet
    if (showLinkMapPickerSheet && state.selectedSector != null) {
        val (col, row) = state.selectedSector!!
        AlertDialog(
            onDismissRequest = { showLinkMapPickerSheet = false },
            title = { Text("Select Map to Link to (${col + 1}, ${row + 1})") },
            text = {
                if (state.allAvailableMaps.isEmpty()) {
                    Text("No local maps available. Create one first!")
                } else {
                    LazyColumn(modifier = Modifier.height(300.dp)) {
                        items(state.allAvailableMaps) { mapItem ->
                            val isAlreadyLinked = world.slots.values.contains(mapItem.id)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        viewModel.linkMapToSector(col, row, mapItem.id)
                                        showLinkMapPickerSheet = false
                                    }
                                    .padding(vertical = 10.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Canvas(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(4.dp))) {
                                    val cs = size.width / mapItem.width
                                    for (y in 0 until mapItem.height) {
                                        for (x in 0 until mapItem.width) {
                                            TileRenderer.drawTile(
                                                drawScope = this,
                                                tile = mapItem.getTile(x, y),
                                                x = x * cs,
                                                y = y * cs,
                                                cellSize = cs,
                                                showGrid = false
                                            )
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = mapItem.name, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        text = "${mapItem.width}×${mapItem.height}" + if (isAlreadyLinked) " • (Already used in world)" else "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                OutlinedButton(onClick = { showLinkMapPickerSheet = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Create New Map for Sector Dialog
    if (showCreateNewMapDialog && state.selectedSector != null) {
        val (col, row) = state.selectedSector!!
        CreateSectorMapDialog(
            defaultName = "${world.name} - Sector (${col + 1},${row + 1})",
            onConfirm = { mapName, terrain ->
                viewModel.createAndLinkNewMap(col, row, mapName, terrain) { newMapId ->
                    showCreateNewMapDialog = false
                    onOpenMapEditor(newMapId, world.id)
                }
            },
            onDismiss = { showCreateNewMapDialog = false }
        )
    }

    // Export World Dialog
    if (showExportDialog) {
        ExportWorldMapDialog(
            worldMap = world,
            connectedMaps = state.connectedMaps,
            onDismiss = { showExportDialog = false }
        )
    }

    // Rename Dialog
    if (showRenameDialog) {
        RenameWorldDialog(
            currentName = world.name,
            onConfirm = {
                viewModel.renameWorld(it)
                showRenameDialog = false
            },
            onDismiss = { showRenameDialog = false }
        )
    }

    // Resize Dialog
    if (showResizeDialog) {
        ResizeWorldDialog(
            currentCols = world.gridCols,
            currentRows = world.gridRows,
            onConfirm = { c, r ->
                viewModel.resizeWorldGrid(c, r)
                showResizeDialog = false
            },
            onDismiss = { showResizeDialog = false }
        )
    }
}

@Composable
fun SectorGridLayout(
    worldMap: WorldMap,
    connectedMaps: Map<Long, GridMap>,
    onSectorClicked: (Int, Int) -> Unit,
    onQuickOpenEditor: (Long) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(worldMap.gridCols),
        modifier = Modifier
            .fillMaxSize()
            .padding(8.dp)
            .testTag("sector_grid_layout"),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        for (r in 0 until worldMap.gridRows) {
            for (c in 0 until worldMap.gridCols) {
                val mapId = worldMap.getMapId(c, r)
                val map = mapId?.let { connectedMaps[it] }

                item {
                    SectorCard(
                        col = c,
                        row = r,
                        map = map,
                        onClick = { onSectorClicked(c, r) },
                        onEdit = { map?.id?.let { onQuickOpenEditor(it) } }
                    )
                }
            }
        }
    }
}

@Composable
fun SectorCard(
    col: Int,
    row: Int,
    map: GridMap?,
    onClick: () -> Unit,
    onEdit: () -> Unit
) {
    if (map != null) {
        Card(
            modifier = Modifier
                .aspectRatio(1f)
                .clickable { onClick() }
                .testTag("sector_card_${col}_${row}"),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                // Miniature Canvas
                Canvas(
                    modifier = Modifier.fillMaxSize()
                ) {
                    val cs = size.width / map.width
                    for (y in 0 until map.height) {
                        for (x in 0 until map.width) {
                            TileRenderer.drawTile(
                                drawScope = this,
                                tile = map.getTile(x, y),
                                x = x * cs,
                                y = y * cs,
                                cellSize = cs,
                                showGrid = false
                            )
                        }
                    }
                }

                // Sector label badge
                Surface(
                    color = Color.Black.copy(alpha = 0.7f),
                    shape = RoundedCornerShape(topStart = 8.dp, bottomEnd = 8.dp),
                    modifier = Modifier.align(Alignment.TopStart)
                ) {
                    Text(
                        text = "(${col + 1}, ${row + 1})",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                // Bottom title bar
                Surface(
                    color = Color.Black.copy(alpha = 0.65f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 6.dp, vertical = 3.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = map.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = onEdit,
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.Edit,
                                contentDescription = "Edit Sector",
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }
        }
    } else {
        // Empty Slot Card
        OutlinedCard(
            modifier = Modifier
                .aspectRatio(1f)
                .clickable { onClick() }
                .testTag("empty_sector_card_${col}_${row}"),
            shape = RoundedCornerShape(10.dp),
            colors = CardDefaults.outlinedCardColors(containerColor = Color(0xFF161D2B))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "(${col + 1}, ${row + 1})",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Icon(
                    Icons.Default.Add,
                    contentDescription = "Connect Map",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(26.dp)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Connect Map",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun SeamlessWorldCanvas(
    worldMap: WorldMap,
    connectedMaps: Map<Long, GridMap>,
    showSectorBorders: Boolean,
    onSectorClicked: (Int, Int) -> Unit
) {
    var zoom by remember { mutableFloatStateOf(1f) }
    var panOffset by remember { mutableStateOf(Offset.Zero) }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(worldMap) {
                detectTransformGestures { _, pan, zoomDelta, _ ->
                    zoom = (zoom * zoomDelta).coerceIn(0.5f, 4.0f)
                    panOffset += pan
                }
            }
            .testTag("seamless_world_canvas")
    ) {
        val containerW = constraints.maxWidth.toFloat()
        val containerH = constraints.maxHeight.toFloat()

        val sectorCols = 16
        val sectorRows = 16
        val totalCols = worldMap.gridCols * sectorCols
        val totalRows = worldMap.gridRows * sectorRows

        val baseCellSize = remember(totalCols, totalRows, containerW, containerH) {
            minOf(containerW / totalCols, containerH / totalRows)
        }
        val effectiveCellSize = baseCellSize * zoom

        val worldPixelW = totalCols * effectiveCellSize
        val worldPixelH = totalRows * effectiveCellSize

        val originX = (containerW - worldPixelW) / 2f + panOffset.x
        val originY = (containerH - worldPixelH) / 2f + panOffset.y

        Canvas(modifier = Modifier.fillMaxSize()) {
            // Draw all connected sectors
            for (sRow in 0 until worldMap.gridRows) {
                for (sCol in 0 until worldMap.gridCols) {
                    val mapId = worldMap.getMapId(sCol, sRow)
                    val map = mapId?.let { connectedMaps[it] }

                    val sectorX = originX + sCol * sectorCols * effectiveCellSize
                    val sectorY = originY + sRow * sectorRows * effectiveCellSize
                    val sectorSize = sectorCols * effectiveCellSize

                    if (map != null) {
                        for (y in 0 until sectorRows) {
                            for (x in 0 until sectorCols) {
                                val tile = map.getTile(x, y)
                                val cellX = sectorX + x * effectiveCellSize
                                val cellY = sectorY + y * effectiveCellSize

                                // Culling
                                if (cellX + effectiveCellSize < 0 || cellX > size.width ||
                                    cellY + effectiveCellSize < 0 || cellY > size.height) {
                                    continue
                                }

                                TileRenderer.drawTile(
                                    drawScope = this,
                                    tile = tile,
                                    x = cellX,
                                    y = cellY,
                                    cellSize = effectiveCellSize,
                                    showGrid = false
                                )
                            }
                        }
                    } else {
                        // Empty uncharted sector placeholder
                        drawRect(
                            color = Color(0xFF161E2E),
                            topLeft = Offset(sectorX, sectorY),
                            size = androidx.compose.ui.geometry.Size(sectorSize, sectorSize)
                        )
                    }

                    // Sector Border
                    if (showSectorBorders) {
                        drawRect(
                            color = if (map != null) Color(0xFF64B5F6).copy(alpha = 0.5f) else Color(0xFF374151),
                            topLeft = Offset(sectorX, sectorY),
                            size = androidx.compose.ui.geometry.Size(sectorSize, sectorSize),
                            style = Stroke(width = 2f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CreateSectorMapDialog(
    defaultName: String,
    onConfirm: (String, TerrainType) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(defaultName) }
    var selectedTerrain by remember { mutableStateOf(TerrainType.GRASS) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Sector Map") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Sector Map Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("sector_map_name_input")
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text("Base Terrain:", style = MaterialTheme.typography.labelMedium)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(TerrainType.GRASS, TerrainType.DEEP_WATER, TerrainType.MOUNTAIN, TerrainType.SAND).forEach { t ->
                        FilterChip(
                            selected = selectedTerrain == t,
                            onClick = { selectedTerrain = t },
                            label = { Text(t.title.split("/").first().trim(), fontSize = 11.sp) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name, selectedTerrain) },
                enabled = name.isNotBlank(),
                modifier = Modifier.testTag("confirm_create_sector_map")
            ) {
                Text("Create & Edit")
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
fun RenameWorldDialog(
    currentName: String,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var text by remember { mutableStateOf(currentName) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Rename World Map") },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text("World Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().testTag("rename_world_input")
            )
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(text) },
                enabled = text.isNotBlank(),
                modifier = Modifier.testTag("confirm_rename_world")
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
fun ResizeWorldDialog(
    currentCols: Int,
    currentRows: Int,
    onConfirm: (Int, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedPreset by remember { mutableStateOf(Pair(currentCols, currentRows)) }
    val presets = listOf(
        Pair(2, 2) to "2×2 World (4 Sectors)",
        Pair(3, 3) to "3×3 World (9 Sectors)",
        Pair(4, 4) to "4×4 World (16 Sectors)",
        Pair(5, 5) to "5×5 World (25 Sectors)"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Resize World Dimensions") },
        text = {
            Column {
                Text(
                    text = "Expanding adds new uncharted sector slots. Shrinking unlinks sectors outside the new bounds.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                presets.forEach { (dims, label) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedPreset = dims }
                            .padding(vertical = 6.dp),
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
                modifier = Modifier.testTag("confirm_resize_world")
            ) {
                Text("Apply")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
