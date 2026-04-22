import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.gallery import Photo, PhotoAlbum
from app.models.user import User
from app.schemas.gallery import AlbumCreate, AlbumDetail, AlbumRead, AlbumUpdate, PhotoRead
from app.services.auth import decode_token

router = APIRouter(prefix="/gallery", tags=["gallery"])

UPLOAD_DIR = Path("uploads/photos")
THUMB_DIR = UPLOAD_DIR / "thumbs"
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024

_optional_security = HTTPBearer(auto_error=False)


def _try_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_security),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        user = db.get(User, int(payload["sub"]))
        if user and user.is_active:
            return user
    except Exception:
        return None
    return None


def _album_to_read(a: PhotoAlbum, db: Session) -> AlbumRead:
    photos_count = db.query(Photo).filter(Photo.album_id == a.id).count()
    cover_url = None
    if a.cover_photo_id:
        cover_url = f"/api/gallery/photos/{a.cover_photo_id}/thumb"
    return AlbumRead(
        id=a.id,
        title=a.title,
        description=a.description,
        date=a.date,
        cover_photo_id=a.cover_photo_id,
        created_by=a.created_by,
        is_public=a.is_public,
        created_at=a.created_at,
        updated_at=a.updated_at,
        photos_count=photos_count,
        cover_url=cover_url,
    )


@router.get("/albums/", response_model=list[AlbumRead])
def list_albums(
    public_only: bool = Query(False),
    db: Session = Depends(get_db),
    user: User | None = Depends(_try_current_user),
):
    q = db.query(PhotoAlbum)
    if not user or public_only:
        q = q.filter(PhotoAlbum.is_public == True)
    albums = q.order_by(PhotoAlbum.date.desc().nullslast(), PhotoAlbum.created_at.desc()).all()
    return [_album_to_read(a, db) for a in albums]


@router.get("/albums/{album_id}", response_model=AlbumDetail)
def get_album(
    album_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(_try_current_user),
):
    album = db.get(PhotoAlbum, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album non trovato")
    if not album.is_public and not user:
        raise HTTPException(status_code=403, detail="Accesso negato")

    photos = (
        db.query(Photo)
        .filter(Photo.album_id == album_id)
        .order_by(Photo.created_at)
        .all()
    )
    base = _album_to_read(album, db)
    return AlbumDetail(
        **base.model_dump(),
        photos=[PhotoRead.model_validate(p) for p in photos],
    )


@router.post("/albums/", response_model=AlbumRead, status_code=201)
def create_album(
    body: AlbumCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    album = PhotoAlbum(
        title=body.title,
        description=body.description,
        date=body.date,
        is_public=body.is_public,
        created_by=user.id,
    )
    db.add(album)
    db.commit()
    db.refresh(album)
    return _album_to_read(album, db)


def _check_album_perm(album: PhotoAlbum, user: User) -> None:
    if user.role != "admin" and album.created_by != user.id:
        raise HTTPException(status_code=403, detail="Permessi insufficienti")


@router.patch("/albums/{album_id}", response_model=AlbumRead)
def update_album(
    album_id: int,
    body: AlbumUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    album = db.get(PhotoAlbum, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album non trovato")
    _check_album_perm(album, user)

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(album, k, v)
    db.commit()
    db.refresh(album)
    return _album_to_read(album, db)


@router.delete("/albums/{album_id}", status_code=204)
def delete_album(
    album_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    album = db.get(PhotoAlbum, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album non trovato")
    _check_album_perm(album, user)

    # Remove files
    for p in album.photos:
        for rel in (p.filename, p.thumbnail):
            if rel:
                fp = Path(rel)
                if fp.exists():
                    try:
                        fp.unlink()
                    except OSError:
                        pass

    db.delete(album)
    db.commit()


@router.post("/albums/{album_id}/photos", response_model=list[PhotoRead])
async def upload_photos(
    album_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    album = db.get(PhotoAlbum, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album non trovato")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)

    try:
        from PIL import Image
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Libreria Pillow non installata sul server",
        )

    created: list[Photo] = []
    for file in files:
        if file.content_type not in ALLOWED:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo file non ammesso: {file.content_type}",
            )
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise HTTPException(
                status_code=400, detail=f"File troppo grande (max 10 MB): {file.filename}"
            )

        ext = Path(file.filename or "").suffix or ".jpg"
        uid = uuid.uuid4().hex
        fname = f"{uid}{ext}"
        fpath = UPLOAD_DIR / fname
        fpath.write_bytes(content)

        thumb_name = f"{uid}_thumb.jpg"
        thumb_path = THUMB_DIR / thumb_name
        try:
            img = Image.open(fpath)
            img.thumbnail((300, 300))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            img.save(thumb_path, "JPEG", quality=85)
            thumb_rel = str(thumb_path).replace("\\", "/")
        except Exception:
            thumb_rel = None

        photo = Photo(
            album_id=album_id,
            filename=str(fpath).replace("\\", "/"),
            thumbnail=thumb_rel,
            caption=None,
            uploaded_by=user.id,
        )
        db.add(photo)
        created.append(photo)

    db.commit()
    for p in created:
        db.refresh(p)
    return [PhotoRead.model_validate(p) for p in created]


@router.get("/photos/{photo_id}/view")
def view_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(_try_current_user),
):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    album = db.get(PhotoAlbum, photo.album_id)
    if not album.is_public and not user:
        raise HTTPException(status_code=403, detail="Accesso negato")
    fp = Path(photo.filename)
    if not fp.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(str(fp))


@router.get("/photos/{photo_id}/thumb")
def thumb_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(_try_current_user),
):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    album = db.get(PhotoAlbum, photo.album_id)
    if not album.is_public and not user:
        raise HTTPException(status_code=403, detail="Accesso negato")
    path = photo.thumbnail or photo.filename
    fp = Path(path)
    if not fp.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(str(fp))


@router.delete("/photos/{photo_id}", status_code=204)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Foto non trovata")
    if user.role != "admin" and photo.uploaded_by != user.id:
        raise HTTPException(status_code=403, detail="Permessi insufficienti")

    for rel in (photo.filename, photo.thumbnail):
        if rel:
            fp = Path(rel)
            if fp.exists():
                try:
                    fp.unlink()
                except OSError:
                    pass

    # Se era cover, azzera
    album = db.get(PhotoAlbum, photo.album_id)
    if album and album.cover_photo_id == photo.id:
        album.cover_photo_id = None

    db.delete(photo)
    db.commit()


@router.post("/albums/{album_id}/set-cover/{photo_id}", response_model=AlbumRead)
def set_cover(
    album_id: int,
    photo_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    album = db.get(PhotoAlbum, album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album non trovato")
    _check_album_perm(album, user)
    photo = db.get(Photo, photo_id)
    if not photo or photo.album_id != album_id:
        raise HTTPException(status_code=404, detail="Foto non trovata nell'album")
    album.cover_photo_id = photo_id
    db.commit()
    db.refresh(album)
    return _album_to_read(album, db)
