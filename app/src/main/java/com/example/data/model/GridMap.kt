package com.example.data.model

import org.json.JSONArray
import org.json.JSONObject

data class GridTile(
    val terrain: TerrainType = TerrainType.GRASS,
    val obj: MapObjectType = MapObjectType.NONE,
    val label: String? = null
) {
    fun toSerialized(): String {
        val objPart = if (obj != MapObjectType.NONE) obj.id else ""
        val labelPart = label ?: ""
        return "${terrain.id}|$objPart|$labelPart"
    }

    companion object {
        fun fromSerialized(str: String): GridTile {
            val parts = str.split("|")
            val terrain = TerrainType.fromId(parts.getOrNull(0))
            val obj = parts.getOrNull(1)?.let { MapObjectType.fromId(it) } ?: MapObjectType.NONE
            val label = parts.getOrNull(2)?.takeIf { it.isNotBlank() }
            return GridTile(terrain, obj, label)
        }
    }
}

data class GridMap(
    val id: Long = 0,
    val name: String,
    val width: Int,
    val height: Int,
    val tiles: List<GridTile>,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val description: String = ""
) {
    init {
        require(width > 0 && height > 0) { "Dimensions must be positive" }
    }

    fun getTile(x: Int, y: Int): GridTile {
        if (x in 0 until width && y in 0 until height) {
            val index = y * width + x
            if (index in tiles.indices) {
                return tiles[index]
            }
        }
        return GridTile(TerrainType.GRASS)
    }

    fun withTileUpdated(x: Int, y: Int, newTile: GridTile): GridMap {
        if (x !in 0 until width || y !in 0 until height) return this
        val newTiles = tiles.toMutableList()
        val index = y * width + x
        newTiles[index] = newTile
        return copy(tiles = newTiles, updatedAt = System.currentTimeMillis())
    }

    fun withTilesUpdated(updatedIndices: Map<Int, GridTile>): GridMap {
        if (updatedIndices.isEmpty()) return this
        val newTiles = tiles.toMutableList()
        for ((idx, tile) in updatedIndices) {
            if (idx in newTiles.indices) {
                newTiles[idx] = tile
            }
        }
        return copy(tiles = newTiles, updatedAt = System.currentTimeMillis())
    }

    fun expandMap(
        addLeft: Int = 0,
        addTop: Int = 0,
        addRight: Int = 0,
        addBottom: Int = 0,
        fillTerrain: TerrainType = TerrainType.GRASS
    ): GridMap {
        if (addLeft <= 0 && addTop <= 0 && addRight <= 0 && addBottom <= 0) return this
        val clampedLeft = maxOf(0, addLeft)
        val clampedTop = maxOf(0, addTop)
        val clampedRight = maxOf(0, addRight)
        val clampedBottom = maxOf(0, addBottom)

        val newWidth = width + clampedLeft + clampedRight
        val newHeight = height + clampedTop + clampedBottom
        val newTiles = ArrayList<GridTile>(newWidth * newHeight)

        for (ny in 0 until newHeight) {
            val oldY = ny - clampedTop
            for (nx in 0 until newWidth) {
                val oldX = nx - clampedLeft
                if (oldX in 0 until width && oldY in 0 until height) {
                    newTiles.add(getTile(oldX, oldY))
                } else {
                    newTiles.add(GridTile(fillTerrain))
                }
            }
        }

        return copy(
            width = newWidth,
            height = newHeight,
            tiles = newTiles,
            updatedAt = System.currentTimeMillis()
        )
    }

    fun serializeTiles(): String {
        return tiles.joinToString(";") { it.toSerialized() }
    }

    fun toJsonString(): String {
        val root = JSONObject()
        root.put("version", 1)
        root.put("name", name)
        root.put("width", width)
        root.put("height", height)
        root.put("description", description)
        root.put("createdAt", createdAt)
        root.put("updatedAt", updatedAt)

        val tileArray = JSONArray()
        for (tile in tiles) {
            tileArray.put(tile.toSerialized())
        }
        root.put("tiles", tileArray)
        return root.toString(2)
    }

    companion object {
        fun createEmpty(name: String, width: Int = 16, height: Int = 16, defaultTerrain: TerrainType = TerrainType.GRASS): GridMap {
            val total = width * height
            val tiles = List(total) { GridTile(defaultTerrain) }
            return GridMap(
                name = name,
                width = width,
                height = height,
                tiles = tiles
            )
        }

        fun deserializeTiles(serialized: String, width: Int, height: Int, defaultTerrain: TerrainType = TerrainType.GRASS): List<GridTile> {
            val total = width * height
            if (serialized.isBlank()) return List(total) { GridTile(defaultTerrain) }
            val rawList = serialized.split(";")
            val result = mutableListOf<GridTile>()
            for (i in 0 until total) {
                if (i < rawList.size && rawList[i].isNotBlank()) {
                    result.add(GridTile.fromSerialized(rawList[i]))
                } else {
                    result.add(GridTile(defaultTerrain))
                }
            }
            return result
        }

        fun fromJsonString(jsonStr: String): GridMap? {
            return try {
                val root = JSONObject(jsonStr)
                val name = root.optString("name", "Imported Map")
                val width = root.getInt("width")
                val height = root.getInt("height")
                val desc = root.optString("description", "")
                val tileArray = root.getJSONArray("tiles")
                val tiles = mutableListOf<GridTile>()
                for (i in 0 until tileArray.length()) {
                    tiles.add(GridTile.fromSerialized(tileArray.getString(i)))
                }
                GridMap(
                    name = name,
                    width = width,
                    height = height,
                    tiles = tiles,
                    description = desc
                )
            } catch (e: Exception) {
                null
            }
        }
    }
}
