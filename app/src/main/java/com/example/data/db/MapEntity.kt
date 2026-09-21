package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.GridMap

@Entity(tableName = "maps")
data class MapEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val width: Int,
    val height: Int,
    val tilesData: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val description: String = ""
) {
    fun toDomain(): GridMap {
        return GridMap(
            id = id,
            name = name,
            width = width,
            height = height,
            tiles = GridMap.deserializeTiles(tilesData, width, height),
            createdAt = createdAt,
            updatedAt = updatedAt,
            description = description
        )
    }

    companion object {
        fun fromDomain(map: GridMap): MapEntity {
            return MapEntity(
                id = map.id,
                name = map.name,
                width = map.width,
                height = map.height,
                tilesData = map.serializeTiles(),
                createdAt = map.createdAt,
                updatedAt = map.updatedAt,
                description = map.description
            )
        }
    }
}
