FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY build/test/server/rifferone /app/rifferone
COPY build/test/frontend/app /app/frontend/app

EXPOSE 8080

ENTRYPOINT ["/app/rifferone"]
CMD ["-addr", ":8080", "-postgres-config", "", "-static-dir", "/app/frontend/app", "-fretboard-dir", ""]
