package postgresdb

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"music-tools/src/key_signatures"
	"music-tools/src/scales"
	"music-tools/src/tuning"
)

type Store struct {
	pool *pgxpool.Pool
}

func Open(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	if s == nil || s.pool == nil {
		return
	}
	s.pool.Close()
}

func ConnectionStringFromEnvFile(path string) (string, error) {
	if raw := strings.TrimSpace(os.Getenv("DATABASE_URL")); raw != "" {
		return raw, nil
	}

	values := map[string]string{}
	if path != "" {
		file, err := os.Open(path)
		if err != nil {
			return "", fmt.Errorf("open postgres config: %w", err)
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}
			values[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
		if err := scanner.Err(); err != nil {
			return "", fmt.Errorf("read postgres config: %w", err)
		}
	}

	host := firstNonEmpty(os.Getenv("PGHOST"), values["PGHOST"])
	port := firstNonEmpty(os.Getenv("PGPORT"), values["PGPORT"])
	dbName := firstNonEmpty(os.Getenv("PGDATABASE"), values["PGDATABASE"])
	user := firstNonEmpty(os.Getenv("PGUSER"), values["PGUSER"])
	password := firstNonEmpty(os.Getenv("PGPASSWORD"), values["PGPASSWORD"])

	if host == "" || port == "" || dbName == "" || user == "" {
		return "", fmt.Errorf("postgres config requires PGHOST, PGPORT, PGDATABASE, and PGUSER")
	}

	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		user,
		password,
		host,
		port,
		dbName,
	), nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func (s *Store) LoadScaleDefinitions(ctx context.Context) (scales.DefinitionSet, error) {
	log.Printf("db query load_scale_definitions")
	rows, err := s.pool.Query(ctx, `
		SELECT s.external_id, s.name, s.common_name, st.code, si.ordinal, si.semitones
		FROM scales s
		JOIN scale_types st ON st.id = s.scale_type_id
		JOIN scale_intervals si ON si.scale_id = s.id
		ORDER BY s.external_id, si.ordinal
	`)
	if err != nil {
		return scales.DefinitionSet{}, fmt.Errorf("query scale definitions: %w", err)
	}
	defer rows.Close()

	type aggregate struct {
		definition scales.Definition
	}
	byID := map[int]*aggregate{}
	var order []int

	for rows.Next() {
		var id, ordinal, semitones int
		var name, commonName, scaleType string
		if err := rows.Scan(&id, &name, &commonName, &scaleType, &ordinal, &semitones); err != nil {
			return scales.DefinitionSet{}, fmt.Errorf("scan scale definitions: %w", err)
		}
		item, ok := byID[id]
		if !ok {
			item = &aggregate{
				definition: scales.Definition{
					ID:         id,
					Name:       name,
					CommonName: commonName,
					Type:       scales.ScaleType(scaleType),
					Intervals:  []int{},
				},
			}
			byID[id] = item
			order = append(order, id)
		}
		item.definition.Intervals = append(item.definition.Intervals, semitones)
	}
	if err := rows.Err(); err != nil {
		return scales.DefinitionSet{}, fmt.Errorf("iterate scale definitions: %w", err)
	}

	sort.Ints(order)
	result := scales.DefinitionSet{Scales: make([]scales.Definition, 0, len(order))}
	for _, id := range order {
		result.Scales = append(result.Scales, byID[id].definition)
	}
	return result, nil
}

func (s *Store) LoadKeySignatures(ctx context.Context) (key_signatures.KeySignatureSet, error) {
	log.Printf("db query load_key_signatures")
	rows, err := s.pool.Query(ctx, `
		SELECT ksg.code, ks.key_name, ks.accidentals
		FROM key_signatures ks
		JOIN key_signature_groups ksg ON ksg.id = ks.key_signature_group_id
		ORDER BY ksg.code, ks.accidentals, ks.key_name
	`)
	if err != nil {
		return key_signatures.KeySignatureSet{}, fmt.Errorf("query key signatures: %w", err)
	}
	defer rows.Close()

	result := key_signatures.KeySignatureSet{}
	for rows.Next() {
		var groupCode, keyName string
		var accidentals int
		if err := rows.Scan(&groupCode, &keyName, &accidentals); err != nil {
			return key_signatures.KeySignatureSet{}, fmt.Errorf("scan key signatures: %w", err)
		}
		item := key_signatures.KeySignature{Key: keyName, Accidentals: accidentals}
		switch groupCode {
		case "major":
			result.Major = append(result.Major, item)
		case "minor":
			result.Minor = append(result.Minor, item)
		}
	}
	if err := rows.Err(); err != nil {
		return key_signatures.KeySignatureSet{}, fmt.Errorf("iterate key signatures: %w", err)
	}
	return result, nil
}

func (s *Store) LoadTunings(ctx context.Context) (tuning.DefinitionSet, error) {
	log.Printf("db query load_tunings")
	rows, err := s.pool.Query(ctx, `
		SELECT t.external_id, t.name, t.string_count, ts.string_number, ts.note_name
		FROM tunings t
		JOIN tuning_strings ts ON ts.tuning_id = t.id
		ORDER BY t.external_id, ts.string_number
	`)
	if err != nil {
		return tuning.DefinitionSet{}, fmt.Errorf("query tunings: %w", err)
	}
	defer rows.Close()

	byID := map[int]*tuning.Definition{}
	var order []int

	for rows.Next() {
		var id, stringCount, stringNumber int
		var name, noteName string
		if err := rows.Scan(&id, &name, &stringCount, &stringNumber, &noteName); err != nil {
			return tuning.DefinitionSet{}, fmt.Errorf("scan tunings: %w", err)
		}
		item, ok := byID[id]
		if !ok {
			item = &tuning.Definition{
				ID:          id,
				Name:        name,
				StringCount: stringCount,
				Strings:     make([]string, 0, stringCount),
			}
			byID[id] = item
			order = append(order, id)
		}
		item.Strings = append(item.Strings, noteName)
	}
	if err := rows.Err(); err != nil {
		return tuning.DefinitionSet{}, fmt.Errorf("iterate tunings: %w", err)
	}

	sort.Ints(order)
	result := tuning.DefinitionSet{Tunings: make([]tuning.Definition, 0, len(order))}
	for _, id := range order {
		result.Tunings = append(result.Tunings, *byID[id])
	}
	return result, nil
}

func (s *Store) LoadScaleLayouts(ctx context.Context) (scales.ScaleLayoutSet, error) {
	log.Printf("db query load_scale_layouts")
	type positionAggregate struct {
		id       int64
		code     string
		position scales.ScaleLayoutPosition
	}
	type layoutAggregate struct {
		id          int64
		scale       scales.ScaleLayoutScale
		positionIDs []int64
	}
	type tuningAggregate struct {
		id        int64
		tuning    scales.ScaleLayoutTuning
		layoutIDs []int64
	}

	tuningsByDBID := map[int64]*tuningAggregate{}
	layoutsByID := map[int64]*layoutAggregate{}
	positionsByID := map[int64]*positionAggregate{}
	orderTunings := []int64{}

	rows, err := s.pool.Query(ctx, `
		SELECT
			t.id,
			t.external_id,
			t.name,
			t.string_count,
			ts.string_number,
			ts.note_name
		FROM tunings t
		JOIN tuning_strings ts ON ts.tuning_id = t.id
		ORDER BY t.id, ts.string_number
	`)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("query layout tunings: %w", err)
	}
	for rows.Next() {
		var tuningDBID int64
		var tuningExternalID, stringCount, stringNumber int
		var tuningName, noteName string
		if err := rows.Scan(&tuningDBID, &tuningExternalID, &tuningName, &stringCount, &stringNumber, &noteName); err != nil {
			rows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("scan layout tunings: %w", err)
		}
		item, ok := tuningsByDBID[tuningDBID]
		if !ok {
			item = &tuningAggregate{
				id: tuningDBID,
				tuning: scales.ScaleLayoutTuning{
					ID:          tuningExternalID,
					Name:        tuningName,
					StringCount: stringCount,
					Strings:     make([]string, 0, stringCount),
					Scales:      []scales.ScaleLayoutScale{},
				},
			}
			tuningsByDBID[tuningDBID] = item
			orderTunings = append(orderTunings, tuningDBID)
		}
		item.tuning.Strings = append(item.tuning.Strings, noteName)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("iterate layout tunings: %w", err)
	}

	layoutRows, err := s.pool.Query(ctx, `
		SELECT
			sl.id,
			sl.tuning_id,
			s.external_id,
			s.name,
			st.code
		FROM scale_layouts sl
		JOIN scales s ON s.id = sl.scale_id
		JOIN scale_types st ON st.id = s.scale_type_id
		ORDER BY sl.tuning_id, s.external_id
	`)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("query scale layouts: %w", err)
	}
	for layoutRows.Next() {
		var layoutID, tuningDBID int64
		var scaleID int
		var scaleName, scaleType string
		if err := layoutRows.Scan(&layoutID, &tuningDBID, &scaleID, &scaleName, &scaleType); err != nil {
			layoutRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("scan scale layouts: %w", err)
		}
		tuningItem := tuningsByDBID[tuningDBID]
		if tuningItem == nil {
			layoutRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("missing tuning for layout %d", layoutID)
		}
		layoutsByID[layoutID] = &layoutAggregate{
			id: layoutID,
			scale: scales.ScaleLayoutScale{
				ID:        scaleID,
				Name:      scaleName,
				Type:      scales.ScaleType(scaleType),
				Positions: map[string]scales.ScaleLayoutPosition{},
			},
		}
		tuningItem.layoutIDs = append(tuningItem.layoutIDs, layoutID)
	}
	layoutRows.Close()
	if err := layoutRows.Err(); err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("iterate scale layouts: %w", err)
	}

	positionRows, err := s.pool.Query(ctx, `
		SELECT id, scale_layout_id, position_code, mode, start_fret, fret_span, validated_manual
		FROM scale_layout_positions
		ORDER BY scale_layout_id, position_code
	`)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("query layout positions: %w", err)
	}
	for positionRows.Next() {
		var positionID, layoutID int64
		var positionCode, mode string
		var startFret, fretSpan *int32
		var validated bool
		if err := positionRows.Scan(&positionID, &layoutID, &positionCode, &mode, &startFret, &fretSpan, &validated); err != nil {
			positionRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("scan layout positions: %w", err)
		}
		layoutItem := layoutsByID[layoutID]
		if layoutItem == nil {
			positionRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("missing layout for position %d", positionID)
		}
		pos := scales.ScaleLayoutPosition{
			Mode:      mode,
			Validated: validated,
		}
		if startFret != nil {
			pos.Start = int(*startFret)
		}
		if fretSpan != nil {
			pos.Span = int(*fretSpan)
		}
		layoutItem.positionIDs = append(layoutItem.positionIDs, positionID)
		positionsByID[positionID] = &positionAggregate{
			id:       positionID,
			code:     positionCode,
			position: pos,
		}
	}
	positionRows.Close()
	if err := positionRows.Err(); err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("iterate layout positions: %w", err)
	}

	splitRows, err := s.pool.Query(ctx, `
		SELECT id, scale_layout_position_id, ordinal, start_fret, fret_span
		FROM scale_layout_position_split_ranges
		ORDER BY scale_layout_position_id, ordinal
	`)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("query split ranges: %w", err)
	}
	type splitRef struct {
		positionID int64
		index      int
	}
	splitByID := map[int64]splitRef{}
	for splitRows.Next() {
		var splitID, positionID int64
		var ordinal, startFret, fretSpan int
		if err := splitRows.Scan(&splitID, &positionID, &ordinal, &startFret, &fretSpan); err != nil {
			splitRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("scan split ranges: %w", err)
		}
		position := positionsByID[positionID]
		if position == nil {
			splitRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("missing position for split range %d", splitID)
		}
		position.position.SplitRanges = append(position.position.SplitRanges, scales.SplitRange{
			Start: startFret,
			Span:  fretSpan,
		})
		splitByID[splitID] = splitRef{positionID: positionID, index: len(position.position.SplitRanges) - 1}
	}
	splitRows.Close()
	if err := splitRows.Err(); err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("iterate split ranges: %w", err)
	}

	splitStringRows, err := s.pool.Query(ctx, `
		SELECT split_range_id, string_index_zero_based
		FROM scale_layout_position_split_range_strings
		ORDER BY split_range_id, string_index_zero_based
	`)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("query split range strings: %w", err)
	}
	for splitStringRows.Next() {
		var splitID int64
		var stringIndex int
		if err := splitStringRows.Scan(&splitID, &stringIndex); err != nil {
			splitStringRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("scan split range strings: %w", err)
		}
		splitRangeRef, ok := splitByID[splitID]
		if !ok {
			splitStringRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("missing split range for string row %d", splitID)
		}
		position := positionsByID[splitRangeRef.positionID]
		if position == nil || splitRangeRef.index >= len(position.position.SplitRanges) {
			splitStringRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("missing position for split range string row %d", splitID)
		}
		position.position.SplitRanges[splitRangeRef.index].Strings = append(
			position.position.SplitRanges[splitRangeRef.index].Strings,
			stringIndex,
		)
	}
	splitStringRows.Close()
	if err := splitStringRows.Err(); err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("iterate split range strings: %w", err)
	}

	fretRows, err := s.pool.Query(ctx, `
		SELECT scale_layout_position_id, string_index_zero_based, fret
		FROM scale_layout_position_string_frets
		ORDER BY scale_layout_position_id, string_index_zero_based, fret
	`)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("query string frets: %w", err)
	}
	for fretRows.Next() {
		var positionID int64
		var stringIndex, fret int
		if err := fretRows.Scan(&positionID, &stringIndex, &fret); err != nil {
			fretRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("scan string frets: %w", err)
		}
		position := positionsByID[positionID]
		if position == nil {
			fretRows.Close()
			return scales.ScaleLayoutSet{}, fmt.Errorf("missing position for fret row %d", positionID)
		}
		if position.position.PerStringFrets == nil {
			position.position.PerStringFrets = map[string][]int{}
		}
		key := fmt.Sprintf("%d", stringIndex)
		position.position.PerStringFrets[key] = append(position.position.PerStringFrets[key], fret)
	}
	fretRows.Close()
	if err := fretRows.Err(); err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("iterate string frets: %w", err)
	}

	result := scales.ScaleLayoutSet{Tunings: make([]scales.ScaleLayoutTuning, 0, len(orderTunings))}
	sort.Slice(orderTunings, func(i, j int) bool { return orderTunings[i] < orderTunings[j] })
	for _, tuningDBID := range orderTunings {
		tuningItem := tuningsByDBID[tuningDBID]
		for _, layoutID := range tuningItem.layoutIDs {
			layoutItem := layoutsByID[layoutID]
			for _, positionID := range layoutItem.positionIDs {
				position := positionsByID[positionID]
				layoutItem.scale.Positions[position.code] = position.position
			}
			tuningItem.tuning.Scales = append(tuningItem.tuning.Scales, layoutItem.scale)
		}
		result.Tunings = append(result.Tunings, tuningItem.tuning)
	}

	definitions, err := s.LoadScaleDefinitions(ctx)
	if err != nil {
		return scales.ScaleLayoutSet{}, fmt.Errorf("load definitions for layout materialization: %w", err)
	}
	scales.MaterializeScaleLayoutFrets(&result, definitions)

	return result, nil
}
