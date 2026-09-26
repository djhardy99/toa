package utils

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

// NewLogger creates a logger that writes to stderr and to a new file in dir,
// named after the moment of startup (e.g. logs/2026-09-26_15-04-05.log).
//
// The caller must call the returned close function when finished (usually
// via defer) so the file is closed properly.
func NewLogger(dir string) (*slog.Logger, func() error, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, nil, fmt.Errorf("creating log dir: %w", err)
	}

	// Colons are not allowed in filenames on Windows, so use dashes in the time.
	name := time.Now().Format("2006-01-02_15-04-05") + ".log"
	path := filepath.Join(dir, name)

	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, nil, fmt.Errorf("opening log file: %w", err)
	}

	// Stderr, not stdout: stdout is reserved for the program's real output.
	w := io.MultiWriter(os.Stderr, f)
	logger := slog.New(slog.NewTextHandler(w, &slog.HandlerOptions{Level: slog.LevelInfo}))

	return logger, f.Close, nil
}
