package com.example

import com.example.data.model.GridMap
import com.example.data.model.GridTile
import com.example.data.model.TerrainType
import com.example.data.model.WorldMap
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for GridMap and WorldMap infinite dimension expansion logic.
 */
class ExampleUnitTest {
  @Test
  fun addition_isCorrect() {
    assertEquals(4, 2 + 2)
  }

  @Test
  fun gridMap_expandMap_shiftsCorrectly() {
    val map = GridMap.createEmpty(
      name = "Test Map",
      width = 4,
      height = 4,
      defaultTerrain = TerrainType.GRASS
    )
    val mapWithTile = map.withTileUpdated(0, 0, GridTile(TerrainType.DEEP_WATER))

    // Expand by 2 on all sides
    val expanded = mapWithTile.expandMap(addLeft = 2, addTop = 2, addRight = 2, addBottom = 2)
    assertEquals(8, expanded.width)
    assertEquals(8, expanded.height)

    // Previously at (0,0), shifted by +2 X and +2 Y, should now be at (2,2)
    assertEquals(TerrainType.DEEP_WATER, expanded.getTile(2, 2).terrain)
    // New cell at (0,0) should be default GRASS
    assertEquals(TerrainType.GRASS, expanded.getTile(0, 0).terrain)
  }

  @Test
  fun worldMap_expandWorld_shiftsSlotsCorrectly() {
    val world = WorldMap(
      name = "Test World",
      gridCols = 3,
      gridRows = 3
    )
    val linkedWorld = world.withSlotLinked(1, 1, 101L)

    val expanded = linkedWorld.expandWorld(addLeft = 1, addTop = 1, addRight = 1, addBottom = 1)
    assertEquals(5, expanded.gridCols)
    assertEquals(5, expanded.gridRows)
    // Shifted from (1,1) by (+1, +1) to (2,2)
    assertEquals(101L, expanded.getMapId(2, 2))
    assertNull(expanded.getMapId(1, 1))
  }
}


