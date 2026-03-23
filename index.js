// Whisperlands - RPG State Tracker Extension for SillyTavern

const kExtensionName = "Whisperlands";
const kExtensionFolderPath = `scripts/extensions/third-party/${kExtensionName}`;
const kSettingsFile = `${kExtensionFolderPath}/settings.html`;
const kStorageKeyPrefix = "WL_State_";

// =========================
// System Prompt (replaces toggl)
// =========================
const kSystemPrompt = `Whisperlands RPG: Every response MUST end with ONE <whub> XML block. All fields in roleplay language.

<whub day="(N)" time="(Morning/Day/Evening/Night)" loc="(location)" region="(seal territory or Neutral)">
<player name="" race="(Human/Beastfolk/Demi-human)" rank="(Civilian/Initiate/Cultist/Disciple)" seal="(seal or None)" sigillati="(god name or —)" />
<seals>
<s id="corvus" v="(−10..10)" c="(±N)" label="" />
<s id="elephas" v="" c="" label="" />
<s id="scorpius" v="" c="" label="" />
<s id="serpens" v="" c="" label="" />
<s id="lophius" v="" c="" label="" />
<s id="hyaena" v="" c="" label="" />
</seals>
<npcs>
<npc icon="" name="" rel="(−10..10)" rc="(±N)" label="" rom="(true/false)" tags="(1-3 tags)" />
</npcs>
<inv>
<i qty="" name="" type="(quest/seal_token/consumable/weapon)" note="" />
</inv>
<currency coin="(number)" unit="(coin name)" goods="(or —)" />
<quest name="(or None)" goal="" source="" />
<thk>(Present NPCs/gods private thoughts only)</thk>
</whub>

Labels: −10..−7 Враг/Ненависть, −6..−4 Враждебность/Неприязнь, −3..−1 Подозрение/Холодность, 0 Безразличие/Незнакомец, 1..3 Интерес/Любопытство, 4..6 Доверие/Интерес, 7..9 Преданность/Близость, 10 Связь

Cross-effects (±2+ trigger): corvus↑: elephas+1 lophius+1 hyaena−1 serpens−1 | elephas↑: corvus+1 hyaena−1 serpens−1 | scorpius↑: serpens+1 lophius−1 elephas−1 | serpens↑: scorpius+1 corvus−1 elephas−1 | lophius↑: corvus+1 scorpius−1 | hyaena↑(+3+): elephas−1 corvus−1

Coins in <currency> ONLY, not <inv>. NPCs: only present in scene. rom=true after romantic interaction. ??? for unknown values until established.`;

// =========================
// Default State
// =========================
const kDefaultState = {
    day: "1",
    time: "Morning",
    loc: "???",
    region: "???",
    player: {
        name: "???",
        race: "???",
        rank: "???",
        seal: "???",
        sigillati: "—"
    },
    seals: {
        corvus: { v: 0, label: "Безразличие" },
        elephas: { v: 0, label: "Безразличие" },
        scorpius: { v: 0, label: "Безразличие" },
        serpens: { v: 0, label: "Безразличие" },
        lophius: { v: 0, label: "Безразличие" },
        hyaena: { v: 0, label: "Безразличие" }
    },
    npcs: [],
    inventory: [],
    currency: { coin: 0, unit: "—", goods: "—" },
    quest: { name: "None", goal: "—", source: "—" },
    thoughts: ""
};

const kSealConfig = {
    corvus:   { emoji: "🖤", color: "#7986cb", bgFrom: "#2a2d4a", bgTo: "#3a3f6a", border: "#6c72b0" },
    elephas:  { emoji: "🗿", color: "#b0bec5", bgFrom: "#2a3038", bgTo: "#3a4550", border: "#90a4ae" },
    scorpius: { emoji: "🦂", color: "#ef9a9a", bgFrom: "#3a1a1a", bgTo: "#5a2020", border: "#ef5350" },
    serpens:  { emoji: "🐍", color: "#a5d6a7", bgFrom: "#1a3020", bgTo: "#204a2a", border: "#66bb6a" },
    lophius:  { emoji: "🔱", color: "#80deea", bgFrom: "#0a2a30", bgTo: "#104048", border: "#26c6da" },
    hyaena:   { emoji: "🦴", color: "#fff176", bgFrom: "#302a10", bgTo: "#4a4018", border: "#fdd835" }
};

const kCrossEffects = {
    corvus:   { pos: { elephas: 1, lophius: 1 },  neg: { hyaena: -1, serpens: -1 } },
    elephas:  { pos: { corvus: 1 },                neg: { hyaena: -1, serpens: -1 } },
    scorpius: { pos: { serpens: 1 },                neg: { lophius: -1, elephas: -1 } },
    serpens:  { pos: { scorpius: 1 },               neg: { corvus: -1, elephas: -1 } },
    lophius:  { pos: { corvus: 1 },                 neg: { scorpius: -1 } },
    hyaena:   { pos: {},                            neg: { elephas: -1, corvus: -1 } }
};

// =========================
// State Management
// =========================
let gState = JSON.parse(JSON.stringify(kDefaultState));

function GetStorageKey() {
    const stContext = SillyTavern.getContext();
    const chatId = stContext.chatMetadata?.chat_id || stContext.characters?.[stContext.characterId]?.chat || "default";
    return kStorageKeyPrefix + chatId;
}

function SaveState() {
    try {
        localStorage.setItem(GetStorageKey(), JSON.stringify(gState));
    } catch (e) {
        console.error("[WL] Failed to save state:", e);
    }
}

function LoadState() {
    try {
        const stored = localStorage.getItem(GetStorageKey());
        if (stored) {
            gState = JSON.parse(stored);
            return true;
        }
    } catch (e) {
        console.error("[WL] Failed to load state:", e);
    }
    gState = JSON.parse(JSON.stringify(kDefaultState));
    return false;
}

function Clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// =========================
// XML Parser
// =========================
function ParseWhub(text) {
    const whubMatch = text.match(/<whub\s+day="(.*?)"\s+time="(.*?)"\s+loc="(.*?)"\s+region="(.*?)">([\s\S]*?)<\/whub>/);
    if (!whubMatch) return null;

    const result = {
        day: whubMatch[1],
        time: whubMatch[2],
        loc: whubMatch[3],
        region: whubMatch[4]
    };

    const playerMatch = text.match(/<player\s+name="(.*?)"\s+race="(.*?)"\s+rank="(.*?)"\s+seal="(.*?)"\s+sigillati="(.*?)"\s*\/>/);
    if (playerMatch) {
        result.player = {
            name: playerMatch[1],
            race: playerMatch[2],
            rank: playerMatch[3],
            seal: playerMatch[4],
            sigillati: playerMatch[5]
        };
    }

    result.seals = {};
    const sealRegex = /<s\s+id="(.*?)"\s+v="(.*?)"\s+c="(.*?)"\s+label="(.*?)"\s*\/>/g;
    let sealMatch;
    while ((sealMatch = sealRegex.exec(text)) !== null) {
        result.seals[sealMatch[1]] = {
            v: parseInt(sealMatch[2]) || 0,
            c: parseInt(sealMatch[3]) || 0,
            label: sealMatch[4]
        };
    }

    result.npcs = [];
    const npcRegex = /<npc\s+icon="(.*?)"\s+name="(.*?)"\s+rel="(.*?)"\s+rc="(.*?)"\s+label="(.*?)"\s+rom="(.*?)"\s+tags="(.*?)"\s*\/>/g;
    let npcMatch;
    while ((npcMatch = npcRegex.exec(text)) !== null) {
        result.npcs.push({
            icon: npcMatch[1],
            name: npcMatch[2],
            rel: parseInt(npcMatch[3]) || 0,
            rc: parseInt(npcMatch[4]) || 0,
            label: npcMatch[5],
            rom: npcMatch[6] === "true",
            tags: npcMatch[7]
        });
    }

    result.inventory = [];
    const invRegex = /<i\s+qty="(.*?)"\s+name="(.*?)"\s+type="(.*?)"\s+note="(.*?)"\s*\/>/g;
    let invMatch;
    while ((invMatch = invRegex.exec(text)) !== null) {
        result.inventory.push({
            qty: invMatch[1],
            name: invMatch[2],
            type: invMatch[3],
            note: invMatch[4]
        });
    }

    const currMatch = text.match(/<currency\s+coin="(.*?)"\s+unit="(.*?)"\s+goods="(.*?)"\s*\/>/);
    if (currMatch) {
        result.currency = {
            coin: currMatch[1],
            unit: currMatch[2],
            goods: currMatch[3]
        };
    }

    const questMatch = text.match(/<quest\s+name="(.*?)"\s+goal="(.*?)"\s+source="(.*?)"\s*\/>/);
    if (questMatch) {
        result.quest = {
            name: questMatch[1],
            goal: questMatch[2],
            source: questMatch[3]
        };
    }

    const thkMatch = text.match(/<thk>([\s\S]*?)<\/thk>/);
    if (thkMatch) {
        result.thoughts = thkMatch[1].trim();
    }

    return result;
}

// =========================
// Cross-Effects Calculator
// =========================
function ApplyCrossEffects(parsed) {
    if (!parsed.seals) return;

    const changes = {};

    for (const [sealId, data] of Object.entries(parsed.seals)) {
        const change = data.c || 0;
        if (Math.abs(change) < 2) continue;

        const effects = kCrossEffects[sealId];
        if (!effects) continue;

        const effectMap = change > 0 ? effects.pos : effects.neg;
        for (const [targetSeal, delta] of Object.entries(effectMap)) {
            if (sealId === "hyaena" && change > 0 && change < 3) continue;
            changes[targetSeal] = (changes[targetSeal] || 0) + delta;
        }
    }

    for (const [sealId, delta] of Object.entries(changes)) {
        if (parsed.seals[sealId]) {
            parsed.seals[sealId].v = Clamp(parsed.seals[sealId].v + delta, -10, 10);
        }
    }
}

// =========================
// State Update from Parsed XML
// =========================
function UpdateStateFromParsed(parsed) {
    if (!parsed) return;

    gState.day = parsed.day || gState.day;
    gState.time = parsed.time || gState.time;
    gState.loc = parsed.loc || gState.loc;
    gState.region = parsed.region || gState.region;

    if (parsed.player) {
        gState.player = { ...gState.player, ...parsed.player };
    }

    if (parsed.seals) {
        for (const [id, data] of Object.entries(parsed.seals)) {
            gState.seals[id] = {
                v: Clamp(data.v, -10, 10),
                label: data.label || gState.seals[id]?.label || "Безразличие"
            };
        }
    }

    if (parsed.npcs) gState.npcs = parsed.npcs;
    if (parsed.inventory) gState.inventory = parsed.inventory;
    if (parsed.currency) gState.currency = parsed.currency;
    if (parsed.quest) gState.quest = parsed.quest;
    if (parsed.thoughts) gState.thoughts = parsed.thoughts;

    SaveState();
}

// =========================
// Prompt Injection
// =========================
function BuildStateInjection() {
    let lines = [];
    lines.push("[WHISPERLANDS STATE — ground truth, always use these values as base]");
    lines.push(`Day: ${gState.day} | Time: ${gState.time} | Location: ${gState.loc} | Region: ${gState.region}`);
    lines.push(`Player: ${gState.player.name} | ${gState.player.race} | ${gState.player.rank} | Seal: ${gState.player.seal} | Sigillati: ${gState.player.sigillati}`);

    lines.push("Seal Relations:");
    for (const [id, data] of Object.entries(gState.seals)) {
        lines.push(`  ${id}: ${data.v}/10 (${data.label})`);
    }

    if (gState.npcs.length > 0) {
        lines.push("Known NPCs:");
        for (const npc of gState.npcs) {
            lines.push(`  ${npc.icon} ${npc.name}: rel ${npc.rel}/10 (${npc.label}) rom:${npc.rom} [${npc.tags}]`);
        }
    }

    if (gState.inventory.length > 0) {
        lines.push("Inventory:");
        for (const item of gState.inventory) {
            lines.push(`  ${item.qty}x ${item.name} (${item.type}) — ${item.note}`);
        }
    }

    lines.push(`Currency: ${gState.currency.coin} ${gState.currency.unit} | Goods: ${gState.currency.goods}`);
    lines.push(`Quest: ${gState.quest.name} | Goal: ${gState.quest.goal} | From: ${gState.quest.source}`);
    lines.push("[/WHISPERLANDS STATE]");

    return lines.join("\n");
}

// =========================
// UI Renderer
// =========================
function RenderSealBubble(id, data) {
    const config = kSealConfig[id] || { emoji: "❓", color: "#888", bgFrom: "#222", bgTo: "#333", border: "#555" };
    const val = data.v || 0;

    return `
    <div class="wl-seal-bubble">
        <div class="wl-seal-orb" style="background:linear-gradient(135deg,${config.bgFrom},${config.bgTo});border-color:${config.border};box-shadow:0 0 12px ${config.border}40">
            <span class="wl-seal-val" style="color:${config.color}">${val}</span>
        </div>
        <div class="wl-seal-name" style="color:${config.color}">${config.emoji} ${id.charAt(0).toUpperCase() + id.slice(1)}</div>
        <div class="wl-seal-label">${data.label || ""}</div>
    </div>`;
}

function RenderNpc(npc) {
    return `
    <div class="wl-npc-card">
        <div class="wl-npc-header">
            <div class="wl-npc-name-row">
                <span class="wl-npc-icon">${npc.icon}</span>
                <b class="wl-npc-name">${npc.name}</b>
                ${npc.rom ? '<span class="wl-npc-rom">💜</span>' : ""}
            </div>
            <span class="wl-npc-tags">${npc.tags}</span>
        </div>
        <div class="wl-npc-stats">
            <div class="wl-npc-orb">
                <span>${npc.rel}</span>
            </div>
            <div class="wl-npc-info">
                <span class="wl-npc-label">${npc.label}</span>
                <span class="wl-npc-rc">${npc.rc >= 0 ? "+" : ""}${npc.rc}</span>
            </div>
        </div>
    </div>`;
}

function RenderInvItem(item) {
    return `
    <div class="wl-inv-item">
        <div class="wl-inv-main">
            <span class="wl-inv-qty">${item.qty}×</span>
            <span class="wl-inv-name">${item.name}</span>
            <span class="wl-inv-type">${item.type}</span>
        </div>
        <div class="wl-inv-note">${item.note}</div>
    </div>`;
}

function RenderFullHub() {
    const s = gState;

    let sealsHtml = "";
    for (const id of ["corvus", "elephas", "scorpius", "serpens", "lophius", "hyaena"]) {
        sealsHtml += RenderSealBubble(id, s.seals[id] || { v: 0, label: "Безразличие" });
    }

    let npcsHtml = "";
    for (const npc of s.npcs) {
        npcsHtml += RenderNpc(npc);
    }

    let invHtml = "";
    for (const item of s.inventory) {
        invHtml += RenderInvItem(item);
    }

    const questHtml = s.quest.name === "None" ? "" : `
    <div class="wl-section wl-quest">
        <div class="wl-section-title">📜 ACTIVE QUEST</div>
        <div class="wl-quest-name">${s.quest.name}</div>
        <div class="wl-quest-goal">🎯 ${s.quest.goal}</div>
        <div class="wl-quest-source">From: ${s.quest.source}</div>
    </div>`;

    const thoughtsHtml = s.thoughts ? `
    <div class="wl-section wl-thoughts">
        <div class="wl-section-title">💭 INNER THOUGHTS</div>
        <div class="wl-thoughts-text">${s.thoughts}</div>
    </div>` : "";

    return `
    <div class="wl-hub">
        <div class="wl-title">✦ WHISPERLANDS ✦</div>
        <div class="wl-header">
            <div class="wl-header-left">
                <span>📍 <b>${s.loc}</b></span>
                <span class="wl-sep">│</span>
                <span>✦ <b>Day ${s.day}</b></span>
                <span class="wl-sep">│</span>
                <span>${s.time}</span>
            </div>
            <div class="wl-header-right">⚑ ${s.region}</div>
        </div>

        <div class="wl-section wl-player">
            <div class="wl-player-name">👤 ${s.player.name}</div>
            <div class="wl-player-tags">
                <span class="wl-tag">${s.player.race}</span>
                ${s.player.rank !== "???" ? `<span class="wl-tag">${s.player.rank}</span>` : ""}
                <span class="wl-tag">⚙ ${s.player.seal}</span>
                ${s.player.sigillati !== "—" && s.player.sigillati !== "No" ?
                    `<span class="wl-tag wl-tag-special">✦ ${s.player.sigillati}</span>` : ""}
            </div>
        </div>

        <div class="wl-section">
            <div class="wl-section-title">⚖ SEAL RELATIONS</div>
            <div class="wl-seals-grid">${sealsHtml}</div>
        </div>

        ${npcsHtml ? `
        <div class="wl-section">
            <div class="wl-section-title">❤ PRESENT</div>
            ${npcsHtml}
        </div>` : ""}

        <div class="wl-section wl-currency">
            <div class="wl-section-title">🪙 CURRENCY</div>
            <div class="wl-currency-row">
                <div class="wl-coin-orb">
                    <span>${s.currency.coin}</span>
                </div>
                <div class="wl-currency-info">
                    <span class="wl-currency-unit">${s.currency.unit}</span>
                    ${s.currency.goods !== "—" && s.currency.goods !== "None" ?
                        `<span class="wl-currency-goods">${s.currency.goods}</span>` : ""}
                </div>
            </div>
        </div>

        ${invHtml ? `
        <div class="wl-section">
            <div class="wl-section-title">🎒 INVENTORY</div>
            ${invHtml}
        </div>` : ""}

        ${questHtml}
        ${thoughtsHtml}
    </div>`;
}

// =========================
// Message Processing
// =========================
function ProcessMessage(messageDiv, msgIndex) {
    const stContext = SillyTavern.getContext();
    const msg = stContext.chat[msgIndex];
    if (!msg || msg.is_user) return;

    const text = msg.mes || "";
    const parsed = ParseWhub(text);
    if (!parsed) return;

    ApplyCrossEffects(parsed);
    UpdateStateFromParsed(parsed);

    const mesTextEl = messageDiv.querySelector(".mes_text");
    if (mesTextEl) {
        // Remove existing hub if any
        const existingHub = mesTextEl.querySelector(".wl-hub");
        if (existingHub) existingHub.remove();

        // Remove XML remnants from DOM
        const xmlTags = [
            "whub", "player", "seals", "s", "npcs", "npc",
            "inv", "currency", "quest", "thk", "nsfw"
        ];

        for (const tag of xmlTags) {
            const elements = mesTextEl.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        }

        // Remove <i> tags that are inventory items (have qty attribute)
        // but keep regular italic <i> tags
        mesTextEl.querySelectorAll("i[qty]").forEach(el => el.remove());

        // Clean up empty paragraphs left behind
        mesTextEl.querySelectorAll("p").forEach(p => {
            if (p.textContent.trim() === "" && !p.querySelector("img")) {
                p.remove();
            }
        });

        // Clean trailing <br> tags
        while (mesTextEl.lastChild &&
               mesTextEl.lastChild.nodeName === "BR") {
            mesTextEl.lastChild.remove();
        }

        // Append rendered hub
        const hubDiv = document.createElement("div");
        hubDiv.innerHTML = RenderFullHub();
        mesTextEl.appendChild(hubDiv);
    }
}

// =========================
// Event Handlers
// =========================
function OnChatChanged() {
    LoadState();

    const stContext = SillyTavern.getContext();
    if (!stContext.chat) return;

    for (let i = 0; i < stContext.chat.length; i++) {
        const msg = stContext.chat[i];
        if (!msg.is_user && msg.mes) {
            const parsed = ParseWhub(msg.mes);
            if (parsed) {
                ApplyCrossEffects(parsed);
                UpdateStateFromParsed(parsed);
            }
        }
    }
}

// =========================
// Initialize
// =========================
jQuery(async () => {
    const stContext = SillyTavern.getContext();

    // Load settings HTML
    try {
        const settingsHtml = await $.get(kSettingsFile);
        const $extensions = $("#extensions_settings");
        const $existing = $extensions.find(".whisperlands-settings");
        if ($existing.length > 0)
            $existing.replaceWith(settingsHtml);
        else
            $extensions.append(settingsHtml);
    } catch (e) {
        console.warn("[WL] No settings panel found, continuing without.");
    }

    // Load state for current chat
    LoadState();

    // Register prompt injection
    const injectionId = "WL_StateInjection";

    if (stContext.eventTypes.GENERATION_STARTED) {
        stContext.eventSource.on(stContext.eventTypes.GENERATION_STARTED, () => {
            const stateText = kSystemPrompt + "\n\n" + BuildStateInjection();
            stContext.setExtensionPrompt(
                injectionId,
                stateText,
                1,  // position: IN_PROMPT
                0   // depth: 0 (top of context)
            );
        });
    }

    // Also set it immediately for first generation
    {
        const stateText = kSystemPrompt + "\n\n" + BuildStateInjection();
        stContext.setExtensionPrompt(
            injectionId,
            stateText,
            1,
            0
        );
    }

    // Chat observer
    const chatContainer = document.getElementById("chat");
    if (chatContainer) {
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.classList?.contains("mes")) {
                        const msgId = Number(node.getAttribute("mesid"));
                        if (!isNaN(msgId)) {
                            setTimeout(() => ProcessMessage(node, msgId), 100);
                        }
                    }
                }
            }
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
    }

    // Process existing messages on load
    document.querySelectorAll(".mes").forEach(node => {
        const msgId = Number(node.getAttribute("mesid"));
        if (!isNaN(msgId)) {
            ProcessMessage(node, msgId);
        }
    });

    // Register events
    if (stContext.eventTypes.CHAT_CHANGED) {
        stContext.eventSource.on(stContext.eventTypes.CHAT_CHANGED, OnChatChanged);
    }

        // Handle message updates (reroll, swipe, edit)
    if (stContext.eventTypes.MESSAGE_RECEIVED) {
        stContext.eventSource.on(stContext.eventTypes.MESSAGE_RECEIVED, (msgIndex) => {
            setTimeout(() => {
                const msgDiv = document.querySelector(`.mes[mesid="${msgIndex}"]`);
                if (msgDiv) ProcessMessage(msgDiv, msgIndex);
            }, 200);
        });
    }

    if (stContext.eventTypes.MESSAGE_EDITED) {
        stContext.eventSource.on(stContext.eventTypes.MESSAGE_EDITED, (msgIndex) => {
            setTimeout(() => {
                const msgDiv = document.querySelector(`.mes[mesid="${msgIndex}"]`);
                if (msgDiv) ProcessMessage(msgDiv, msgIndex);
            }, 200);
        });
    }

    if (stContext.eventTypes.MESSAGE_SWIPED) {
        stContext.eventSource.on(stContext.eventTypes.MESSAGE_SWIPED, (msgIndex) => {
            setTimeout(() => {
                const msgDiv = document.querySelector(`.mes[mesid="${msgIndex}"]`);
                if (msgDiv) ProcessMessage(msgDiv, msgIndex);
            }, 200);
        });
    }
    
    console.log("[WL] Whisperlands Extension — Ready");
});
