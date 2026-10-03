export const ID_CARD_RATIO = 85.6 / 53.98;

export interface ScanPoint {
  x: number;
  y: number;
}

export interface ScanCorners {
  topLeftCorner?: ScanPoint;
  topRightCorner?: ScanPoint;
  bottomLeftCorner?: ScanPoint;
  bottomRightCorner?: ScanPoint;
}

interface Jscanify {
  findPaperContour(image: unknown): any;
  getCornerPoints(contour: unknown, image?: unknown): ScanCorners;
  extractPaper(
    image: CanvasImageSource,
    width: number,
    height: number,
    corners?: Required<ScanCorners>,
  ): HTMLCanvasElement | null;
}

interface JscanifyConstructor {
  new (): Jscanify;
}

export interface CardGuide {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OpenCvModule {
  Mat: new () => { delete: () => void };
  imread: (source: CanvasImageSource) => { delete: () => void };
}

declare global {
  interface Window {
    cv?: OpenCvModule | Promise<OpenCvModule>;
    jscanify?: JscanifyConstructor;
  }
}

let scannerPromise: Promise<{ cv: OpenCvModule; scanner: Jscanify }> | null = null;

function loadScript(source: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement('script');
    const handleLoad = () => {
      script.removeEventListener('error', handleError);
      script.dataset.loaded = 'true';
      resolve();
    };
    const handleError = () => {
      script.removeEventListener('load', handleLoad);
      script.remove();
      reject(new Error('The card detector could not be loaded.'));
    };
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = source;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

async function readyOpenCv(): Promise<OpenCvModule> {
  await loadScript('/opencv/opencv.js');
  const module = await window.cv;
  if (!module?.Mat) throw new Error('The card detector could not be started.');
  // OpenCV 5 exposes a Promise while its WebAssembly runtime initializes.
  // jscanify reads the global `cv` value directly, so replace that Promise
  // with the resolved runtime before any detection method is called.
  window.cv = module;
  return module;
}

export async function getCardScanner() {
  if (!scannerPromise) {
    scannerPromise = Promise.all([readyOpenCv(), loadScript('/jscanify/jscanify.js')])
      .then(([cv]) => {
        if (!window.jscanify) throw new Error('The card scanner could not be started.');
        return { cv, scanner: new window.jscanify() };
      })
      .catch((error) => {
        scannerPromise = null;
        throw error;
      });
  }
  return scannerPromise;
}

export function cardGuide(width: number, height: number): CardGuide {
  const guideWidth = Math.min(width * 0.86, height * 0.58 * ID_CARD_RATIO);
  const guideHeight = guideWidth / ID_CARD_RATIO;
  return {
    x: (width - guideWidth) / 2,
    y: (height - guideHeight) / 2,
    width: guideWidth,
    height: guideHeight,
  };
}

export function drawVideoCover(video: HTMLVideoElement, canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context || !video.videoWidth || !video.videoHeight) return false;

  const sourceRatio = video.videoWidth / video.videoHeight;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = sourceHeight * targetRatio;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = sourceWidth / targetRatio;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  return true;
}

export function detectCard(
  canvas: HTMLCanvasElement,
  cv: OpenCvModule,
  scanner: Jscanify,
): Required<ScanCorners> | null {
  const image = cv.imread(canvas);
  let contour: any = null;
  try {
    contour = scanner.findPaperContour(image);
    if (!contour) return null;
    const corners = scanner.getCornerPoints(contour, image);
    if (!corners.topLeftCorner || !corners.topRightCorner || !corners.bottomLeftCorner || !corners.bottomRightCorner) {
      return null;
    }
    return corners as Required<ScanCorners>;
  } finally {
    contour?.delete?.();
    image.delete();
  }
}

const pointDistance = (first: ScanPoint, second: ScanPoint) => Math.hypot(first.x - second.x, first.y - second.y);

export function cardIsAligned(corners: Required<ScanCorners>, guide: CardGuide) {
  const expected: Required<ScanCorners> = {
    topLeftCorner: { x: guide.x, y: guide.y },
    topRightCorner: { x: guide.x + guide.width, y: guide.y },
    bottomLeftCorner: { x: guide.x, y: guide.y + guide.height },
    bottomRightCorner: { x: guide.x + guide.width, y: guide.y + guide.height },
  };
  const tolerance = guide.width * 0.16;
  return (Object.keys(expected) as Array<keyof ScanCorners>)
    .every((key) => pointDistance(corners[key], expected[key]) <= tolerance);
}

export function cornersAreStable(current: Required<ScanCorners>, previous: Required<ScanCorners> | null) {
  if (!previous) return false;
  return (Object.keys(current) as Array<keyof ScanCorners>)
    .every((key) => pointDistance(current[key], previous[key]) <= 12);
}

export function scaleCorners(corners: Required<ScanCorners>, scale: number): Required<ScanCorners> {
  return {
    topLeftCorner: { x: corners.topLeftCorner.x * scale, y: corners.topLeftCorner.y * scale },
    topRightCorner: { x: corners.topRightCorner.x * scale, y: corners.topRightCorner.y * scale },
    bottomLeftCorner: { x: corners.bottomLeftCorner.x * scale, y: corners.bottomLeftCorner.y * scale },
    bottomRightCorner: { x: corners.bottomRightCorner.x * scale, y: corners.bottomRightCorner.y * scale },
  };
}

export function canvasFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The captured image could not be prepared.'));
        return;
      }
      resolve(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.88);
  });
}
