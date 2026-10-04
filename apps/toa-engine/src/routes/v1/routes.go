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

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /v1/inference", h.inference)
}
