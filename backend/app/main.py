import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, boats, bookings, contact, members, settings
from app.services.reminders import reminder_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Avvia lo scheduler promemoria certificati medici in background
    task = asyncio.create_task(reminder_loop())
    yield
    task.cancel()


app = FastAPI(
    title="Remiera Zonca API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(members.router, prefix="/api")
app.include_router(boats.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
