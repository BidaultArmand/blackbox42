/**
 * Python renamer using rope library via subprocess
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { RenameResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Rename a Python symbol using rope library
 */
export async function renamePythonSymbol(
  filePath: string,
  oldName: string,
  newName: string,
  projectRoot: string = '.'
): Promise<RenameResult> {
  try {
    logger.info(`Renaming Python symbol ${oldName} -> ${newName} in ${filePath}`);

    // Check if rope is available
    try {
      await execAsync('python3 -c "import rope"');
    } catch {
      logger.warn('rope library not found, falling back to regex replacement');
      return await fallbackPythonRename(filePath, oldName, newName);
    }

    // Create a Python script to perform the rename using rope
    const renameScript = `
import sys
from rope.base.project import Project
from rope.refactor.rename import Rename

try:
    project = Project('${projectRoot}')
    resource = project.get_file('${filePath}')
    
    # Find the offset of the symbol
    content = resource.read()
    offset = content.find('${oldName}')
    
    if offset == -1:
        print('ERROR: Symbol not found')
        sys.exit(1)
    
    # Perform rename
    renamer = Rename(project, resource, offset)
    changes = renamer.get_changes('${newName}')
    project.do(changes)
    
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {str(e)}')
    sys.exit(1)
`;

    const { stdout, stderr } = await execAsync(`python3 -c "${renameScript.replace(/"/g, '\\"')}"`);

    if (stdout.includes('SUCCESS')) {
      // Count references (approximate)
      const content = await fs.readFile(filePath, 'utf-8');
      const regex = new RegExp(`\\b${newName}\\b`, 'g');
      const matches = content.match(regex);
      const referencesUpdated = matches ? matches.length : 0;

      logger.info(`Successfully renamed ${oldName} -> ${newName} in Python`);

      return {
        success: true,
        file: filePath,
        oldName,
        newName,
        referencesUpdated,
      };
    } else {
      throw new Error(stderr || stdout);
    }
  } catch (error) {
    logger.error(`Python rename failed: ${error}`);
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
 * Fallback: Simple regex-based rename for Python
 * Used when rope is not available
 */
async function fallbackPythonRename(
  filePath: string,
  oldName: string,
  newName: string
): Promise<RenameResult> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Use word boundary regex to avoid partial matches
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

    logger.info(`Fallback rename: ${oldName} -> ${newName} (${referencesUpdated} references)`);

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
 * Verify Python syntax after rename
 */
export async function verifyPythonSyntax(filePath: string): Promise<boolean> {
  try {
    const { stderr } = await execAsync(`python3 -m py_compile ${filePath}`);
    
    if (stderr) {
      logger.warn(`Python syntax errors in ${filePath}: ${stderr}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Python syntax check failed: ${error}`);
    return false;
  }
}
