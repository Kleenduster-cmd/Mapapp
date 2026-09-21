package com.example.ui.export

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import androidx.core.content.FileProvider
import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.MapObjectType
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

data class LegendEntry(
    val color: Long,
    val title: String,
    val count: Int,
    val iconEmoji: String? = null
)

object ImageExporter {

    suspend fun renderMapToBitmap(
        map: GridMap,
        cellSize: Int = 48,
        includeGridLines: Boolean = true,
        includeTitle: Boolean = true,
        includeLegend: Boolean = true,
        colorOnlyMode: Boolean = false
    ): Bitmap = withContext(Dispatchers.Default) {
        val bannerHeight = if (includeTitle) 80 else 0
        val mapPixelW = map.width * cellSize
        val mapPixelH = map.height * cellSize

        // Calculate legend entries and height if enabled
        val legendEntries = if (includeLegend) calculateMapLegend(map) else emptyList()
        val legendHeight = if (includeLegend && legendEntries.isNotEmpty()) {
            calculateLegendPanelHeight(legendEntries.size, mapPixelW)
        } else 0

        val imgWidth = mapPixelW.coerceAtLeast(360)
        val imgHeight = mapPixelH + bannerHeight + legendHeight

        val bitmap = Bitmap.createBitmap(imgWidth, imgHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Draw overall background
        val canvasBgPaint = Paint().apply { color = 0xFF141924.toInt() }
        canvas.drawRect(0f, 0f, imgWidth.toFloat(), imgHeight.toFloat(), canvasBgPaint)

        // Draw title banner if enabled
        if (includeTitle) {
            val bannerPaint = Paint().apply {
                color = 0xFF181E29.toInt()
                isAntiAlias = true
            }
            canvas.drawRect(0f, 0f, imgWidth.toFloat(), bannerHeight.toFloat(), bannerPaint)

            val textPaint = Paint().apply {
                color = 0xFFECEFF4.toInt()
                textSize = 34f
                isFakeBoldText = true
                isAntiAlias = true
            }
            canvas.drawText(map.name, 24f, 50f, textPaint)

            val dimPaint = Paint().apply {
                color = 0xFFA0AEC0.toInt()
                textSize = 20f
                isAntiAlias = true
                textAlign = Paint.Align.RIGHT
            }
            canvas.drawText("${map.width} × ${map.height} Grid", (imgWidth - 24).toFloat(), 50f, dimPaint)
        }

        val offsetY = bannerHeight.toFloat()
        val bgPaint = Paint().apply { isAntiAlias = false }
        val strokePaint = Paint().apply {
            color = if (colorOnlyMode) 0x44000000 else 0x2E000000
            strokeWidth = 1f
            style = Paint.Style.STROKE
            isAntiAlias = false
        }
        val textPaint = Paint().apply {
            textSize = cellSize * 0.65f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }

        // Center map horizontally if canvas is wider than map
        val offsetX = ((imgWidth - mapPixelW) / 2f).coerceAtLeast(0f)

        for (y in 0 until map.height) {
            for (x in 0 until map.width) {
                val tile = map.getTile(x, y)
                val cellX = offsetX + x * cellSize.toFloat()
                val cellY = offsetY + y * cellSize.toFloat()

                // Terrain base color
                bgPaint.color = tile.terrain.baseColor.toInt()
                canvas.drawRect(cellX, cellY, cellX + cellSize, cellY + cellSize, bgPaint)

                // Detail accent (only if not color-only mode)
                if (!colorOnlyMode) {
                    drawDetailToCanvas(canvas, tile.terrain, cellX, cellY, cellSize.toFloat())
                }

                // Overlay object
                if (tile.obj != MapObjectType.NONE && tile.obj.iconEmoji.isNotEmpty()) {
                    canvas.drawText(
                        tile.obj.iconEmoji,
                        cellX + cellSize * 0.5f,
                        cellY + cellSize * 0.74f,
                        textPaint
                    )
                }

                // Grid border
                if (includeGridLines) {
                    canvas.drawRect(cellX, cellY, cellX + cellSize, cellY + cellSize, strokePaint)
                }
            }
        }

        // Draw Tile Legend if enabled
        if (includeLegend && legendEntries.isNotEmpty()) {
            val legendTop = offsetY + mapPixelH
            drawLegendPanel(canvas, legendEntries, 0f, legendTop, imgWidth.toFloat(), legendHeight.toFloat())
        }

        bitmap
    }

    suspend fun renderWorldMapToBitmap(
        worldMap: WorldMap,
        connectedMaps: Map<Long, GridMap>,
        sectorCellSize: Int = 32,
        includeGridLines: Boolean = true,
        includeSectorBorders: Boolean = true,
        includeLegend: Boolean = true,
        colorOnlyMode: Boolean = false
    ): Bitmap = withContext(Dispatchers.Default) {
        val sectorWidth = 16
        val sectorHeight = 16
        val totalCols = worldMap.gridCols * sectorWidth
        val totalRows = worldMap.gridRows * sectorHeight

        val bannerHeight = 90
        val mapPixelW = totalCols * sectorCellSize
        val mapPixelH = totalRows * sectorCellSize

        // Calculate world legend
        val worldLegend = if (includeLegend) calculateWorldLegend(connectedMaps.values.toList()) else emptyList()
        val legendHeight = if (includeLegend && worldLegend.isNotEmpty()) {
            calculateLegendPanelHeight(worldLegend.size, mapPixelW)
        } else 0

        val imgWidth = mapPixelW.coerceAtLeast(400)
        val imgHeight = mapPixelH + bannerHeight + legendHeight

        val bitmap = Bitmap.createBitmap(imgWidth, imgHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        // Background
        val canvasBgPaint = Paint().apply { color = 0xFF141924.toInt() }
        canvas.drawRect(0f, 0f, imgWidth.toFloat(), imgHeight.toFloat(), canvasBgPaint)

        // Banner
        val bannerPaint = Paint().apply {
            color = 0xFF141924.toInt()
            isAntiAlias = true
        }
        canvas.drawRect(0f, 0f, imgWidth.toFloat(), bannerHeight.toFloat(), bannerPaint)

        val titlePaint = Paint().apply {
            color = 0xFFFFFFFF.toInt()
            textSize = 36f
            isFakeBoldText = true
            isAntiAlias = true
        }
        canvas.drawText(worldMap.name, 32f, 55f, titlePaint)

        val metaPaint = Paint().apply {
            color = 0xFF9AB8EC.toInt()
            textSize = 22f
            isAntiAlias = true
            textAlign = Paint.Align.RIGHT
        }
        val linkedCount = worldMap.slots.size
        canvas.drawText(
            "World Map (${worldMap.gridCols}×${worldMap.gridRows} Sectors • $linkedCount Connected)",
            (imgWidth - 32).toFloat(),
            55f,
            metaPaint
        )

        val offsetY = bannerHeight.toFloat()
        val offsetX = ((imgWidth - mapPixelW) / 2f).coerceAtLeast(0f)

        val bgPaint = Paint().apply { isAntiAlias = false }
        val gridPaint = Paint().apply {
            color = 0x20000000
            strokeWidth = 1f
            style = Paint.Style.STROKE
            isAntiAlias = false
        }
        val sectorBorderPaint = Paint().apply {
            color = 0xFF4B6B94.toInt()
            strokeWidth = 3f
            style = Paint.Style.STROKE
            isAntiAlias = true
        }
        val emptySectorPaint = Paint().apply {
            color = 0xFF1A2234.toInt()
            isAntiAlias = true
        }
        val textPaint = Paint().apply {
            textSize = sectorCellSize * 0.65f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }

        // Render sectors
        for (sRow in 0 until worldMap.gridRows) {
            for (sCol in 0 until worldMap.gridCols) {
                val mapId = worldMap.getMapId(sCol, sRow)
                val map = mapId?.let { connectedMaps[it] }

                val secOriginX = offsetX + sCol * sectorWidth * sectorCellSize.toFloat()
                val secOriginY = offsetY + sRow * sectorHeight * sectorCellSize.toFloat()

                if (map != null) {
                    for (y in 0 until sectorHeight) {
                        for (x in 0 until sectorWidth) {
                            val tile = map.getTile(x, y)
                            val cellX = secOriginX + x * sectorCellSize.toFloat()
                            val cellY = secOriginY + y * sectorCellSize.toFloat()

                            bgPaint.color = tile.terrain.baseColor.toInt()
                            canvas.drawRect(cellX, cellY, cellX + sectorCellSize, cellY + sectorCellSize, bgPaint)

                            if (!colorOnlyMode) {
                                drawDetailToCanvas(canvas, tile.terrain, cellX, cellY, sectorCellSize.toFloat())
                            }

                            if (tile.obj != MapObjectType.NONE && tile.obj.iconEmoji.isNotEmpty()) {
                                canvas.drawText(
                                    tile.obj.iconEmoji,
                                    cellX + sectorCellSize * 0.5f,
                                    cellY + sectorCellSize * 0.74f,
                                    textPaint
                                )
                            }

                            if (includeGridLines) {
                                canvas.drawRect(cellX, cellY, cellX + sectorCellSize, cellY + sectorCellSize, gridPaint)
                            }
                        }
                    }
                } else {
                    canvas.drawRect(
                        secOriginX,
                        secOriginY,
                        secOriginX + sectorWidth * sectorCellSize,
                        secOriginY + sectorHeight * sectorCellSize,
                        emptySectorPaint
                    )
                }

                if (includeSectorBorders) {
                    canvas.drawRect(
                        secOriginX,
                        secOriginY,
                        secOriginX + sectorWidth * sectorCellSize,
                        secOriginY + sectorHeight * sectorCellSize,
                        sectorBorderPaint
                    )
                }
            }
        }

        // Draw World Legend if enabled
        if (includeLegend && worldLegend.isNotEmpty()) {
            val legendTop = offsetY + mapPixelH
            drawLegendPanel(canvas, worldLegend, 0f, legendTop, imgWidth.toFloat(), legendHeight.toFloat())
        }

        bitmap
    }

    private fun calculateMapLegend(map: GridMap): List<LegendEntry> {
        val terrainCounts = map.tiles.groupingBy { it.terrain }.eachCount()
        val objectCounts = map.tiles
            .map { it.obj }
            .filter { it != MapObjectType.NONE }
            .groupingBy { it }
            .eachCount()

        val list = mutableListOf<LegendEntry>()
        // Sort terrains by count descending
        terrainCounts.entries.sortedByDescending { it.value }.forEach { (terrain, count) ->
            list.add(LegendEntry(color = terrain.baseColor, title = terrain.title.split("/").first().trim(), count = count))
        }
        // Add objects
        objectCounts.entries.sortedByDescending { it.value }.forEach { (obj, count) ->
            list.add(LegendEntry(color = 0xFF4A5568, title = obj.title.split("/").first().trim(), count = count, iconEmoji = obj.iconEmoji))
        }
        return list
    }

    private fun calculateWorldLegend(maps: List<GridMap>): List<LegendEntry> {
        val allTiles = maps.flatMap { it.tiles }
        val terrainCounts = allTiles.groupingBy { it.terrain }.eachCount()
        val objectCounts = allTiles
            .map { it.obj }
            .filter { it != MapObjectType.NONE }
            .groupingBy { it }
            .eachCount()

        val list = mutableListOf<LegendEntry>()
        terrainCounts.entries.sortedByDescending { it.value }.forEach { (terrain, count) ->
            list.add(LegendEntry(color = terrain.baseColor, title = terrain.title.split("/").first().trim(), count = count))
        }
        objectCounts.entries.sortedByDescending { it.value }.forEach { (obj, count) ->
            list.add(LegendEntry(color = 0xFF4A5568, title = obj.title.split("/").first().trim(), count = count, iconEmoji = obj.iconEmoji))
        }
        return list
    }

    private fun calculateLegendPanelHeight(itemCount: Int, availableWidth: Int): Int {
        val itemWidth = 190
        val cols = (availableWidth / itemWidth).coerceAtLeast(1)
        val rows = (itemCount + cols - 1) / cols
        return 48 + rows * 36 + 18 // Header (48px) + rows + bottom margin
    }

    private fun drawLegendPanel(
        canvas: Canvas,
        entries: List<LegendEntry>,
        left: Float,
        top: Float,
        width: Float,
        height: Float
    ) {
        // Panel background
        val panelBg = Paint().apply {
            color = 0xFF161D2B.toInt()
            isAntiAlias = true
        }
        canvas.drawRect(left, top, left + width, top + height, panelBg)

        // Top divider line
        val linePaint = Paint().apply {
            color = 0xFF2D3B52.toInt()
            strokeWidth = 2f
        }
        canvas.drawLine(left, top, left + width, top, linePaint)

        // Legend Header Title
        val headerPaint = Paint().apply {
            color = 0xFFE2E8F0.toInt()
            textSize = 20f
            isFakeBoldText = true
            isAntiAlias = true
        }
        canvas.drawText("TILE & COLOR LEGEND", left + 24f, top + 32f, headerPaint)

        // Items layout
        val itemWidth = 190f
        val cols = (width / itemWidth).toInt().coerceAtLeast(1)
        val startY = top + 52f

        val swatchPaint = Paint().apply { isAntiAlias = true }
        val swatchBorder = Paint().apply {
            color = 0xFF64748B.toInt()
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
            isAntiAlias = true
        }
        val labelPaint = Paint().apply {
            color = 0xFFCBD5E1.toInt()
            textSize = 15f
            isAntiAlias = true
        }
        val countPaint = Paint().apply {
            color = 0xFF94A3B8.toInt()
            textSize = 13f
            isAntiAlias = true
        }
        val emojiPaint = Paint().apply {
            textSize = 18f
            isAntiAlias = true
        }

        entries.forEachIndexed { index, entry ->
            val col = index % cols
            val row = index / cols

            val itemX = left + 24f + col * itemWidth
            val itemY = startY + row * 34f

            if (entry.iconEmoji != null) {
                // Draw object marker icon
                canvas.drawText(entry.iconEmoji, itemX, itemY + 18f, emojiPaint)
                canvas.drawText(entry.title, itemX + 28f, itemY + 14f, labelPaint)
                canvas.drawText("(${entry.count})", itemX + 28f + labelPaint.measureText(entry.title) + 6f, itemY + 14f, countPaint)
            } else {
                // Draw color swatch
                val swatchRect = RectF(itemX, itemY, itemX + 20f, itemY + 20f)
                swatchPaint.color = entry.color.toInt()
                canvas.drawRoundRect(swatchRect, 4f, 4f, swatchPaint)
                canvas.drawRoundRect(swatchRect, 4f, 4f, swatchBorder)

                // Label & count
                canvas.drawText(entry.title, itemX + 28f, itemY + 15f, labelPaint)
                canvas.drawText("(${entry.count})", itemX + 28f + labelPaint.measureText(entry.title) + 6f, itemY + 15f, countPaint)
            }
        }
    }

    private fun drawDetailToCanvas(
        canvas: Canvas,
        terrain: TerrainType,
        x: Float,
        y: Float,
        s: Float
    ) {
        val detailPaint = Paint().apply {
            color = terrain.detailColor.toInt()
            strokeWidth = (s * 0.08f).coerceAtLeast(1.5f)
            style = Paint.Style.STROKE
            isAntiAlias = true
        }
        val fillPaint = Paint().apply {
            color = terrain.detailColor.toInt()
            style = Paint.Style.FILL
            isAntiAlias = true
        }

        when (terrain) {
            TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER -> {
                canvas.drawLine(x + s * 0.2f, y + s * 0.45f, x + s * 0.5f, y + s * 0.45f, detailPaint)
                canvas.drawLine(x + s * 0.4f, y + s * 0.7f, x + s * 0.75f, y + s * 0.7f, detailPaint)
            }
            TerrainType.MOUNTAIN, TerrainType.SNOW -> {
                val path = android.graphics.Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.2f)
                    lineTo(x + s * 0.82f, y + s * 0.8f)
                    lineTo(x + s * 0.18f, y + s * 0.8f)
                    close()
                }
                canvas.drawPath(path, fillPaint)
            }
            TerrainType.FOREST -> {
                val path = android.graphics.Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.2f)
                    lineTo(x + s * 0.78f, y + s * 0.55f)
                    lineTo(x + s * 0.22f, y + s * 0.55f)
                    close()
                }
                canvas.drawPath(path, fillPaint)
                canvas.drawRect(x + s * 0.42f, y + s * 0.55f, x + s * 0.58f, y + s * 0.85f, fillPaint)
            }
            TerrainType.LAVA -> {
                val path = android.graphics.Path().apply {
                    moveTo(x + s * 0.1f, y + s * 0.2f)
                    lineTo(x + s * 0.45f, y + s * 0.5f)
                    lineTo(x + s * 0.35f, y + s * 0.85f)
                }
                canvas.drawPath(path, detailPaint)
            }
            TerrainType.SAND -> {
                canvas.drawCircle(x + s * 0.35f, y + s * 0.4f, s * 0.08f, fillPaint)
                canvas.drawCircle(x + s * 0.65f, y + s * 0.65f, s * 0.08f, fillPaint)
            }
            TerrainType.STONE_ROAD -> {
                val cobbleBorder = Paint().apply {
                    color = terrain.detailColor.toInt()
                    style = Paint.Style.STROKE
                    strokeWidth = 1f
                }
                canvas.drawRect(x + s * 0.1f, y + s * 0.1f, x + s * 0.45f, y + s * 0.45f, cobbleBorder)
                canvas.drawRect(x + s * 0.55f, y + s * 0.55f, x + s * 0.9f, y + s * 0.9f, cobbleBorder)
            }
            else -> {
                canvas.drawLine(x + s * 0.3f, y + s * 0.5f, x + s * 0.7f, y + s * 0.5f, detailPaint)
            }
        }
    }

    suspend fun saveBitmapToFile(context: Context, bitmap: Bitmap, fileName: String): File = withContext(Dispatchers.IO) {
        val exportDir = File(context.cacheDir, "shared_maps").apply { mkdirs() }
        val safeName = fileName.replace("[^a-zA-Z0-9_\\-]".toRegex(), "_")
        val file = File(exportDir, "${safeName}_${System.currentTimeMillis()}.png")
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            out.flush()
        }
        file
    }

    suspend fun saveJsonToFile(context: Context, jsonString: String, fileName: String): File = withContext(Dispatchers.IO) {
        val exportDir = File(context.cacheDir, "shared_maps").apply { mkdirs() }
        val safeName = fileName.replace("[^a-zA-Z0-9_\\-]".toRegex(), "_")
        val file = File(exportDir, "${safeName}_${System.currentTimeMillis()}.json")
        file.writeText(jsonString)
        file
    }

    fun shareImageFile(context: Context, file: File, title: String) {
        val authority = "${context.packageName}.fileprovider"
        val uri = FileProvider.getUriForFile(context, authority, file)

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, title)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Export & Share Map"))
    }

    fun shareJsonFile(context: Context, file: File, title: String) {
        val authority = "${context.packageName}.fileprovider"
        val uri = FileProvider.getUriForFile(context, authority, file)

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, title)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Export Map Data"))
    }
}
