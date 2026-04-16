# Remiera Zonca - Gestionale Barche

Gestionale web per la **Scuola Padovana di Voga alla Veneta "Vittorio Zonca"**.

Permette di gestire la flotta, i soci, e le prenotazioni delle uscite in barca dalla remiera di Bastione dell'Arena a Padova.

## Funzionalità

- **Calendario settimanale** con 8 slot giornalieri per prenotare le uscite
- **Gestione flotta**: mascarete, sandoli, gondolini, caorline
- **Gestione soci** con ruoli voga veneta (Pope, Paron, Provin, Ospite)
- **Certificato medico**: scadenza, upload file (PDF/JPEG/PNG), download
- **Quota sociale**: tracciamento pagamento per anno
- **Promemoria automatici**: email 30 giorni prima della scadenza del certificato medico
- **Prenotazioni** con conferma da parte di Pope/Admin
- **Autenticazione JWT** con 3 livelli: Admin, Pope, Socio
- **Impostazioni SMTP** configurabili da interfaccia admin
- **Form di contatto** con invio email via SMTP
- **Download modulo adesione** socio (PDF)

## Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + PostGIS |
| ORM | SQLAlchemy 2 + Alembic |
| Auth | JWT (access + refresh token) |
| Email | SMTP OVH via aiosmtplib |
| Deploy | Docker Compose + Portainer |

## Quick start

### 1. Clona e configura

```bash
git clone https://github.com/fgianoli/zonca.git
cd zonca
cp .env.example .env
# Edita .env con le tue credenziali
```

### 2. Avvia con Docker Compose

```bash
docker compose up -d --build
```

### 3. Migrazione database

```bash
docker exec -it zonca-api bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

### 4. Crea utente admin

```bash
docker exec -it zonca-api python -c "
from app.database import SessionLocal
from app.models.user import User
from app.services.auth import hash_password
db = SessionLocal()
admin = User(email='admin@scuolazonca.it', password_hash=hash_password('changeme'), role='admin')
db.add(admin)
db.commit()
print('Admin creato!')
"
```

### 5. Accedi

- **Frontend**: http://localhost
- **API docs (Swagger)**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/api/health

## Sviluppo locale (senza Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Il dev server Vite su `:5173` fa proxy automatico di `/api` verso il backend su `:8000`.

## Struttura progetto

```
zonca/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   ├── database.py      # SQLAlchemy
│   │   ├── models/          # User, Member, Boat, Booking, AppSetting
│   │   ├── schemas/         # Pydantic validation
│   │   ├── api/             # REST endpoints
│   │   └── services/        # Auth, Email, Reminders (scheduler)
│   └── alembic/             # Migrazioni DB
└── frontend/
    ├── src/
    │   ├── components/       # ContactForm, DownloadAdesione
    │   ├── context/          # AuthContext (JWT)
    │   ├── api/              # Axios client
    │   └── styles/           # Theme veneziano
    └── nginx.conf            # Reverse proxy per /api
```

## Schema database

6 tabelle: `users` (auth), `members` (soci con certificato medico e quota), `boats` (flotta), `bookings` (prenotazioni), `booking_participants` (M:N), `app_settings` (configurazioni SMTP/promemoria).

Vincolo `UNIQUE(date, slot, boat_id)` per impedire doppie prenotazioni sullo stesso slot.

## Ruoli e permessi

| Azione | Admin | Pope | Socio |
|--------|-------|------|-------|
| Gestire barche e soci | ✓ | | |
| Confermare prenotazioni | ✓ | ✓ | |
| Creare prenotazioni | ✓ | ✓ | ✓ |
| Cancellare (solo proprie) | ✓ | ✓ | ✓ |
| Upload certificato medico | ✓ | proprio | proprio |
| Configurare SMTP/promemoria | ✓ | | |

## API endpoints

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, ritorna JWT |
| POST | `/api/auth/register` | Registra utente (admin) |
| GET | `/api/auth/me` | Utente corrente |
| GET/POST | `/api/members/` | Lista / crea soci |
| GET/POST | `/api/boats/` | Lista / crea barche |
| GET/POST | `/api/bookings/` | Lista / crea prenotazioni |
| POST | `/api/bookings/{id}/confirm` | Conferma (pope/admin) |
| POST | `/api/members/{id}/medical-cert` | Upload certificato medico |
| GET | `/api/members/{id}/medical-cert` | Download certificato medico |
| GET/PATCH | `/api/settings/smtp` | Leggi/aggiorna impostazioni SMTP |
| POST | `/api/contact/` | Form contatto → email |

## Licenza

[Apache License 2.0](LICENSE)

## Contatti

**Scuola Padovana di Voga alla Veneta "Vittorio Zonca"**
Golena del Bastione dell'Arena - Corso Garibaldi, 41 - 35131 Padova
scuolazonca@gmail.com | tel. 347 084 1787
