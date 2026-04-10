package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"music-tools/api"
	"music-tools/src/key_signatures"
	"music-tools/src/scales"
	"music-tools/src/tuning"
)

func main() {
	addr := flag.String("addr", ":8080", "server listen address")
	definitionsPath := flag.String("definitions", "data/scales/DEFINITIONS.json", "path to scale definitions JSON")
	keySignaturesPath := flag.String("key-signatures", "data/scales/KEY_SIGNATURES.json", "path to key signatures JSON")
	layoutsPath := flag.String("scale-layouts", "data/scales/LAYOUTS.json", "path to scale layout definitions JSON")
	layoutInstancesPath := flag.String("scale-layout-instances", "data/scales/LAYOUT_INSTANCES.json", "path to scale layout instances JSON")
	tuningsPath := flag.String("tunings", "data/tunings/DEFINITIONS.json", "path to tuning definitions JSON")
	flag.Parse()

	defs, err := scales.LoadDefinitions(*definitionsPath)
	if err != nil {
		log.Fatalf("load definitions: %v", err)
	}
	keySignatures, err := key_signatures.LoadKeySignatures(*keySignaturesPath)
	if err != nil {
		log.Fatalf("load key signatures: %v", err)
	}
	layouts, err := scales.LoadLayouts(*layoutsPath)
	if err != nil {
		log.Fatalf("load scale layouts: %v", err)
	}
	layoutInstances, err := scales.LoadLayoutInstances(*layoutInstancesPath, defs)
	if err != nil {
		log.Fatalf("load scale layout instances: %v", err)
	}
	tunings, err := tuning.LoadDefinitions(*tuningsPath)
	if err != nil {
		log.Fatalf("load tunings: %v", err)
	}

	scaleService := api.NewScaleService(defs, keySignatures)
	layoutService := api.NewScaleLayoutService(layouts, layoutInstances)
	tuningService := api.NewTuningService(tunings)
	handler := api.NewRouter(scaleService, layoutService, tuningService)

	server := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Listening on %s\n", *addr)
	log.Fatal(server.ListenAndServe())
}
