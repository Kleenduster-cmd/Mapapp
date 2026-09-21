package com.example

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.example.data.model.GridMap
import com.example.data.model.TerrainType
import com.example.ui.library.EmptyLibraryState
import com.example.ui.library.MapCard
import com.example.ui.theme.MyApplicationTheme
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = RobolectricDeviceQualifiers.Pixel8, sdk = [34])
class GreetingScreenshotTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun map_maker_empty_state_screenshot() {
        composeTestRule.setContent {
            MyApplicationTheme {
                EmptyLibraryState(
                    title = "No Maps Created Yet",
                    subtitle = "Create your first grid map with customized terrain tiles, paths, and structures.",
                    buttonText = "Create New Map",
                    onAction = {}
                )
            }
        }

        composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/library_empty.png")
    }

    @Test
    fun map_card_preview_screenshot() {
        val sampleMap = GridMap.createEmpty(name = "Valyria Highlands", width = 12, height = 12, defaultTerrain = TerrainType.MOUNTAIN)
        composeTestRule.setContent {
            MyApplicationTheme {
                MapCard(
                    map = sampleMap,
                    onOpen = {},
                    onExport = {},
                    onDuplicate = {},
                    onDelete = {}
                )
            }
        }

        composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/map_card.png")
    }
}
