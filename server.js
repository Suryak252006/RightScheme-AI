// ========================================
//  RightScheme AI - Backend Server
// ========================================

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ---- Groq API Proxy Endpoint ----
app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY not set. Add it to your .env file.' });
    }

    try {
        const { messages, max_tokens = 3000 } = req.body;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
                temperature: 0.7,
                max_tokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: errorData.error?.message || `Groq API error: ${response.status}`
            });
        }

        const data = await response.json();
        res.json({ content: data.choices[0].message.content });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/selector', (req, res) => {
    res.sendFile(path.join(__dirname, 'selector.html'));
});

// Start
app.listen(PORT, () => {
    console.log(`\n  🚀 RightScheme AI is running at http://localhost:${PORT}\n`);
});
