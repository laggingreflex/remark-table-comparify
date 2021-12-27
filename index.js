import { visit } from 'unist-util-visit';
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
};

/**
 * Remark plugin to perform comparisons in a table
 * @param {object} [opts] Options
 * @param {object} [opts.operations] Operations in the form of: `{ ['+']: (a, b) => a + b }`
 */
export default function tableComparify(opts) {
  return (tree, file) => {
    const state = file.data.tableComparify = {};
    visit(tree, 'table', table => onTable({ table, file, state, opts }));
    if (!state.found) {
      file.message(`Couldn't find a table (be sure to use remark-gfm before)`);
    } else if (!state.altered) {
      file.message(`Didn't alter any table`);
    } else {
      // file.info(`Altered table successfully!`);
    }
  }
}

function onTable({ table, file, state, opts }) {
  state.found = true;
  debug({ table, file, state, opts });

  const operations = opts?.operations || defaults.operations;
  const operationSymbols = Object.keys(operations);
  // const operationSymbolsRegex = new RegExp(operationSymbols.join('|'));
  const operationsQueue = operationSymbols.reduce((ops, op) => ({ ...ops, [op]: [] }), {});
  let resultColI;
  let hasAtleastOneOp
  const [headerRow, ...rows] = table.children;
  debug({ headerRow });
  for (let i = 0; i < headerRow.children.length; i++) {
    const column = headerRow.children[i];
    const [{ value: header }] = column.children;
    const modifier = {};
    debug({ header });
    for (const op in operationsQueue) {
      if (_.startsWith(header, op)) {
        let modifier;
        if (header.includes(':')) {
          let [, modifierString] = header.split(':');
          let operation, number;
          const opRx = '\\' + operationSymbols.join('|\\');
          const regexpString = `(${opRx})([0-9]+)`;
          const regExp = new RegExp(regexpString, 'i');
          [, operation, number] = modifierString.match(regExp) || [];
          number = Number(number);
          debug({ header, modifier: modifierString, opRx, regexpString, regExp });
          if (!operation) throw new Error(`Couldn't extract operation from: "${header}"`);
          if (!number) throw new Error(`Couldn't extract number from: "${header}"`);
          modifier = { operation, number };
        }
        operationsQueue[op].push({ i, header, modifier });
        hasAtleastOneOp = true;
      }
    }
    if (_.startsWith(header, '=')) resultColI = i;

  }
  if (typeof resultColI === 'undefined') {
    const error = `Couldn't find "result" column — a column that starts with a '='`
    // throw new Error(error);
    // console.warn(error);
    file.message(error)
    return;
  }
  if (!hasAtleastOneOp) {
    const error = `Couldn't find any column that contributes to result. Such a column would start with a mathematical operator: + - * /`
    file.message(error); // file.fail(error)
    return;
  }
  for (const row of rows) try {
    debug(row);
    let newResult = 0;
    for (const op in operationsQueue) {
      for (const { i, header, modifier } of operationsQueue[op]) {
        const column = row.children[i]
        debug({ header, row, i, column, modifier });
        let val = column.children?. [0]?.value ?? 0;
        val = Number(val);
        debug({ header, val });
        if (modifier) {
          val = operations[modifier.operation](val, modifier.number);
        }
        newResult = operations[op](newResult, val);
      }
    }
    let resultCol = row.children[resultColI];
    debug({ resultColI, resultCol });
    newResult = _.toFixed(newResult);
    debug({ resultColI, resultCol, newResult })
    if (resultCol?.children?. [0]) {
      resultCol.children[0].value = newResult
      debug(resultCol.children)
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
  _.sort(rows, r => r.children[resultColI].children[0].value, true);
  table.children = [headerRow, ...rows];
  state.altered = true;
  return table;
}
