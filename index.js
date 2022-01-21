import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmToMarkdown } from 'mdast-util-gfm'
import _ from './utils.js';
const debug = _.debug();

export const defaults = {
  operations: {
    ['+']: (a, b) => a + b,
    ['-']: (a, b) => a - b,
    ['*']: (a, b) => a * b,
    ['/']: (a, b) => a / b,
  },
  resultSymbol: '=',
  modifierSeparator: ':',
  defaultSeparator: '?',
};

/**
 * Remark plugin to perform comparisons in a table
 * @param {object} [opts] Options
 * @param {object} [opts.operations] Operations in the form of: `{ ['+']: (a, b) => a + b }`
 */
export default function tableComparify(opts) {
  return (tree, file) => {
    const state = file.data.tableComparify = {};
    visit(tree, 'table', node => onTable({ node, file, state, opts }));
    if (!state.found) {
      file.message(`Couldn't find a table (be sure to use remark-gfm before)`);
    } else if (!state.altered) {
      file.message(`Didn't alter any table`);
    } else {
      // file.info(`Altered table successfully!`);
    }
  }
}

/**
 * Modify a Markdown string containing a table and returns the modified output
 * @param {string} input
 * @param {object} opts
 * @returns {string} output
 */
export async function modify(input, opts) {
  const modifications = [];
  await remark().use(remarkGfm).use(opts => (tree, file) => visit(tree, 'table', original => {
    const modified = onTable({ node: original, file });
    modifications.push(modified);
  })).process(input);
  const originals = modifications.map(modification =>
    input.substring(
      modification.position.start.offset,
      modification.position.end.offset,
    )
  );
  for (let i = 0; i < originals.length; i++) {
    const original = originals[i];
    const modified = modifications[i];
    let string = toMarkdown(modified, { extensions: [gfmToMarkdown()] });
    string = string.replace(/\n$/, '');
    input = input.replace(original, string);
  }
  return input;
}

function onTable({ node, file, state, opts }) {
  state && (state.found = true);
  const operations = opts?.operations || defaults.operations;
  const resultSymbol = opts?.resultSymbol || defaults.resultSymbol;
  const operationSymbols = Object.keys(operations);
  const operationsQueue = operationSymbols.reduce((ops, op) => ({ ...ops, [op]: [] }), {});
  let resultColI;
  let hasAtleastOneOp
  const [headerRow, ...rows] = node.children;
  for (let i = 0; i < headerRow.children.length; i++) {
    const column = headerRow.children[i];
    const [{ value: header }] = column.children;
    const meta = getMeta(header, opts);
    if (meta.operation) {
      operationsQueue[meta.operation].push({ i, header, ...meta });
      hasAtleastOneOp = true;
    }
    if (_.startsWith(header, resultSymbol)) {
      if (typeof resultColI !== typeof undefined) file.message(`Multiple "${resultSymbol}result" columns, picking last one`);
      resultColI = i;
    }
  }
  if (typeof resultColI === typeof undefined) {
    file.message(`Couldn't find "result" column — a column that starts with a '${resultSymbol}'`);
    return;
  }
  if (!hasAtleastOneOp) {
    file.message(`Couldn't find any column that contributes to result. Such a column would start with a mathematical operator: + - * /`);
    return;
  }
  for (const row of rows) try {
    let newResult = 0;
    for (const op in operationsQueue) {
      for (const { i, header, modifier, defaultValue } of operationsQueue[op]) {
        const column = row.children[i]
        let val = column.children?. [0]?.value ?? defaultValue ?? 0;
        val = Number(val);
        if (modifier) {
          val = operations[modifier.operation](val, modifier.number);
        }
        newResult = operations[op](newResult, val);
      }
    }
    let resultCol = row.children[resultColI];
    if (resultCol?.children?. [0]) {
      resultCol.children[0].value = newResult
    } else {
      if (!resultCol) {
        for (let i = row.children.length; i <= resultColI; i++) {
          row.children.push({ type: 'tableCell', children: [] });
        }
        resultCol = row.children[resultColI];
      }
      resultCol.children.push({ type: 'text', value: newResult })
    }
  } catch (error) {
    debug(row);
    throw error;
  }

  const results = rows.map(row => row.children[resultColI].children[0]);
  const min = Math.min(...results.map(r => r.value)) ?? 1;
  const resultHeader = headerRow.children[resultColI].children[0];
  const headerMeta = getMeta(resultHeader.value, { ...opts, min });
  if (headerMeta.modifier) {
    for (const result of results) {
      result.value = operations[headerMeta.modifier.operation](result.value, headerMeta.modifier.number);
    }
  }

  for (const result of results) {
    result.value = _.toFixed(result.value);
  }

  _.sort(rows, r => r.children[resultColI].children[0].value, true);

  node.children = [headerRow, ...rows];
  state && (state.altered = true);
  return node;
}


function getMeta(string, opts) {
  const operations = opts?.operations || defaults.operations;
  const operationSymbols = Object.keys(operations);
  const min = opts?.min ?? -Infinity;
  const defaultSeparator = opts?.defaultSeparator || defaults.defaultSeparator;
  const modifierSeparator = opts?.modifierSeparator || defaults.modifierSeparator;

  const meta = {};

  for (const operation in defaults.operations) {
    if (_.startsWith(string, operation)) {
      meta.operation = operation;
    }
  }

  if (string.includes(modifierSeparator)) {
    let [, modifierString] = string.split(modifierSeparator);
    const opRx = '\\' + operationSymbols.join('|\\');
    const regexpString = `(${opRx})([0-9]+|min)`;
    const regExp = new RegExp(regexpString, 'i');
    const modifier = meta.modifier = {};
    [, modifier.operation, modifier.number] = modifierString.match(regExp) || [];
    if (modifier.number === 'min') modifier.number = min;
    modifier.number = Number(modifier.number);
  }

  if (string.includes(defaultSeparator)) {
    const regex = new RegExp(`\\${defaultSeparator}(-?[0-9]+)`);
    // [, meta.defaultValue] = string.match(/\?(-?[0-9]+)/);
    [, meta.defaultValue] = string.match(regex);
  }

  return meta;
}
