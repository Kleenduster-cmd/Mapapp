package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.WorldMap

@Entity(tableName = "world_maps")
data class WorldMapEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val gridCols: Int = 3,
    val gridRows: Int = 3,
    val slotsData: String = "{}",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val description: String = ""
) {
    fun toDomain(): WorldMap {
        return WorldMap(
            id = id,
            name = name,
            gridCols = gridCols,
            gridRows = gridRows,
            slots = WorldMap.deserializeSlots(slotsData),
            createdAt = createdAt,
            updatedAt = updatedAt,
            description = description
        )
    }

    companion object {
        fun fromDomain(worldMap: WorldMap): WorldMapEntity {
            return WorldMapEntity(
                id = worldMap.id,
                name = worldMap.name,
                gridCols = worldMap.gridCols,
                gridRows = worldMap.gridRows,
                slotsData = worldMap.serializeSlots(),
                createdAt = worldMap.createdAt,
                updatedAt = worldMap.updatedAt,
                description = worldMap.description
            )
        }
    }
}
