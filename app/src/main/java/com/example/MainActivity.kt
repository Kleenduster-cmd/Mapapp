package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.db.AppDatabase
import com.example.data.repository.MapRepository
import com.example.ui.editor.MapEditorScreen
import com.example.ui.editor.MapEditorViewModel
import com.example.ui.library.MapsLibraryScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.world.WorldMapScreen
import com.example.ui.world.WorldMapViewModel

sealed interface Screen {
    data object Library : Screen
    data class MapEditor(val mapId: Long, val worldMapContextId: Long? = null) : Screen
    data class World(val worldMapId: Long) : Screen
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val db = AppDatabase.getInstance(this)
        val repository = MapRepository(db)

        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MapMakerApp(repository = repository)
                }
            }
        }
    }
}

@Composable
fun MapMakerApp(repository: MapRepository) {
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Library) }

    // Seed starter content if needed
    LaunchedEffect(Unit) {
        repository.checkAndSeedInitialData()
    }

    // ViewModels
    val editorViewModel = remember { MapEditorViewModel(repository) }
    val worldViewModel = remember { WorldMapViewModel(repository) }

    when (val screen = currentScreen) {
        is Screen.Library -> {
            MapsLibraryScreen(
                repository = repository,
                onOpenMap = { mapId ->
                    editorViewModel.loadMap(mapId, null)
                    currentScreen = Screen.MapEditor(mapId)
                },
                onOpenWorldMap = { worldId ->
                    currentScreen = Screen.World(worldId)
                }
            )
        }
        is Screen.MapEditor -> {
            BackHandler {
                if (screen.worldMapContextId != null) {
                    currentScreen = Screen.World(screen.worldMapContextId)
                } else {
                    currentScreen = Screen.Library
                }
            }

            MapEditorScreen(
                viewModel = editorViewModel,
                onNavigateBack = {
                    currentScreen = Screen.Library
                },
                onNavigateToWorldMap = { worldId ->
                    currentScreen = Screen.World(worldId)
                }
            )
        }
        is Screen.World -> {
            BackHandler {
                currentScreen = Screen.Library
            }

            WorldMapScreen(
                viewModel = worldViewModel,
                worldMapId = screen.worldMapId,
                onNavigateBack = {
                    currentScreen = Screen.Library
                },
                onOpenMapEditor = { mapId, worldId ->
                    editorViewModel.loadMap(mapId, worldId)
                    currentScreen = Screen.MapEditor(mapId, worldId)
                }
            )
        }
    }
}
