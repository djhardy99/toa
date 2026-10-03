package health

import (
	"fmt"
	"net/http"
)

func Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", handle)
}

func handle(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Ok")
}
