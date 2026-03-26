package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/lru"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/swatkatz/babybaton/backend/graph"
	"github.com/swatkatz/babybaton/backend/internal/auth"
	"github.com/swatkatz/babybaton/backend/internal/middleware"
	"github.com/swatkatz/babybaton/backend/internal/store/postgres"
	"github.com/vektah/gqlparser/v2/ast"
)

const defaultPort = "8080"

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Initialize database store
	store, err := postgres.NewPostgresStore(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()
	log.Println("Successfully connected to database")

	// Initialize auth verifier (optional — falls back to header-only auth if no JWT secret)
	var authMiddleware func(http.Handler) http.Handler
	if jwtSecret := os.Getenv("SUPABASE_JWT_SECRET"); jwtSecret != "" {
		verifier := auth.NewSupabaseVerifier(jwtSecret)
		dualAuth := middleware.NewDualAuthMiddleware(verifier, store)
		authMiddleware = dualAuth.Handler
		log.Println("Dual auth enabled (JWT + header-based)")
	} else {
		authMiddleware = middleware.AuthMiddleware
		log.Println("Header-based auth only (SUPABASE_JWT_SECRET not set)")
	}

	// Create resolver with store
	resolver := graph.NewResolver(store)

	srv := handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{})

	srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))

	srv.Use(extension.Introspection{})
	srv.Use(extension.AutomaticPersistedQuery{
		Cache: lru.New[string](100),
	})

	// Add CORS middleware (CORS_ALLOWED_ORIGIN supports comma-separated values)
	allowedOrigins := []string{"http://localhost:8081"}
	if corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN"); corsOrigin != "" {
		for _, origin := range strings.Split(corsOrigin, ",") {
			if o := strings.TrimSpace(origin); o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}
	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowCredentials: true,
		AllowedHeaders:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
	})

	// Health check endpoint for deployment platforms
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.Handle("/query", c.Handler(authMiddleware(srv)))

	log.Printf("connect to http://localhost:%s/ for GraphQL playground", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
