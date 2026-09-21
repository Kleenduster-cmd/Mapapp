package com.example.data.model

import org.json.JSONArray
import org.json.JSONObject

data class SectorSlot(
    val col: Int,
    val row: Int,
    val mapId: Long
)

data class WorldMap(
    val id: Long = 0,
    val name: String,
    val gridCols: Int = 3,
    val gridRows: Int = 3,
    val slots: Map<String, Long> = emptyMap(), // key: "col_row" -> mapId
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val description: String = ""
) {
    init {
        require(gridCols > 0 && gridRows > 0) { "World dimensions must be positive" }
    }

    fun getMapId(col: Int, row: Int): Long? {
        return slots["${col}_$row"]
    }

    fun withSlotLinked(col: Int, row: Int, mapId: Long): WorldMap {
        val newSlots = slots.toMutableMap()
        newSlots["${col}_$row"] = mapId
        return copy(slots = newSlots, updatedAt = System.currentTimeMillis())
    }

    fun withSlotUnlinked(col: Int, row: Int): WorldMap {
        val newSlots = slots.toMutableMap()
        newSlots.remove("${col}_$row")
        return copy(slots = newSlots, updatedAt = System.currentTimeMillis())
    }

    fun expandWorld(
        addLeft: Int = 0,
        addTop: Int = 0,
        addRight: Int = 0,
        addBottom: Int = 0
    ): WorldMap {
        if (addLeft <= 0 && addTop <= 0 && addRight <= 0 && addBottom <= 0) return this
        val clampedLeft = maxOf(0, addLeft)
        val clampedTop = maxOf(0, addTop)
        val clampedRight = maxOf(0, addRight)
        val clampedBottom = maxOf(0, addBottom)

        val newCols = gridCols + clampedLeft + clampedRight
        val newRows = gridRows + clampedTop + clampedBottom
        val newSlots = mutableMapOf<String, Long>()

        for ((key, mapId) in slots) {
            val parts = key.split("_")
            val c = parts.getOrNull(0)?.toIntOrNull() ?: continue
            val r = parts.getOrNull(1)?.toIntOrNull() ?: continue
            val newC = c + clampedLeft
            val newR = r + clampedTop
            newSlots["${newC}_${newR}"] = mapId
        }

        return copy(
            gridCols = newCols,
            gridRows = newRows,
            slots = newSlots,
            updatedAt = System.currentTimeMillis()
        )
    }

    fun serializeSlots(): String {
        val json = JSONObject()
        for ((key, mapId) in slots) {
            json.put(key, mapId)
        }
        return json.toString()
    }

    fun toJsonString(connectedMaps: List<GridMap>): String {
        val root = JSONObject()
        root.put("version", 1)
        root.put("name", name)
        root.put("gridCols", gridCols)
        root.put("gridRows", gridRows)
        root.put("description", description)
        root.put("createdAt", createdAt)
        root.put("updatedAt", updatedAt)

        val slotsObj = JSONObject()
        for ((key, id) in slots) {
            slotsObj.put(key, id)
        }
        root.put("slots", slotsObj)

        val mapsArr = JSONArray()
        for (m in connectedMaps) {
            mapsArr.put(JSONObject(m.toJsonString()))
        }
        root.put("maps", mapsArr)
        return root.toString(2)
    }

    companion object {
        fun deserializeSlots(jsonStr: String): Map<String, Long> {
            if (jsonStr.isBlank()) return emptyMap()
            return try {
                val json = JSONObject(jsonStr)
                val map = mutableMapOf<String, Long>()
                val keys = json.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    map[key] = json.getLong(key)
                }
                map
            } catch (e: Exception) {
                emptyMap()
            }
        }
    }
}
