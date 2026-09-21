package com.example.ui.components

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import com.example.data.model.GridTile
import com.example.data.model.MapObjectType
import com.example.data.model.TerrainType

object TileRenderer {

    fun drawTile(
        drawScope: DrawScope,
        tile: GridTile,
        x: Float,
        y: Float,
        cellSize: Float,
        showGrid: Boolean = true
    ) {
        val terrain = tile.terrain
        val baseColor = Color(terrain.baseColor)
        val detailColor = Color(terrain.detailColor)

        // 1. Draw base terrain background
        drawScope.drawRect(
            color = baseColor,
            topLeft = Offset(x, y),
            size = Size(cellSize, cellSize)
        )

        // 2. Draw terrain procedural patterns
        if (cellSize >= 12f) {
            drawTerrainDetails(drawScope, terrain, x, y, cellSize, detailColor)
        }

        // 3. Draw overlay object if present
        if (tile.obj != MapObjectType.NONE && cellSize >= 10f) {
            drawMapObject(drawScope, tile.obj, x, y, cellSize)
        }

        // 4. Draw grid border if requested
        if (showGrid && cellSize >= 8f) {
            drawScope.drawRect(
                color = Color.Black.copy(alpha = 0.18f),
                topLeft = Offset(x, y),
                size = Size(cellSize, cellSize),
                style = Stroke(width = if (cellSize > 24f) 1f else 0.5f)
            )
        }
    }

    private fun drawTerrainDetails(
        drawScope: DrawScope,
        terrain: TerrainType,
        x: Float,
        y: Float,
        s: Float,
        detailColor: Color
    ) {
        when (terrain) {
            TerrainType.DEEP_WATER -> {
                // Wave shimmer lines
                val stroke = Stroke(width = s * 0.07f)
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.2f, y + s * 0.35f),
                    end = Offset(x + s * 0.8f, y + s * 0.35f),
                    strokeWidth = stroke.width
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.35f, y + s * 0.7f),
                    end = Offset(x + s * 0.65f, y + s * 0.7f),
                    strokeWidth = stroke.width
                )
            }
            TerrainType.SHALLOW_WATER -> {
                // Light wave crests
                val stroke = Stroke(width = s * 0.08f)
                drawScope.drawLine(
                    color = Color.White.copy(alpha = 0.45f),
                    start = Offset(x + s * 0.25f, y + s * 0.4f),
                    end = Offset(x + s * 0.75f, y + s * 0.4f),
                    strokeWidth = stroke.width
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.15f, y + s * 0.75f),
                    end = Offset(x + s * 0.55f, y + s * 0.75f),
                    strokeWidth = stroke.width
                )
            }
            TerrainType.FOREST -> {
                // Cluster of 2 pine tree tops
                val p1 = Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.18f)
                    lineTo(x + s * 0.82f, y + s * 0.75f)
                    lineTo(x + s * 0.18f, y + s * 0.75f)
                    close()
                }
                drawScope.drawPath(p1, color = detailColor)
                // Small trunk
                drawScope.drawRect(
                    color = Color(0xFF4A321E),
                    topLeft = Offset(x + s * 0.44f, y + s * 0.75f),
                    size = Size(s * 0.12f, s * 0.18f)
                )
            }
            TerrainType.MOUNTAIN -> {
                // Peak triangle
                val mountainPath = Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.15f)
                    lineTo(x + s * 0.88f, y + s * 0.85f)
                    lineTo(x + s * 0.12f, y + s * 0.85f)
                    close()
                }
                drawScope.drawPath(mountainPath, color = detailColor)
                // Snow cap
                val snowPath = Path().apply {
                    moveTo(x + s * 0.5f, y + s * 0.15f)
                    lineTo(x + s * 0.65f, y + s * 0.4f)
                    lineTo(x + s * 0.35f, y + s * 0.4f)
                    close()
                }
                drawScope.drawPath(snowPath, color = Color.White.copy(alpha = 0.9f))
            }
            TerrainType.HILLS -> {
                // Rounded hill mound
                val hillPath = Path().apply {
                    moveTo(x + s * 0.1f, y + s * 0.85f)
                    quadraticBezierTo(x + s * 0.5f, y + s * 0.25f, x + s * 0.9f, y + s * 0.85f)
                    close()
                }
                drawScope.drawPath(hillPath, color = detailColor)
            }
            TerrainType.GRASS -> {
                // Gentle blades
                val bladeColor = detailColor.copy(alpha = 0.6f)
                drawScope.drawLine(
                    color = bladeColor,
                    start = Offset(x + s * 0.3f, y + s * 0.6f),
                    end = Offset(x + s * 0.35f, y + s * 0.35f),
                    strokeWidth = s * 0.05f
                )
                drawScope.drawLine(
                    color = bladeColor,
                    start = Offset(x + s * 0.7f, y + s * 0.7f),
                    end = Offset(x + s * 0.65f, y + s * 0.45f),
                    strokeWidth = s * 0.05f
                )
            }
            TerrainType.SAND -> {
                // Dune ripples
                drawScope.drawArc(
                    color = detailColor,
                    startAngle = 180f,
                    sweepAngle = 180f,
                    useCenter = false,
                    topLeft = Offset(x + s * 0.2f, y + s * 0.35f),
                    size = Size(s * 0.6f, s * 0.3f),
                    style = Stroke(width = s * 0.06f)
                )
            }
            TerrainType.DIRT_PATH -> {
                // Irregular pebbled path texture
                drawScope.drawCircle(
                    color = detailColor,
                    radius = s * 0.08f,
                    center = Offset(x + s * 0.35f, y + s * 0.4f)
                )
                drawScope.drawCircle(
                    color = detailColor,
                    radius = s * 0.06f,
                    center = Offset(x + s * 0.68f, y + s * 0.65f)
                )
            }
            TerrainType.STONE_ROAD -> {
                // Cobblestone paver pattern
                val stroke = Stroke(width = s * 0.05f)
                drawScope.drawRect(
                    color = detailColor,
                    topLeft = Offset(x + s * 0.1f, y + s * 0.1f),
                    size = Size(s * 0.38f, s * 0.38f),
                    style = stroke
                )
                drawScope.drawRect(
                    color = detailColor,
                    topLeft = Offset(x + s * 0.52f, y + s * 0.52f),
                    size = Size(s * 0.38f, s * 0.38f),
                    style = stroke
                )
            }
            TerrainType.SNOW -> {
                // Snowflake ice sparkle
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.5f, y + s * 0.3f),
                    end = Offset(x + s * 0.5f, y + s * 0.7f),
                    strokeWidth = s * 0.06f
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.3f, y + s * 0.5f),
                    end = Offset(x + s * 0.7f, y + s * 0.5f),
                    strokeWidth = s * 0.06f
                )
            }
            TerrainType.SWAMP -> {
                // Murky water pool
                drawScope.drawOval(
                    color = detailColor,
                    topLeft = Offset(x + s * 0.2f, y + s * 0.4f),
                    size = Size(s * 0.6f, s * 0.35f)
                )
            }
            TerrainType.LAVA -> {
                // Molten crack veins
                val lavaPath = Path().apply {
                    moveTo(x + s * 0.15f, y + s * 0.2f)
                    lineTo(x + s * 0.5f, y + s * 0.45f)
                    lineTo(x + s * 0.35f, y + s * 0.75f)
                    lineTo(x + s * 0.85f, y + s * 0.85f)
                }
                drawScope.drawPath(
                    lavaPath,
                    color = Color(0xFFFFCC00),
                    style = Stroke(width = s * 0.09f)
                )
            }
            TerrainType.DUNGEON_WALL -> {
                // Stone masonry blocks
                val mortar = Stroke(width = s * 0.06f)
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x, y + s * 0.5f),
                    end = Offset(x + s, y + s * 0.5f),
                    strokeWidth = mortar.width
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.5f, y),
                    end = Offset(x + s * 0.5f, y + s * 0.5f),
                    strokeWidth = mortar.width
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.25f, y + s * 0.5f),
                    end = Offset(x + s * 0.25f, y + s),
                    strokeWidth = mortar.width
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x + s * 0.75f, y + s * 0.5f),
                    end = Offset(x + s * 0.75f, y + s),
                    strokeWidth = mortar.width
                )
            }
            TerrainType.DUNGEON_FLOOR -> {
                // Grid flagstones
                drawScope.drawRect(
                    color = detailColor,
                    topLeft = Offset(x + s * 0.05f, y + s * 0.05f),
                    size = Size(s * 0.9f, s * 0.9f),
                    style = Stroke(width = s * 0.04f)
                )
            }
            TerrainType.WOOD_PLANK -> {
                // Floorboards
                val lineStroke = Stroke(width = s * 0.05f)
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x, y + s * 0.33f),
                    end = Offset(x + s, y + s * 0.33f),
                    strokeWidth = lineStroke.width
                )
                drawScope.drawLine(
                    color = detailColor,
                    start = Offset(x, y + s * 0.67f),
                    end = Offset(x + s, y + s * 0.67f),
                    strokeWidth = lineStroke.width
                )
            }
            TerrainType.CHASM -> {
                // Void cracks
                drawScope.drawLine(
                    color = Color(0xFF333333),
                    start = Offset(x + s * 0.1f, y + s * 0.1f),
                    end = Offset(x + s * 0.4f, y + s * 0.4f),
                    strokeWidth = s * 0.06f
                )
            }
        }
    }

    private fun drawMapObject(
        drawScope: DrawScope,
        obj: MapObjectType,
        x: Float,
        y: Float,
        s: Float
    ) {
        val paint = android.graphics.Paint().apply {
            textSize = s * 0.68f
            textAlign = android.graphics.Paint.Align.CENTER
            isAntiAlias = true
        }

        // Draw emoji or symbol centered in cell
        val emoji = obj.iconEmoji
        if (emoji.isNotEmpty()) {
            val textY = y + s * 0.75f
            val textX = x + s * 0.5f
            drawScope.drawContext.canvas.nativeCanvas.drawText(emoji, textX, textY, paint)
        }
    }
}
