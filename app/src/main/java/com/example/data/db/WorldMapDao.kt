package com.example.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface WorldMapDao {
    @Query("SELECT * FROM world_maps ORDER BY updatedAt DESC")
    fun getAllWorldMaps(): Flow<List<WorldMapEntity>>

    @Query("SELECT * FROM world_maps WHERE id = :id")
    suspend fun getWorldMapById(id: Long): WorldMapEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWorldMap(worldMap: WorldMapEntity): Long

    @Update
    suspend fun updateWorldMap(worldMap: WorldMapEntity)

    @Query("DELETE FROM world_maps WHERE id = :id")
    suspend fun deleteWorldMap(id: Long)
}
