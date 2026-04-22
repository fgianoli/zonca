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


def _daily_traffic_light(
    gusts_max: float | None,
    rain_prob: float | None,
    rain_sum: float | None = None,
    wave_max: float | None = None,
    is_marine: bool = False,
) -> dict:
    """Calcolo semaforo per un giorno futuro basato su massimi previsti."""
    # Per la previsione uso criteri leggermente più conservativi
    fake_conditions = {
        "wind_gusts": gusts_max or 0,
        "precipitation": rain_sum if rain_sum is not None else (
            # Approssimazione: se prob > 70% consideriamo "piove parecchio"
            5.0 if (rain_prob or 0) >= 70 else (2.0 if (rain_prob or 0) >= 40 else 0)
        ),
        "wave_height": wave_max or 0,
    }
    return compute_traffic_light(fake_conditions, is_marine=is_marine)


def _build_padova_forecast(daily: dict) -> list[dict]:
    times = daily.get("time", []) or []
    out = []
    for i in range(len(times)):
        gusts_max = daily["wind_gusts_10m_max"][i]
        rain_prob = daily["precipitation_probability_max"][i]
        rain_sum = (daily.get("precipitation_sum") or [None] * len(times))[i]
        tl = _daily_traffic_light(gusts_max, rain_prob, rain_sum, is_marine=False)
        out.append(
            {
                "date": times[i],
                "weather_code": daily["weather_code"][i],
                "temp_max": daily["temperature_2m_max"][i],
                "temp_min": daily["temperature_2m_min"][i],
                "wind_max": daily["wind_speed_10m_max"][i],
                "gusts_max": gusts_max,
                "rain_probability": rain_prob,
                "rain_sum": rain_sum,
                "traffic_light": tl,
            }
        )
    return out


def _analyze_tide(marine: dict) -> dict:
    """Analizza i dati di marea: valore corrente, trend, prossimi picchi.

    Open-Meteo marine fornisce sea_level_height_msl come dato orario.
    Calcoliamo:
    - tide_level_m: valore attuale (ora corrente)
    - tide_trend: "rising" | "falling" | "stable"
    - next_high: { time, level_m } - prossimo massimo locale nelle prossime 24h
    - next_low: { time, level_m } - prossimo minimo locale
    """
    result = {
        "tide_level_m": None,
        "tide_trend": None,
        "next_high": None,
        "next_low": None,
        "tide_available": False,
    }

    hourly = marine.get("hourly") or {}
    levels = hourly.get("sea_level_height_msl") or []
    times = hourly.get("time") or []
    if not levels or not times or len(levels) != len(times):
        return result

    from datetime import datetime

    # Trova indice più vicino all'ora attuale (timezone Europe/Rome del payload)
    now = datetime.now()
    now_iso = now.strftime("%Y-%m-%dT%H:00")
    current_idx = None
    if now_iso in times:
        current_idx = times.index(now_iso)
    else:
        # Trova l'indice più vicino
        for i, t in enumerate(times):
            try:
                dt = datetime.fromisoformat(t)
                if dt >= now:
                    current_idx = max(0, i - 1)
                    break
            except Exception:
                continue
    if current_idx is None or current_idx >= len(levels):
        current_idx = 0

    curr = levels[current_idx]
    if curr is None:
        # prova il primo valore disponibile
        for i, v in enumerate(levels):
            if v is not None:
                curr = v
                current_idx = i
                break

    if curr is None:
        return result

    result["tide_level_m"] = float(curr)
    result["tide_available"] = True

    # Trend: confronta con ora successiva
    trend = "stable"
    for j in range(current_idx + 1, min(current_idx + 4, len(levels))):
        nxt = levels[j]
        if nxt is None:
            continue
        delta = nxt - curr
        if delta > 0.02:
            trend = "rising"
        elif delta < -0.02:
            trend = "falling"
        break
    result["tide_trend"] = trend

    # Trova prossimi picchi (max/min locali) dalle ore future
    future_levels = []
    future_times = []
    for i in range(current_idx, min(current_idx + 48, len(levels))):
        if levels[i] is not None:
            future_levels.append(float(levels[i]))
            future_times.append(times[i])

    if len(future_levels) >= 3:
        for i in range(1, len(future_levels) - 1):
            lv = future_levels[i]
            prev_v = future_levels[i - 1]
            next_v = future_levels[i + 1]
            # Massimo locale
            if result["next_high"] is None and lv > prev_v and lv >= next_v:
                result["next_high"] = {"time": future_times[i], "level_m": lv}
            # Minimo locale
            if result["next_low"] is None and lv < prev_v and lv <= next_v:
                result["next_low"] = {"time": future_times[i], "level_m": lv}
            if result["next_high"] and result["next_low"]:
                break

    return result


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
        "location": "Padova",
        "current": current_clean,
        "wind_alert": (current_clean["wind_gusts"] or 0) > 30,
        "forecast": _build_padova_forecast(daily),
        "traffic_light": traffic,
        "source": {
            "name": "Open-Meteo",
            "url": "https://open-meteo.com/",
            "attribution": "Dati meteo forniti da Open-Meteo (CC-BY 4.0)",
        },
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

    tide = _analyze_tide(marine_data) if marine_data else {
        "tide_level_m": None,
        "tide_trend": None,
        "next_high": None,
        "next_low": None,
        "tide_available": False,
    }

    current_clean = {
        "temperature": w_current.get("temperature_2m"),
        "wind_speed": w_current.get("wind_speed_10m"),
        "wind_direction": w_current.get("wind_direction_10m"),
        "wind_gusts": w_current.get("wind_gusts_10m"),
        "precipitation": w_current.get("precipitation"),
        "wave_height": m_current.get("wave_height"),
        "wave_period": m_current.get("wave_period"),
        "wave_direction": m_current.get("wave_direction"),
        "tide_level_m": tide["tide_level_m"],
        "tide_trend": tide["tide_trend"],
        "tide_next_high": tide["next_high"],
        "tide_next_low": tide["next_low"],
        "tide_available": tide["tide_available"],
    }

    traffic = compute_traffic_light(current_clean, is_marine=True)

    # Forecast combinato weather + marine per giorno
    w_times = w_daily.get("time", []) or []
    m_times = m_daily.get("time", []) or []
    rain_sum_list = w_daily.get("precipitation_sum") or [None] * len(w_times)
    forecast = []
    for i, d in enumerate(w_times):
        gusts_max = w_daily["wind_gusts_10m_max"][i]
        rain_prob = w_daily["precipitation_probability_max"][i]
        rain_sum = rain_sum_list[i] if i < len(rain_sum_list) else None
        wave_max = None
        wave_period = None
        if d in m_times:
            j = m_times.index(d)
            wave_max = (m_daily.get("wave_height_max") or [None])[j] if j < len(m_daily.get("wave_height_max") or []) else None
            wave_period = (m_daily.get("wave_period_max") or [None])[j] if j < len(m_daily.get("wave_period_max") or []) else None
        tl = _daily_traffic_light(
            gusts_max=gusts_max,
            rain_prob=rain_prob,
            rain_sum=rain_sum,
            wave_max=wave_max,
            is_marine=True,
        )
        forecast.append(
            {
                "date": d,
                "weather_code": w_daily["weather_code"][i],
                "temp_max": w_daily["temperature_2m_max"][i],
                "temp_min": w_daily["temperature_2m_min"][i],
                "wind_max": w_daily["wind_speed_10m_max"][i],
                "gusts_max": gusts_max,
                "rain_probability": rain_prob,
                "rain_sum": rain_sum,
                "wave_height_max": wave_max,
                "wave_period_max": wave_period,
                "traffic_light": tl,
            }
        )

    return {
        "location": "Laguna di Venezia",
        "current": current_clean,
        "forecast": forecast,
        "traffic_light": traffic,
        "source": {
            "name": "Open-Meteo",
            "url": "https://open-meteo.com/",
            "attribution": "Dati meteo + marine forniti da Open-Meteo (CC-BY 4.0)",
            "marine_api": "https://marine-api.open-meteo.com/",
        },
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
