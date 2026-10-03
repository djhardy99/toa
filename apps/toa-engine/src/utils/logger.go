package utils

import (
	"log/slog"
	"os"
)
func NewLogger() *slog.Logger {
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	return logger
}
