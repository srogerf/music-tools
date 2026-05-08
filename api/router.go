package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

// StaticConfig defines where the browser assets are served from.
type StaticConfig struct {
	AppDir           string
	FretboardDir     string
	EnvironmentLabel string
}

// NewRouter wires the API routes for the server.
func NewRouter(scaleService *ScaleService, layoutService *ScaleLayoutService, tuningService *TuningService, staticConfig StaticConfig) http.Handler {
	mux := http.NewServeMux()
	if staticConfig.AppDir != "" {
		mux.Handle("/app/", http.StripPrefix("/app/", http.FileServer(http.Dir(staticConfig.AppDir))))
	}
	if staticConfig.FretboardDir != "" {
		mux.Handle("/fretboard/", http.StripPrefix("/fretboard/", http.FileServer(http.Dir(staticConfig.FretboardDir))))
	}
	mux.HandleFunc("/runtime-config.js", runtimeConfigHandler(staticConfig))
	mux.HandleFunc("/runtime-config.json", runtimeConfigJSONHandler(staticConfig))
	mux.Handle("/", staticAppHandler(staticConfig.AppDir))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", withAPIMiddleware(newV1Router(scaleService, layoutService, tuningService))))
	return requestLogger(withSecurityHeaders(mux))
}

// NewUnavailableRouter keeps the frontend reachable while the API returns a
// startup error such as an unavailable database.
func NewUnavailableRouter(staticConfig StaticConfig, message string) http.Handler {
	mux := http.NewServeMux()
	if staticConfig.AppDir != "" {
		mux.Handle("/app/", http.StripPrefix("/app/", http.FileServer(http.Dir(staticConfig.AppDir))))
	}
	if staticConfig.FretboardDir != "" {
		mux.Handle("/fretboard/", http.StripPrefix("/fretboard/", http.FileServer(http.Dir(staticConfig.FretboardDir))))
	}
	mux.HandleFunc("/runtime-config.js", runtimeConfigHandler(staticConfig))
	mux.HandleFunc("/runtime-config.json", runtimeConfigJSONHandler(staticConfig))
	mux.Handle("/", staticAppHandler(staticConfig.AppDir))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", withAPIMiddleware(unavailableV1Router(message))))
	return requestLogger(withSecurityHeaders(mux))
}

func runtimeConfigHandler(staticConfig StaticConfig) http.HandlerFunc {
	type runtimeConfig struct {
		EnvironmentLabel string `json:"environmentLabel"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/javascript")
		payload, err := json.Marshal(runtimeConfig{EnvironmentLabel: staticConfig.EnvironmentLabel})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to build runtime config")
			return
		}
		_, _ = w.Write([]byte("window.RIFFERONE_RUNTIME = "))
		_, _ = w.Write(payload)
		_, _ = w.Write([]byte(";\n"))
	}
}

func runtimeConfigJSONHandler(staticConfig StaticConfig) http.HandlerFunc {
	type runtimeConfig struct {
		EnvironmentLabel string `json:"environmentLabel"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(runtimeConfig{EnvironmentLabel: staticConfig.EnvironmentLabel})
	}
}

func staticAppHandler(appDir string) http.Handler {
	fileServer := http.FileServer(http.Dir(appDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if shouldDisableStaticCaching(r.URL.Path) {
			w.Header().Set("Cache-Control", "no-store")
		}
		fileServer.ServeHTTP(w, r)
	})
}

func newV1Router(scaleService *ScaleService, layoutService *ScaleLayoutService, tuningService *TuningService) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/scales/scale_layouts", layoutService.ListScaleLayoutsHandler)
	mux.HandleFunc("/scales/scale_layouts/", layoutService.GetScaleLayoutHandler)
	mux.HandleFunc("/scales", scaleService.ListScalesHandler)
	mux.HandleFunc("/scales/", scaleService.GetScaleHandler)
	mux.HandleFunc("/scales/random", scaleService.RandomScaleHandler)
	mux.HandleFunc("/tunings", tuningService.ListTuningsHandler)
	mux.HandleFunc("/tunings/", tuningService.GetTuningHandler)
	return mux
}

func unavailableV1Router(message string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusServiceUnavailable, message)
	})
}

func shouldDisableStaticCaching(path string) bool {
	return path == "/" || strings.HasSuffix(path, ".html")
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("http request method=%s path=%s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
