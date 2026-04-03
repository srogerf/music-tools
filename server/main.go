package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"music-tools/api"
	"music-tools/src/scales"
)

func main() {
	addr := flag.String("addr", ":8080", "server listen address")
	definitionsPath := flag.String("definitions", "data/scales/DEFINITIONS.json", "path to scale definitions JSON")
	flag.Parse()

	defs, err := scales.LoadDefinitions(*definitionsPath)
	if err != nil {
		log.Fatalf("load definitions: %v", err)
	}

	scaleService := api.NewScaleService(defs)
	handler := api.NewRouter(scaleService)

	server := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Listening on %s\n", *addr)
	log.Fatal(server.ListenAndServe())
}
