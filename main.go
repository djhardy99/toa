package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
)

func NewLogger() *slog.Logger {
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	return logger
}

func handleGetRequest(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello")
}

func main() {
	var port int = 4001
	logger := NewLogger()
	logger.Info("starting server", "addr", fmt.Sprintf(":%d", port), "port", port)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", handleGetRequest)
	if err := http.ListenAndServe(":4001", mux); err != nil {
		logger.Error(err.Error())
	}
}
