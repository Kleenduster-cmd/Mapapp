package com.example.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DataObject
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.model.GridMap
import com.example.data.model.WorldMap
import com.example.ui.export.ImageExporter
import kotlinx.coroutines.launch

@Composable
fun ExportMapDialog(
    map: GridMap,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableIntStateOf(0) }
    var includeGridLines by remember { mutableStateOf(true) }
    var includeTitle by remember { mutableStateOf(true) }
    var includeLegend by remember { mutableStateOf(true) }
    var colorOnlyMode by remember { mutableStateOf(false) }
    var cellSize by remember { mutableIntStateOf(48) }
    var isExporting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Export \"${map.name}\"",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onDismiss, modifier = Modifier.testTag("close_export_dialog")) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("PNG Image") },
                        icon = { Icon(Icons.Default.Image, contentDescription = null) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("JSON Data") },
                        icon = { Icon(Icons.Default.DataObject, contentDescription = null) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (selectedTab == 0) {
                    // PNG Options
                    Text("Image Options", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeGridLines,
                            onCheckedChange = { includeGridLines = it },
                            modifier = Modifier.testTag("checkbox_grid_lines")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Include Grid Lines", style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeTitle,
                            onCheckedChange = { includeTitle = it },
                            modifier = Modifier.testTag("checkbox_title_banner")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Include Header Banner", style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeLegend,
                            onCheckedChange = { includeLegend = it },
                            modifier = Modifier.testTag("checkbox_tile_legend")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Include Tile Legend (Color-Coded)", style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = colorOnlyMode,
                            onCheckedChange = { colorOnlyMode = it },
                            modifier = Modifier.testTag("checkbox_color_mode")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Color-Based Style (Solid Color Blocks)", style = MaterialTheme.typography.bodyMedium)
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Resolution / Tile Size:", style = MaterialTheme.typography.labelMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(32 to "Compact", 48 to "Standard", 64 to "Ultra HD").forEach { (size, label) ->
                            FilterChip(
                                selected = cellSize == size,
                                onClick = { cellSize = size },
                                label = { Text(label) },
                                leadingIcon = if (cellSize == size) {
                                    { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                                } else null
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Output size: ${map.width * cellSize} × ${map.height * cellSize + if (includeTitle) 80 else 0} px",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    // JSON Export
                    Text("Map Data Payload", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Export the raw structure of this grid map. You can save it as a file, backup, or share with other players.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "Tiles: ${map.tiles.size} (${map.width}×${map.height})",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Format: JSON Map Format v1",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (selectedTab == 0) {
                Button(
                    onClick = {
                        scope.launch {
                            isExporting = true
                            try {
                                val bitmap = ImageExporter.renderMapToBitmap(
                                    map = map,
                                    cellSize = cellSize,
                                    includeGridLines = includeGridLines,
                                    includeTitle = includeTitle,
                                    includeLegend = includeLegend,
                                    colorOnlyMode = colorOnlyMode
                                )
                                val file = ImageExporter.saveBitmapToFile(context, bitmap, map.name)
                                ImageExporter.shareImageFile(context, file, map.name)
                                onDismiss()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Export error: ${e.message}", Toast.LENGTH_SHORT).show()
                            } finally {
                                isExporting = false
                            }
                        }
                    },
                    enabled = !isExporting,
                    modifier = Modifier.testTag("share_png_button")
                ) {
                    if (isExporting) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Rendering...")
                    } else {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Share / Save PNG")
                    }
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(map.toJsonString()))
                            Toast.makeText(context, "Map JSON copied to clipboard!", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        modifier = Modifier.testTag("copy_json_button")
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Copy")
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                try {
                                    val file = ImageExporter.saveJsonToFile(context, map.toJsonString(), map.name)
                                    ImageExporter.shareJsonFile(context, file, map.name)
                                    onDismiss()
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Export error: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        modifier = Modifier.testTag("share_json_button")
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Share JSON")
                    }
                }
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
fun ExportWorldMapDialog(
    worldMap: WorldMap,
    connectedMaps: Map<Long, GridMap>,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableIntStateOf(0) }
    var includeGridLines by remember { mutableStateOf(false) }
    var includeBorders by remember { mutableStateOf(true) }
    var includeLegend by remember { mutableStateOf(true) }
    var colorOnlyMode by remember { mutableStateOf(false) }
    var cellSize by remember { mutableIntStateOf(32) }
    var isExporting by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Export \"${worldMap.name}\"",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onDismiss, modifier = Modifier.testTag("close_world_export_dialog")) {
                    Icon(Icons.Default.Close, contentDescription = "Close")
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Stitched World PNG") },
                        icon = { Icon(Icons.Default.Image, contentDescription = null) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("World Bundle JSON") },
                        icon = { Icon(Icons.Default.DataObject, contentDescription = null) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (selectedTab == 0) {
                    Text("Stitched World Image", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeBorders,
                            onCheckedChange = { includeBorders = it },
                            modifier = Modifier.testTag("checkbox_sector_borders")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Show Sector Boundaries", style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeGridLines,
                            onCheckedChange = { includeGridLines = it },
                            modifier = Modifier.testTag("checkbox_world_grid_lines")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Show Local Tile Grid", style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = includeLegend,
                            onCheckedChange = { includeLegend = it },
                            modifier = Modifier.testTag("checkbox_world_legend")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Include Tile & Color Legend", style = MaterialTheme.typography.bodyMedium)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = colorOnlyMode,
                            onCheckedChange = { colorOnlyMode = it },
                            modifier = Modifier.testTag("checkbox_world_color_mode")
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Color-Based Flat Style", style = MaterialTheme.typography.bodyMedium)
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Tile Resolution:", style = MaterialTheme.typography.labelMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(24 to "Standard", 32 to "High-Res", 48 to "Ultra").forEach { (size, label) ->
                            FilterChip(
                                selected = cellSize == size,
                                onClick = { cellSize = size },
                                label = { Text(label) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    val totalCols = worldMap.gridCols * 16
                    val totalRows = worldMap.gridRows * 16
                    Text(
                        text = "Composite Dimensions: ${totalCols * cellSize} × ${totalRows * cellSize + 90} px (${worldMap.slots.size} connected maps)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Text("World Package Payload", style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Exports the complete world structure including all connected sector maps.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        confirmButton = {
            if (selectedTab == 0) {
                Button(
                    onClick = {
                        scope.launch {
                            isExporting = true
                            try {
                                val bitmap = ImageExporter.renderWorldMapToBitmap(
                                    worldMap = worldMap,
                                    connectedMaps = connectedMaps,
                                    sectorCellSize = cellSize,
                                    includeGridLines = includeGridLines,
                                    includeSectorBorders = includeBorders,
                                    includeLegend = includeLegend,
                                    colorOnlyMode = colorOnlyMode
                                )
                                val file = ImageExporter.saveBitmapToFile(context, bitmap, worldMap.name)
                                ImageExporter.shareImageFile(context, file, worldMap.name)
                                onDismiss()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Export error: ${e.message}", Toast.LENGTH_SHORT).show()
                            } finally {
                                isExporting = false
                            }
                        }
                    },
                    enabled = !isExporting,
                    modifier = Modifier.testTag("share_world_png_button")
                ) {
                    if (isExporting) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Stitching World...")
                    } else {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Share Stitched PNG")
                    }
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val jsonStr = remember(worldMap, connectedMaps) {
                        worldMap.toJsonString(connectedMaps.values.toList())
                    }
                    OutlinedButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(jsonStr))
                            Toast.makeText(context, "World JSON copied to clipboard!", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        },
                        modifier = Modifier.testTag("copy_world_json_button")
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Copy")
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                try {
                                    val file = ImageExporter.saveJsonToFile(context, jsonStr, worldMap.name)
                                    ImageExporter.shareJsonFile(context, file, worldMap.name)
                                    onDismiss()
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Export error: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        modifier = Modifier.testTag("share_world_json_button")
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Share JSON")
                    }
                }
            }
        },
        dismissButton = {
            OutlinedButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
