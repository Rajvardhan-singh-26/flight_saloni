import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Snackbar,
  TextField,
  type TextFieldProps,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import LinkIcon from '@mui/icons-material/LinkOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  createAircraft,
  fetchAircraftById,
  notifyAircraftChanged,
  updateAircraft,
  uploadAircraftImage,
  type AircraftFieldsPayload,
} from '../api/client';
import { formatMoney } from '../hooks/usePricing';
import { AIRCRAFT_CATEGORIES, CURRENCIES, MAX_GALLERY_IMAGES, type Aircraft, type GalleryImage } from '../types';
import { cardSx, GOLD, LINK_BLUE, NAVY, NAVY_DEEP, SERIF } from '../theme';

const BLANK_AIRCRAFT: Aircraft = {
  id: 'new',
  name: '',
  manufacturer: '',
  category: '',
  hourly_rate: 0,
  max_passengers: 1,
  max_range_nm: 0,
  cruise_speed_kt: 0,
  image: '',
  accent: '#2d67b2',
  description: '',
  gallery: [],
};

export default function AircraftDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const location = useLocation();
  const hasBackground = Boolean((location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);

  const [nameDraft, setNameDraft] = useState('');
  const [manufacturerDraft, setManufacturerDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [passengersInput, setPassengersInput] = useState('1');
  const [rangeInput, setRangeInput] = useState('0');
  const [speedInput, setSpeedInput] = useState('0');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [rateInput, setRateInput] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [heroDraft, setHeroDraft] = useState('');
  const [heroUrlInput, setHeroUrlInput] = useState('');
  const [galleryDraft, setGalleryDraft] = useState<GalleryImage[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [snack, setSnack] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const resetDraftsFrom = (a: Aircraft) => {
    setNameDraft(a.name);
    setManufacturerDraft(a.manufacturer);
    setCategoryDraft(a.category);
    setPassengersInput(String(a.max_passengers));
    setRangeInput(String(a.max_range_nm));
    setSpeedInput(String(a.cruise_speed_kt));
    setDescriptionDraft(a.description);
    setRateInput(String(a.hourly_rate));
    setHeroDraft(a.image);
    setHeroUrlInput('');
    setGalleryDraft(a.gallery);
    setUrlInput('');
  };

  useEffect(() => {
    if (!id) return;
    if (isNew) {
      setAircraft(BLANK_AIRCRAFT);
      resetDraftsFrom(BLANK_AIRCRAFT);
      setEditing(true);
      setLoading(false);
      return;
    }
    fetchAircraftById(id)
      .then((a) => {
        setAircraft(a);
        resetDraftsFrom(a);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEdit = () => {
    if (!aircraft) return;
    resetDraftsFrom(aircraft);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (isNew) {
      handleClose();
      return;
    }
    if (!aircraft) return;
    resetDraftsFrom(aircraft);
    setEditing(false);
  };

  // Going back keeps the page behind the popup exactly as it was; a direct
  // visit has no history to pop, so fall back to the quote page.
  function handleClose() {
    // Going back restores whatever page was behind the popup; a direct visit
    // has no history to pop, so fall back to the fleet list.
    if (hasBackground) navigate(-1);
    else navigate('/aircraft');
  }

  const handleFilePick = () => fileInputRef.current?.click();
  const handleHeroFilePick = () => heroFileInputRef.current?.click();

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    setHeroUploading(true);
    try {
      const { path } = await uploadAircraftImage(id, file);
      setHeroDraft(path);
    } catch {
      setSnack('Upload failed — check the file is an image under 5MB.');
    } finally {
      setHeroUploading(false);
    }
  };

  const handleSetHeroUrl = () => {
    const value = heroUrlInput.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (!parsed.protocol.startsWith('http')) throw new Error('invalid');
    } catch {
      setSnack('Enter a valid image URL starting with http:// or https://');
      return;
    }
    setHeroDraft(value);
    setHeroUrlInput('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    if (galleryDraft.length >= MAX_GALLERY_IMAGES) {
      setSnack(`Gallery is limited to ${MAX_GALLERY_IMAGES} images.`);
      return;
    }
    setUploading(true);
    try {
      const { path } = await uploadAircraftImage(id, file);
      setGalleryDraft((g) => [...g, { url: path, caption: '' }]);
    } catch {
      setSnack('Upload failed — check the file is an image under 5MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    const value = urlInput.trim();
    if (!value) return;
    if (galleryDraft.length >= MAX_GALLERY_IMAGES) {
      setSnack(`Gallery is limited to ${MAX_GALLERY_IMAGES} images.`);
      return;
    }
    try {
      const parsed = new URL(value);
      if (!parsed.protocol.startsWith('http')) throw new Error('invalid');
    } catch {
      setSnack('Enter a valid image URL starting with http:// or https://');
      return;
    }
    setGalleryDraft((g) => [...g, { url: value, caption: '' }]);
    setUrlInput('');
  };

  const removeImage = (index: number) => {
    setGalleryDraft((g) => g.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    setGalleryDraft((g) => g.map((item, i) => (i === index ? { ...item, caption } : item)));
  };

  const handleSave = async () => {
    if (isNew && !nameDraft.trim()) {
      setSnack('Enter an aircraft name before saving.');
      return;
    }
    if (!id) return;
    setSaving(true);
    const payload: AircraftFieldsPayload = {
      name: nameDraft.trim(),
      manufacturer: manufacturerDraft,
      category: categoryDraft,
      hourly_rate: Number(rateInput) || 0,
      max_passengers: Number(passengersInput) || 0,
      max_range_nm: Number(rangeInput) || 0,
      cruise_speed_kt: Number(speedInput) || 0,
      description: descriptionDraft,
      image: heroDraft,
      gallery: galleryDraft,
    };
    try {
      if (isNew) {
        const created = await createAircraft({ ...payload, name: payload.name! });
        notifyAircraftChanged();
        setAircraft(created);
        setEditing(false);
        setSnack('Aircraft added — it now appears in the selection carousel.');
        navigate(`/aircraft/${created.id}`, { replace: true, state: location.state });
      } else {
        const updated = await updateAircraft(id, payload);
        notifyAircraftChanged();
        setAircraft(updated);
        setEditing(false);
        setSnack('Saved — this will appear in the carousel and every future quotation.');
      }
    } catch {
      setSnack(isNew ? 'Could not add the aircraft — is the backend running on port 8000?' : 'Save failed — is the backend running on port 8000?');
    } finally {
      setSaving(false);
    }
  };

  const title = isNew ? 'Add New Aircraft' : aircraft ? `${aircraft.manufacturer} ${aircraft.name}`.trim() || aircraft.name : 'Aircraft Details';

  // Live preview values for the hero caption — reflect drafts while editing.
  const capCategory = editing ? categoryDraft : aircraft?.category ?? '';
  const capManufacturer = editing ? manufacturerDraft : aircraft?.manufacturer ?? '';
  const capName = editing ? nameDraft : aircraft?.name ?? '';
  const capPax = editing ? Number(passengersInput) || 0 : aircraft?.max_passengers ?? 0;
  const capRange = editing ? Number(rangeInput) || 0 : aircraft?.max_range_nm ?? 0;
  const capSpeed = editing ? Number(speedInput) || 0 : aircraft?.cruise_speed_kt ?? 0;

  // Whether the current gallery count satisfies the PDF's display rule
  // (minimum 2, even number) — drives the side note's color/icon/message.
  const galleryCount = (editing ? galleryDraft : aircraft?.gallery ?? []).length;
  const galleryWillShow = galleryCount >= 2 && galleryCount % 2 === 0;
  const galleryStatus =
    galleryCount === 0 ? 'neutral' : galleryWillShow ? 'ok' : 'warning';

  // Drag-to-move: pointerdown on the header grabs the popup's own Paper
  // element (via ref) and pins it to `position: fixed` at the pointer, so it
  // can be dragged anywhere instead of staying locked to the centered spot.
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return; // let the close button work normally
    const paper = paperRef.current;
    if (!paper) return;
    const rect = paper.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    paper.style.position = 'fixed';
    paper.style.margin = '0';
    paper.style.left = `${rect.left}px`;
    paper.style.top = `${rect.top}px`;
    document.body.style.userSelect = 'none';

    const minVisible = 80;
    const onMove = (ev: PointerEvent) => {
      const left = Math.min(Math.max(ev.clientX - offsetX, minVisible - rect.width), window.innerWidth - minVisible);
      const top = Math.min(Math.max(ev.clientY - offsetY, 0), window.innerHeight - minVisible);
      paper.style.left = `${left}px`;
      paper.style.top = `${top}px`;
    };
    const onUp = () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <Dialog
      open
      onClose={handleClose}
      scroll="paper"
      slotProps={{
        paper: {
          ref: paperRef,
          sx: {
            width: 760,
            height: '92vh',
            maxWidth: '96vw',
            maxHeight: '96vh',
            minWidth: 420,
            minHeight: 320,
            borderRadius: 3,
            boxShadow: '0 30px 80px rgba(11,23,48,0.35)',
            // Native browser resize handle in the bottom-right corner.
            resize: 'both',
            overflow: 'hidden',
          },
        },
        // 30% scrim instead of MUI's default 50% black, so the quote page
        // behind the popup stays clearly visible through it.
        backdrop: { sx: { bgcolor: 'rgba(11,23,48,0.30)' } },
      }}
    >
      {/* Popup header — drag handle for repositioning, plus close button */}
      <Box
        onPointerDown={handleDragStart}
        sx={{
          bgcolor: NAVY,
          px: 3,
          py: 1.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${GOLD}`,
          flexShrink: 0,
          cursor: 'move',
          touchAction: 'none',
        }}
      >
        <Typography sx={{ color: '#fff', fontWeight: 700, fontFamily: SERIF, fontSize: 19 }}>{title}</Typography>
        <IconButton onClick={handleClose} aria-label="Close" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={28} sx={{ color: GOLD }} />
          </Box>
        )}

        {!loading && (notFound || !aircraft) && (
          <Box sx={{ p: 4 }}>
            <Typography sx={{ color: 'text.secondary' }}>Aircraft not found.</Typography>
          </Box>
        )}

        {!loading && aircraft && (
          <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Hero */}
            <Box sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative', boxShadow: '0 10px 36px rgba(11,23,48,0.14)' }}>
              {(editing ? heroDraft : aircraft.image) ? (
                <Box
                  component="img"
                  src={editing ? heroDraft : aircraft.image}
                  alt={capName || 'Aircraft'}
                  sx={{ width: '100%', height: { xs: 200, md: 300 }, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box sx={{ width: '100%', height: { xs: 200, md: 300 }, bgcolor: '#e6eaf0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#9aa3af', fontSize: 13, fontStyle: 'italic' }}>No photo yet</Typography>
                </Box>
              )}
              {editing && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'rgba(11,23,48,0.82)',
                    px: 2.5,
                    py: 1.5,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <input ref={heroFileInputRef} type="file" accept="image/*" hidden onChange={handleHeroFileChange} />
                  <Button
                    onClick={handleHeroFilePick}
                    disabled={heroUploading}
                    startIcon={heroUploading ? <CircularProgress size={14} /> : <PhotoCameraOutlinedIcon sx={{ fontSize: 18 }} />}
                    size="small"
                    sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
                  >
                    {isNew ? 'Add Main Photo' : 'Change Main Photo'}
                  </Button>
                  <TextField
                    placeholder="Or paste image URL"
                    size="small"
                    value={heroUrlInput}
                    onChange={(e) => setHeroUrlInput(e.target.value)}
                    sx={{ maxWidth: 240, bgcolor: '#fff', borderRadius: 1 }}
                    slotProps={{ input: { startAdornment: <LinkIcon sx={{ fontSize: 16, color: '#9aa3af', mr: 0.8 }} /> } }}
                  />
                  <Button
                    onClick={handleSetHeroUrl}
                    variant="outlined"
                    size="small"
                    sx={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
                  >
                    Set
                  </Button>
                </Box>
              )}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'rgba(11,23,48,0.88)',
                  px: 2.5,
                  py: 1.5,
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                }}
              >
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: GOLD, letterSpacing: 1 }}>
                  {(capCategory || '—').toUpperCase()}
                </Typography>
                <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  {capManufacturer || capName ? `${capManufacturer} ${capName}`.trim() : 'Untitled Aircraft'}
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#c8d0dc' }}>
                  {capPax} pax · {capRange.toLocaleString()} nm · {capSpeed} kt
                </Typography>
              </Box>
            </Box>

            {/* Aircraft details: name, manufacturer, category, specs, description — all editable */}
            <Box sx={cardSx}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>
                  Aircraft Details
                </Typography>
                {!editing && (
                  <Button
                    onClick={startEdit}
                    startIcon={<EditIcon sx={{ fontSize: 18 }} />}
                    sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
                  >
                    Edit Details
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2.2 }}>
                <FieldBlock label="Aircraft Name">
                  {editing ? (
                    <BlueField
                      fullWidth
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="e.g. Citation CJ3+"
                    />
                  ) : (
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{aircraft.name || '—'}</Typography>
                  )}
                </FieldBlock>

                <FieldBlock label="Manufacturer">
                  {editing ? (
                    <BlueField
                      fullWidth
                      value={manufacturerDraft}
                      onChange={(e) => setManufacturerDraft(e.target.value)}
                      placeholder="e.g. Cessna"
                    />
                  ) : (
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{aircraft.manufacturer || '—'}</Typography>
                  )}
                </FieldBlock>

                <FieldBlock label="Category">
                  {editing ? (
                    <BlueField select fullWidth value={categoryDraft} onChange={(e) => setCategoryDraft(e.target.value)}>
                      <MenuItem value="">
                        <em>Select category</em>
                      </MenuItem>
                      {AIRCRAFT_CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </BlueField>
                  ) : (
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{aircraft.category || '—'}</Typography>
                  )}
                </FieldBlock>

                <FieldBlock label="Passengers · Range (nm) · Speed (kt)">
                  {editing ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <BlueField
                        type="number"
                        value={passengersInput}
                        onChange={(e) => setPassengersInput(e.target.value)}
                        slotProps={{ htmlInput: { min: 1 } }}
                      />
                      <BlueField
                        type="number"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                      <BlueField
                        type="number"
                        value={speedInput}
                        onChange={(e) => setSpeedInput(e.target.value)}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                      {aircraft.max_passengers} pax · {aircraft.max_range_nm.toLocaleString()} nm · {aircraft.cruise_speed_kt} kt
                    </Typography>
                  )}
                </FieldBlock>
              </Box>

              <FieldBlock label="Description">
                {editing ? (
                  <BlueField
                    fullWidth
                    multiline
                    minRows={2}
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    placeholder="A short client-facing description of this aircraft…"
                  />
                ) : (
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.7 }}>
                    {aircraft.description || '—'}
                  </Typography>
                )}
              </FieldBlock>
            </Box>

            {/* Rate + gallery */}
            <Box sx={cardSx}>
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>
                  Pricing &amp; Gallery
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.3 }}>
                  {isNew
                    ? 'This will be added to the fleet catalogue and available for every future quotation.'
                    : 'Editing here updates the fleet catalogue and every future quotation.'}
                </Typography>
              </Box>

              {/* Hourly rate */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: GOLD, textTransform: 'uppercase' }}>
                    Hourly Rate
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    sx={{ minWidth: 110 }}
                  >
                    {CURRENCIES.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                {editing ? (
                  <BlueField
                    type="number"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    slotProps={{ htmlInput: { min: 0 } }}
                    sx={{ maxWidth: 220 }}
                  />
                ) : (
                  <Typography sx={{ fontWeight: 800, fontSize: 22, color: 'text.primary' }}>
                    {formatMoney(aircraft.hourly_rate, currency)}
                    <Box component="span" sx={{ fontWeight: 500, fontSize: 13, color: 'text.secondary' }}> /hr</Box>
                  </Typography>
                )}
              </Box>

              {/* Gallery, with a rule reminder alongside it */}
              <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 420px', minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: GOLD, textTransform: 'uppercase', mb: 1 }}>
                    Gallery ({(editing ? galleryDraft : aircraft.gallery).length}/{MAX_GALLERY_IMAGES})
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
                    These images appear below the main photo in the quotation PDF.
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      // Columns match the actual photo count (capped at 4), the
                      // same rule QuotePreview and the PDF use — otherwise a
                      // 2-image gallery gets squeezed into a leftover half of a
                      // 4-column grid and looks nothing like the other views.
                      gridTemplateColumns: {
                        xs: `repeat(${Math.min(Math.max((editing ? galleryDraft : aircraft.gallery).length, 1), 2)}, 1fr)`,
                        sm: `repeat(${Math.min(Math.max((editing ? galleryDraft : aircraft.gallery).length, 1), 4)}, 1fr)`,
                      },
                      gap: 1.5,
                      mb: editing ? 2 : 0,
                    }}
                  >
                    {(editing ? galleryDraft : aircraft.gallery).map((item, i) => (
                      <Box key={item.url + i}>
                        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e8ee' }}>
                          <Box component="img" src={item.url} alt={item.caption || `Gallery ${i + 1}`} sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                          {editing && (
                            <IconButton
                              onClick={() => removeImage(i)}
                              size="small"
                              sx={{
                                position: 'absolute', top: 3, right: 3, bgcolor: 'rgba(11,23,48,0.75)', color: '#fff',
                                width: 22, height: 22, '&:hover': { bgcolor: 'rgba(178,40,40,0.9)' },
                              }}
                            >
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Box>
                        {editing ? (
                          <BlueField
                            placeholder="Caption (e.g. Cabin interior)"
                            value={item.caption}
                            onChange={(e) => updateCaption(i, e.target.value)}
                            fullWidth
                            sx={{ mt: 0.7 }}
                            slotProps={{ htmlInput: { style: { fontSize: 11.5, padding: '6px 8px' } } }}
                          />
                        ) : (
                          item.caption && (
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5, textAlign: 'center' }}>
                              {item.caption}
                            </Typography>
                          )
                        )}
                      </Box>
                    ))}
                    {(editing ? galleryDraft : aircraft.gallery).length === 0 && (
                      <Typography sx={{ gridColumn: '1 / -1', fontSize: 13, color: '#9aa3af', fontStyle: 'italic', py: 2 }}>
                        No gallery images yet.
                      </Typography>
                    )}
                  </Box>

                  {editing && (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                      <Button
                        onClick={handleFilePick}
                        disabled={uploading || galleryDraft.length >= MAX_GALLERY_IMAGES}
                        startIcon={uploading ? <CircularProgress size={14} /> : <AddPhotoAlternateIcon sx={{ fontSize: 18 }} />}
                        variant="outlined"
                        size="small"
                        sx={{ borderColor: '#d6dbe3', color: 'text.primary' }}
                      >
                        Upload Image
                      </Button>
                      <TextField
                        placeholder="Paste image URL"
                        size="small"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        disabled={galleryDraft.length >= MAX_GALLERY_IMAGES}
                        sx={{ maxWidth: 260 }}
                        slotProps={{ input: { startAdornment: <LinkIcon sx={{ fontSize: 16, color: '#9aa3af', mr: 0.8 }} /> } }}
                      />
                      <Button
                        onClick={handleAddUrl}
                        disabled={galleryDraft.length >= MAX_GALLERY_IMAGES}
                        variant="outlined"
                        size="small"
                        sx={{ borderColor: '#d6dbe3', color: 'text.primary' }}
                      >
                        Add URL
                      </Button>
                    </Box>
                  )}
                  {editing && (
                    <Typography sx={{ fontSize: 11.5, color: '#9aa3af', mt: 1 }}>
                      Paste a direct link to an image file (ending in .jpg, .png, etc.) — not a Google Images
                      search-results page, which won't render in the PDF. The caption under each thumbnail is
                      optional and prints below that photo in the PDF.
                    </Typography>
                  )}
                </Box>

                {/* Side note: PDF gallery rule — color/icon/message track the current count live */}
                <Box
                  sx={{
                    width: { xs: '100%', md: 220 },
                    flexShrink: 0,
                    bgcolor: galleryStatus === 'ok' ? '#f0f9f1' : galleryStatus === 'warning' ? '#fdf1ee' : '#fdf8ec',
                    border: `1px solid ${galleryStatus === 'ok' ? '#2e7d3255' : galleryStatus === 'warning' ? '#c4432555' : GOLD + '55'}`,
                    borderRadius: 2,
                    p: 1.6,
                    display: 'flex',
                    gap: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  {galleryStatus === 'ok' ? (
                    <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#2e7d32', mt: 0.2, flexShrink: 0 }} />
                  ) : galleryStatus === 'warning' ? (
                    <WarningAmberIcon sx={{ fontSize: 18, color: '#c44325', mt: 0.2, flexShrink: 0 }} />
                  ) : (
                    <InfoOutlinedIcon sx={{ fontSize: 18, color: GOLD, mt: 0.2, flexShrink: 0 }} />
                  )}
                  {galleryStatus === 'ok' ? (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                      <Box component="strong" sx={{ color: '#2e7d32' }}>✓ {galleryCount} image{galleryCount === 1 ? '' : 's'}</Box> will
                      appear below the main photo in the quotation PDF.
                    </Typography>
                  ) : galleryStatus === 'warning' ? (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                      <Box component="strong" sx={{ color: '#c44325' }}>{galleryCount} image{galleryCount === 1 ? '' : 's'} won't appear</Box> in
                      the PDF — add {galleryCount === 1 ? 'one' : 'or remove one'} to reach an even number (2 or 4).
                    </Typography>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
                      Add a <Box component="strong" sx={{ color: 'text.primary' }}>minimum of 2 images</Box>, in an{' '}
                      <Box component="strong" sx={{ color: 'text.primary' }}>even number</Box> (2 or 4) — an odd
                      count is skipped and won't appear in the quotation PDF.
                    </Typography>
                  )}
                </Box>
              </Box>

              {editing && (
                <Box sx={{ display: 'flex', gap: 1.2, mt: 3, pt: 2.5, borderTop: '1px solid #edf0f4' }}>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
                    sx={{ color: '#fff', bgcolor: NAVY_DEEP, '&:hover': { bgcolor: '#122441' } }}
                  >
                    {isNew ? 'Add Aircraft' : 'Save Changes'}
                  </Button>
                  <Button onClick={cancelEdit} disabled={saving} sx={{ color: 'text.secondary' }}>
                    Cancel
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <Snackbar
        open={!!snack}
        autoHideDuration={4200}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack(null)} severity="info" variant="filled" sx={{ bgcolor: '#122441' }}>
          {snack}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

/** Gold uppercase label above a value/input, matching the popup's field style. */
function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', mb: 0.6 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** TextField with a blue border, marking it as an editable field in edit mode. */
function BlueField(props: TextFieldProps) {
  return (
    <TextField
      {...props}
      size="small"
      sx={{
        '& .MuiOutlinedInput-notchedOutline': { borderColor: LINK_BLUE },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: LINK_BLUE },
        '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: LINK_BLUE, borderWidth: 2 },
        ...props.sx,
      }}
    />
  );
}
