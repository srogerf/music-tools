package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"music-tools/src/key_signatures"
	"music-tools/src/scales"
)

type ScaleService struct {
	definitions   scales.DefinitionSet
	keySignatures key_signatures.KeySignatureSet
}

func NewScaleService(definitions scales.DefinitionSet, keySignatures key_signatures.KeySignatureSet) *ScaleService {
	return &ScaleService{definitions: definitions, keySignatures: keySignatures}
}

type randomScaleResponse struct {
	Scale string   `json:"scale"`
	Key   string   `json:"key"`
	Notes []string `json:"notes"`
}

type listScalesResponse struct {
	Scales []scales.Definition `json:"scales"`
}

func (s *ScaleService) ListScalesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path != "/scales" && r.URL.Path != "/scales/" {
		http.NotFound(w, r)
		return
	}

	nameQuery := strings.TrimSpace(r.URL.Query().Get("name"))
	if nameQuery != "" {
		matches := make([]scales.Definition, 0, 1)
		for _, scale := range s.definitions.Scales {
			if strings.EqualFold(scale.Name, nameQuery) || strings.EqualFold(scale.CommonName, nameQuery) {
				matches = append(matches, scale)
			}
		}

		writeJSON(w, http.StatusOK, listScalesResponse{Scales: matches})
		return
	}

	payload := listScalesResponse{
		Scales: s.definitions.Scales,
	}

	writeJSON(w, http.StatusOK, payload)
}

func (s *ScaleService) GetScaleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/scales/")
	if path == "" || path == "/" {
		s.ListScalesHandler(w, r)
		return
	}

	id := strings.Trim(path, "/")
	if id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}

	idValue, err := strconv.Atoi(id)
	if err != nil || idValue <= 0 {
		writeError(w, http.StatusBadRequest, "scale id must be a positive integer")
		return
	}

	scale, ok := s.definitions.ByID(idValue)
	if !ok {
		writeError(w, http.StatusNotFound, "scale not found")
		return
	}

	writeJSON(w, http.StatusOK, scale)
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
		KeySignatures:  &s.keySignatures,
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
