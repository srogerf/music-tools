package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"music-tools/src/scales"
)

type ScaleService struct {
	definitions scales.DefinitionSet
}

func NewScaleService(definitions scales.DefinitionSet) *ScaleService {
	return &ScaleService{definitions: definitions}
}

type randomScaleResponse struct {
	Scale string   `json:"scale"`
	Key   string   `json:"key"`
	Notes []string `json:"notes"`
}

func (s *ScaleService) RandomScaleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	maxAccidentals, err := parseMaxAccidentals(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	options := &scales.RandomScaleSelectorOptions{
		MaxAccidentals: maxAccidentals,
		ScaleNames:     r.URL.Query()["scale"],
	}

	selection, err := s.definitions.RandomScaleWithNotes(options)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	payload := randomScaleResponse{
		Scale: selection.Scale.Name,
		Key:   selection.Key,
		Notes: selection.Notes,
	}

	writeJSON(w, http.StatusOK, payload)
}

func parseMaxAccidentals(r *http.Request) (int, error) {
	raw := r.URL.Query().Get("maxAccidentals")
	if raw == "" {
		return 5, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("maxAccidentals must be an integer")
	}
	if value < 0 || value > 7 {
		return 0, fmt.Errorf("maxAccidentals must be between 0 and 7")
	}
	return value, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
