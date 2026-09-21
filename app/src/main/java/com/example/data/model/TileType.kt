package com.example.data.model

import androidx.compose.ui.graphics.Color

enum class TerrainType(
    val id: String,
    val title: String,
    val baseColor: Long,
    val detailColor: Long,
    val category: String = "Natural"
) {
    GRASS("grass", "Plains / Grass", 0xFF5B9E4D, 0xFF49833D, "Natural"),
    FOREST("forest", "Dense Forest", 0xFF2D6930, 0xFF1E4921, "Natural"),
    MOUNTAIN("mountain", "Mountain Peak", 0xFF6D7987, 0xFF4A5563, "Natural"),
    HILLS("hills", "Rolling Hills", 0xFF7CA655, 0xFF5F853C, "Natural"),
    DEEP_WATER("deep_water", "Ocean / Deep Water", 0xFF23558A, 0xFF19406B, "Water"),
    SHALLOW_WATER("shallow_water", "Coast / River", 0xFF4AA5D8, 0xFF358AB8, "Water"),
    SAND("sand", "Desert / Beach", 0xFFE0C179, 0xFFC9A658, "Natural"),
    DIRT_PATH("dirt_path", "Dirt Road / Path", 0xFF9E774A, 0xFF7A5832, "Path"),
    STONE_ROAD("stone_road", "Cobblestone / Road", 0xFF8A8F98, 0xFF686C74, "Path"),
    SNOW("snow", "Snow / Tundra", 0xFFDFEAF2, 0xFFB9CFDF, "Natural"),
    SWAMP("swamp", "Swamp / Marsh", 0xFF485E40, 0xFF35462E, "Natural"),
    LAVA("lava", "Molten Lava", 0xFFD4421E, 0xFF8F1E05, "Hazard"),
    DUNGEON_FLOOR("dungeon_floor", "Dungeon Floor", 0xFF3A3F47, 0xFF2A2D33, "Dungeon"),
    DUNGEON_WALL("dungeon_wall", "Dungeon Wall", 0xFF1E2126, 0xFF131518, "Dungeon"),
    WOOD_PLANK("wood_plank", "Wood Deck", 0xFF8B5A2B, 0xFF66411E, "Structure"),
    CHASM("chasm", "Void / Chasm", 0xFF0D1117, 0xFF000000, "Hazard");

    companion object {
        fun fromId(id: String?): TerrainType {
            return entries.find { it.id.equals(id, ignoreCase = true) } ?: GRASS
        }
    }
}

enum class MapObjectType(
    val id: String,
    val title: String,
    val iconEmoji: String,
    val color: Long
) {
    NONE("none", "Empty / Clear", "", 0x00000000),
    CASTLE("castle", "Castle / Keep", "🏰", 0xFFE5E9F0),
    VILLAGE("village", "Town / Village", "🏘️", 0xFFEBCB8B),
    TOWER("tower", "Watchtower", "🗼", 0xFF88C0D0),
    DUNGEON("dungeon", "Dungeon Entrance", "🚪", 0xFFB48EAD),
    BRIDGE("bridge", "Bridge", "🌉", 0xFFD08770),
    CHEST("chest", "Treasure Chest", "🪙", 0xFFEBCB8B),
    CAMPFIRE("campfire", "Camp / Tavern", "🔥", 0xFFBF616A),
    PORTAL("portal", "Mystic Portal", "🌀", 0xFFB48EAD),
    SKULL("skull", "Hazard / Boss", "💀", 0xFFECEFF4),
    RUINS("ruins", "Ancient Ruins", "🏛️", 0xFFD8DEE9),
    TREE_PIN("tree", "Single Tree", "🌲", 0xFFA3BE8C),
    SHIP("ship", "Ship / Harbor", "⛵", 0xFF81A1C1);

    companion object {
        fun fromId(id: String?): MapObjectType {
            if (id.isNullOrBlank()) return NONE
            return entries.find { it.id.equals(id, ignoreCase = true) } ?: NONE
        }
    }
}
