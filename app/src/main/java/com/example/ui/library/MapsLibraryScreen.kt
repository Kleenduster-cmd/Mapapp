package com.example.ui.library

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.GridOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.GridMap
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import com.example.data.repository.MapRepository
import com.example.ui.components.ExportMapDialog
import com.example.ui.components.TileRenderer
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapsLibraryScreen(
    repository: MapRepository,
    onOpenMap: (Long) -> Unit,
    onOpenWorldMap: (Long) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val maps by repository.allMaps.collectAsState(initial = emptyList())
    val worldMaps by repository.allWorldMaps.collectAsState(initial = emptyList())

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Local Maps, 1: World Maps
    var showCreateMapDialog by remember { mutableStateOf(false) }
    var showCreateWorldDialog by remember { mutableStateOf(false) }
    var showImportDialog by remember { mutableStateOf(false) }
    var mapToExport by remember { mutableStateOf<GridMap?>(null) }
    var mapToDelete by remember { mutableStateOf<GridMap?>(null) }
    var worldToDelete by remember { mutableStateOf<WorldMap?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Map,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Map Maker",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Grid Maps & World Builder",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                actions = {
                    IconButton(
                        onClick = { showImportDialog = true },
                        modifier = Modifier.testTag("import_map_button")
                    ) {
                        Icon(Icons.Default.FileDownload, contentDescription = "Import Map JSON")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = {
                    if (selectedTab == 0) {
                        showCreateMapDialog = true
                    } else {
                        showCreateWorldDialog = true
                    }
                },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text(if (selectedTab == 0) "New Map" else "New World Map") },
                modifier = Modifier.testTag("create_fab")
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Local Maps (${maps.size})", fontWeight = FontWeight.SemiBold) },
                    icon = { Icon(Icons.Default.GridOn, contentDescription = null, modifier = Modifier.size(20.dp)) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("World Maps (${worldMaps.size})", fontWeight = FontWeight.SemiBold) },
                    icon = { Icon(Icons.Default.Public, contentDescription = null, modifier = Modifier.size(20.dp)) }
                )
            }

            if (selectedTab == 0) {
                // Local Maps Tab
                if (maps.isEmpty()) {
                    EmptyLibraryState(
                        title = "No Maps Created Yet",
                        subtitle = "Create your first grid map with customized terrain tiles, paths, and structures.",
                        buttonText = "Create New Map",
                        onAction = { showCreateMapDialog = true }
                    )
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 160.dp),
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(maps) { mapItem ->
                            MapCard(
                                map = mapItem,
                                onOpen = { onOpenMap(mapItem.id) },
                                onExport = { mapToExport = mapItem },
                                onDuplicate = {
                                    scope.launch {
                                        val duplicate = mapItem.copy(
                                            id = 0,
                                            name = "${mapItem.name} (Copy)",
                                            createdAt = System.currentTimeMillis(),
                                            updatedAt = System.currentTimeMillis()
                                        )
                                        repository.saveMap(duplicate)
                                        Toast.makeText(context, "Map duplicated!", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                onDelete = { mapToDelete = mapItem }
                            )
                        }
                    }
                }
            } else {
                // World Maps Tab
                if (worldMaps.isEmpty()) {
                    EmptyLibraryState(
                        title = "No World Maps Yet",
                        subtitle = "Connect smaller local maps into expansive multi-sector world maps!",
                        buttonText = "Create World Map",
                        onAction = { showCreateWorldDialog = true }
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(worldMaps) { world ->
                            WorldMapCard(
                                world = world,
                                onOpen = { onOpenWorldMap(world.id) },
                                onDelete = { worldToDelete = world }
                            )
                        }
                    }
                }
            }
        }
    }

    // Create Map Dialog
    if (showCreateMapDialog) {
        CreateMapDialog(
            onConfirm = { name, w, h, terrain ->
                scope.launch {
                    val newMap = GridMap.createEmpty(name = name, width = w, height = h, defaultTerrain = terrain)
                    val id = repository.saveMap(newMap)
                    showCreateMapDialog = false
                    onOpenMap(id)
                }
            },
            onDismiss = { showCreateMapDialog = false }
        )
    }

    // Create World Map Dialog
    if (showCreateWorldDialog) {
        CreateWorldDialog(
            onConfirm = { name, cols, rows ->
                scope.launch {
                    val newWorld = WorldMap(name = name, gridCols = cols, gridRows = rows)
                    val id = repository.saveWorldMap(newWorld)
                    showCreateWorldDialog = false
                    onOpenWorldMap(id)
                }
            },
            onDismiss = { showCreateWorldDialog = false }
        )
    }

    // Import Map Dialog
    if (showImportDialog) {
        ImportMapDialog(
            onImport = { jsonString ->
                val imported = GridMap.fromJsonString(jsonString)
                if (imported != null) {
                    scope.launch {
                        val id = repository.saveMap(imported)
                        showImportDialog = false
                        Toast.makeText(context, "Map imported successfully!", Toast.LENGTH_SHORT).show()
                        onOpenMap(id)
                    }
                } else {
                    Toast.makeText(context, "Invalid map JSON format", Toast.LENGTH_LONG).show()
                }
            },
            onDismiss = { showImportDialog = false }
        )
    }

    // Export Map Dialog
    if (mapToExport != null) {
        ExportMapDialog(
            map = mapToExport!!,
            onDismiss = { mapToExport = null }
        )
    }

    // Delete Map Confirmation
    if (mapToDelete != null) {
        AlertDialog(
            onDismissRequest = { mapToDelete = null },
            title = { Text("Delete Map") },
            text = { Text("Are you sure you want to delete \"${mapToDelete!!.name}\"? This cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        val id = mapToDelete!!.id
                        mapToDelete = null
                        scope.launch { repository.deleteMap(id) }
                    },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { mapToDelete = null }) { Text("Cancel") }
            }
        )
    }

    // Delete World Map Confirmation
    if (worldToDelete != null) {
        AlertDialog(
            onDismissRequest = { worldToDelete = null },
            title = { Text("Delete World Map") },
            text = { Text("Are you sure you want to delete \"${worldToDelete!!.name}\"? (Individual sector maps will not be deleted)") },
            confirmButton = {
                Button(
                    onClick = {
                        val id = worldToDelete!!.id
                        worldToDelete = null
                        scope.launch { repository.deleteWorldMap(id) }
                    },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { worldToDelete = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun MapCard(
    map: GridMap,
    onOpen: () -> Unit,
    onExport: () -> Unit,
    onDuplicate: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen() }
            .testTag("map_card_${map.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column {
            // Miniature Map Canvas Preview
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .background(Color(0xFF131822))
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val cs = size.width / map.width
                    val offsetY = (size.height - (map.height * cs)) / 2f
                    for (y in 0 until map.height) {
                        for (x in 0 until map.width) {
                            TileRenderer.drawTile(
                                drawScope = this,
                                tile = map.getTile(x, y),
                                x = x * cs,
                                y = offsetY + y * cs,
                                cellSize = cs,
                                showGrid = false
                            )
                        }
                    }
                }

                // Grid size badge
                Surface(
                    color = Color.Black.copy(alpha = 0.7f),
                    shape = RoundedCornerShape(bottomEnd = 8.dp),
                    modifier = Modifier.align(Alignment.TopStart)
                ) {
                    Text(
                        text = "${map.width}×${map.height}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            // Title and Actions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = map.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${map.tiles.size} tiles",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Box {
                    IconButton(
                        onClick = { showMenu = true },
                        modifier = Modifier.size(32.dp).testTag("map_menu_${map.id}")
                    ) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Options", modifier = Modifier.size(18.dp))
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Open / Edit") },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                            onClick = {
                                showMenu = false
                                onOpen()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Export (PNG / JSON)") },
                            leadingIcon = { Icon(Icons.Default.Share, contentDescription = null) },
                            onClick = {
                                showMenu = false
                                onExport()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Duplicate") },
                            leadingIcon = { Icon(Icons.Default.ContentCopy, contentDescription = null) },
                            onClick = {
                                showMenu = false
                                onDuplicate()
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete") },
                            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                            onClick = {
                                showMenu = false
                                onDelete()
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WorldMapCard(
    world: WorldMap,
    onOpen: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen() }
            .testTag("world_card_${world.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon emblem
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Public,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = world.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${world.gridCols}×${world.gridRows} Macro Grid (${world.gridCols * world.gridRows} Sectors)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "${world.slots.size} connected regional maps",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Options")
                }
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Open World Builder") },
                        leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                        onClick = {
                            showMenu = false
                            onOpen()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Delete World Map") },
                        leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                        onClick = {
                            showMenu = false
                            onDelete()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyLibraryState(
    title: String,
    subtitle: String,
    buttonText: String,
    onAction: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Map,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        Button(onClick = onAction) {
            Icon(Icons.Default.Add, contentDescription = null)
            Spacer(modifier = Modifier.width(6.dp))
            Text(buttonText)
        }
    }
}

@Composable
fun CreateMapDialog(
    onConfirm: (String, Int, Int, TerrainType) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("New Realm") }
    var width by remember { mutableIntStateOf(16) }
    var height by remember { mutableIntStateOf(16) }
    var widthText by remember { mutableStateOf("16") }
    var heightText by remember { mutableStateOf("16") }
    var selectedTerrain by remember { mutableStateOf(TerrainType.GRASS) }

    fun updateWidth(newW: Int) {
        val clamped = newW.coerceIn(2, 64)
        width = clamped
        widthText = clamped.toString()
    }

    fun updateHeight(newH: Int) {
        val clamped = newH.coerceIn(2, 64)
        height = clamped
        heightText = clamped.toString()
    }

    val presets = listOf(
        Pair(8, 8) to "8×8",
        Pair(12, 12) to "12×12",
        Pair(16, 16) to "16×16",
        Pair(20, 20) to "20×20",
        Pair(24, 24) to "24×24",
        Pair(32, 32) to "32×32"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create New Map") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Map Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("new_map_name_input")
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Dimensions Controls
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Grid Dimensions:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "${width} × ${height} (${width * height} cells)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Width Stepper
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("W:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, modifier = Modifier.width(20.dp))
                    IconButton(onClick = { updateWidth(width - 1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease width")
                    }
                    OutlinedTextField(
                        value = widthText,
                        onValueChange = {
                            widthText = it
                            it.toIntOrNull()?.let { w -> if (w in 2..64) width = w }
                        },
                        singleLine = true,
                        modifier = Modifier.weight(1f).testTag("new_map_width_input"),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    )
                    IconButton(onClick = { updateWidth(width + 1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Add, contentDescription = "Increase width")
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Height Stepper
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("H:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, modifier = Modifier.width(20.dp))
                    IconButton(onClick = { updateHeight(height - 1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease height")
                    }
                    OutlinedTextField(
                        value = heightText,
                        onValueChange = {
                            heightText = it
                            it.toIntOrNull()?.let { h -> if (h in 2..64) height = h }
                        },
                        singleLine = true,
                        modifier = Modifier.weight(1f).testTag("new_map_height_input"),
                        textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    )
                    IconButton(onClick = { updateHeight(height + 1) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.Add, contentDescription = "Increase height")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Presets
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    presets.take(4).forEach { (dims, label) ->
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

                Spacer(modifier = Modifier.height(14.dp))
                Text("Base Terrain:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(TerrainType.GRASS, TerrainType.DEEP_WATER, TerrainType.SAND, TerrainType.DUNGEON_FLOOR).forEach { t ->
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
                onClick = { onConfirm(name, width, height, selectedTerrain) },
                enabled = name.isNotBlank(),
                modifier = Modifier.testTag("confirm_create_map")
            ) {
                Text("Create Map")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun CreateWorldDialog(
    onConfirm: (String, Int, Int) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf("New World Map") }
    var cols by remember { mutableIntStateOf(3) }
    var rows by remember { mutableIntStateOf(3) }

    val presets = listOf(
        Pair(2, 2) to "2×2",
        Pair(3, 3) to "3×3",
        Pair(4, 4) to "4×4",
        Pair(5, 5) to "5×5"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Connected World Map") },
        text = {
            Column {
                Text(
                    text = "A world map connects local grid maps together into a seamless macro world.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("World Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().testTag("new_world_name_input")
                )
                Spacer(modifier = Modifier.height(14.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("World Grid Layout:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        text = "${cols} × ${rows} (${cols * rows} sectors)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))

                // Columns Stepper
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Cols:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, modifier = Modifier.width(36.dp))
                    IconButton(
                        onClick = { if (cols > 1) cols-- },
                        modifier = Modifier.size(36.dp).testTag("world_cols_minus")
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease columns")
                    }
                    Text(
                        text = cols.toString(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    IconButton(
                        onClick = { if (cols < 8) cols++ },
                        modifier = Modifier.size(36.dp).testTag("world_cols_plus")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Increase columns")
                    }
                }

                // Rows Stepper
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Rows:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, modifier = Modifier.width(36.dp))
                    IconButton(
                        onClick = { if (rows > 1) rows-- },
                        modifier = Modifier.size(36.dp).testTag("world_rows_minus")
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease rows")
                    }
                    Text(
                        text = rows.toString(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    IconButton(
                        onClick = { if (rows < 8) rows++ },
                        modifier = Modifier.size(36.dp).testTag("world_rows_plus")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Increase rows")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    presets.forEach { (dims, label) ->
                        FilterChip(
                            selected = cols == dims.first && rows == dims.second,
                            onClick = {
                                cols = dims.first
                                rows = dims.second
                            },
                            label = { Text(label, fontSize = 11.sp) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name, cols, rows) },
                enabled = name.isNotBlank(),
                modifier = Modifier.testTag("confirm_create_world")
            ) {
                Text("Create World")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun ImportMapDialog(
    onImport: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var jsonText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Import Map from JSON") },
        text = {
            Column {
                Text(
                    text = "Paste the exported map JSON string below:",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = jsonText,
                    onValueChange = { jsonText = it },
                    label = { Text("Map JSON") },
                    maxLines = 8,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .testTag("import_json_input")
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onImport(jsonText) },
                enabled = jsonText.isNotBlank(),
                modifier = Modifier.testTag("confirm_import_button")
            ) {
                Text("Import")
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
