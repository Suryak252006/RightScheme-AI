// ========================================
//  RightScheme AI - Main Application Script
// ========================================

// ---- Configuration ----
const API_URL = '/api/chat';  // Backend proxy (API key stays in .env)

// ---- State ----
let currentStep = 1;
const totalSteps = 3;
let chatHistory = [];

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    // Form submit handler
    const form = document.getElementById('schemeForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

// ========================================
//  TAB SWITCHING
// ========================================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
}

// ========================================
//  FORM STEP NAVIGATION
// ========================================

function nextStep(current) {
    // Basic validation for current step
    const currentStepEl = document.querySelector(`.form-step[data-step="${current}"]`);
    const requiredFields = currentStepEl.querySelectorAll('[required]');
    let valid = true;

    requiredFields.forEach(field => {
        if (!field.value && field.type !== 'radio') {
            field.style.borderColor = '#e53e3e';
            valid = false;
            setTimeout(() => { field.style.borderColor = ''; }, 2000);
        }
    });

    // Check radio buttons
    if (current === 2) {
        const categorySelected = document.querySelector('input[name="category"]:checked');
        if (!categorySelected) {
            alert('Please select a category that describes you');
            return;
        }
    }

    if (!valid) return;

    currentStep = current + 1;
    showStep(currentStep);
}

function prevStep(current) {
    currentStep = current - 1;
    showStep(currentStep);
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));

    // Show target step
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    // Update progress bar
    const progressPercent = (step / totalSteps) * 100;
    document.getElementById('progressFill').style.width = progressPercent + '%';

    // Update progress step indicators
    document.querySelectorAll('.progress-step').forEach((ps, i) => {
        ps.classList.toggle('active', i < step);
    });
}

// ========================================
//  FORM SUBMISSION
// ========================================

async function handleFormSubmit(e) {
    e.preventDefault();

    // Gather form data
    const formData = gatherFormData();

    // Show loading
    showLoading(true);

    try {
        const response = await callBackendAPI([
            {
                role: 'system',
                content: 'You are an expert on Indian Government Schemes. Provide comprehensive, accurate information about government schemes based on user profiles.'
            },
            { role: 'user', content: buildSchemePrompt(formData) }
        ], 4000);
        displayResults(response);
    } catch (error) {
        console.error('API Error:', error);
        alert('Error fetching schemes. Please try again.\n\n' + error.message);
    } finally {
        showLoading(false);
    }
}

function gatherFormData() {
    const data = {
        state: document.getElementById('state').value,
        language: document.getElementById('language').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        category: document.querySelector('input[name="category"]:checked')?.value || '',
        socialCategory: document.getElementById('socialCategory').value,
        income: document.getElementById('income').value,
        sector: document.getElementById('sector').value,
        disability: document.getElementById('disability').value,
        support: Array.from(document.querySelectorAll('input[name="support"]:checked')).map(cb => cb.value)
    };
    return data;
}

function buildSchemePrompt(data) {
    return `You are an expert on Indian Government Schemes (both Central and State level). Based on the following user profile, provide a comprehensive list of government schemes they are eligible for. Include both central government schemes and ${data.state} state schemes.

USER PROFILE:
- State: ${data.state}
- Age: ${data.age}
- Gender: ${data.gender}
- Category: ${data.category}
- Social Category: ${data.socialCategory}
- Annual Household Income: ${data.income}
- Work Sector: ${data.sector}
- Disability: ${data.disability}
- Looking for support in: ${data.support.join(', ') || 'General'}

Please respond in ${data.language} language.

For EACH scheme, you MUST use EXACTLY this format:

---

## 🏛️ [Scheme Name]

💡 **Why This Scheme**
[1-2 sentences explaining why this scheme matches the user's profile]

📋 **Key Benefits**
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

✅ **Eligibility Status**
✅ **Age Requirement** — Requirement: [age criteria or "No specific age limit"]
✅ **Income Limit** — Requirement: [income criteria]
✅ **Category** — Requirement: [eligible categories]
✅ **Occupation** — Requirement: [occupation/sector]
✅ **State** — Requirement: [applicable states]

📝 **How to Apply**
• 1. [Step 1]
• 2. [Step 2]
• 3. [Step 3]

**Match Score: [X]%**

---

IMPORTANT RULES:
- List at least 8-10 relevant schemes
- Calculate a realistic Match Score (0-100%) based on how well the user profile matches the scheme eligibility
- Use ✅ for criteria the user meets and ❌ for criteria they don't meet
- Focus on schemes that are currently active
- Include official website/portal links where available`;
}

// ========================================
//  RESULTS DISPLAY
// ========================================

function displayResults(content) {
    // Hide form, show results
    document.getElementById('schemeForm').style.display = 'none';
    document.querySelector('.progress-bar-container').style.display = 'none';

    const resultsSection = document.getElementById('selectorResults');
    const resultsContent = document.getElementById('selectorResultsContent');

    // Parse into accordion cards
    resultsContent.innerHTML = buildSchemeAccordion(content);
    resultsSection.style.display = 'block';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('schemeForm').style.display = 'block';
    document.querySelector('.progress-bar-container').style.display = 'block';
    document.getElementById('selectorResults').style.display = 'none';

    // Reset to step 1
    currentStep = 1;
    showStep(1);
}

// ========================================
//  SMART SEARCH (CHAT)
// ========================================

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message to UI
    addChatMessage(message, 'user');
    input.value = '';

    // Add to history
    chatHistory.push({ role: 'user', content: message });

    // Show typing indicator
    showTypingIndicator();

    try {
        const systemPrompt = `You are RightScheme AI, an expert assistant on Indian Government Schemes. You have comprehensive knowledge of:
- All Central Government schemes
- State Government schemes for all Indian states
- Eligibility criteria, benefits, application processes, and required documents

Guidelines:
- Provide accurate, up-to-date information about government schemes
- Always mention the official scheme name
- If the user mentions their state, include state-specific schemes
- Be conversational but informative
- Respond in the language the user uses
- If unsure about specific details, mention that the user should verify from the official website

When recommending schemes, use this format for EACH scheme:

## 🏛️ [Scheme Name]

💡 **Why This Scheme**
[1-2 sentences explaining relevance]

📋 **Key Benefits**
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

✅ **Eligibility Status**
✅ **Age Requirement** — Requirement: [criteria]
✅ **Income Limit** — Requirement: [criteria]
✅ **Category** — Requirement: [criteria]
✅ **Occupation** — Requirement: [criteria]
✅ **State** — Requirement: [criteria]

📝 **How to Apply**
• 1. [Step 1]
• 2. [Step 2]
• 3. [Step 3]

**Match Score: [X]%**

Use ✅ for met criteria and ❌ for unmet. Include official portal links where available. For general questions, respond conversationally without the template.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory
        ];

        const response = await callBackendAPI(messages, 2000);

        // Remove typing indicator
        removeTypingIndicator();

        // Add bot response
        chatHistory.push({ role: 'assistant', content: response });
        addChatMessage(response, 'bot');

    } catch (error) {
        removeTypingIndicator();
        let errorMsg;
        if (error.message && error.message.toLowerCase().includes('quota')) {
            errorMsg = '⚠️ **API quota exceeded.** Your Groq API key has hit its rate limit. Please wait a moment or check your Groq dashboard and try again.';
        } else if (error.message && error.message.toLowerCase().includes('rate')) {
            errorMsg = '⚠️ **Rate limit reached.** Too many requests sent. Please wait a moment and try again.';
        } else {
            errorMsg = `⚠️ **Error:** ${error.message || 'Something went wrong. Please try again later.'}`;
        }
        addChatMessage(errorMsg, 'bot');
        console.error('Chat Error:', error);
    }
}

function askQuickQuestion(question) {
    document.getElementById('chatInput').value = question;
    sendMessage();
}

function addChatMessage(content, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const avatar = type === 'bot'
        ? '<div class="message-avatar"><i class="fas fa-robot"></i></div>'
        : '<div class="message-avatar"><i class="fas fa-user"></i></div>';

    const formattedContent = type === 'bot' ? buildSchemeAccordion(content) : escapeHtml(content);

    // If accordion wasn't generated (no schemes), fall back to formatResponse
    const finalContent = (type === 'bot' && !formattedContent.includes('scheme-accordion'))
        ? formatResponse(content)
        : formattedContent;

    messageDiv.innerHTML = `
        ${avatar}
        <div class="message-content">${finalContent}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

// ========================================
//  BACKEND API CALL
// ========================================

async function callBackendAPI(messages, maxTokens = 3000) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens: maxTokens })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data.content;
}

// ========================================
//  UTILITIES
// ========================================

function formatResponse(text) {
    let html = text;

    // Escape HTML
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Remove horizontal rules and excess whitespace
    html = html.replace(/^---+$/gm, '');
    html = html.replace(/\n{3,}/g, '\n\n');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/(?<!=)\*([^*\n]+?)\*/g, '<em>$1</em>');

    // Bullet points
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$1. $2</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';

    // Clean up empty/redundant tags
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-3]>)/g, '$1');
    html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
    html = html.replace(/<p><br>/g, '<p>');
    html = html.replace(/<br><\/p>/g, '</p>');
    html = html.replace(/(<\/ul>)<br>/g, '$1');
    html = html.replace(/<br>(<ul>)/g, '$1');
    html = html.replace(/<br>(<h[1-3]>)/g, '$1');
    html = html.replace(/(<\/h[1-3]>)<br>/g, '$1');
    html = html.replace(/<br>\s*<br>/g, '<br>');

    return html;
}

// ========================================
//  SCHEME ACCORDION BUILDER
// ========================================

function buildSchemeAccordion(content) {
    // Split by scheme sections (## 🏛️ or ## numbered)
    const sections = content.split(/(?=##\s*🏛️)|(?=##\s*\d+\.)/).filter(s => s.trim());

    // If we can't parse sections, fall back to formatted response
    if (sections.length <= 1 && !content.includes('🏛️')) {
        return formatResponse(content);
    }

    let accordionHTML = '<div class="scheme-accordion">';
    let schemeIndex = 0;

    sections.forEach(section => {
        const trimmed = section.trim();
        if (!trimmed) return;

        // Extract scheme name from ## heading
        const nameMatch = trimmed.match(/^##\s*(?:🏛️\s*)?(.+?)$/m);
        if (!nameMatch) {
            accordionHTML += formatResponse(trimmed);
            return;
        }

        const schemeName = nameMatch[1].replace(/\*\*/g, '').trim();
        let schemeBody = trimmed.replace(/^##\s*.+$/m, '').trim();

        // Clean separators
        schemeBody = schemeBody.replace(/^---+/gm, '').replace(/---+$/gm, '').trim();

        // Extract and remove match score from body
        const scoreMatch = schemeBody.match(/\*?\*?Match Score:\s*(\d+)%\*?\*?/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
        schemeBody = schemeBody.replace(/\*?\*?Match Score:\s*\d+%\*?\*?/gi, '').trim();

        // Parse body into structured sections
        const bodyHTML = parseSchemeBody(schemeBody);

        const id = `scheme-${schemeIndex++}`;

        accordionHTML += `
            <div class="scheme-accordion-item" id="${id}">
                <button class="scheme-accordion-header" onclick="toggleSchemeAccordion('${id}')">
                    <div class="scheme-accordion-title">
                        <span class="scheme-accordion-icon"><i class="fas fa-chevron-right"></i></span>
                        <span class="scheme-accordion-name">${escapeHtml(schemeName)}</span>
                    </div>
                    ${score !== null ? `<span class="scheme-match-badge ${score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'}"><i class="fas fa-chart-line"></i> ${score}%</span>` : ''}
                </button>
                <div class="scheme-accordion-body">
                    ${bodyHTML}
                </div>
            </div>
        `;
    });

    accordionHTML += '</div>';
    return accordionHTML;
}

function parseSchemeBody(body) {
    // Match emoji section headers like: 💡 **Why This Scheme**
    const sectionMeta = {
        '💡': { icon: 'fa-lightbulb', cls: 'why' },
        '📋': { icon: 'fa-clipboard-list', cls: 'benefits' },
        '✅': { icon: 'fa-circle-check', cls: 'eligibility' },
        '📝': { icon: 'fa-pen-to-square', cls: 'apply' },
        '❌': { icon: 'fa-circle-xmark', cls: 'eligibility' }
    };

    // Split body into sections by emoji headers
    const sectionRegex = /(💡|📋|✅|📝)\s*\*\*([^*]+)\*\*/g;
    const splits = [];
    let lastIdx = 0;
    let match;

    // Collect all section positions
    const matches = [];
    while ((match = sectionRegex.exec(body)) !== null) {
        matches.push({ index: match.index, emoji: match[1], title: match[2].trim(), headerLen: match[0].length });
    }

    if (matches.length === 0) {
        // No structured sections — return clean formatted content
        return `<div class="scheme-body-simple">${formatResponse(body)}</div>`;
    }

    let html = '';

    // Text before first section
    if (matches[0].index > 0) {
        const before = body.substring(0, matches[0].index).trim();
        if (before) html += `<div class="scheme-body-simple">${formatResponse(before)}</div>`;
    }

    matches.forEach((m, i) => {
        const contentStart = m.index + m.headerLen;
        const contentEnd = (i + 1 < matches.length) ? matches[i + 1].index : body.length;
        const sectionContent = body.substring(contentStart, contentEnd).trim();
        const meta = sectionMeta[m.emoji] || { icon: 'fa-info-circle', cls: 'info' };

        html += `
            <div class="scheme-section scheme-section--${meta.cls}">
                <div class="scheme-section-header">
                    <span class="scheme-section-icon"><i class="fas ${meta.icon}"></i></span>
                    <span class="scheme-section-title">${m.title}</span>
                </div>
                <div class="scheme-section-content">${formatResponse(sectionContent)}</div>
            </div>
        `;
    });

    // Text after last section
    const lastEnd = matches[matches.length - 1].index + matches[matches.length - 1].headerLen;
    // Already handled in loop

    return html;
}

function toggleSchemeAccordion(id) {
    const item = document.getElementById(id);
    const isOpen = item.classList.contains('open');
    item.classList.toggle('open', !isOpen);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
}
