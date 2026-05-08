package api

import (
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	apiRateLimitRequests = 120
	apiRateLimitWindow   = time.Minute
)

var defaultAPIRateLimiter = newFixedWindowLimiter(apiRateLimitRequests, apiRateLimitWindow)

type fixedWindowLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	clients map[string]fixedWindowClient
}

type fixedWindowClient struct {
	count   int
	resetAt time.Time
}

func newFixedWindowLimiter(limit int, window time.Duration) *fixedWindowLimiter {
	return &fixedWindowLimiter{
		limit:   limit,
		window:  window,
		clients: map[string]fixedWindowClient{},
	}
}

func (l *fixedWindowLimiter) allow(key string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	client := l.clients[key]
	if client.resetAt.IsZero() || !now.Before(client.resetAt) {
		client = fixedWindowClient{count: 0, resetAt: now.Add(l.window)}
	}
	if client.count >= l.limit {
		l.clients[key] = client
		return false
	}

	client.count++
	l.clients[key] = client
	l.pruneLocked(now)
	return true
}

func (l *fixedWindowLimiter) pruneLocked(now time.Time) {
	if len(l.clients) <= 1024 {
		return
	}
	for key, client := range l.clients {
		if !now.Before(client.resetAt) {
			delete(l.clients, key)
		}
	}
}

func withSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}

func withAPIMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !originAllowed(r) {
			writeError(w, http.StatusForbidden, "cross-origin API requests are not allowed")
			return
		}

		clientIP := clientIPFromRequest(r)
		if !defaultAPIRateLimiter.allow(clientIP, time.Now()) {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func originAllowed(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	return strings.EqualFold(parsed.Host, requestHost(r))
}

func requestHost(r *http.Request) string {
	forwardedHost := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if forwardedHost != "" {
		parts := strings.Split(forwardedHost, ",")
		return strings.TrimSpace(parts[0])
	}
	return strings.TrimSpace(r.Host)
}

func clientIPFromRequest(r *http.Request) string {
	forwardedFor := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if forwardedFor != "" {
		parts := strings.Split(forwardedFor, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	if trimmed := strings.TrimSpace(r.RemoteAddr); trimmed != "" {
		return trimmed
	}
	return "unknown"
}
