package api

import "net/http"

// NewRouter wires the API routes for the server.
func NewRouter(scaleService *ScaleService) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", newV1Router(scaleService)))
	return mux
}

func newV1Router(scaleService *ScaleService) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/scales/random", scaleService.RandomScaleHandler)
	return mux
}
