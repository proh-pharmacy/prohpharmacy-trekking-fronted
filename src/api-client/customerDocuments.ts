export const ID_DOCUMENT_TYPES = [
  'GhanaCard', 'PharmacyLicence', 'BusinessRegistration', 'DriversLicence', 'Passport', 'Other',
] as const;
export type IdDocumentType = typeof ID_DOCUMENT_TYPES[number];
export interface CustomerIdDocument {
  idDocumentType: IdDocumentType;
  idDocumentNumber: string;
}

export type IdSideRule = 'required' | 'optional' | 'none';
export interface IdDocumentSides { front: IdSideRule; back: IdSideRule }

const ID_SIDES: Record<IdDocumentType, IdDocumentSides> = {
  GhanaCard: { front: 'required', back: 'required' },
  DriversLicence: { front: 'required', back: 'required' },
  Passport: { front: 'required', back: 'none' },
  PharmacyLicence: { front: 'required', back: 'none' },
  BusinessRegistration: { front: 'required', back: 'none' },
  Other: { front: 'required', back: 'optional' },
};

export function idDocumentSides(type: IdDocumentType | ''): IdDocumentSides {
  if (!type) return { front: 'required', back: 'optional' };
  return ID_SIDES[type];
}

const CARD_SHAPED: ReadonlySet<IdDocumentType> = new Set(['GhanaCard', 'DriversLicence', 'Other']);
export function supportsCardScanner(type: IdDocumentType | ''): boolean {
  return Boolean(type) && CARD_SHAPED.has(type as IdDocumentType);
}

export function idDocumentLabel(type: IdDocumentType | ''): string {
  if (!type) return 'document';
  if (type === 'Other') return 'document';
  return type.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function validateIdDocument(type: string, number: string): string | undefined {
  if (!ID_DOCUMENT_TYPES.includes(type as IdDocumentType)) return 'Select a document type.';
  if (!number.trim()) return 'Enter a document number.';
  if (number.trim().length > 100) return 'Document number must be 100 characters or fewer.';
}

export function validateIdImage(file: Pick<File, 'type' | 'size'>): string | undefined {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (file.size === 0) return 'Choose a non-empty image.';
  if (file.size > 5 * 1024 * 1024) return 'Image must be 5 MB or smaller.';
}

export interface CustomerIdentification {
  idDocumentType?: IdDocumentType | null;
  idDocumentNumber?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
}
export type CustomerPhotos = { premises?: File; portrait?: File; idFront?: File; idBack?: File };
