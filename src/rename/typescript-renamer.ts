/**
 * TypeScript/JavaScript renamer using ts-morph
 */

import { Project, SourceFile } from 'ts-morph';
import { RenameResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

/**
 * Rename a TypeScript/JavaScript symbol using ts-morph
 */
export async function renameTsSymbol(
  filePath: string,
  oldName: string,
  newName: string
): Promise<RenameResult> {
  try {
    logger.info(`Renaming ${oldName} -> ${newName} in ${filePath}`);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Create in-memory project
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(filePath, content);

    // Find the symbol to rename
    const symbols = findSymbolDeclarations(sourceFile, oldName);
    if (symbols.length === 0) {
      return {
        success: false,
        file: filePath,
        oldName,
        newName,
        referencesUpdated: 0,
        error: `Symbol ${oldName} not found`,
      };
    }

    // Rename the first matching symbol
    const symbol = symbols[0];
    let referencesUpdated = 0;

    try {
      // Use ts-morph's rename functionality
      symbol.rename(newName);
      
      // Count references (approximate)
      const text = sourceFile.getText();
      const oldNameRegex = new RegExp(`\\b${oldName}\\b`, 'g');
      const newNameRegex = new RegExp(`\\b${newName}\\b`, 'g');
      const oldCount = (text.match(oldNameRegex) || []).length;
      const newText = sourceFile.getText();
      const newCount = (newText.match(newNameRegex) || []).length;
      referencesUpdated = newCount;

      // Write back to file
      await fs.writeFile(filePath, sourceFile.getText(), 'utf-8');

      logger.info(`Successfully renamed ${oldName} -> ${newName} (${referencesUpdated} references)`);

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
        error: `Rename failed: ${error}`,
      };
    }
  } catch (error) {
    logger.error(`Error in renameTsSymbol: ${error}`);
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
 * Find symbol declarations in source file
 */
function findSymbolDeclarations(sourceFile: SourceFile, symbolName: string): Array<{
  rename: (newName: string) => void;
}> {
  const results: Array<{ rename: (newName: string) => void }> = [];

  sourceFile.forEachDescendant((node) => {
    // Variable declarations
    if (node.getKind() === 254 /* VariableDeclaration */) {
      const varDecl = node as any;
      if (varDecl.getName && varDecl.getName() === symbolName) {
        results.push(varDecl);
      }
    }
    // Function declarations
    else if (node.getKind() === 255 /* FunctionDeclaration */) {
      const funcDecl = node as any;
      if (funcDecl.getName && funcDecl.getName() === symbolName) {
        results.push(funcDecl);
      }
    }
    // Class declarations
    else if (node.getKind() === 256 /* ClassDeclaration */) {
      const classDecl = node as any;
      if (classDecl.getName && classDecl.getName() === symbolName) {
        results.push(classDecl);
      }
    }
    // Method/Property declarations
    else if (node.getKind() === 168 /* MethodDeclaration */ || 
             node.getKind() === 166 /* PropertyDeclaration */) {
      const member = node as any;
      if (member.getName && member.getName() === symbolName) {
        results.push(member);
      }
    }
  });

  return results;
}

/**
 * Verify TypeScript compilation after rename
 */
export async function verifyTsCompilation(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(filePath, content);

    const diagnostics = sourceFile.getPreEmitDiagnostics();
    
    if (diagnostics.length > 0) {
      logger.warn(`TypeScript errors in ${filePath}:`);
      diagnostics.forEach((diag) => {
        logger.warn(`  ${diag.getMessageText()}`);
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`Error verifying TypeScript compilation: ${error}`);
    return false;
  }
}
