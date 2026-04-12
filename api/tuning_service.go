package api

import (
	"net/http"
	"strconv"
	"strings"

	"music-tools/src/postgresdb"
	"music-tools/src/tuning"
)

type TuningService struct {
	store *postgresdb.Store
}

func NewTuningService(store *postgresdb.Store) *TuningService {
	return &TuningService{store: store}
}

type listTuningsResponse struct {
	Tunings []tuning.Definition `json:"tunings"`
}

func (s *TuningService) ListTuningsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path != "/tunings" && r.URL.Path != "/tunings/" {
		http.NotFound(w, r)
		return
	}

	nameQuery := strings.TrimSpace(r.URL.Query().Get("name"))
	definitions, err := s.store.LoadTunings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tunings")
		return
	}
	if nameQuery != "" {
		if tuningDef, ok := definitions.ByName(nameQuery); ok {
			writeJSON(w, http.StatusOK, listTuningsResponse{Tunings: []tuning.Definition{tuningDef}})
			return
		}
		writeJSON(w, http.StatusOK, listTuningsResponse{Tunings: []tuning.Definition{}})
		return
	}

	writeJSON(w, http.StatusOK, listTuningsResponse{Tunings: definitions.Tunings})
}

func (s *TuningService) GetTuningHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/tunings/")
	if path == "" || path == "/" {
		s.ListTuningsHandler(w, r)
		return
	}

	idRaw := strings.Trim(path, "/")
	if idRaw == "" || strings.Contains(idRaw, "/") {
		http.NotFound(w, r)
		return
	}

	id, err := strconv.Atoi(idRaw)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "tuning id must be a positive integer")
		return
	}

	definitions, err := s.store.LoadTunings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load tunings")
		return
	}
	item, ok := definitions.ByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "tuning not found")
		return
	}

	writeJSON(w, http.StatusOK, item)
}
