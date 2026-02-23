const parser = require('@babel/parser');

function parseCode(code) {
  try {
    const ast = parser.parse(code, {
      sourceType: 'script',
      plugins: [],
      errorRecovery: false,
    });
    return { ast, error: null };
  } catch (err) {
    return {
      ast: null,
      error: {
        message: err.message,
        line: err.loc ? err.loc.line : null,
        column: err.loc ? err.loc.column : null,
      },
    };
  }
}

module.exports = { parseCode };
