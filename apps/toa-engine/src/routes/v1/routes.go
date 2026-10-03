package v1

import (
	"log/slog"
	"net/http"
)

type Handler struct {
	log *slog.Logger
}

func NewHandler(log *slog.Logger) *Handler {
	return &Handler{log: log}
}

// Register adds the v1 routes to mux. Versioned API routes go here.
func (h *Handler) Register(mux *http.ServeMux) {}
