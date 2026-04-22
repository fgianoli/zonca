from datetime import date as _date, datetime

from pydantic import BaseModel, computed_field


class PhotoRead(BaseModel):
    id: int
    album_id: int
    filename: str
    thumbnail: str | None
    caption: str | None
    uploaded_by: int | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def url(self) -> str:
        return f"/api/gallery/photos/{self.id}/view"

    @computed_field
    @property
    def thumb_url(self) -> str:
        return f"/api/gallery/photos/{self.id}/thumb"


class AlbumCreate(BaseModel):
    title: str
    description: str | None = None
    date: _date | None = None
    is_public: bool = False


class AlbumUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    date: _date | None = None
    is_public: bool | None = None
    cover_photo_id: int | None = None


class AlbumRead(BaseModel):
    id: int
    title: str
    description: str | None
    date: _date | None
    cover_photo_id: int | None
    created_by: int | None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    photos_count: int = 0
    cover_url: str | None = None

    model_config = {"from_attributes": True}


class AlbumDetail(AlbumRead):
    photos: list[PhotoRead] = []
