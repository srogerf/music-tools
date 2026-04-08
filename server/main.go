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
)

func main() {
	addr := flag.String("addr", ":8080", "server listen address")
	definitionsPath := flag.String("definitions", "data/scales/DEFINITIONS.json", "path to scale definitions JSON")
	keySignaturesPath := flag.String("key-signatures", "data/scales/KEY_SIGNATURES.json", "path to key signatures JSON")
	flag.Parse()

	defs, err := scales.LoadDefinitions(*definitionsPath)
	if err != nil {
		log.Fatalf("load definitions: %v", err)
	}
	keySignatures, err := key_signatures.LoadKeySignatures(*keySignaturesPath)
	if err != nil {
		log.Fatalf("load key signatures: %v", err)
	}

	scaleService := api.NewScaleService(defs, keySignatures)
	handler := api.NewRouter(scaleService)

	server := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Listening on %s\n", *addr)
	log.Fatal(server.ListenAndServe())
}
