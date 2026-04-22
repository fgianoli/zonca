import logging

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/weather", tags=["weather"])

PADOVA_LAT = 45.4064
PADOVA_LON = 11.8768

VENEZIA_LAT = 45.43
VENEZIA_LON = 12.33

logger = logging.getLogger(__name__)


def compute_traffic_light(conditions: dict, is_marine: bool) -> dict:
    """Calcola lo stato del semaforo operativo dalle condizioni correnti.

    RED se: raffiche > 35 km/h, onde > 0.8 m (marine), precipitazione > 5 mm.
    YELLOW se: raffiche 20..35 km/h, onde 0.4..0.8 m (marine), precipitazione 1..5 mm.
    GREEN altrimenti.
    """
    reasons_red: list[str] = []
    reasons_yellow: list[str] = []

    gusts = conditions.get("wind_gusts") or 0
    precipitation = conditions.get("precipitation") or 0
    wave = conditions.get("wave_height") or 0

    # Raffiche
    if gusts > 35:
        reasons_red.append(f"raffiche > 35 km/h ({gusts:.0f})")
    elif gusts >= 20:
        reasons_yellow.append(f"raffiche {gusts:.0f} km/h")

    # Precipitazione
    if precipitation > 5:
        reasons_red.append(f"pioggia > 5 mm ({precipitation:.1f})")
    elif precipitation >= 1:
        reasons_yellow.append(f"pioggia {precipitation:.1f} mm")

    # Onde (solo marine)
    if is_marine:
        if wave > 0.8:
            reasons_red.append(f"onde > 0.8 m ({wave:.2f})")
        elif wave >= 0.4:
            reasons_yellow.append(f"onde {wave:.2f} m")

    if reasons_red:
        return {"status": "red", "reasons": reasons_red + reasons_yellow}
    if reasons_yellow:
        return {"status": "yellow", "reasons": reasons_yellow}
    return {"status": "green", "reasons": []}


async def _fetch_weather(lat: float, lon: float) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max,precipitation_sum",
                "timezone": "Europe/Rome",
                "forecast_days": 3,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _fetch_marine(lat: float, lon: float) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://marine-api.open-meteo.com/v1/marine",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "wave_height,wave_period,wave_direction",
                "hourly": "sea_level_height_msl",
                "daily": "wave_height_max,wave_period_max",
                "timezone": "Europe/Rome",
                "forecast_days": 3,
            },
        )
        resp.raise_for_status()
        return resp.json()


def _build_padova_forecast(daily: dict) -> list[dict]:
    times = daily.get("time", []) or []
    return [
        {
            "date": times[i],
            "weather_code": daily["weather_code"][i],
            "temp_max": daily["temperature_2m_max"][i],
            "temp_min": daily["temperature_2m_min"][i],
            "wind_max": daily["wind_speed_10m_max"][i],
            "gusts_max": daily["wind_gusts_10m_max"][i],
            "rain_probability": daily["precipitation_probability_max"][i],
        }
        for i in range(len(times))
    ]


def _current_tide_level(marine: dict) -> float | None:
    """Estrae il valore sea_level_height_msl corrente (più vicino all'ora attuale)."""
    hourly = marine.get("hourly") or {}
    levels = hourly.get("sea_level_height_msl")
    times = hourly.get("time")
    if not levels or not times:
        return None
    # Prendi l'ultimo valore disponibile non-null più vicino al current
    current_time = (marine.get("current") or {}).get("time")
    if current_time and current_time in times:
        idx = times.index(current_time)
        val = levels[idx]
        if val is not None:
            return float(val)
    # Fallback: primo valore non nullo
    for v in levels:
        if v is not None:
            return float(v)
    return None


async def _padova_payload() -> dict:
    try:
        data = await _fetch_weather(PADOVA_LAT, PADOVA_LON)
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.warning("Weather API unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Servizio meteo temporaneamente non disponibile",
        )

    current = data.get("current", {}) or {}
    daily = data.get("daily", {}) or {}

    current_clean = {
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "weather_code": current.get("weather_code"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_direction": current.get("wind_direction_10m"),
        "wind_gusts": current.get("wind_gusts_10m"),
        "precipitation": current.get("precipitation"),
    }

    traffic = compute_traffic_light(current_clean, is_marine=False)

    return {
        "location": "Padova / Bacinetto",
        "current": current_clean,
        "wind_alert": (current_clean["wind_gusts"] or 0) > 30,
        "forecast": _build_padova_forecast(daily),
        "traffic_light": traffic,
    }


async def _laguna_payload() -> dict:
    try:
        weather_data = await _fetch_weather(VENEZIA_LAT, VENEZIA_LON)
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.warning("Weather API unavailable (Venezia): %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Servizio meteo temporaneamente non disponibile",
        )

    marine_data: dict = {}
    try:
        marine_data = await _fetch_marine(VENEZIA_LAT, VENEZIA_LON)
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.warning("Marine API unavailable: %s", exc)
        # Prosegui senza dati marini

    w_current = weather_data.get("current", {}) or {}
    w_daily = weather_data.get("daily", {}) or {}
    m_current = marine_data.get("current", {}) or {}
    m_daily = marine_data.get("daily", {}) or {}

    tide_level = _current_tide_level(marine_data) if marine_data else None

    current_clean = {
        "temperature": w_current.get("temperature_2m"),
        "wind_speed": w_current.get("wind_speed_10m"),
        "wind_direction": w_current.get("wind_direction_10m"),
        "wind_gusts": w_current.get("wind_gusts_10m"),
        "precipitation": w_current.get("precipitation"),
        "wave_height": m_current.get("wave_height"),
        "wave_period": m_current.get("wave_period"),
        "wave_direction": m_current.get("wave_direction"),
        "tide_level_m": tide_level,
        "tide_available": tide_level is not None,
    }

    traffic = compute_traffic_light(current_clean, is_marine=True)

    # Forecast combinato weather + marine per giorno
    w_times = w_daily.get("time", []) or []
    m_times = m_daily.get("time", []) or []
    forecast = []
    for i, d in enumerate(w_times):
        entry = {
            "date": d,
            "weather_code": w_daily["weather_code"][i],
            "temp_max": w_daily["temperature_2m_max"][i],
            "temp_min": w_daily["temperature_2m_min"][i],
            "wind_max": w_daily["wind_speed_10m_max"][i],
            "gusts_max": w_daily["wind_gusts_10m_max"][i],
            "rain_probability": w_daily["precipitation_probability_max"][i],
            "wave_height_max": None,
            "wave_period_max": None,
        }
        if d in m_times:
            j = m_times.index(d)
            entry["wave_height_max"] = (m_daily.get("wave_height_max") or [None])[j] if j < len(m_daily.get("wave_height_max") or []) else None
            entry["wave_period_max"] = (m_daily.get("wave_period_max") or [None])[j] if j < len(m_daily.get("wave_period_max") or []) else None
        forecast.append(entry)

    return {
        "location": "Laguna di Venezia",
        "current": current_clean,
        "forecast": forecast,
        "traffic_light": traffic,
    }


@router.get("/current")
async def current_weather():
    """Alias storico: ritorna il meteo di Padova (retro-compatibilità)."""
    return await _padova_payload()


@router.get("/padova")
async def padova_weather():
    """Meteo corrente + forecast 3 giorni per Padova / Bacinetto."""
    return await _padova_payload()


@router.get("/laguna-venezia")
async def laguna_venezia_weather():
    """Dati marini + meteo per la Laguna di Venezia."""
    return await _laguna_payload()
