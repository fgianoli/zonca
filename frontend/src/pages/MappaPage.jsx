import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";
import { colors, fonts } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

// Palette di colori per distinguere gli itinerari
const ROUTE_COLORS = [
  "#0891b2", "#d97706", "#059669", "#dc2626", "#7c3aed",
  "#db2777", "#0284c7", "#ea580c", "#16a34a", "#9333ea",
  "#0d9488", "#e11d48", "#ca8a04", "#2563eb",
];

const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
  ],
};

export default function MappaPage() {
  const isMobile = useIsMobile();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [routes, setRoutes] = useState([]); // [{ fid, nome, lunghezza, color }]
  const [selected, setSelected] = useState(null);
  const [hiddenFids, setHiddenFids] = useState(new Set());
  // Su mobile pannello chiuso di default
  const [panelOpen, setPanelOpen] = useState(!isMobile);

  // Misura
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]); // [[lng,lat]]
  const measurePointsRef = useRef([]);
  const measureModeRef = useRef(false);

  useEffect(() => {
    measurePointsRef.current = measurePoints;
  }, [measurePoints]);
  useEffect(() => {
    measureModeRef.current = measureMode;
  }, [measureMode]);

  // Init mappa
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [12.0, 45.42],
      zoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }),
      "bottom-left"
    );

    map.on("load", async () => {
      // Carica GeoJSON itinerari
      try {
        const res = await fetch("/itinerari.geojson");
        const gj = await res.json();

        // Assegno colori e raccolgo info
        const info = gj.features
          .map((f, i) => ({
            fid: f.properties.fid,
            nome: f.properties.nome || `Itinerario ${f.properties.fid}`,
            lunghezza: f.properties.lunghezza || 0,
            color: ROUTE_COLORS[i % ROUTE_COLORS.length],
          }))
          .sort((a, b) => b.lunghezza - a.lunghezza);
        setRoutes(info);

        // Aggiungo color per feature
        gj.features.forEach((f, i) => {
          f.properties.color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        });

        map.addSource("itinerari", { type: "geojson", data: gj });

        // Linea alone bianco sotto per leggibilità
        map.addLayer({
          id: "itinerari-halo",
          type: "line",
          source: "itinerari",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 9],
            "line-opacity": 0.8,
          },
        });

        // Linea colorata
        map.addLayer({
          id: "itinerari-line",
          type: "line",
          source: "itinerari",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 6],
            "line-opacity": 0.9,
          },
        });

        // Fit bounds sugli itinerari
        const bounds = new maplibregl.LngLatBounds();
        gj.features.forEach((f) => {
          const addCoords = (coords) => {
            if (Array.isArray(coords[0])) coords.forEach(addCoords);
            else bounds.extend(coords);
          };
          addCoords(f.geometry.coordinates);
        });
        map.fitBounds(bounds, { padding: 60, duration: 0 });

        // Hover / click sui percorsi
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "route-popup",
        });

        map.on("mouseenter", "itinerari-line", () => {
          if (!measureModeRef.current) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "itinerari-line", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
        map.on("mousemove", "itinerari-line", (e) => {
          if (measureModeRef.current) return;
          if (!e.features || !e.features[0]) return;
          const p = e.features[0].properties;
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:Inter,sans-serif;min-width:160px">
                <div style="font-weight:700;color:${p.color};margin-bottom:4px">${p.nome || "Itinerario " + p.fid}</div>
                <div style="font-size:12px;color:#475569">📏 <b>${(p.lunghezza || 0).toFixed(2)} km</b></div>
              </div>`
            )
            .addTo(map);
        });

        map.on("click", "itinerari-line", (e) => {
          if (measureModeRef.current) return;
          const p = e.features[0].properties;
          setSelected({
            fid: p.fid,
            nome: p.nome || `Itinerario ${p.fid}`,
            lunghezza: p.lunghezza,
            color: p.color,
          });
        });
      } catch (err) {
        console.error("Errore caricamento itinerari:", err);
      }

      // === Strumento misura ===
      // Sorgente + layer per linea misura e punti
      map.addSource("measure-line", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("measure-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "measure-line-layer",
        type: "line",
        source: "measure-line",
        paint: {
          "line-color": "#dc2626",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });

      map.addLayer({
        id: "measure-points-layer",
        type: "circle",
        source: "measure-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#dc2626",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click handler per modalità misura
      map.on("click", (e) => {
        if (!measureModeRef.current) return;
        const newPt = [e.lngLat.lng, e.lngLat.lat];
        const next = [...measurePointsRef.current, newPt];
        setMeasurePoints(next);
      });
    });

    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggiorna visualizzazione misura quando cambiano i punti
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const pointsSrc = map.getSource("measure-points");
    const lineSrc = map.getSource("measure-line");
    if (!pointsSrc || !lineSrc) return;

    pointsSrc.setData({
      type: "FeatureCollection",
      features: measurePoints.map((c, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c },
        properties: { idx: i },
      })),
    });

    lineSrc.setData(
      measurePoints.length >= 2
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "LineString", coordinates: measurePoints },
                properties: {},
              },
            ],
          }
        : { type: "FeatureCollection", features: [] }
    );
  }, [measurePoints]);

  // Cursore quando entra/esce dalla modalità misura
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = measureMode ? "crosshair" : "";
  }, [measureMode]);

  // Filtri (mostra/nascondi itinerari)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("itinerari-line")) return;
    const filter = ["!", ["in", ["get", "fid"], ["literal", Array.from(hiddenFids)]]];
    map.setFilter("itinerari-line", filter);
    map.setFilter("itinerari-halo", filter);
  }, [hiddenFids]);

  const measureDistance =
    measurePoints.length >= 2
      ? turf.length(turf.lineString(measurePoints), { units: "kilometers" })
      : 0;

  const clearMeasure = () => setMeasurePoints([]);
  const undoMeasure = () =>
    setMeasurePoints((pts) => pts.slice(0, -1));

  const toggleRoute = (fid) => {
    setHiddenFids((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  const zoomToRoute = (fid) => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("itinerari");
    if (!src) return;
    const data = src._data;
    const f = data.features.find((x) => x.properties.fid === fid);
    if (!f) return;
    const bounds = new maplibregl.LngLatBounds();
    const addCoords = (coords) => {
      if (Array.isArray(coords[0])) coords.forEach(addCoords);
      else bounds.extend(coords);
    };
    addCoords(f.geometry.coordinates);
    map.fitBounds(bounds, { padding: 80, duration: 800 });
  };

  const totalKm = routes.reduce((sum, r) => sum + (r.lunghezza || 0), 0);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh - 0px)",
        minHeight: 500,
        fontFamily: fonts.body,
      }}
    >
      <div ref={mapContainer} style={{ position: "absolute", inset: 0 }} />

      {/* Home */}
      <a
        href="/"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 6,
          padding: isMobile ? "6px 10px" : "8px 14px",
          background: "#ffffffee",
          backdropFilter: "blur(10px)",
          borderRadius: 10,
          color: colors.foam,
          textDecoration: "none",
          fontSize: isMobile ? 12 : 13,
          fontWeight: 600,
          boxShadow: colors.shadowSoft,
          border: `1px solid ${colors.borderSoft}`,
        }}
      >
        ← Home
      </a>

      {/* Pannello legenda / itinerari (collassabile). Mobile: bottom sheet */}
      <div
        style={
          isMobile
            ? {
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 12,
                maxHeight: panelOpen ? "55vh" : "auto",
                background: "#ffffffee",
                backdropFilter: "blur(10px)",
                borderRadius: 14,
                boxShadow: colors.shadowMed,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                zIndex: 5,
                transition: "max-height .25s ease",
              }
            : {
                position: "absolute",
                top: 60,
                left: 16,
                width: panelOpen ? 280 : "auto",
                maxHeight: panelOpen ? "calc(100% - 76px)" : "auto",
                background: "#ffffffee",
                backdropFilter: "blur(10px)",
                borderRadius: 14,
                boxShadow: colors.shadowMed,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                zIndex: 5,
                transition: "width .2s ease",
              }
        }
      >
        <button
          onClick={() => setPanelOpen((v) => !v)}
          style={{
            padding: panelOpen ? "14px 16px" : "10px 14px",
            background: colors.gradLagoon,
            color: "#fff",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            boxShadow: "none",
          }}
          title={panelOpen ? "Nascondi pannello" : "Mostra itinerari"}
        >
          <span style={{ fontSize: 18 }}>🗺</span>
          {panelOpen ? (
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 700 }}>
                Itinerari Remiera
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>
                {routes.length} percorsi · {totalKm.toFixed(0)} km totali
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {routes.length}
            </span>
          )}
          <span style={{ fontSize: 14, opacity: 0.9 }}>
            {panelOpen ? "▾" : "▸"}
          </span>
        </button>
        {panelOpen && (
          <div
            style={{
              padding: "10px 12px",
              overflowY: "auto",
              flex: 1,
            }}
          >
            {routes.map((r) => {
              const hidden = hiddenFids.has(r.fid);
              return (
                <div
                  key={r.fid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    opacity: hidden ? 0.4 : 1,
                    transition: "background .15s",
                    marginBottom: 2,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = colors.panel)
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div
                    onClick={() => toggleRoute(r.fid)}
                    title={hidden ? "Mostra" : "Nascondi"}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${r.color}`,
                      background: hidden ? "transparent" : r.color,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    onClick={() => zoomToRoute(r.fid)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: colors.foam,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.nome}
                    </div>
                    <div style={{ fontSize: 11, color: colors.muted }}>
                      {r.lunghezza?.toFixed(2)} km
                    </div>
                  </div>
                </div>
              );
            })}
            {routes.length === 0 && (
              <div style={{ color: colors.muted, fontSize: 13, padding: 10 }}>
                Caricamento itinerari…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tool misura (sotto controlli mappa su desktop, in basso-destra su mobile) */}
      <div
        style={
          isMobile
            ? {
                position: "absolute",
                top: 12,
                right: 12,
                background: "#ffffffee",
                backdropFilter: "blur(10px)",
                borderRadius: 12,
                boxShadow: colors.shadowMed,
                padding: measureMode ? "10px 12px" : "6px 10px",
                zIndex: 6,
                maxWidth: measureMode ? "calc(100vw - 24px)" : "auto",
                minWidth: measureMode ? 200 : "auto",
              }
            : {
                position: "absolute",
                top: 140,
                right: 16,
                background: "#ffffffee",
                backdropFilter: "blur(10px)",
                borderRadius: 14,
                boxShadow: colors.shadowMed,
                padding: measureMode ? "12px 16px" : "10px 14px",
                zIndex: 5,
                minWidth: measureMode ? 220 : "auto",
              }
        }
      >
        {!measureMode ? (
          <button
            onClick={() => setMeasureMode(true)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              color: colors.foam,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📏 Misura
          </button>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <strong style={{ color: colors.red, fontSize: 14 }}>📏 Misura</strong>
              <button
                onClick={() => {
                  setMeasureMode(false);
                  clearMeasure();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: colors.muted,
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginBottom: 10,
              }}
            >
              Clicca sulla mappa per aggiungere punti
            </div>
            <div
              style={{
                padding: "10px 12px",
                background: `${colors.red}10`,
                border: `1px solid ${colors.red}44`,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                Distanza totale
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: colors.red,
                  fontFamily: fonts.display,
                }}
              >
                {measureDistance.toFixed(2)} km
              </div>
              <div style={{ fontSize: 11, color: colors.muted }}>
                {measurePoints.length} {measurePoints.length === 1 ? "punto" : "punti"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={undoMeasure}
                disabled={measurePoints.length === 0}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  color: colors.foam,
                  borderRadius: 6,
                  cursor: measurePoints.length === 0 ? "not-allowed" : "pointer",
                  opacity: measurePoints.length === 0 ? 0.5 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ↶ Annulla
              </button>
              <button
                onClick={clearMeasure}
                disabled={measurePoints.length === 0}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  border: "none",
                  background: colors.red,
                  color: "#fff",
                  borderRadius: 6,
                  cursor: measurePoints.length === 0 ? "not-allowed" : "pointer",
                  opacity: measurePoints.length === 0 ? 0.5 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                🗑 Pulisci
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info itinerario selezionato */}
      {selected && !measureMode && (
        <div
          style={
            isMobile
              ? {
                  position: "absolute",
                  top: 56,
                  left: 12,
                  right: 12,
                  background: "#ffffffee",
                  backdropFilter: "blur(10px)",
                  borderRadius: 12,
                  boxShadow: colors.shadowMed,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  zIndex: 6,
                  borderLeft: `4px solid ${selected.color}`,
                }
              : {
                  position: "absolute",
                  bottom: 28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#ffffffee",
                  backdropFilter: "blur(10px)",
                  borderRadius: 14,
                  boxShadow: colors.shadowMed,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  zIndex: 5,
                  borderLeft: `5px solid ${selected.color}`,
                }
          }
        >
          <div>
            <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              Itinerario #{selected.fid}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: colors.foam,
                fontFamily: fonts.display,
              }}
            >
              {selected.nome}
            </div>
            <div style={{ fontSize: 13, color: colors.muted }}>
              📏 {selected.lunghezza?.toFixed(2)} km
            </div>
          </div>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: colors.muted,
            }}
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}
