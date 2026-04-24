package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"time"

	"music-tools/api"
	"music-tools/src/postgresdb"
)

func main() {
	addr := flag.String("addr", ":8080", "server listen address")
	postgresConfigPath := flag.String("postgres-config", "conf/postgres.env", "path to postgres env config")
	staticDir := flag.String("static-dir", "frontend/app", "path to frontend app static assets")
	fretboardDir := flag.String("fretboard-dir", "frontend/fretboard", "path to fretboard static assets; leave empty when bundled into static-dir")
	flag.Parse()

	ctx := context.Background()
	staticConfig := api.StaticConfig{
		AppDir:       *staticDir,
		FretboardDir: *fretboardDir,
	}

	databaseURL, err := postgresdb.ConnectionStringFromEnvFile(*postgresConfigPath)
	if err != nil {
		log.Printf("load postgres config: %v", err)
		handler := api.NewUnavailableRouter(staticConfig, "database unavailable: failed to load postgres config")
		startServer(*addr, handler)
		return
	}

	store, err := postgresdb.Open(ctx, databaseURL)
	if err != nil {
		log.Printf("connect postgres: %v", err)
		handler := api.NewUnavailableRouter(staticConfig, "database unavailable: could not connect to postgres")
		startServer(*addr, handler)
		return
	}
	defer store.Close()

	scaleService := api.NewScaleService(store)
	layoutService := api.NewScaleLayoutService(store)
	tuningService := api.NewTuningService(store)
	handler := api.NewRouter(scaleService, layoutService, tuningService, staticConfig)

	startServer(*addr, handler)
}

func startServer(addr string, handler http.Handler) {
	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Listening on %s\n", addr)
	log.Fatal(server.ListenAndServe())
}
