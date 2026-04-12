package api

import (
	"net/http"
	"strconv"
	"strings"

	"music-tools/src/postgresdb"
	"music-tools/src/scales"
)

type ScaleLayoutService struct {
	store *postgresdb.Store
}

func NewScaleLayoutService(store *postgresdb.Store) *ScaleLayoutService {
	return &ScaleLayoutService{store: store}
}

type listScaleLayoutsByTuningResponse struct {
	Tunings []scales.ScaleLayoutTuning `json:"tunings"`
}

func (s *ScaleLayoutService) ListScaleLayoutsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path != "/scales/scale_layouts" && r.URL.Path != "/scales/scale_layouts/" {
		http.NotFound(w, r)
		return
	}

	scaleLayouts, err := s.store.LoadScaleLayouts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load scale layouts")
		return
	}

	writeJSON(w, http.StatusOK, listScaleLayoutsByTuningResponse{Tunings: scaleLayouts.Tunings})
}

func (s *ScaleLayoutService) GetScaleLayoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/scales/scale_layouts/")
	if path == "" || path == "/" {
		s.ListScaleLayoutsHandler(w, r)
		return
	}

	idRaw := strings.Trim(path, "/")
	if idRaw == "" || strings.Contains(idRaw, "/") {
		http.NotFound(w, r)
		return
	}

	id, err := strconv.Atoi(idRaw)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "layout tuning id must be a positive integer")
		return
	}

	scaleLayouts, err := s.store.LoadScaleLayouts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load scale layouts")
		return
	}
	tuning, ok := scaleLayouts.ByTuningID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "layout tuning not found")
		return
	}

	writeJSON(w, http.StatusOK, tuning)
}
