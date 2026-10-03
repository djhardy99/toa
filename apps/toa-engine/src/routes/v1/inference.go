package v1

import (
	"fmt"
	"net/http"
)

func (h *Handler) inference(w http.ResponseWriter, r *http.Request) {
	h.log.Info("handling request", "method", r.Method, "path", r.URL.Path)
	fmt.Fprint(w, "Inference call")
}
