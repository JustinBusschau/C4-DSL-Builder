import { fileURLToPath } from 'url';
import path from 'path';

export const getCurrentDir = (metaUrl: string): string => {
  if (!metaUrl.startsWith('file://')) {
    throw new Error('Must be a file URL');
  }

  return path.dirname(fileURLToPath(metaUrl));
};
