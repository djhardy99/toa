package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/djhardy99/toa/src/utils"
)

func handleGetRequest(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello")
}

func main() {
	logger := utils.NewLogger()
	cfg, err := utils.LoadConfig("cfg/core.json")
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	addr := fmt.Sprintf(":%d", cfg.Port)
	logger.Info("starting server", "addr", addr, "port", cfg.Port)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", handleGetRequest)
	if err := http.ListenAndServe(addr, mux); err != nil {
		logger.Error(err.Error())
	}
}
