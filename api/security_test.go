package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestWithSecurityHeaders(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)

	withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})).ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Referrer-Policy"); got != "strict-origin-when-cross-origin" {
		t.Fatalf("Referrer-Policy = %q, want strict-origin-when-cross-origin", got)
	}
	if got := recorder.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q, want nosniff", got)
	}
	if got := recorder.Header().Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("X-Frame-Options = %q, want DENY", got)
	}
}

func TestOriginAllowed(t *testing.T) {
	testCases := []struct {
		name   string
		origin string
		host   string
		want   bool
	}{
		{name: "missing origin", origin: "", host: "localhost:8080", want: true},
		{name: "same origin", origin: "http://localhost:8080", host: "localhost:8080", want: true},
		{name: "different origin", origin: "https://example.com", host: "localhost:8080", want: false},
		{name: "invalid origin", origin: "://bad", host: "localhost:8080", want: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/api/v1/scales", nil)
			request.Host = testCase.host
			if testCase.origin != "" {
				request.Header.Set("Origin", testCase.origin)
			}

			if got := originAllowed(request); got != testCase.want {
				t.Fatalf("originAllowed() = %v, want %v", got, testCase.want)
			}
		})
	}
}

func TestWithAPIMiddlewareRejectsCrossOrigin(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/scales", nil)
	request.Host = "localhost:8080"
	request.Header.Set("Origin", "https://example.com")

	withAPIMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not run for cross-origin request")
	})).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusForbidden)
	}
}

func TestFixedWindowLimiter(t *testing.T) {
	limiter := newFixedWindowLimiter(2, time.Minute)
	now := time.Unix(0, 0)

	if !limiter.allow("127.0.0.1", now) {
		t.Fatal("first request should be allowed")
	}
	if !limiter.allow("127.0.0.1", now.Add(time.Second)) {
		t.Fatal("second request should be allowed")
	}
	if limiter.allow("127.0.0.1", now.Add(2*time.Second)) {
		t.Fatal("third request in same window should be blocked")
	}
	if !limiter.allow("127.0.0.1", now.Add(time.Minute+time.Second)) {
		t.Fatal("request after window reset should be allowed")
	}
}
