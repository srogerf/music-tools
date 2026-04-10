package api

import (
	"net/http"
	"strconv"
	"strings"

	"music-tools/src/scales"
)

type ScaleLayoutService struct {
	scaleLayouts scales.ScaleLayoutSet
}

func NewScaleLayoutService(scaleLayouts scales.ScaleLayoutSet) *ScaleLayoutService {
	return &ScaleLayoutService{scaleLayouts: scaleLayouts}
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

	writeJSON(w, http.StatusOK, listScaleLayoutsByTuningResponse{Tunings: s.scaleLayouts.Tunings})
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

	tuning, ok := s.scaleLayouts.ByTuningID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "layout tuning not found")
		return
	}

	writeJSON(w, http.StatusOK, tuning)
}
