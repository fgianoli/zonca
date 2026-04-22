import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import attendance, auth, backups, boats, bookings, circulars, contact, crews, dashboard, documents, email_templates, events, exports, fees, finance, gallery, gdpr, ical, invoices, maintenance, members, settings, users, weather
from app.services.backup import backup_loop
from app.services.reminders import reminder_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Avvia lo scheduler promemoria certificati medici in background
    reminder_task = asyncio.create_task(reminder_loop())
    # Avvia lo scheduler di backup automatico del DB
    backup_task = asyncio.create_task(backup_loop())
    yield
    reminder_task.cancel()
    backup_task.cancel()


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
app.include_router(fees.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(circulars.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(ical.router, prefix="/api")
app.include_router(backups.router, prefix="/api")
app.include_router(crews.router, prefix="/api")
app.include_router(gallery.router, prefix="/api")
app.include_router(email_templates.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(gdpr.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
