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
	flag.Parse()

	ctx := context.Background()
	databaseURL, err := postgresdb.ConnectionStringFromEnvFile(*postgresConfigPath)
	if err != nil {
		log.Fatalf("load postgres config: %v", err)
	}
	store, err := postgresdb.Open(ctx, databaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer store.Close()

	scaleService := api.NewScaleService(store)
	layoutService := api.NewScaleLayoutService(store)
	tuningService := api.NewTuningService(store)
	handler := api.NewRouter(scaleService, layoutService, tuningService)

	server := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Printf("Listening on %s\n", *addr)
	log.Fatal(server.ListenAndServe())
}
