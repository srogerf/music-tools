package api

import "net/http"

// NewRouter wires the API routes for the server.
func NewRouter(scaleService *ScaleService, layoutService *ScaleLayoutService, tuningService *TuningService) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/fretboard/", http.StripPrefix("/fretboard/", http.FileServer(http.Dir("frontend/fretboard"))))
	mux.Handle("/", http.FileServer(http.Dir("frontend/app")))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", newV1Router(scaleService, layoutService, tuningService)))
	return mux
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
