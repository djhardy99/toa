package main

import (
	"net/http"

	"github.com/djhardy99/toa/core/utils"
)

func main() {
	logger := utils.NewLogger()
	err := http.ListenAndServe(":4001", nil)
	if err != nil {
			logger.Error(err.Error())
	}
	logger.Info("Server started on port")
}

