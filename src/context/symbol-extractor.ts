/**
 * Extract detailed symbol context from source files
 * Uses language-specific AST parsing where possible
 */

import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { LanguageType } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface SymbolInfo {
  name: string;
  declaration: string;
  usages: string[];
  neighbors: string[];
  enclosingScopes: string[];
  types: Record<string, string>;
  lineNumber: number;
}

/**
 * Extract symbol information for TypeScript/JavaScript files
 */
export async function extractTsSymbolInfo(
  filePath: string,
  symbolName: string,
  fileContent: string
): Promise<SymbolInfo | null> {
  try {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(filePath, fileContent);

    // Find the symbol declaration
    const declarations = findDeclarations(sourceFile, symbolName);
    if (declarations.length === 0) {
      logger.debug(`Symbol ${symbolName} not found in ${filePath}`);
      return null;
    }

    const declaration = declarations[0];
    const declarationText = declaration.getText();
    const lineNumber = declaration.getStartLineNumber();

    // Find usages
    const usages = findUsages(sourceFile, symbolName, declaration);

    // Find neighbors (symbols in same scope)
    const neighbors = findNeighbors(declaration);

    // Find enclosing scopes
    const enclosingScopes = findEnclosingScopes(declaration);

    // Extract type information
    const types = extractTypeInfo(declaration);

    return {
      name: symbolName,
      declaration: declarationText,
      usages,
      neighbors,
      enclosingScopes,
      types,
      lineNumber,
    };
  } catch (error) {
    logger.error(`Error extracting TS symbol info: ${error}`);
    return null;
  }
}

/**
 * Find all declarations of a symbol
 */
function findDeclarations(sourceFile: SourceFile, symbolName: string): Node[] {
  const declarations: Node[] = [];

  sourceFile.forEachDescendant((node) => {
    // Variable declarations
    if (Node.isVariableDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
    // Function declarations
    else if (Node.isFunctionDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
    // Class declarations
    else if (Node.isClassDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
    // Interface declarations
    else if (Node.isInterfaceDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
    // Type alias declarations
    else if (Node.isTypeAliasDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
    // Method declarations
    else if (Node.isMethodDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
    // Property declarations
    else if (Node.isPropertyDeclaration(node) && node.getName() === symbolName) {
      declarations.push(node);
    }
  });

  return declarations;
}

/**
 * Find usages of a symbol (excluding the declaration)
 */
function findUsages(sourceFile: SourceFile, symbolName: string, declaration: Node): string[] {
  const usages: string[] = [];
  const maxUsages = 5; // Limit to avoid token bloat

  sourceFile.forEachDescendant((node) => {
    if (usages.length >= maxUsages) return;

    if (Node.isIdentifier(node) && node.getText() === symbolName) {
      // Skip the declaration itself
      if (node.getStartLineNumber() === declaration.getStartLineNumber()) {
        return;
      }

      // Get the containing statement for context
      const statement = node.getFirstAncestorByKind(SyntaxKind.ExpressionStatement) ||
                       node.getFirstAncestorByKind(SyntaxKind.VariableStatement) ||
                       node.getFirstAncestorByKind(SyntaxKind.ReturnStatement);

      if (statement) {
        usages.push(statement.getText().trim());
      }
    }
  });

  return usages;
}

/**
 * Find neighboring symbols in the same scope
 */
function findNeighbors(declaration: Node): string[] {
  const neighbors: string[] = [];
  const parent = declaration.getParent();

  if (!parent) return neighbors;

  // Get siblings in the same scope
  parent.forEachChild((child) => {
    if (child === declaration) return;

    let name: string | undefined;

    if (Node.isVariableStatement(child)) {
      const decl = child.getDeclarations()[0];
      name = decl?.getName();
    } else if (Node.isFunctionDeclaration(child)) {
      name = child.getName();
    } else if (Node.isClassDeclaration(child)) {
      name = child.getName();
    } else if (Node.isInterfaceDeclaration(child)) {
      name = child.getName();
    }

    if (name && neighbors.length < 10) {
      neighbors.push(name);
    }
  });

  return neighbors;
}

/**
 * Find enclosing scopes (function, class, module)
 */
function findEnclosingScopes(declaration: Node): string[] {
  const scopes: string[] = [];
  let current = declaration.getParent();

  while (current) {
    if (Node.isFunctionDeclaration(current) || Node.isMethodDeclaration(current)) {
      const name = current.getName();
      if (name) scopes.push(`function ${name}`);
    } else if (Node.isClassDeclaration(current)) {
      const name = current.getName();
      if (name) scopes.push(`class ${name}`);
    } else if (Node.isModuleDeclaration(current)) {
      const name = current.getName();
      scopes.push(`module ${name}`);
    }

    current = current.getParent();
  }

  return scopes.reverse();
}

/**
 * Extract type information from declaration
 */
function extractTypeInfo(declaration: Node): Record<string, string> {
  const types: Record<string, string> = {};

  if (Node.isVariableDeclaration(declaration)) {
    const type = declaration.getType();
    types[declaration.getName()] = type.getText();
  } else if (Node.isFunctionDeclaration(declaration)) {
    const returnType = declaration.getReturnType();
    types.returnType = returnType.getText();

    declaration.getParameters().forEach((param) => {
      types[param.getName()] = param.getType().getText();
    });
  } else if (Node.isMethodDeclaration(declaration)) {
    const returnType = declaration.getReturnType();
    types.returnType = returnType.getText();
  }

  return types;
}

/**
 * Extract symbol info for Python files (simplified regex-based)
 */
export async function extractPythonSymbolInfo(
  filePath: string,
  symbolName: string,
  fileContent: string
): Promise<SymbolInfo | null> {
  const lines = fileContent.split('\n');
  let declaration = '';
  let lineNumber = 0;
  const usages: string[] = [];
  const neighbors: string[] = [];

  // Find declaration
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const defMatch = line.match(new RegExp(`def\\s+${symbolName}\\s*\\(`));
    const classMatch = line.match(new RegExp(`class\\s+${symbolName}\\s*[:(]`));
    const varMatch = line.match(new RegExp(`${symbolName}\\s*=`));

    if (defMatch || classMatch || varMatch) {
      declaration = line.trim();
      lineNumber = i + 1;
      break;
    }
  }

  if (!declaration) {
    return null;
  }

  // Find usages (simple text search)
  for (let i = 0; i < lines.length; i++) {
    if (i === lineNumber - 1) continue;
    if (lines[i].includes(symbolName) && usages.length < 5) {
      usages.push(lines[i].trim());
    }
  }

  return {
    name: symbolName,
    declaration,
    usages,
    neighbors,
    enclosingScopes: [],
    types: {},
    lineNumber,
  };
}

/**
 * Extract symbol info for Go files (simplified regex-based)
 */
export async function extractGoSymbolInfo(
  filePath: string,
  symbolName: string,
  fileContent: string
): Promise<SymbolInfo | null> {
  const lines = fileContent.split('\n');
  let declaration = '';
  let lineNumber = 0;
  const usages: string[] = [];

  // Find declaration
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const funcMatch = line.match(new RegExp(`func\\s+(?:\\([^)]*\\)\\s+)?${symbolName}\\s*\\(`));
    const typeMatch = line.match(new RegExp(`type\\s+${symbolName}\\s+`));
    const varMatch = line.match(new RegExp(`var\\s+${symbolName}\\s+`));

    if (funcMatch || typeMatch || varMatch) {
      declaration = line.trim();
      lineNumber = i + 1;
      break;
    }
  }

  if (!declaration) {
    return null;
  }

  // Find usages
  for (let i = 0; i < lines.length; i++) {
    if (i === lineNumber - 1) continue;
    if (lines[i].includes(symbolName) && usages.length < 5) {
      usages.push(lines[i].trim());
    }
  }

  return {
    name: symbolName,
    declaration,
    usages,
    neighbors: [],
    enclosingScopes: [],
    types: {},
    lineNumber,
  };
}

/**
 * Main entry point - route to language-specific extractor
 */
export async function extractSymbolInfo(
  filePath: string,
  symbolName: string,
  fileContent: string,
  language: LanguageType
): Promise<SymbolInfo | null> {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return extractTsSymbolInfo(filePath, symbolName, fileContent);
    case 'python':
      return extractPythonSymbolInfo(filePath, symbolName, fileContent);
    case 'go':
      return extractGoSymbolInfo(filePath, symbolName, fileContent);
    default:
      return null;
  }
}
