package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/djhardy99/toa/src/utils"
)

type Server struct {
	log *slog.Logger
}

func (s *Server) healthCheckRoute(w http.ResponseWriter, r *http.Request) {
	s.log.Info("handling request", "method", r.Method, "path", r.URL.Path)
	fmt.Fprint(w, "Ok")
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
	srv := &Server{log: logger}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", srv.healthCheckRoute)
	if err := http.ListenAndServe(addr, mux); err != nil {
		logger.Error(err.Error())
	}
}
