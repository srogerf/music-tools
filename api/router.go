package api

import "net/http"

// NewRouter wires the API routes for the server.
func NewRouter(scaleService *ScaleService) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/fretboard/", http.StripPrefix("/fretboard/", http.FileServer(http.Dir("frontend/fretboard"))))
	mux.Handle("/", http.FileServer(http.Dir("frontend/app")))
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", newV1Router(scaleService)))
	return mux
}

func newV1Router(scaleService *ScaleService) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/scales", scaleService.ListScalesHandler)
	mux.HandleFunc("/scales/", scaleService.GetScaleHandler)
	mux.HandleFunc("/scales/random", scaleService.RandomScaleHandler)
	return mux
}
