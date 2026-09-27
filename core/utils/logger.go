package utils

import (
    "os"
    "log/slog"
)

func NewLogger() *slog.Logger{
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	return logger
}