package com.example

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.data.db.AppDatabase
import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.MapObjectType
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import com.example.data.repository.MapRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

    private lateinit var database: AppDatabase
    private lateinit var repository: MapRepository

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        repository = MapRepository(database)
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun readStringFromContext() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("Map Maker", appName)
    }

    @Test
    fun testGridMapCreationAndTileSerialization() {
        val map = GridMap.createEmpty(name = "Test Realm", width = 10, height = 10, defaultTerrain = TerrainType.GRASS)
        assertEquals(10, map.width)
        assertEquals(10, map.height)
        assertEquals(100, map.tiles.size)

        // Modify tile
        val updated = map.withTileUpdated(2, 3, GridTile(TerrainType.LAVA, MapObjectType.DUNGEON))
        val tile = updated.getTile(2, 3)
        assertEquals(TerrainType.LAVA, tile.terrain)
        assertEquals(MapObjectType.DUNGEON, tile.obj)

        // Test serialization round-trip
        val serialized = updated.serializeTiles()
        val deserialized = GridMap.deserializeTiles(serialized, 10, 10)
        assertEquals(100, deserialized.size)
        assertEquals(TerrainType.LAVA, deserialized[3 * 10 + 2].terrain)
        assertEquals(MapObjectType.DUNGEON, deserialized[3 * 10 + 2].obj)
    }

    @Test
    fun testWorldMapSectorLinking() {
        val world = WorldMap(name = "Aethelgard World", gridCols = 3, gridRows = 3)
        assertEquals(0, world.slots.size)

        // Link sectors
        val linkedWorld = world.withSlotLinked(0, 0, 101L)
            .withSlotLinked(1, 0, 102L)
            .withSlotLinked(2, 2, 203L)

        assertEquals(101L, linkedWorld.getMapId(0, 0))
        assertEquals(102L, linkedWorld.getMapId(1, 0))
        assertEquals(203L, linkedWorld.getMapId(2, 2))
        assertEquals(null, linkedWorld.getMapId(1, 1))

        // Unlink sector
        val unlinkedWorld = linkedWorld.withSlotUnlinked(0, 0)
        assertEquals(null, unlinkedWorld.getMapId(0, 0))
        assertEquals(102L, unlinkedWorld.getMapId(1, 0))
    }

    @Test
    fun testMapRepositoryDatabasePersistence() = runBlocking {
        val testMap = GridMap.createEmpty(name = "Emerald Valley", width = 8, height = 8, defaultTerrain = TerrainType.FOREST)
        val id = repository.saveMap(testMap)
        assertTrue(id > 0)

        val retrieved = repository.getMap(id)
        assertNotNull(retrieved)
        assertEquals("Emerald Valley", retrieved!!.name)
        assertEquals(8, retrieved.width)
        assertEquals(64, retrieved.tiles.size)

        // Test world map persistence
        val testWorld = WorldMap(name = "Overworld", gridCols = 2, gridRows = 2)
            .withSlotLinked(0, 0, id)
        val worldId = repository.saveWorldMap(testWorld)
        assertTrue(worldId > 0)

        val retrievedWorld = repository.getWorldMap(worldId)
        assertNotNull(retrievedWorld)
        assertEquals("Overworld", retrievedWorld!!.name)
        assertEquals(id, retrievedWorld.getMapId(0, 0))
    }

    @Test
    fun testInitialSeedDataPopulates() = runBlocking {
        repository.checkAndSeedInitialData()
        val maps = repository.allMaps.first()
        val worlds = repository.allWorldMaps.first()

        assertTrue(maps.isNotEmpty())
        assertTrue(worlds.isNotEmpty())
    }
}
