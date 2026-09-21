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
