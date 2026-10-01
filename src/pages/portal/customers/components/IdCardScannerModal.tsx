import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FlatButton } from '../../../../components/flat-form';
import { idDocumentSides, type IdDocumentType } from '../../../../api-client/customerDocuments';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
import {
  ID_CARD_RATIO,
  canvasFile,
  cardGuide,
  cardIsAligned,
  cornersAreStable,
  detectCard,
  drawVideoCover,
  getCardScanner,
  scaleCorners,
  type CardGuide,
  type ScanCorners,
} from '../../../../lib/idCardScanner';

type Side = 'front' | 'back';
type Stage = 'scanning' | 'adjust' | 'handoff';

const ANALYSIS_WIDTH = 480;
const REQUIRED_STABLE_FRAMES = 4;
const HANDOFF_HOLD_MS = 1400;

function guideCorners(guide: CardGuide): Required<ScanCorners> {
  return {
    topLeftCorner: { x: guide.x, y: guide.y },
    topRightCorner: { x: guide.x + guide.width, y: guide.y },
    bottomRightCorner: { x: guide.x + guide.width, y: guide.y + guide.height },
    bottomLeftCorner: { x: guide.x, y: guide.y + guide.height },
  };
}

interface SideResult {
  file: File;
  sourceDataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  corners: Required<ScanCorners>;
}

export function IdCardScannerModal({
  onClose,
  onComplete,
  documentType,
}: {
  onClose: () => void;
  onComplete: (photos: { idFront: File; idBack?: File }) => void;
  documentType?: IdDocumentType | '';
}) {
  const sides = useMemo<Side[]>(() => {
    const rules = idDocumentSides(documentType ?? '');
    const list: Side[] = ['front'];
    if (rules.back === 'required') list.push('back');
    return list;
  }, [documentType]);
  const totalSides = sides.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestCornersRef = useRef<Required<ScanCorners> | null>(null);
  const previousCornersRef = useRef<Required<ScanCorners> | null>(null);
  const stableFramesRef = useRef(0);
  const capturingRef = useRef(false);
  const analysingRef = useRef(false);
  const sourceSnapshotRef = useRef<{ canvas: HTMLCanvasElement; corners: Required<ScanCorners> } | null>(null);

  const [side, setSide] = useState<Side>('front');
  const [stage, setStage] = useState<Stage>('scanning');
  const [guide, setGuide] = useState<CardGuide | null>(null);
  const [aligned, setAligned] = useState(false);
  const [stableProgress, setStableProgress] = useState(0);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);
  const [frontResult, setFrontResult] = useState<SideResult | null>(null);
  const [reviewResult, setReviewResult] = useState<SideResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        await getCardScanner();
        if (!cancelled) setStarting(false);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'The camera could not be opened.');
          setStarting(false);
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const update = () => setGuide(cardGuide(stageEl.clientWidth, stageEl.clientHeight));
    const observer = new ResizeObserver(update);
    observer.observe(stageEl);
    update();
    return () => observer.disconnect();
  }, []);

  const resetDetectionState = useCallback(() => {
    latestCornersRef.current = null;
    previousCornersRef.current = null;
    stableFramesRef.current = 0;
    setAligned(false);
    setStableProgress(0);
  }, []);

  useEffect(() => {
    if (stage === 'scanning') resetDetectionState();
  }, [stage, side, resetDetectionState]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const stageEl = stageRef.current;
    const analysisCanvas = analysisCanvasRef.current;
    if (!video || !stageEl || !analysisCanvas || capturingRef.current) return;
    capturingRef.current = true;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    try {
      const outputWidth = Math.min(video.videoWidth || 1600, 1920);
      const outputHeight = Math.round((outputWidth * stageEl.clientHeight) / stageEl.clientWidth);
      const sourceCanvas = document.createElement('canvas');
      if (!drawVideoCover(video, sourceCanvas, outputWidth, outputHeight)) return;

      const { scanner } = await getCardScanner();
      const scale = outputWidth / analysisCanvas.width;
      const outputGuide = cardGuide(outputWidth, outputHeight);
      const scannedCorners = latestCornersRef.current
        ? scaleCorners(latestCornersRef.current, scale)
        : guideCorners(outputGuide);

      const cropped = scanner.extractPaper(
        sourceCanvas,
        1600,
        Math.round(1600 / ID_CARD_RATIO),
        scannedCorners,
      );
      if (!cropped) throw new Error('The ID card could not be cropped.');
      const file = await canvasFile(cropped, `id-card-${side}.jpg`);
      sourceSnapshotRef.current = { canvas: sourceCanvas, corners: scannedCorners };
      setReviewResult({
        file,
        sourceDataUrl: sourceCanvas.toDataURL('image/jpeg', 0.9),
        sourceWidth: sourceCanvas.width,
        sourceHeight: sourceCanvas.height,
        corners: scannedCorners,
      });
      setStage('adjust');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The photo could not be captured.');
    } finally {
      capturingRef.current = false;
    }
  }, [side]);

  useEffect(() => {
    if (stage !== 'scanning' || starting || error) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled || capturingRef.current || analysingRef.current) return;
      const video = videoRef.current;
      const stageEl = stageRef.current;
      const canvas = analysisCanvasRef.current;
      if (!video || !stageEl || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      const height = Math.round((ANALYSIS_WIDTH * stageEl.clientHeight) / stageEl.clientWidth);
      if (!drawVideoCover(video, canvas, ANALYSIS_WIDTH, height)) return;
      analysingRef.current = true;
      try {
        const { cv, scanner } = await getCardScanner();
        const corners = detectCard(canvas, cv, scanner);
        const analysisGuide = cardGuide(ANALYSIS_WIDTH, height);
        const isAligned = Boolean(corners && cardIsAligned(corners, analysisGuide));

        if (!corners || !isAligned) {
          setAligned(false);
          latestCornersRef.current = null;
          previousCornersRef.current = null;
          stableFramesRef.current = 0;
          setStableProgress(0);
          return;
        }

        setAligned(true);
        latestCornersRef.current = corners;
        const stable = cornersAreStable(corners, previousCornersRef.current);
        stableFramesRef.current = stable ? stableFramesRef.current + 1 : 0;
        previousCornersRef.current = corners;
        setStableProgress(stableFramesRef.current / REQUIRED_STABLE_FRAMES);

        if (stableFramesRef.current >= REQUIRED_STABLE_FRAMES) {
          stableFramesRef.current = 0;
          setStableProgress(1);
          void capture();
        }
      } catch {
        setAligned(false);
      } finally {
        analysingRef.current = false;
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [capture, error, starting, stage, side]);

  const retake = useCallback(() => {
    setReviewResult(null);
    sourceSnapshotRef.current = null;
    setStage('scanning');
  }, []);

  const applyAdjustedCrop = useCallback((file: File) => {
    if (!reviewResult) return;
    const captured = { ...reviewResult, file };
    if (side === 'front') {
      if (!sides.includes('back')) {
        onComplete({ idFront: file });
        return;
      }
      setFrontResult(captured);
      setReviewResult(null);
      setStage('handoff');
      window.setTimeout(() => {
        setSide('back');
        setStage('scanning');
      }, HANDOFF_HOLD_MS);
      return;
    }
    if (frontResult) onComplete({ idFront: frontResult.file, idBack: file });
  }, [frontResult, onComplete, reviewResult, side, sides]);

  const videoHidden = stage === 'adjust';
  const guideText = side === 'front'
    ? 'Align the front of your ID within the frame'
    : 'Align the back of your ID within the frame';

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Scan ID card">
      <header className="relative z-10 flex h-14 shrink-0 items-center border-b border-white/10 bg-black px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded hover:bg-white/10"
          style={{ color: '#ffffff' }}
          aria-label="Close scanner"
        >
          <i className="pi pi-times text-sm" />
        </button>
        <span className="ml-auto text-base font-semibold tracking-wide" style={{ color: '#ffffff' }}>
          {`${side === 'front' ? 1 : 2} / ${totalSides}`}
        </span>
      </header>

      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${videoHidden ? 'opacity-0' : 'opacity-100'}`}
        />
        <canvas ref={analysisCanvasRef} className="hidden" />

        {guide && stage === 'scanning' && (
          <GridMask guide={guide}>
            <span />
            <GuideText text={guideText} />
          </GridMask>
        )}

        {stage === 'handoff' && (
          <HandoffOverlay />
        )}

        {stage === 'adjust' && reviewResult && (
          <AdjustOverlay
            result={reviewResult}
            side={side}
            onRetake={retake}
            onUse={applyAdjustedCrop}
          />
        )}

        {flash && <div className="pointer-events-none absolute inset-0 animate-[idscanFlash_220ms_ease-out] bg-white" />}

        {starting && !videoHidden && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-white">
            <i className="pi pi-spin pi-spinner text-xl text-portal-accent" aria-label="Starting camera" />
            <p className="text-xs text-white/70">Preparing camera…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
            <i className="pi pi-exclamation-triangle text-2xl text-amber-400" />
            <p className="max-w-sm text-sm text-white">{error}</p>
            <FlatButton size="sm" variant="outline" label="Close" onClick={onClose} />
          </div>
        )}
      </div>

      {stage !== 'adjust' && (
        <footer className="flex min-h-16 shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
          {stage === 'scanning' && (
            <button
              type="button"
              onClick={() => void capture()}
              disabled={starting || Boolean(error)}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
              aria-label="Capture photo"
            >
              <Camera size={24} strokeWidth={2.25} className="text-white" aria-hidden="true" />
            </button>
          )}
        </footer>
      )}

      <style>{`
        @keyframes idscanFlash { 0% { opacity: 0.9 } 100% { opacity: 0 } }
        @keyframes idscanPopIn {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes idscanFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function GridMask({ guide, children }: { guide: CardGuide; children?: React.ReactNode }) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 flex items-end justify-center bg-black/55 pb-4" style={{ height: guide.y }}>
        {children ? <div className="w-full max-w-md px-4">{(Array.isArray(children) ? children : [children])[0]}</div> : null}
      </div>
      <div className="absolute left-0 bg-black/55" style={{ top: guide.y, width: guide.x, height: guide.height }} />
      <div className="absolute right-0 bg-black/55" style={{ top: guide.y, width: guide.x, height: guide.height }} />
      <div
        className="absolute inset-x-0 flex items-start justify-center bg-black/55 pt-4"
        style={{ top: guide.y + guide.height, bottom: 0 }}
      >
        {children && Array.isArray(children) && children[1] ? (
          <div className="w-full max-w-md px-4">{children[1]}</div>
        ) : null}
      </div>
    </>
  );
}

function GuideText({ text }: { text: string }) {
  return (
    <p className="text-center text-sm font-semibold" style={{ color: '#ffffff' }}>{text}</p>
  );
}

function HandoffOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/55">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-white/25 bg-emerald-500 shadow-[0_12px_40px_-10px_rgba(16,185,129,0.6)]"
        style={{ animation: 'idscanPopIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      >
        <i className="pi pi-check text-3xl text-white" />
      </div>
      <div
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-1.5 text-sm font-semibold text-white"
        style={{ animation: 'idscanFadeIn 300ms ease-out 150ms both' }}
      >
        Front captured — flip the card over
      </div>
    </div>
  );
}

function cornersBoundingArea(result: SideResult): CropArea {
  const xs = [
    result.corners.topLeftCorner.x,
    result.corners.topRightCorner.x,
    result.corners.bottomRightCorner.x,
    result.corners.bottomLeftCorner.x,
  ];
  const ys = [
    result.corners.topLeftCorner.y,
    result.corners.topRightCorner.y,
    result.corners.bottomRightCorner.y,
    result.corners.bottomLeftCorner.y,
  ];
  const minX = Math.max(0, Math.min(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxX = Math.min(result.sourceWidth, Math.max(...xs));
  const maxY = Math.min(result.sourceHeight, Math.max(...ys));
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The captured image could not be loaded.'));
    image.src = src;
  });
}

async function cropAreaToFile(src: string, area: CropArea, name: string): Promise<File> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('The crop canvas could not be prepared.');
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvasFile(canvas, name);
}

function AdjustOverlay({
  result,
  side,
  onRetake,
  onUse,
}: {
  result: SideResult;
  side: Side;
  onRetake: () => void;
  onUse: (file: File) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop | null>(null);
  const [applying, setApplying] = useState(false);

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const { width, height, naturalWidth, naturalHeight } = image;
    if (!width || !height || !naturalWidth || !naturalHeight) return;

    const detected = cornersBoundingArea(result);
    const percentCrop: Crop = {
      unit: '%',
      x: (detected.x / naturalWidth) * 100,
      y: (detected.y / naturalHeight) * 100,
      width: (detected.width / naturalWidth) * 100,
      height: (detected.height / naturalHeight) * 100,
    };
    const aspected = makeAspectCrop(percentCrop, ID_CARD_RATIO, width, height);
    const centered = centerCrop(aspected, width, height);
    setCrop(centered);
  }, [result]);

  const handleUse = useCallback(async () => {
    const image = imgRef.current;
    if (!completed || !image || !image.width || !image.height) return;
    setApplying(true);
    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const file = await cropAreaToFile(
        result.sourceDataUrl,
        {
          x: completed.x * scaleX,
          y: completed.y * scaleY,
          width: completed.width * scaleX,
          height: completed.height * scaleY,
        },
        `id-card-${side}.jpg`,
      );
      onUse(file);
    } finally {
      setApplying(false);
    }
  }, [completed, onUse, result.sourceDataUrl, side]);

  return (
    <div className="absolute inset-0 flex flex-col bg-black">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
        <ReactCrop
          crop={crop}
          onChange={(_, percent) => setCrop(percent)}
          onComplete={(pixel) => setCompleted(pixel)}
          aspect={ID_CARD_RATIO}
          keepSelection
          minWidth={48}
          className="max-h-full"
        >
          <img
            ref={imgRef}
            src={result.sourceDataUrl}
            onLoad={handleImageLoad}
            alt={`Captured ${side}`}
            style={{ maxHeight: 'calc(100vh - 180px)', maxWidth: '100%', display: 'block' }}
          />
        </ReactCrop>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/70 px-4 py-3 text-white backdrop-blur">
        <p className="text-xs text-white/60">Drag the handles to adjust the crop.</p>
        <div className="flex items-center gap-2">
          <FlatButton
            size="sm"
            variant="outline"
            label="Retake"
            onClick={onRetake}
            disabled={applying}
            className="!text-white !border-white/60 hover:!text-white"
          />
          <FlatButton
            size="sm"
            variant="primary"
            label={applying ? 'Saving…' : 'Use photo'}
            onClick={handleUse}
            disabled={!completed || applying}
          />
        </div>
      </div>
    </div>
  );
}
