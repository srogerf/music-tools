package api

import (
	"net/http"
	"strconv"
	"strings"

	"music-tools/src/scales"
)

type ScaleLayoutService struct {
	layouts   scales.LayoutSet
	instances scales.LayoutInstanceSet
}

func NewScaleLayoutService(layouts scales.LayoutSet, instances scales.LayoutInstanceSet) *ScaleLayoutService {
	return &ScaleLayoutService{layouts: layouts, instances: instances}
}

type listScaleLayoutsResponse struct {
	Layouts []scales.LayoutDefinition `json:"layouts"`
}

type listLayoutInstancesResponse struct {
	Tunings []scales.LayoutTuningInstance `json:"tunings"`
}

func (s *ScaleLayoutService) ListLayoutsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path != "/scales/layouts" && r.URL.Path != "/scales/layouts/" {
		http.NotFound(w, r)
		return
	}

	writeJSON(w, http.StatusOK, listScaleLayoutsResponse{Layouts: s.layouts.Layouts})
}

func (s *ScaleLayoutService) GetLayoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/scales/layouts/")
	if path == "" || path == "/" {
		s.ListLayoutsHandler(w, r)
		return
	}

	layoutType := strings.Trim(path, "/")
	if layoutType == "" || strings.Contains(layoutType, "/") {
		http.NotFound(w, r)
		return
	}

	layout, ok := s.layouts.ByType(scales.ScaleType(layoutType))
	if !ok {
		writeError(w, http.StatusNotFound, "scale layout not found")
		return
	}

	writeJSON(w, http.StatusOK, layout)
}

func (s *ScaleLayoutService) ListLayoutInstancesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path != "/scales/layouts/instances" && r.URL.Path != "/scales/layouts/instances/" {
		http.NotFound(w, r)
		return
	}

	writeJSON(w, http.StatusOK, listLayoutInstancesResponse{Tunings: s.instances.Tunings})
}

func (s *ScaleLayoutService) GetLayoutInstanceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/scales/layouts/instances/")
	if path == "" || path == "/" {
		s.ListLayoutInstancesHandler(w, r)
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

	tuning, ok := s.instances.ByTuningID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "layout tuning not found")
		return
	}

	writeJSON(w, http.StatusOK, tuning)
}
