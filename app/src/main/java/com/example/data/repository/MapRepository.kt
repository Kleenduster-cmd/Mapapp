package com.example.data.repository

import com.example.data.db.AppDatabase
import com.example.data.db.MapEntity
import com.example.data.db.WorldMapEntity
import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.MapObjectType
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

class MapRepository(private val db: AppDatabase) {

    val allMaps: Flow<List<GridMap>> = db.mapDao().getAllMaps().map { entities ->
        entities.map { it.toDomain() }
    }

    val allWorldMaps: Flow<List<WorldMap>> = db.worldMapDao().getAllWorldMaps().map { entities ->
        entities.map { it.toDomain() }
    }

    suspend fun getMap(id: Long): GridMap? = withContext(Dispatchers.IO) {
        db.mapDao().getMapById(id)?.toDomain()
    }

    suspend fun getMapsByIds(ids: List<Long>): List<GridMap> = withContext(Dispatchers.IO) {
        if (ids.isEmpty()) emptyList()
        else db.mapDao().getMapsByIds(ids).map { it.toDomain() }
    }

    suspend fun saveMap(map: GridMap): Long = withContext(Dispatchers.IO) {
        val entity = MapEntity.fromDomain(map)
        if (map.id > 0) {
            db.mapDao().updateMap(entity)
            map.id
        } else {
            db.mapDao().insertMap(entity)
        }
    }

    suspend fun deleteMap(id: Long) = withContext(Dispatchers.IO) {
        db.mapDao().deleteMap(id)
    }

    suspend fun getWorldMap(id: Long): WorldMap? = withContext(Dispatchers.IO) {
        db.worldMapDao().getWorldMapById(id)?.toDomain()
    }

    suspend fun saveWorldMap(worldMap: WorldMap): Long = withContext(Dispatchers.IO) {
        val entity = WorldMapEntity.fromDomain(worldMap)
        if (worldMap.id > 0) {
            db.worldMapDao().updateWorldMap(entity)
            worldMap.id
        } else {
            db.worldMapDao().insertWorldMap(entity)
        }
    }

    suspend fun deleteWorldMap(id: Long) = withContext(Dispatchers.IO) {
        db.worldMapDao().deleteWorldMap(id)
    }

    suspend fun checkAndSeedInitialData() = withContext(Dispatchers.IO) {
        val existingMaps = db.mapDao().getAllMaps().first()
        if (existingMaps.isNotEmpty()) return@withContext

        // Map 1: Royal Castle Plains (16x16)
        val castleMapTiles = createSampleCastleMap()
        val castleMap = GridMap(
            name = "Castle Plains",
            width = 16,
            height = 16,
            tiles = castleMapTiles,
            description = "The central province home to the royal stronghold and surrounding farmlands."
        )
        val castleId = db.mapDao().insertMap(MapEntity.fromDomain(castleMap))

        // Map 2: Dragon Spine Mountains (16x16)
        val mountainTiles = createSampleMountainMap()
        val mountainMap = GridMap(
            name = "Dragon Spine Pass",
            width = 16,
            height = 16,
            tiles = mountainTiles,
            description = "Treacherous jagged ridges with an ancient watchtower guarding the pass."
        )
        val mountainId = db.mapDao().insertMap(MapEntity.fromDomain(mountainMap))

        // Map 3: Whispering Forest (16x16)
        val forestTiles = createSampleForestMap()
        val forestMap = GridMap(
            name = "Whispering Forest",
            width = 16,
            height = 16,
            tiles = forestTiles,
            description = "Dense ancient woods, winding paths, and hidden ruin shrines."
        )
        val forestId = db.mapDao().insertMap(MapEntity.fromDomain(forestMap))

        // Map 4: Azure Coast (16x16)
        val coastTiles = createSampleCoastMap()
        val coastMap = GridMap(
            name = "Azure Coast",
            width = 16,
            height = 16,
            tiles = coastTiles,
            description = "Coastal trade route with sandy beaches, ocean waters, and a port harbor."
        )
        val coastId = db.mapDao().insertMap(MapEntity.fromDomain(coastMap))

        // World Map connecting them in a 3x3 world layout
        // (0,0): Mountains, (1,0): Castle Plains, (1,1): Forest, (2,1): Coast
        val worldSlots = mapOf(
            "0_0" to mountainId,
            "1_0" to castleId,
            "1_1" to forestId,
            "2_1" to coastId
        )
        val sampleWorld = WorldMap(
            name = "Realm of Eldoria",
            gridCols = 3,
            gridRows = 3,
            slots = worldSlots,
            description = "Connected continent showing northern mountains, royal kingdom plains, ancient forest, and eastern coast."
        )
        db.worldMapDao().insertWorldMap(WorldMapEntity.fromDomain(sampleWorld))
    }

    private fun createSampleCastleMap(): List<GridTile> {
        val w = 16
        val h = 16
        val list = MutableList(w * h) { GridTile(TerrainType.GRASS) }

        // River flowing from top (x=4) to bottom (x=7)
        for (y in 0 until h) {
            val rx = (4 + (y * 0.25).toInt()).coerceIn(0, 15)
            list[y * w + rx] = GridTile(TerrainType.DEEP_WATER)
            if (rx + 1 < w) list[y * w + rx + 1] = GridTile(TerrainType.SHALLOW_WATER)
            if (rx - 1 >= 0) list[y * w + rx - 1] = GridTile(TerrainType.SHALLOW_WATER)
        }

        // Stone road through middle
        for (x in 0 until w) {
            val idx = 8 * w + x
            val cur = list[idx]
            if (cur.terrain == TerrainType.DEEP_WATER || cur.terrain == TerrainType.SHALLOW_WATER) {
                list[idx] = GridTile(TerrainType.WOOD_PLANK, MapObjectType.BRIDGE)
            } else {
                list[idx] = GridTile(TerrainType.STONE_ROAD)
            }
        }

        // Castle courtyard at (10, 5)
        list[5 * w + 11] = GridTile(TerrainType.STONE_ROAD, MapObjectType.CASTLE)
        list[5 * w + 10] = GridTile(TerrainType.STONE_ROAD, MapObjectType.TOWER)
        list[5 * w + 12] = GridTile(TerrainType.STONE_ROAD, MapObjectType.TOWER)

        // Village houses
        list[9 * w + 12] = GridTile(TerrainType.GRASS, MapObjectType.VILLAGE)
        list[10 * w + 12] = GridTile(TerrainType.GRASS, MapObjectType.VILLAGE)
        list[9 * w + 13] = GridTile(TerrainType.GRASS, MapObjectType.CAMPFIRE)

        // Trees
        listOf(Pair(1, 1), Pair(2, 2), Pair(13, 2), Pair(14, 3), Pair(1, 12), Pair(2, 13)).forEach { (tx, ty) ->
            list[ty * w + tx] = GridTile(TerrainType.FOREST, MapObjectType.TREE_PIN)
        }

        return list
    }

    private fun createSampleMountainMap(): List<GridTile> {
        val w = 16
        val h = 16
        val list = MutableList(w * h) { GridTile(TerrainType.HILLS) }

        for (y in 0 until h) {
            for (x in 0 until w) {
                if (x + y in 8..18) {
                    list[y * w + x] = GridTile(TerrainType.MOUNTAIN)
                }
                if (x + y in 12..14) {
                    list[y * w + x] = GridTile(TerrainType.SNOW)
                }
            }
        }

        // Dirt pass
        for (i in 0 until 16) {
            val px = (15 - i).coerceIn(0, 15)
            val py = i
            list[py * w + px] = GridTile(TerrainType.DIRT_PATH)
        }

        list[7 * w + 8] = GridTile(TerrainType.STONE_ROAD, MapObjectType.TOWER)
        list[12 * w + 3] = GridTile(TerrainType.MOUNTAIN, MapObjectType.DUNGEON)
        list[3 * w + 12] = GridTile(TerrainType.SNOW, MapObjectType.CHEST)

        return list
    }

    private fun createSampleForestMap(): List<GridTile> {
        val w = 16
        val h = 16
        val list = MutableList(w * h) { GridTile(TerrainType.FOREST) }

        // Dirt trail winding through
        for (y in 0 until h) {
            val tx = (7 + Math.sin(y.toDouble() * 0.5) * 3).toInt().coerceIn(0, 15)
            list[y * w + tx] = GridTile(TerrainType.DIRT_PATH)
            if (tx + 1 < w) list[y * w + tx + 1] = GridTile(TerrainType.GRASS)
        }

        // Ruins hidden in forest
        list[4 * w + 3] = GridTile(TerrainType.GRASS, MapObjectType.RUINS)
        list[11 * w + 12] = GridTile(TerrainType.GRASS, MapObjectType.PORTAL)
        list[8 * w + 7] = GridTile(TerrainType.DIRT_PATH, MapObjectType.CAMPFIRE)

        // Swamp corner
        for (y in 12 until 16) {
            for (x in 0 until 4) {
                list[y * w + x] = GridTile(TerrainType.SWAMP)
            }
        }
        list[14 * w + 1] = GridTile(TerrainType.SWAMP, MapObjectType.SKULL)

        return list
    }

    private fun createSampleCoastMap(): List<GridTile> {
        val w = 16
        val h = 16
        val list = MutableList(w * h) { GridTile(TerrainType.GRASS) }

        for (y in 0 until h) {
            for (x in 0 until w) {
                val coastX = 8 + (y * 0.3).toInt()
                if (x == coastX || x == coastX - 1) {
                    list[y * w + x] = GridTile(TerrainType.SAND)
                } else if (x > coastX) {
                    if (x == coastX + 1 || x == coastX + 2) {
                        list[y * w + x] = GridTile(TerrainType.SHALLOW_WATER)
                    } else {
                        list[y * w + x] = GridTile(TerrainType.DEEP_WATER)
                    }
                }
            }
        }

        // Harbor and ship
        list[7 * w + 13] = GridTile(TerrainType.DEEP_WATER, MapObjectType.SHIP)
        list[7 * w + 10] = GridTile(TerrainType.WOOD_PLANK, MapObjectType.BRIDGE)
        list[7 * w + 9] = GridTile(TerrainType.SAND, MapObjectType.VILLAGE)
        list[3 * w + 8] = GridTile(TerrainType.SAND, MapObjectType.CHEST)

        return list
    }
}
