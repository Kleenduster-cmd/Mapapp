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

object ImageExporter {

    suspend fun renderMapToBitmap(
        map: GridMap,
        cellSize: Int = 48,
        includeGridLines: Boolean = true,
        includeTitle: Boolean = true
    ): Bitmap = withContext(Dispatchers.Default) {
        val bannerHeight = if (includeTitle) 80 else 0
        val imgWidth = map.width * cellSize
        val imgHeight = map.height * cellSize + bannerHeight

        val bitmap = Bitmap.createBitmap(imgWidth, imgHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

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
            color = 0x2E000000
            strokeWidth = 1f
            style = Paint.Style.STROKE
            isAntiAlias = false
        }
        val textPaint = Paint().apply {
            textSize = cellSize * 0.65f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }

        for (y in 0 until map.height) {
            for (x in 0 until map.width) {
                val tile = map.getTile(x, y)
                val cellX = x * cellSize.toFloat()
                val cellY = offsetY + y * cellSize.toFloat()

                // Terrain base
                bgPaint.color = tile.terrain.baseColor.toInt()
                canvas.drawRect(cellX, cellY, cellX + cellSize, cellY + cellSize, bgPaint)

                // Detail accent
                drawDetailToCanvas(canvas, tile.terrain, cellX, cellY, cellSize.toFloat())

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

        bitmap
    }

    suspend fun renderWorldMapToBitmap(
        worldMap: WorldMap,
        connectedMaps: Map<Long, GridMap>,
        sectorCellSize: Int = 32,
        includeGridLines: Boolean = true,
        includeSectorBorders: Boolean = true
    ): Bitmap = withContext(Dispatchers.Default) {
        // Assume sectors are uniform or fallback to standard 16x16
        val sectorWidth = 16
        val sectorHeight = 16
        val totalCols = worldMap.gridCols * sectorWidth
        val totalRows = worldMap.gridRows * sectorHeight

        val bannerHeight = 90
        val imgWidth = totalCols * sectorCellSize
        val imgHeight = totalRows * sectorCellSize + bannerHeight

        val bitmap = Bitmap.createBitmap(imgWidth, imgHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

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
        val bgPaint = Paint().apply { isAntiAlias = false }
        val gridPaint = Paint().apply {
            color = 0x20000000
            strokeWidth = 1f
            style = Paint.Style.STROKE
            isAntiAlias = false
        }
        val sectorBorderPaint = Paint().apply {
            color = 0xFF3D5A80.toInt()
            strokeWidth = 4f
            style = Paint.Style.STROKE
            isAntiAlias = true
        }
        val emptySectorPaint = Paint().apply {
            color = 0xFF1E2638.toInt()
            isAntiAlias = true
        }
        val textPaint = Paint().apply {
            textSize = sectorCellSize * 0.65f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
        }

        // Draw each sector
        for (sRow in 0 until worldMap.gridRows) {
            for (sCol in 0 until worldMap.gridCols) {
                val mapId = worldMap.getMapId(sCol, sRow)
                val gridMap = mapId?.let { connectedMaps[it] }

                val sectorPixelX = sCol * sectorWidth * sectorCellSize.toFloat()
                val sectorPixelY = offsetY + sRow * sectorHeight * sectorCellSize.toFloat()
                val sectorPixelW = sectorWidth * sectorCellSize.toFloat()
                val sectorPixelH = sectorHeight * sectorCellSize.toFloat()

                if (gridMap != null) {
                    for (y in 0 until sectorHeight) {
                        for (x in 0 until sectorWidth) {
                            val tile = gridMap.getTile(x, y)
                            val cellX = sectorPixelX + x * sectorCellSize.toFloat()
                            val cellY = sectorPixelY + y * sectorCellSize.toFloat()

                            bgPaint.color = tile.terrain.baseColor.toInt()
                            canvas.drawRect(cellX, cellY, cellX + sectorCellSize, cellY + sectorCellSize, bgPaint)

                            drawDetailToCanvas(canvas, tile.terrain, cellX, cellY, sectorCellSize.toFloat())

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
                    // Empty uncharted sector
                    canvas.drawRect(sectorPixelX, sectorPixelY, sectorPixelX + sectorPixelW, sectorPixelY + sectorPixelH, emptySectorPaint)
                    val unchPaint = Paint().apply {
                        color = 0x55FFFFFF
                        textSize = 26f
                        textAlign = Paint.Align.CENTER
                        isAntiAlias = true
                    }
                    canvas.drawText("Uncharted Sector (${sCol + 1}, ${sRow + 1})", sectorPixelX + sectorPixelW / 2f, sectorPixelY + sectorPixelH / 2f, unchPaint)
                }

                if (includeSectorBorders) {
                    canvas.drawRect(sectorPixelX, sectorPixelY, sectorPixelX + sectorPixelW, sectorPixelY + sectorPixelH, sectorBorderPaint)
                }
            }
        }

        bitmap
    }

    private fun drawDetailToCanvas(canvas: Canvas, terrain: TerrainType, x: Float, y: Float, s: Float) {
        if (s < 12f) return
        val detailPaint = Paint().apply {
            color = terrain.detailColor.toInt()
            isAntiAlias = true
            strokeWidth = (s * 0.07f).coerceAtLeast(1f)
            style = Paint.Style.STROKE
        }

        when (terrain) {
            TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER -> {
                canvas.drawLine(x + s * 0.2f, y + s * 0.4f, x + s * 0.8f, y + s * 0.4f, detailPaint)
                canvas.drawLine(x + s * 0.35f, y + s * 0.7f, x + s * 0.65f, y + s * 0.7f, detailPaint)
            }
            TerrainType.MOUNTAIN -> {
                val fillPaint = Paint().apply {
                    color = terrain.detailColor.toInt()
                    style = Paint.Style.FILL
                    isAntiAlias = true
                }
                val path = android.graphics.Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.15f)
                    lineTo(x + s * 0.88f, y + s * 0.85f)
                    lineTo(x + s * 0.12f, y + s * 0.85f)
                    close()
                }
                canvas.drawPath(path, fillPaint)

                // Snow cap
                val snowPaint = Paint().apply {
                    color = 0xFFFFFFFF.toInt()
                    style = Paint.Style.FILL
                    isAntiAlias = true
                }
                val snowPath = android.graphics.Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.15f)
                    lineTo(x + s * 0.65f, y + s * 0.4f)
                    lineTo(x + s * 0.35f, y + s * 0.4f)
                    close()
                }
                canvas.drawPath(snowPath, snowPaint)
            }
            TerrainType.FOREST -> {
                val fillPaint = Paint().apply {
                    color = terrain.detailColor.toInt()
                    style = Paint.Style.FILL
                    isAntiAlias = true
                }
                val path = android.graphics.Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.18f)
                    lineTo(x + s * 0.82f, y + s * 0.75f)
                    lineTo(x + s * 0.18f, y + s * 0.75f)
                    close()
                }
                canvas.drawPath(path, fillPaint)
            }
            else -> {
                // Subtle texture line
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
