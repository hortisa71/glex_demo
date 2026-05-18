(function () {
    const STORAGE_KEY = 'glex-chats';
    const ACTIVE_KEY = 'glex-active-chat';

    const els = {
        messages: document.getElementById('chatMessages'),
        input: document.getElementById('chatInput'),
        send: document.getElementById('sendBtn'),
        history: document.getElementById('chatHistory'),
        newChat: document.getElementById('newChatBtn'),
        modeRadios: document.querySelectorAll('input[name="userMode"]'),
        modeHint: document.getElementById('modeHint'),
        docTabs: document.querySelectorAll('.gl-doc-tabs button'),
        sidebar: document.querySelector('.gl-sidebar'),
        doc: document.querySelector('.gl-doc'),
        backdrop: document.getElementById('glBackdrop'),
    };

    /* ===== Drawers (mobile/tablet off-canvas) ===== */
    const drawer = {
        open(which) {
            this.closeAll();
            if (which === 'sidebar') els.sidebar.classList.add('is-open');
            if (which === 'docs') els.doc.classList.add('is-open');
            els.backdrop.classList.add('is-visible');
        },
        closeAll() {
            els.sidebar.classList.remove('is-open');
            els.doc.classList.remove('is-open');
            els.backdrop.classList.remove('is-visible');
        },
        isAnyOpen() {
            return els.sidebar.classList.contains('is-open')
                || els.doc.classList.contains('is-open');
        },
    };

    document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-toggle]');
        if (t) {
            const which = t.dataset.toggle;
            const target = which === 'sidebar' ? els.sidebar : els.doc;
            if (target.classList.contains('is-open')) drawer.closeAll();
            else drawer.open(which);
        }
    });

    els.backdrop.addEventListener('click', () => drawer.closeAll());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.isAnyOpen()) drawer.closeAll();
    });

    // Reset drawer state when crossing breakpoints (avoid stuck-open on resize)
    let lastIsLg = window.matchMedia('(min-width: 1200px)').matches;
    let lastIsMd = window.matchMedia('(min-width: 992px)').matches;
    window.addEventListener('resize', () => {
        const isLg = window.matchMedia('(min-width: 1200px)').matches;
        const isMd = window.matchMedia('(min-width: 992px)').matches;
        if (isLg !== lastIsLg || isMd !== lastIsMd) {
            drawer.closeAll();
            lastIsLg = isLg;
            lastIsMd = isMd;
        }
    });

    const MODE_HINTS = {
        citizen: {
            icon: 'bi-shield-check',
            text: 'Режим консультації для громадянина — пояснення простою мовою з покликанням на статті.',
        },
        lawyer: {
            icon: 'bi-briefcase',
            text: 'Режим консультації для юриста — аналіз колізій, ієрархія норм, посилання на акти ВРУ.',
        },
        student: {
            icon: 'bi-mortarboard',
            text: 'Навчальний режим для студента — структура галузі, контрольні питання, кейси.',
        },
    };

    const WELCOME = {
        citizen:
            'Вітаю. Я модуль <strong>«Захист прав споживачів»</strong>. Опишіть вашу ситуацію — я відповім простою мовою та надам посилання на чинні норми.',
        lawyer:
            'Готовий до роботи у режимі юриста. Можу провести аналіз колізій, побудувати правову позицію або підготувати фрагмент процесуального документа.',
        student:
            'Навчальний модуль активовано. Можемо розглянути структуру споживчого права, контрольні питання або типові кейси.',
    };

    let chats = loadChats();
    let activeChatId = localStorage.getItem(ACTIVE_KEY) || null;

    /* ===== Storage ===== */
    function loadChats() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }

    function saveChats() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }

    function uid() {
        return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    /* ===== Mode ===== */
    function currentMode() {
        const el = document.querySelector('input[name="userMode"]:checked');
        return el ? el.value : 'citizen';
    }

    function updateModeHint() {
        const m = currentMode();
        const hint = MODE_HINTS[m];
        els.modeHint.innerHTML = `<i class="bi ${hint.icon}"></i><span>${hint.text}</span>`;
    }

    els.modeRadios.forEach((r) =>
        r.addEventListener('change', () => {
            updateModeHint();
            if (!getActiveChat() || getActiveChat().messages.length === 1) {
                resetWelcome();
            }
        })
    );

    /* ===== Chat operations ===== */
    function getActiveChat() {
        return chats.find((c) => c.id === activeChatId) || null;
    }

    function setActive(id) {
        activeChatId = id;
        if (id) localStorage.setItem(ACTIVE_KEY, id);
        else localStorage.removeItem(ACTIVE_KEY);
        renderHistory();
        renderMessages();
    }

    function createChat(title) {
        const chat = {
            id: uid(),
            title: (title || 'Нова сесія').slice(0, 60),
            createdAt: Date.now(),
            mode: currentMode(),
            messages: [
                {
                    role: 'assistant',
                    mode: currentMode(),
                    text: WELCOME[currentMode()],
                    ts: Date.now(),
                },
            ],
        };
        chats.unshift(chat);
        saveChats();
        setActive(chat.id);
        return chat;
    }

    function deleteChat(id) {
        chats = chats.filter((c) => c.id !== id);
        saveChats();
        if (activeChatId === id) {
            const next = chats[0];
            setActive(next ? next.id : null);
            if (!next) resetWelcome();
        } else {
            renderHistory();
        }
    }

    function resetWelcome() {
        const m = currentMode();
        els.messages.innerHTML = '';
        appendMessage({
            role: 'assistant',
            mode: m,
            text: WELCOME[m],
            ts: Date.now(),
        }, true);
    }

    /* ===== Rendering ===== */
    function renderHistory() {
        if (!chats.length) {
            els.history.innerHTML =
                '<div class="gl-history-empty">Тут зберігатимуться ваші сесії.</div>';
            return;
        }
        els.history.innerHTML = chats
            .map(
                (c) => `
            <div class="gl-history-item ${c.id === activeChatId ? 'is-active' : ''}" data-id="${c.id}">
                <i class="bi bi-chat-left-text"></i>
                <span class="title">${escapeHtml(c.title)}</span>
                <span class="del" data-del="${c.id}" title="Видалити"><i class="bi bi-x-lg"></i></span>
            </div>`
            )
            .join('');
    }

    function renderMessages() {
        const chat = getActiveChat();
        els.messages.innerHTML = '';
        if (!chat) {
            resetWelcome();
            return;
        }
        chat.messages.forEach((m) => appendMessage(m, true));
    }

    function appendMessage(msg, skipSave) {
        const isUser = msg.role === 'user';
        const wrap = document.createElement('div');
        wrap.className = 'gl-msg ' + (isUser ? 'user' : 'assistant');

        const avatarIcon = isUser ? 'bi-person-fill' : 'bi-cpu';
        const senderName = isUser ? 'Ви' : 'GLeX AI';
        const modeTag = isUser ? '' : `<span class="tag">${modeLabel(msg.mode)}</span>`;

        wrap.innerHTML = `
            <div class="gl-msg-avatar"><i class="bi ${avatarIcon}"></i></div>
            <div class="gl-msg-bubble">
                <div class="gl-msg-meta">
                    <span>${senderName}</span>
                    ${modeTag}
                </div>
                ${msg.text}
                ${msg.cite ? `<div class="cite"><i class="bi bi-quote me-1"></i>${msg.cite}</div>` : ''}
            </div>
        `;
        els.messages.appendChild(wrap);
        els.messages.scrollTop = els.messages.scrollHeight;

        if (skipSave) return;
        const chat = getActiveChat();
        if (chat) {
            chat.messages.push(msg);
            saveChats();
        }
    }

    function modeLabel(m) {
        if (m === 'lawyer') return 'юрист';
        if (m === 'student') return 'студент';
        return 'громадянин';
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[c]));
    }

    /* ===== Demo response generator ===== */
    const RESPONSES = {
        citizen: [
            {
                text:
                    '<p>Згідно зі <strong>ст. 9 Закону «Про захист прав споживачів»</strong>, ви маєте право обміняти непродовольчий товар належної якості на аналогічний протягом <strong>14 днів</strong>, якщо він не використовувався і збережено товарний вигляд, упаковку та розрахунковий документ.</p><p>Якщо в магазині немає аналога — можете вимагати повернення грошей.</p>',
                cite: 'ЗУ № 1023-XII «Про захист прав споживачів», ст. 9, ч. 1–2',
            },
            {
                text:
                    '<p>Право на відмову від товару належної якості діє <strong>лише за межами торгового приміщення</strong> (онлайн, з кур\'єром) — <strong>14 днів</strong> з моменту отримання, без пояснення причин.</p>',
                cite: 'ЗУ № 1023-XII, ст. 13. Постанова КМУ № 172 (перелік винятків).',
            },
        ],
        lawyer: [
            {
                text:
                    '<p><strong>[Аналіз колізій]</strong> Між <em>ст. 9 ЗУ № 1023-XII</em> та <em>Постановою КМУ № 172</em> щодо переліку товарів, не підлягаючих обміну, виявлено розбіжність у частині «технічно складних товарів побутового призначення».</p><p>Пріоритет — за нормою <strong>Закону як акта вищої юридичної сили</strong> (ч. 2 ст. 8 КАСУ; принцип <em>lex superior</em>).</p>',
                cite: 'ЗУ № 1023-XII, ст. 9 ⇄ Постанова КМУ № 172 від 19.03.1994',
            },
            {
                text:
                    '<p><strong>[Процесуальна позиція]</strong> Для позову про захист прав споживача доцільно поєднати вимогу про <em>розірвання договору купівлі-продажу</em> з вимогою про <em>стягнення 3% пені за кожен день прострочення</em> (ст. 23 ЗУ).</p><p>Підсудність — за місцем проживання споживача (ч. 5 ст. 28 ЦПК України). Судовий збір не сплачується (ст. 22 ЗУ).</p>',
                cite: 'ЦПК України, ст. 28 ч. 5; ЗУ № 1023-XII, ст. 22, 23',
            },
        ],
        student: [
            {
                text:
                    '<p><strong>[Навчальний кейс]</strong> Розглянемо суб\'єктний склад правовідносин:</p><ul><li><strong>Споживач</strong> — фізична особа, яка набуває товар не для підприємницької діяльності;</li><li><strong>Продавець</strong> — суб\'єкт господарювання (юр.особа або ФОП).</li></ul><p>📚 <em>Контрольне питання:</em> чи поширюється ЗУ «Про захист прав споживачів» на правовідносини між двома фізичними особами на OLX? Обґрунтуйте.</p>',
                cite: 'Базовий курс «Споживче право», тема 2: суб\'єкти правовідносин',
            },
            {
                text:
                    '<p><strong>[Структура галузі]</strong> Споживче право в Україні — це <em>міжгалузевий інститут</em>, який включає норми:</p><ul><li>цивільного права (договір купівлі-продажу — гл. 54 ЦК);</li><li>адміністративного права (Держпродспоживслужба);</li><li>господарського права (відповідальність продавця).</li></ul><p>Ключовий принцип — <strong>презумпція вини продавця</strong> протягом гарантійного строку.</p>',
                cite: 'ЦК України, гл. 54; ЗУ № 1023-XII, ст. 8',
            },
        ],
    };

    function generateResponse(userText) {
        const mode = currentMode();
        const pool = RESPONSES[mode];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { ...pick, mode };
    }

    /* ===== Handlers ===== */
    function handleSend() {
        const text = els.input.value.trim();
        if (!text) return;

        if (!getActiveChat()) {
            createChat(text);
            const chat = getActiveChat();
            if (chat) chat.messages = [];
            saveChats();
        } else {
            const chat = getActiveChat();
            if (chat.messages.length <= 1 && chat.title === 'Нова сесія') {
                chat.title = text.slice(0, 60);
                saveChats();
                renderHistory();
            }
        }

        appendMessage({ role: 'user', text: escapeHtml(text), ts: Date.now() });
        els.input.value = '';
        autoResize();
        toggleSendBtn();

        showTyping();
        setTimeout(() => {
            removeTyping();
            const resp = generateResponse(text);
            appendMessage({ role: 'assistant', mode: resp.mode, text: resp.text, cite: resp.cite, ts: Date.now() });
        }, 700 + Math.random() * 600);
    }

    function showTyping() {
        const el = document.createElement('div');
        el.className = 'gl-msg assistant';
        el.id = 'typing';
        el.innerHTML = `
            <div class="gl-msg-avatar"><i class="bi bi-cpu"></i></div>
            <div class="gl-msg-bubble">
                <span class="text-gl-muted small">Аналізую нормативну базу
                    <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
                </span>
            </div>`;
        els.messages.appendChild(el);
        els.messages.scrollTop = els.messages.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('typing');
        if (el) el.remove();
    }

    function autoResize() {
        els.input.style.height = 'auto';
        els.input.style.height = Math.min(els.input.scrollHeight, 120) + 'px';
    }

    function toggleSendBtn() {
        els.send.disabled = !els.input.value.trim();
    }

    els.send.addEventListener('click', handleSend);
    els.input.addEventListener('input', () => {
        autoResize();
        toggleSendBtn();
    });
    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    els.newChat.addEventListener('click', () => {
        setActive(null);
        resetWelcome();
        drawer.closeAll();
        els.input.focus();
    });

    els.history.addEventListener('click', (e) => {
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) {
            e.stopPropagation();
            deleteChat(delBtn.dataset.del);
            return;
        }
        const item = e.target.closest('.gl-history-item');
        if (item && item.dataset.id) {
            setActive(item.dataset.id);
            drawer.closeAll();
        }
    });

    els.docTabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            els.docTabs.forEach((b) => b.classList.remove('is-active'));
            btn.classList.add('is-active');
        });
    });

    // Close docs drawer when an article is clicked
    els.doc.addEventListener('click', (e) => {
        if (e.target.closest('.gl-act-body a')) drawer.closeAll();
    });

    /* ===== Init ===== */
    updateModeHint();
    toggleSendBtn();
    renderHistory();
    if (activeChatId && getActiveChat()) {
        renderMessages();
    } else {
        activeChatId = null;
        resetWelcome();
    }
})();
