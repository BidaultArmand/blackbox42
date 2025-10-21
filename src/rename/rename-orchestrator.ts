/**
 * Orchestrate rename operations across languages
 */

import { RenameResult, LanguageType, NamingSuggestion } from '../types/index.js';
import { renameTsSymbol, verifyTsCompilation } from './typescript-renamer.js';
import { renamePythonSymbol, verifyPythonSyntax } from './python-renamer.js';
import { renameGoSymbol, verifyGoCompilation } from './go-renamer.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

/**
 * Perform a safe rename with verification
 */
export async function performSafeRename(
  filePath: string,
  suggestion: NamingSuggestion,
  language: LanguageType,
  lineNumber: number,
  projectRoot: string = '.'
): Promise<RenameResult> {
  // Backup the file first
  const backupPath = `${filePath}.backup`;
  try {
    await fs.copyFile(filePath, backupPath);
  } catch (error) {
    logger.error(`Failed to create backup: ${error}`);
    return {
      success: false,
      file: filePath,
      oldName: suggestion.oldName,
      newName: suggestion.newName,
      referencesUpdated: 0,
      error: 'Failed to create backup',
    };
  }

  let result: RenameResult;

  try {
    // Perform language-specific rename
    switch (language) {
      case 'typescript':
      case 'javascript':
        result = await renameTsSymbol(filePath, suggestion.oldName, suggestion.newName);
        break;
      case 'python':
        result = await renamePythonSymbol(
          filePath,
          suggestion.oldName,
          suggestion.newName,
          projectRoot
        );
        break;
      case 'go':
        result = await renameGoSymbol(
          filePath,
          suggestion.oldName,
          suggestion.newName,
          lineNumber,
          projectRoot
        );
        break;
      default:
        result = {
          success: false,
          file: filePath,
          oldName: suggestion.oldName,
          newName: suggestion.newName,
          referencesUpdated: 0,
          error: `Unsupported language: ${language}`,
        };
    }

    if (!result.success) {
      // Restore from backup
      await fs.copyFile(backupPath, filePath);
      await fs.unlink(backupPath);
      return result;
    }

    // Verify compilation/syntax
    let isValid = false;
    switch (language) {
      case 'typescript':
      case 'javascript':
        isValid = await verifyTsCompilation(filePath);
        break;
      case 'python':
        isValid = await verifyPythonSyntax(filePath);
        break;
      case 'go':
        isValid = await verifyGoCompilation(filePath, projectRoot);
        break;
    }

    if (!isValid) {
      logger.warn(`Verification failed for ${filePath}, rolling back`);
      await fs.copyFile(backupPath, filePath);
      await fs.unlink(backupPath);
      return {
        ...result,
        success: false,
        error: 'Verification failed after rename',
      };
    }

    // Success - remove backup
    await fs.unlink(backupPath);
    return result;
  } catch (error) {
    // Restore from backup on any error
    try {
      await fs.copyFile(backupPath, filePath);
      await fs.unlink(backupPath);
    } catch (restoreError) {
      logger.error(`Failed to restore backup: ${restoreError}`);
    }

    return {
      success: false,
      file: filePath,
      oldName: suggestion.oldName,
      newName: suggestion.newName,
      referencesUpdated: 0,
      error: String(error),
    };
  }
}

/**
 * Check if a rename should be automatically applied
 */
export function shouldAutoRename(suggestion: NamingSuggestion): boolean {
  // Must have high confidence
  if (suggestion.confidence < 0.85) {
    return false;
  }

  // Must be marked as safe to autofix
  if (!suggestion.safety.shouldAutofix) {
    return false;
  }

  // Must not be API surface
  if (suggestion.safety.isApiSurface) {
    return false;
  }

  return true;
}

/**
 * Batch rename multiple symbols
 */
export async function batchRename(
  renames: Array<{
    filePath: string;
    suggestion: NamingSuggestion;
    language: LanguageType;
    lineNumber: number;
  }>,
  projectRoot: string = '.'
): Promise<RenameResult[]> {
  const results: RenameResult[] = [];

  for (const rename of renames) {
    const result = await performSafeRename(
      rename.filePath,
      rename.suggestion,
      rename.language,
      rename.lineNumber,
      projectRoot
    );
    results.push(result);

    // Stop on first failure to avoid cascading issues
    if (!result.success) {
      logger.warn('Stopping batch rename due to failure');
      break;
    }
  }

  return results;
}
