/** Why a chosen or dropped file was not accepted. */
export type GmFileRejectionReason = 'size' | 'type';

/**
 * One file the component turned away, with a message ready to show. The file
 * itself is the native `File`, so a caller can re-offer it or log its name.
 */
export interface GmFileRejection {
  readonly file: File;
  readonly reason: GmFileRejectionReason;
  readonly message: string;
}
