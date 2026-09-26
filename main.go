package main

import (
	"fmt"
	"os"

	"github.com/djhardy99/toa/core/utils"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "toa:", err)
		os.Exit(1)
	}
}

// run does the real work. It is separate from main so that its deferred calls
// (like closing the log file) still run: os.Exit skips defers, but run has
// already returned by the time main calls it.
func run() error {
	logger, closeLog, err := utils.NewLogger("logs")
	if err != nil {
		return err
	}
	defer closeLog()

	logger.Info("hello, toa")
	return nil
}
