package api

import (
	"log"
	"net/http"
	"strings"
)

// StaticConfig defines where the browser assets are served from.
type StaticConfig struct {
	AppDir       string
	FretboardDir string
}

// NewRouter wires the API routes for the server.
func NewRouter(scaleService *ScaleService, layoutService *ScaleLayoutService, tuningService *TuningService, staticConfig StaticConfig) http.Handler {
	mux := http.NewServeMux()
	if staticConfig.FretboardDir != "" {
		mux.Handle("/fretboard/", http.StripPrefix("/fretboard/", http.FileServer(http.Dir(staticConfig.FretboardDir))))
	}
	mux.Handle("/", staticAppHandler(staticConfig.AppDir))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", newV1Router(scaleService, layoutService, tuningService)))
	return requestLogger(mux)
}

// NewUnavailableRouter keeps the frontend reachable while the API returns a
// startup error such as an unavailable database.
func NewUnavailableRouter(staticConfig StaticConfig, message string) http.Handler {
	mux := http.NewServeMux()
	if staticConfig.FretboardDir != "" {
		mux.Handle("/fretboard/", http.StripPrefix("/fretboard/", http.FileServer(http.Dir(staticConfig.FretboardDir))))
	}
	mux.Handle("/", staticAppHandler(staticConfig.AppDir))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", unavailableV1Router(message)))
	return requestLogger(mux)
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
