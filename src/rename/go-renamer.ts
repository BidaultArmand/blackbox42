/**
 * Go renamer using gopls LSP
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { RenameResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Rename a Go symbol using gopls
 */
export async function renameGoSymbol(
  filePath: string,
  oldName: string,
  newName: string,
  lineNumber: number,
  projectRoot: string = '.'
): Promise<RenameResult> {
  try {
    logger.info(`Renaming Go symbol ${oldName} -> ${newName} in ${filePath}`);

    // Check if gopls is available
    try {
      await execAsync('gopls version');
    } catch {
      logger.warn('gopls not found, falling back to regex replacement');
      return await fallbackGoRename(filePath, oldName, newName);
    }

    // Read file to find the exact position
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    if (lineNumber > lines.length) {
      throw new Error(`Line number ${lineNumber} exceeds file length`);
    }

    const line = lines[lineNumber - 1];
    const column = line.indexOf(oldName) + 1;

    if (column === 0) {
      throw new Error(`Symbol ${oldName} not found on line ${lineNumber}`);
    }

    // Use gopls rename command
    // Format: gopls rename -w file.go:line:col newName
    const position = `${filePath}:${lineNumber}:${column}`;
    const command = `cd ${projectRoot} && gopls rename -w ${position} ${newName}`;

    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('warning')) {
      throw new Error(stderr);
    }

    // Count references by checking the modified file
    const newContent = await fs.readFile(filePath, 'utf-8');
    const regex = new RegExp(`\\b${newName}\\b`, 'g');
    const matches = newContent.match(regex);
    const referencesUpdated = matches ? matches.length : 0;

    logger.info(`Successfully renamed ${oldName} -> ${newName} in Go`);

    return {
      success: true,
      file: filePath,
      oldName,
      newName,
      referencesUpdated,
    };
  } catch (error) {
    logger.error(`Go rename failed: ${error}`);
    return {
      success: false,
      file: filePath,
      oldName,
      newName,
      referencesUpdated: 0,
      error: String(error),
    };
  }
}

/**
 * Fallback: Simple regex-based rename for Go
 */
async function fallbackGoRename(
  filePath: string,
  oldName: string,
  newName: string
): Promise<RenameResult> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Use word boundary regex
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    const matches = content.match(regex);
    const referencesUpdated = matches ? matches.length : 0;

    if (referencesUpdated === 0) {
      return {
        success: false,
        file: filePath,
        oldName,
        newName,
        referencesUpdated: 0,
        error: 'Symbol not found',
      };
    }

    content = content.replace(regex, newName);
    await fs.writeFile(filePath, content, 'utf-8');

    logger.info(`Fallback Go rename: ${oldName} -> ${newName} (${referencesUpdated} references)`);

    return {
      success: true,
      file: filePath,
      oldName,
      newName,
      referencesUpdated,
    };
  } catch (error) {
    return {
      success: false,
      file: filePath,
      oldName,
      newName,
      referencesUpdated: 0,
      error: String(error),
    };
  }
}

/**
 * Verify Go compilation after rename
 */
export async function verifyGoCompilation(
  filePath: string,
  projectRoot: string = '.'
): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    const { stderr } = await execAsync(`cd ${projectRoot} && go build ${dir}`);
    
    if (stderr && !stderr.includes('warning')) {
      logger.warn(`Go compilation errors: ${stderr}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Go compilation check failed: ${error}`);
    return false;
  }
}
