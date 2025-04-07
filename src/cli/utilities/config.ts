import Configstore from 'configstore';
import path from 'path';
import { createLogger } from './logger.js';

export function openConfigStore(): Configstore | null {
  let config: Configstore;
  try {
    config = new Configstore(
      process.cwd().split(path.sep).splice(1).join('_'),
      {},
      {
        configPath: path.join(process.cwd(), '.c4dslbuilder'),
      },
    );
  } catch (error) {
    const logger = createLogger();
    logger.error('Error accessing config store.', error);
    return null;
  }
  return config;
}

function getStoredValue(key: string): string | boolean | undefined {
  const logger = createLogger();
  const config = openConfigStore();
  if (!config) {
    logger.error('Failed to open config store.');
    return undefined;
  }

  const configValue = config.get(key) as string | boolean;
  if (configValue === undefined) {
    logger.warn(`Configuration key ${key} not found.`);
    return undefined;
  }

  return configValue;
}

export function getStrConfig(key: string): string {
  const configValue = getStoredValue(key);
  if (typeof configValue === 'string') {
    return configValue;
  }
  const logger = createLogger();
  logger.info(`Expected string for ${key}, but got ${typeof configValue}`);
  return '';
}

export function getBoolConfig(key: string): boolean {
  const configValue = getStoredValue(key);
  if (typeof configValue === 'boolean') {
    return configValue;
  }

  // cater for string representations of booleans
  if (typeof configValue === 'string') {
    if (configValue.toLowerCase() === 'true' || configValue.toLowerCase() === 'yes') {
      return true;
    }
    if (configValue.toLowerCase() === 'false' || configValue.toLowerCase() === 'no') {
      return false;
    }
  }

  const logger = createLogger();
  logger.info(`Expected boolean for ${key}, but got ${typeof configValue}`);
  return false;
}

export function setConfig(key: string, value: string | boolean): void {
  const config = openConfigStore();
  if (!config) {
    const logger = createLogger();
    logger.error('Failed to open config store.');
    return;
  }

  config.set(key, value);
}

export function deleteConfig(key: string): void {
  const config = openConfigStore();
  if (!config) {
    const logger = createLogger();
    logger.error('Failed to open config store.');
    return;
  }

  config.delete(key);
}

export function clearConfig(): void {
  const config = openConfigStore();
  if (!config) {
    const logger = createLogger();
    logger.error('Failed to open config store.');
    return;
  }

  const projectName = getStrConfig('projectName');
  config.clear();
  config.set('projectName', projectName);
}
