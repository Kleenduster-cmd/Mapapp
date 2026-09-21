package com.example.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface MapDao {
    @Query("SELECT * FROM maps ORDER BY updatedAt DESC")
    fun getAllMaps(): Flow<List<MapEntity>>

    @Query("SELECT * FROM maps WHERE id = :id")
    suspend fun getMapById(id: Long): MapEntity?

    @Query("SELECT * FROM maps WHERE id IN (:ids)")
    suspend fun getMapsByIds(ids: List<Long>): List<MapEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMap(map: MapEntity): Long

    @Update
    suspend fun updateMap(map: MapEntity)

    @Query("DELETE FROM maps WHERE id = :id")
    suspend fun deleteMap(id: Long)
}
