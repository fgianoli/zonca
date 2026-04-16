import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/weather", tags=["weather"])

PADOVA_LAT = 45.4064
PADOVA_LON = 11.8768


@router.get("/current")
async def current_weather():
    """Fetch current weather + 3-day forecast for Padova."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": PADOVA_LAT,
                "longitude": PADOVA_LON,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max",
                "timezone": "Europe/Rome",
                "forecast_days": 3,
            },
        )
        data = resp.json()

    # Build a clean response
    current = data.get("current", {})
    daily = data.get("daily", {})

    # Wind alert: gusts > 30 km/h
    wind_alert = current.get("wind_gusts_10m", 0) > 30

    return {
        "current": {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "weather_code": current.get("weather_code"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "wind_gusts": current.get("wind_gusts_10m"),
        },
        "wind_alert": wind_alert,
        "forecast": [
            {
                "date": daily["time"][i],
                "weather_code": daily["weather_code"][i],
                "temp_max": daily["temperature_2m_max"][i],
                "temp_min": daily["temperature_2m_min"][i],
                "wind_max": daily["wind_speed_10m_max"][i],
                "gusts_max": daily["wind_gusts_10m_max"][i],
                "rain_probability": daily["precipitation_probability_max"][i],
            }
            for i in range(len(daily.get("time", [])))
        ],
    }
