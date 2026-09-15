import {
  GmTableActionColor,
  GmTableActionType,
  GmTableIcon,
} from './table-config.types';
import type { GmActionStyle } from './table-config.types';

/**
 * How every action type is drawn: its icon, its severity, and the key its
 * label and tooltip are translated from.
 *
 * One table rather than styling per call site, so Delete is the same red trash
 * button on every grid in the application and a feature's config only says
 * *what* the action is.
 */
export const GM_TABLE_ACTION_REGISTRY: Record<
  GmTableActionType,
  GmActionStyle
> = {
  [GmTableActionType.ADD]: {
    icon: GmTableIcon.ADD,
    color: GmTableActionColor.PRIMARY,
    label: GmTableActionType.ADD,
  },
  [GmTableActionType.EDIT]: {
    icon: GmTableIcon.EDIT,
    color: GmTableActionColor.WARN,
    label: GmTableActionType.EDIT,
  },
  [GmTableActionType.DELETE]: {
    icon: GmTableIcon.DELETE,
    color: GmTableActionColor.DANGER,
    label: GmTableActionType.DELETE,
  },
  [GmTableActionType.VIEW]: {
    icon: GmTableIcon.VIEW,
    color: GmTableActionColor.PRIMARY,
    label: GmTableActionType.VIEW,
  },
  [GmTableActionType.DOWNLOAD]: {
    icon: GmTableIcon.DOWNLOAD,
    color: GmTableActionColor.PRIMARY,
    label: GmTableActionType.DOWNLOAD,
  },
  [GmTableActionType.UPLOAD]: {
    icon: GmTableIcon.UPLOAD,
    color: GmTableActionColor.PRIMARY,
    label: GmTableActionType.UPLOAD,
  },
  [GmTableActionType.ENABLE_DISABLE]: {
    icon: GmTableIcon.ENABLE_DISABLE,
    color: GmTableActionColor.SECONDARY,
    label: GmTableActionType.ENABLE_DISABLE,
  },
  [GmTableActionType.MOVE_UP]: {
    icon: GmTableIcon.MOVE_UP,
    color: GmTableActionColor.SECONDARY,
    label: GmTableActionType.MOVE_UP,
  },
  [GmTableActionType.MOVE_DOWN]: {
    icon: GmTableIcon.MOVE_DOWN,
    color: GmTableActionColor.SECONDARY,
    label: GmTableActionType.MOVE_DOWN,
  },
  [GmTableActionType.USE]: {
    icon: GmTableIcon.USE,
    color: GmTableActionColor.SUCCESS,
    label: GmTableActionType.USE,
  },
  [GmTableActionType.UNUSE]: {
    icon: GmTableIcon.UNUSE,
    color: GmTableActionColor.WARN,
    label: GmTableActionType.UNUSE,
  },
  [GmTableActionType.EDIT_CONTACTS]: {
    icon: GmTableIcon.EDIT_CONTACTS,
    color: GmTableActionColor.WARN,
    label: GmTableActionType.EDIT_CONTACTS,
  },
  [GmTableActionType.VALIDATE]: {
    icon: GmTableIcon.VALIDATE,
    color: GmTableActionColor.SUCCESS,
    label: GmTableActionType.VALIDATE,
  },
  [GmTableActionType.RESEND_EMAIL]: {
    icon: GmTableIcon.RESEND_EMAIL,
    color: GmTableActionColor.INFO,
    label: GmTableActionType.RESEND_EMAIL,
  },
  [GmTableActionType.BULK_IMPORT]: {
    icon: GmTableIcon.BULK_IMPORT,
    color: GmTableActionColor.SECONDARY,
    label: GmTableActionType.BULK_IMPORT,
  },
  [GmTableActionType.VALIDATE_ALL]: {
    icon: GmTableIcon.VALIDATE,
    color: GmTableActionColor.DANGER,
    label: GmTableActionType.VALIDATE_ALL,
  },
  [GmTableActionType.EXPORT]: {
    icon: GmTableIcon.EXPORT,
    color: GmTableActionColor.SECONDARY,
    label: GmTableActionType.EXPORT,
  },
  [GmTableActionType.DEACTIVATE]: {
    icon: GmTableIcon.DEACTIVATE,
    color: GmTableActionColor.DANGER,
    label: GmTableActionType.DEACTIVATE,
  },
  [GmTableActionType.DELETE_ALL]: {
    icon: GmTableIcon.DELETE_ALL,
    color: GmTableActionColor.DANGER,
    label: GmTableActionType.DELETE_ALL,
  },
};

/** Falls back to a neutral ellipsis for a type no registry entry covers. */
export function gmActionStyle(type: GmTableActionType): GmActionStyle {
  return (
    GM_TABLE_ACTION_REGISTRY[type] ?? {
      icon: 'pi pi-ellipsis-h' as GmTableIcon,
      color: GmTableActionColor.SECONDARY,
      label: type,
    }
  );
}
