import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { galleryApi } from "../api/services";
import { getErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import { S, colors, fonts, formatDate } from "../styles/theme";
import { useIsMobile } from "../hooks/useMediaQuery";

function Banner({ kind = "ok", children }) {
  const color = kind === "ok" ? colors.green : colors.red;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: `${color}15`,
        color,
        border: `1px solid ${color}44`,
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

export default function GalleryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openAlbum, setOpenAlbum] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await galleryApi.listAlbums();
      setAlbums(data);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e, "Errore caricamento"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeAlbum = async (album) => {
    if (!window.confirm(`Eliminare l'album "${album.title}" e tutte le sue foto?`)) return;
    try {
      await galleryApi.removeAlbum(album.id);
      load();
    } catch (e) {
      alert(getErrorMessage(e, "Errore eliminazione"));
    }
  };

  return (
    <div style={{ ...S.container, padding: isMobile ? "16px 12px" : "32px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          marginBottom: 20,
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ ...S.title, fontSize: isMobile ? 24 : 30 }}>Gallery</h1>
          <div style={S.subtitle}>{albums.length} album • foto delle uscite ed eventi</div>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{ ...S.btn, ...S.btnGold, color: colors.deep, width: isMobile ? "100%" : "auto" }}
        >
          + Nuovo album
        </button>
      </div>

      {error && <Banner kind="err">{error}</Banner>}

      {loading ? (
        <div style={{ color: colors.muted }}>Caricamento…</div>
      ) : albums.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: colors.muted, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          Nessun album. Crea il primo!
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
            gap: isMobile ? 10 : 18,
          }}
        >
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              onOpen={() => setOpenAlbum(a)}
              isAdmin={isAdmin}
              canManage={isAdmin || a.created_by === user?.id}
              onEdit={() => setEditing(a)}
              onDelete={() => removeAlbum(a)}
            />
          ))}
        </div>
      )}

      {creating && (
        <AlbumFormModal
          title="Nuovo album"
          initial={{ title: "", description: "", date: new Date().toISOString().split("T")[0] }}
          onClose={() => setCreating(false)}
          onSave={async (form) => {
            await galleryApi.createAlbum(form);
            setCreating(false);
            load();
          }}
        />
      )}

      {editing && (
        <AlbumFormModal
          title="Modifica album"
          initial={{
            title: editing.title || "",
            description: editing.description || "",
            date: editing.date || "",
          }}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            await galleryApi.updateAlbum(editing.id, form);
            setEditing(null);
            load();
          }}
        />
      )}

      {openAlbum && (
        <AlbumDetailModal
          albumId={openAlbum.id}
          user={user}
          isAdmin={isAdmin}
          onClose={() => {
            setOpenAlbum(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AlbumCard({ album, onOpen, isAdmin, canManage, onEdit, onDelete }) {
  const coverUrl = album.cover_photo_id
    ? `/api/gallery/photos/${album.cover_photo_id}/thumb`
    : null;
  return (
    <div
      style={{
        ...S.cardElevated,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "transform .15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      onClick={onOpen}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          background: coverUrl
            ? `url(${coverUrl}) center/cover no-repeat`
            : colors.gradHero,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.muted,
          fontSize: 48,
        }}
      >
        {!coverUrl && "📸"}
      </div>
      <div style={{ padding: 14 }}>
        <div
          style={{
            fontFamily: fonts.display,
            color: colors.foam,
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 4,
          }}
        >
          {album.title}
        </div>
        <div style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
          {album.date && <>📅 {formatDate(album.date)} • </>}
          🖼 {album.photo_count || 0} foto
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                ...S.btnSmall,
                background: `${colors.lagoon}22`,
                color: colors.lagoon,
              }}
            >
              Modifica
            </button>
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{ ...S.btnSmall, ...S.btnRed }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AlbumFormModal({ title, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.title.trim()) {
      setErr("Titolo obbligatorio");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, date: form.date || null });
    } catch (e) {
      setErr(getErrorMessage(e, "Errore salvataggio"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      {err && <Banner kind="err">{err}</Banner>}
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={S.label}>Titolo *</label>
          <input
            style={S.input}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <label style={S.label}>Data</label>
          <input
            type="date"
            style={S.input}
            value={form.date || ""}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div>
          <label style={S.label}>Descrizione</label>
          <textarea
            style={{ ...S.input, minHeight: 70, resize: "vertical", fontFamily: fonts.body }}
            value={form.description || ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ ...S.btn, ...S.btnGhost, flex: 1 }}>
          Annulla
        </button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, flex: 2 }}>
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </Modal>
  );
}

function AlbumDetailModal({ albumId, user, isAdmin, onClose }) {
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await galleryApi.getAlbum(albumId);
      setAlbum(data);
      setError("");
    } catch (e) {
      setError(getErrorMessage(e, "Errore"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [albumId]);

  const photos = album?.photos || [];

  const uploadFiles = useCallback(
    async (files) => {
      const arr = Array.from(files || []);
      if (arr.length === 0) return;
      setUploading(true);
      setUploadMsg("");
      try {
        await galleryApi.uploadPhotos(albumId, arr);
        setUploadMsg(`${arr.length} foto caricate ✓`);
        load();
        setTimeout(() => setUploadMsg(""), 2000);
      } catch (e) {
        setUploadMsg(getErrorMessage(e, "Errore upload"));
      } finally {
        setUploading(false);
      }
    },
    // eslint-disable-next-line
    [albumId]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  const removePhoto = async (photo) => {
    if (!window.confirm("Eliminare questa foto?")) return;
    try {
      await galleryApi.removePhoto(photo.id);
      setLightbox(null);
      load();
    } catch (e) {
      alert(getErrorMessage(e, "Errore"));
    }
  };

  const setCover = async (photo) => {
    try {
      await galleryApi.setCover(albumId, photo.id);
      setUploadMsg("Copertina aggiornata ✓");
      setTimeout(() => setUploadMsg(""), 1500);
      load();
    } catch (e) {
      alert(getErrorMessage(e, "Errore"));
    }
  };

  const canDeletePhoto = (photo) =>
    isAdmin || photo.uploaded_by === user?.id;

  return (
    <>
      <Modal title={album?.title || "Album"} onClose={onClose} maxWidth={1000}>
        {error && <Banner kind="err">{error}</Banner>}
        {album?.description && (
          <p style={{ color: colors.muted, fontSize: 14, marginTop: 0 }}>
            {album.description}
          </p>
        )}
        {album?.date && (
          <div style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
            📅 {formatDate(album.date)}
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? colors.lagoon : colors.border}`,
            borderRadius: 14,
            padding: "22px 16px",
            textAlign: "center",
            background: dragOver ? `${colors.lagoon}10` : colors.panel,
            cursor: "pointer",
            marginBottom: 16,
            transition: "all .15s ease",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 6 }}>⬆</div>
          <div style={{ color: colors.foam, fontWeight: 600, fontSize: 14 }}>
            {uploading
              ? "Caricamento in corso…"
              : "Trascina le foto qui, oppure clicca per selezionare"}
          </div>
          <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            Puoi caricare più file contemporaneamente
          </div>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </div>

        {uploadMsg && <Banner kind="ok">{uploadMsg}</Banner>}

        {loading ? (
          <div style={{ color: colors.muted }}>Caricamento…</div>
        ) : photos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: colors.muted,
              padding: 30,
              fontStyle: "italic",
            }}
          >
            Ancora nessuna foto in questo album.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 6,
            }}
          >
            {photos.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => setLightbox({ index: idx })}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: `url(/api/gallery/photos/${p.id}/thumb) center/cover no-repeat`,
                  border: `1px solid ${colors.borderSoft}`,
                  transition: "transform .15s ease",
                  position: "relative",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.03)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {album?.cover_photo_id === p.id && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      background: colors.gold,
                      color: "#fff",
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    ⭐ Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {lightbox && photos.length > 0 && (
        <Lightbox
          photos={photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() =>
            setLightbox({ index: (lightbox.index - 1 + photos.length) % photos.length })
          }
          onNext={() =>
            setLightbox({ index: (lightbox.index + 1) % photos.length })
          }
          onDelete={
            canDeletePhoto(photos[lightbox.index])
              ? () => removePhoto(photos[lightbox.index])
              : null
          }
          onSetCover={isAdmin ? () => setCover(photos[lightbox.index]) : null}
        />
      )}
    </>
  );
}

function Lightbox({ photos, index, onClose, onPrev, onNext, onDelete, onSetCover }) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext, onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 20,
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 20,
          cursor: "pointer",
        }}
      >
        ×
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        style={navBtnStyle("left")}
      >
        ‹
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <img
          src={`/api/gallery/photos/${photo.id}/view`}
          alt={photo.caption || ""}
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            objectFit: "contain",
            borderRadius: 8,
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        />
        <div
          style={{
            color: "#fff",
            fontSize: 13,
            textAlign: "center",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span>
            {index + 1} / {photos.length}
          </span>
          {photo.caption && <span>· {photo.caption}</span>}
          {onSetCover && (
            <button
              onClick={onSetCover}
              style={{
                ...S.btnSmall,
                ...S.btnGold,
                color: "#fff",
              }}
            >
              ⭐ Imposta come cover
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} style={{ ...S.btnSmall, ...S.btnRed }}>
              ✕ Elimina
            </button>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        style={navBtnStyle("right")}
      >
        ›
      </button>
    </div>
  );
}

const navBtnStyle = (side) => ({
  position: "absolute",
  [side]: 20,
  top: "50%",
  transform: "translateY(-50%)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "none",
  borderRadius: "50%",
  width: 48,
  height: 48,
  fontSize: 32,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
});
