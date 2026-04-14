from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, boats, bookings, contact, members


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Remiera Zonca API",
    version="0.1.0",
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
