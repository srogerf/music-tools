FROM golang:1.25-bookworm AS build

WORKDIR /src

ARG TARGETOS=linux
ARG TARGETARCH=arm64

COPY go.mod go.sum ./
RUN go mod download

COPY api ./api
COPY conf ./conf
COPY data ./data
COPY frontend ./frontend
COPY server ./server
COPY src ./src

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /out/rifferone ./server

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=build /out/rifferone /app/rifferone
COPY --from=build /src/frontend /app/frontend
COPY --from=build /src/conf /app/conf

EXPOSE 8080

ENTRYPOINT ["/app/rifferone"]
CMD ["-addr", ":8080", "-postgres-config", ""]
