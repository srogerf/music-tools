package api

import (
	"log"
	"net/http"
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
	mux.Handle("/", http.FileServer(http.Dir(staticConfig.AppDir)))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", newV1Router(scaleService, layoutService, tuningService)))
	return requestLogger(mux)
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

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("http request method=%s path=%s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
