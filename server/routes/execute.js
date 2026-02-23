const express = require('express');
const router = express.Router();
const { parseCode } = require('../parser/astParser');
const { executeCode } = require('../engine/stepGenerator');

// Quick parse-only validation
router.post('/validate', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });
    const { ast, error } = parseCode(code);
    if (error) return res.json({ valid: false, error });
    return res.json({ valid: true });
});

// Full execution (REST fallback, WS preferred)
router.post('/execute', async (req, res) => {
    const { code, inputs, language = 'javascript' } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });
    if (code.length > 50000) return res.status(400).json({ error: 'Code too large' });

    try {
        const result = await executeCode(code, inputs || [], language);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
