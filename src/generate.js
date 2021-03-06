import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'

import {
  buildClientSchema,
  Source,
  concatAST,
  parse
} from 'graphql';

import { ToolError, logError } from './errors'
import { validateQueryDocument } from './validation'
import { CompilationContext } from './compilation'
import { generateSource } from './swift'

export default function generate(inputPaths, schemaPath, outputPath) {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths);

  validateQueryDocument(schema, document);

  const context = new CompilationContext(schema, document);
  const source = generateSource(context);
  fs.writeFileSync(outputPath, source);
}

export function loadSchema(schemaPath) {
  if (!fs.existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.__schema) {
    throw new ToolError('GraphQL schema file should contain a valid GraphQL introspection query result');
  }

  return buildClientSchema(schemaData);
}

export function loadAndMergeQueryDocuments(inputPaths) {
  const sources = inputPaths.map(inputPath => {
    const body = fs.readFileSync(inputPath, 'utf8')
    return new Source(body, inputPath);
  });

  return concatAST(sources.map(source => parse(source)));
}
