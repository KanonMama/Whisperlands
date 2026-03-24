// Whisperlands - RPG State Tracker Extension for SillyTavern

const kExtensionName = "Whisperlands";
const kExtensionFolderPath = `scripts/extensions/third-party/${kExtensionName}`;
const kSettingsFile = `${kExtensionFolderPath}/settings.html`;
const kStorageKeyPrefix = "WL_State_";

const kThemeStorageKey = "WL_Theme";
const kEnabledStorageKey = "WL_Enabled";
const kLanguageStorageKey = "WL_Language";

const kThemeClasses = ["wl-theme-midnight", "wl-theme-seafoam", "wl-theme-rose", "wl-theme-amber"];

let gEnabled = false;
let gTheme = "midnight";
let gLanguageMode = "auto"; // auto | ru | en

// =========================
// Localization
// =========================
const kI18n = {
    en: {
        extensionActive: "✦ Extension is active",
        extensionInactive: "Extension is inactive",
        disabledSummary: "Disabled — not injecting prompts.",
        resetConfirm: "Reset Whisperlands state for this chat?",
        currentStateTheme: "Theme",
        currentStateLanguage: "Language",

        titleInventory: "🎒 INVENTORY",
        titleSealRelations: "⚖ SEAL RELATIONS",
        titlePresent: "❤ PRESENT",
        titleActiveQuest: "📜 ACTIVE QUEST",
        titleInnerThoughts: "💭 INNER THOUGHTS",

        wanted: "⚠ Wanted",
        refugee: "🏚 Refugee",
        exile: "⛓ Exile",
        noble: "👑 Noble",
        hero: "⭐ Hero",
        disciple: "🔮 Disciple",

        from: "From",
        day: "Day",

        relation_enemy: "Enemy",
        relation_hostile: "Hostile",
        relation_suspicious: "Suspicious",
        relation_neutral: "Neutral",
        relation_curious: "Curious",
        relation_trust: "Trust",
        relation_devoted: "Devoted",
        relation_bond: "Bond",

        auto: "Auto",
        english: "English",
        russian: "Russian"
    },
    ru: {
        extensionActive: "✦ Расширение активно",
        extensionInactive: "Расширение выключено",
        disabledSummary: "Отключено — промпт не внедряется.",
        resetConfirm: "Сбросить состояние Whisperlands для этого чата?",
        currentStateTheme: "Тема",
        currentStateLanguage: "Язык",

        titleInventory: "🎒 ИНВЕНТАРЬ",
        titleSealRelations: "⚖ ОТНОШЕНИЯ С ПЕЧАТЯМИ",
        titlePresent: "❤ РЯДОМ",
        titleActiveQuest: "📜 АКТИВНЫЙ КВЕСТ",
        titleInnerThoughts: "💭 ВНУТРЕННИЕ МЫСЛИ",

        wanted: "⚠ В розыске",
        refugee: "🏚 Беженец",
        exile: "⛓ Изгнанник",
        noble: "👑 Знать",
        hero: "⭐ Герой",
        disciple: "🔮 Ученик",

        from: "От",
        day: "День",

        relation_enemy: "Враг",
        relation_hostile: "Враждебность",
        relation_suspicious: "Подозрение",
        relation_neutral: "Безразличие",
        relation_curious: "Интерес",
        relation_trust: "Доверие",
        relation_devoted: "Преданность",
        relation_bond: "Связь",

        auto: "Авто",
        english: "Английский",
        russian: "Русский"
    }
};

function DetectLanguageFromChat() {
    try {
        const stContext = SillyTavern.getContext();
        const chat = stContext.chat || [];
        const recentMessages = chat.slice(-8).map(m => m?.mes || "").join(" ");

        if (!recentMessages.trim()) return "en";

        const cyrillicMatches = recentMessages.match(/[А-Яа-яЁё]/g) || [];
        const latinMatches = recentMessages.match(/[A-Za-z]/g) || [];

        if (cyrillicMatches.length > latinMatches.length * 0.3) {
            return "ru";
        }

        return "en";
    } catch {
        return "en";
    }
}

function GetCurrentLanguage() {
    if (gLanguageMode === "ru" || gLanguageMode === "en") {
        return gLanguageMode;
    }
    return DetectLanguageFromChat();
}

function T(key) {
    const lang = GetCurrentLanguage();
    return kI18n[lang]?.[key] || kI18n.en[key] || key;
}

function GetReadableThemeName(theme) {
    switch (theme) {
        case "midnight": return "Midnight Blue";
        case "seafoam": return "Seafoam Fantasy";
        case "rose": return "Rose Violet";
        case "amber": return "Amber Night";
        default: return "Midnight Blue";
    }
}

function GetReadableLanguageMode(mode) {
    if (mode === "ru") return T("russian");
    if (mode === "en") return T("english");
    return T("auto");
}

function GetRelationLabel(value) {
    const v = parseInt(value) || 0;
    if (v <= -7) return T("relation_enemy");
    if (v <= -4) return T("relation_hostile");
    if (v <= -1) return T("relation_suspicious");
    if (v === 0) return T("relation_neutral");
    if (v <= 3) return T("relation_curious");
    if (v <= 6) return T("relation_trust");
    if (v <= 9) return T("relation_devoted");
    return T("relation_bond");
}

function BuildSystemPrompt() {
    const lang = GetCurrentLanguage();

    const labelGuideRu = `Labels: −10..−7 Враг/Ненависть, −6..−4 Враждебность/Неприязнь, −3..−1 Подозрение/Холодность, 0 Безразличие/Незнакомец, 1..3 Интерес/Любопытство, 4..6 Доверие/Интерес, 7..9 Преданность/Близость, 10 Связь`;
    const labelGuideEn = `Labels: −10..−7 Enemy/Hatred, −6..−4 Hostility/Dislike, −3..−1 Suspicion/Coldness, 0 Neutral/Stranger, 1..3 Interest/Curiosity, 4..6 Trust/Interest, 7..9 Devotion/Closeness, 10 Bond`;

    const languageRule = lang === "ru"
        ? `All visible text in the XML should match the current roleplay language. For this chat, use Russian for labels, quest text, thoughts, item notes, goods, and similar visible content whenever known.`
        : `All visible text in the XML should match the current roleplay language. For this chat, use English for labels, quest text, thoughts, item notes, goods, and similar visible content whenever known.`;

    return `Whisperlands RPG: Every response MUST end with ONE <whub> XML block. All fields in roleplay language.

<whub day="(N)" time="(Morning/Day/Evening/Night)" loc="(location)" region="(seal territory or Neutral)">
<player name="" race="(Human/Beastfolk/Demi-human)" rank="(Civilian/Initiate/Cultist/Disciple)" seal="(seal or None)" sigillati="(god name or —)" status="(wanted/refugee/exile/noble/hero or —)" />
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
<currency copper="(number)" silver="(number)" gold="(number)" goods="(or —)" />
<quest name="(or None)" goal="" source="" />
<thk>(Present NPCs/gods private thoughts only)</thk>
</whub>

${lang === "ru" ? labelGuideRu : labelGuideEn}

Cross-effects (±2+ trigger): corvus↑: elephas+1 lophius+1 hyaena−1 serpens−1 | elephas↑: corvus+1 hyaena−1 serpens−1 | scorpius↑: serpens+1 lophius−1 elephas−1 | serpens↑: scorpius+1 corvus−1 elephas−1 | lophius↑: corvus+1 scorpius−1 | hyaena↑(+3+): elephas−1 corvus−1

Coins in <currency> ONLY, not <inv>. Use ONLY these currency fields: copper, silver, gold. Do not invent other coin names or currencies. NPCs: only present in scene. rom=true after romantic interaction. ??? for unknown values until established.

${languageRule}

STRICT: The [WHISPERLANDS WORLD] block is absolute canon. Do NOT invent new gods, rename existing gods, change their gender, or contradict any world data provided. Build on it, never replace it.`;
}

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
        sigillati: "—",
        status: "—"
    },
    seals: {
        corvus: { v: 0, label: "Neutral" },
        elephas: { v: 0, label: "Neutral" },
        scorpius: { v: 0, label: "Neutral" },
        serpens: { v: 0, label: "Neutral" },
        lophius: { v: 0, label: "Neutral" },
        hyaena: { v: 0, label: "Neutral" }
    },
    npcs: [],
    inventory: [],
    currency: { copper: 0, silver: 0, gold: 0, goods: "—" },
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
    scorpius: { pos: { serpens: 1 },               neg: { lophius: -1, elephas: -1 } },
    serpens:  { pos: { scorpius: 1 },              neg: { corvus: -1, elephas: -1 } },
    lophius:  { pos: { corvus: 1 },                neg: { scorpius: -1 } },
    hyaena:   { pos: {},                           neg: { elephas: -1, corvus: -1 } }
};

// =========================
// Theme
// =========================
function ApplyThemeClass() {
    document.body.classList.remove(...kThemeClasses);
    document.body.classList.add(`wl-theme-${gTheme}`);
}

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

            if (!gState.currency || typeof gState.currency !== "object") {
                gState.currency = { copper: 0, silver: 0, gold: 0, goods: "—" };
            } else {
                gState.currency = {
                    copper: parseInt(gState.currency.copper) || 0,
                    silver: parseInt(gState.currency.silver) || 0,
                    gold: parseInt(gState.currency.gold) || 0,
                    goods: gState.currency.goods || "—"
                };
            }

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

    const playerMatch = text.match(/<player\s+name="(.*?)"\s+race="(.*?)"\s+rank="(.*?)"\s+seal="(.*?)"\s+sigillati="(.*?)"\s*(?:status="(.*?)")?\s*\/>/);
    if (playerMatch) {
        result.player = {
            name: playerMatch[1],
            race: playerMatch[2],
            rank: playerMatch[3],
            seal: playerMatch[4],
            sigillati: playerMatch[5],
            status: playerMatch[6] || "—"
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

    const currMatchNew = text.match(/<currency\s+copper="(.*?)"\s+silver="(.*?)"\s+gold="(.*?)"\s+goods="(.*?)"\s*\/>/);
    if (currMatchNew) {
        result.currency = {
            copper: parseInt(currMatchNew[1]) || 0,
            silver: parseInt(currMatchNew[2]) || 0,
            gold: parseInt(currMatchNew[3]) || 0,
            goods: currMatchNew[4]
        };
    } else {
        const currMatchOld = text.match(/<currency\s+coin="(.*?)"\s+unit="(.*?)"\s+goods="(.*?)"\s*\/>/);
        if (currMatchOld) {
            const amount = parseInt(currMatchOld[1]) || 0;
            const unit = (currMatchOld[2] || "").toLowerCase();

            result.currency = {
                copper: unit.includes("мед") || unit.includes("copper") ? amount : 0,
                silver: unit.includes("сер") || unit.includes("silver") ? amount : 0,
                gold: unit.includes("зол") || unit.includes("gold") ? amount : 0,
                goods: currMatchOld[3]
            };
        }
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
                label: data.label || gState.seals[id]?.label || "Neutral"
            };
        }
    }

    if (parsed.npcs) gState.npcs = parsed.npcs;
    if (parsed.inventory) gState.inventory = parsed.inventory;

    if (parsed.currency) {
        gState.currency = {
            copper: parseInt(parsed.currency.copper) || 0,
            silver: parseInt(parsed.currency.silver) || 0,
            gold: parseInt(parsed.currency.gold) || 0,
            goods: parsed.currency.goods || "—"
        };
    }

    if (parsed.quest) gState.quest = parsed.quest;
    if (parsed.thoughts !== undefined) gState.thoughts = parsed.thoughts;

    SaveState();
}

// =========================
// Prompt Injection
// =========================
function BuildStateInjection() {
    const lines = [];
    lines.push("[WHISPERLANDS STATE — ground truth, always use these values as base]");
    lines.push(`Day: ${gState.day} | Time: ${gState.time} | Location: ${gState.loc} | Region: ${gState.region}`);
    lines.push(`Player: ${gState.player.name} | ${gState.player.race} | ${gState.player.rank} | Seal: ${gState.player.seal} | Sigillati: ${gState.player.sigillati}`);

    lines.push("Seal Relations:");
    for (const [id, data] of Object.entries(gState.seals)) {
        lines.push(`  ${id}: ${data.v}/10 (${GetRelationLabel(data.v)})`);
    }

    if (gState.npcs.length > 0) {
        lines.push("Known NPCs:");
        for (const npc of gState.npcs) {
            lines.push(`  ${npc.icon} ${npc.name}: rel ${npc.rel}/10 (${GetRelationLabel(npc.rel)}) rom:${npc.rom} [${npc.tags}]`);
        }
    }

    if (gState.inventory.length > 0) {
        lines.push("Inventory:");
        for (const item of gState.inventory) {
            lines.push(`  ${item.qty}x ${item.name} (${item.type}) — ${item.note}`);
        }
    }

    lines.push(`Currency: ${gState.currency.gold} gold | ${gState.currency.silver} silver | ${gState.currency.copper} copper | Goods: ${gState.currency.goods}`);
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
    const label = GetRelationLabel(val);

    return `
    <div class="wl-seal-bubble">
        <div class="wl-seal-orb" style="background:linear-gradient(135deg,${config.bgFrom},${config.bgTo});border-color:${config.border};box-shadow:0 0 12px ${config.border}40">
            <span class="wl-seal-val" style="color:${config.color}">${val}</span>
        </div>
        <div class="wl-seal-name" style="color:${config.color}">${config.emoji} ${id.charAt(0).toUpperCase() + id.slice(1)}</div>
        <div class="wl-seal-label">${label}</div>
    </div>`;
}

function RenderNpc(npc) {
    const label = npc.label && npc.label !== "—" ? npc.label : GetRelationLabel(npc.rel);

    return `
    <div class="wl-npc-card">
        <div class="wl-npc-left">
            <div class="wl-npc-orb">
                <span>${npc.rel}</span>
            </div>
            <div class="wl-npc-name-col">
                <div class="wl-npc-name-row">
                    <span class="wl-npc-icon">${npc.icon}</span>
                    <b class="wl-npc-name">${npc.name}</b>
                    ${npc.rom ? '<span class="wl-npc-rom">💜</span>' : ""}
                </div>
                <span class="wl-npc-label">${label}<span class="wl-npc-rc"> ${npc.rc >= 0 ? "+" : ""}${npc.rc}</span></span>
            </div>
        </div>
        <div class="wl-npc-right">
            <span class="wl-npc-tags">${npc.tags}</span>
        </div>
    </div>`;
}

function RenderInvItem(item) {
    return `
    <div class="wl-inv-item">
        <span class="wl-inv-qty">${item.qty}×</span>
        <div class="wl-inv-info">
            <span class="wl-inv-name">${item.name}</span>
            <div class="wl-inv-meta">
                <span class="wl-inv-type">${item.type}</span>
                ${item.note && item.note !== "—" ? `<span class="wl-inv-note">${item.note}</span>` : ""}
            </div>
        </div>
    </div>`;
}

function RenderCurrency(currency) {
    const c = currency || { copper: 0, silver: 0, gold: 0, goods: "—" };

    return `
    <div class="wl-currency-inline">
        <span class="wl-currency-pack">
            <span class="wl-currency-chip wl-gold">🟡 ${c.gold || 0} з</span>
            <span class="wl-currency-chip wl-silver">⚪ ${c.silver || 0} с</span>
            <span class="wl-currency-chip wl-copper">🟠 ${c.copper || 0} м</span>
        </span>
        ${c.goods !== "—" && c.goods !== "None" ? `<span class="wl-currency-goods-inline">${c.goods}</span>` : ""}
    </div>`;
}

function RenderFullHub() {
    const s = gState;

    let sealsHtml = "";
    for (const id of ["corvus", "elephas", "scorpius", "serpens", "lophius", "hyaena"]) {
        sealsHtml += RenderSealBubble(id, s.seals[id] || { v: 0, label: "Neutral" });
    }

    let npcsHtml = "";
    for (const npc of s.npcs) {
        npcsHtml += RenderNpc(npc);
    }

    let invHtml = "";
    for (const item of s.inventory) {
        invHtml += RenderInvItem(item);
    }

    const currencyHtml = RenderCurrency(s.currency);

    let statusTag = "";
    const rank = (s.player.rank || "").toLowerCase();
    const status = (s.player.status || "").toLowerCase();

    if (status.includes("wanted") || status.includes("розыск")) {
        statusTag = `<span class="wl-tag wl-tag-status-wanted">${T("wanted")}</span>`;
    } else if (status.includes("refugee") || status.includes("беженец")) {
        statusTag = `<span class="wl-tag wl-tag-status-refugee">${T("refugee")}</span>`;
    } else if (status.includes("exile") || status.includes("изгнан")) {
        statusTag = `<span class="wl-tag wl-tag-status-exile">${T("exile")}</span>`;
    } else if (status.includes("noble") || status.includes("знать")) {
        statusTag = `<span class="wl-tag wl-tag-status-noble">${T("noble")}</span>`;
    } else if (status.includes("hero") || status.includes("герой")) {
        statusTag = `<span class="wl-tag wl-tag-status-hero">${T("hero")}</span>`;
    }

    if (rank === "disciple" || rank === "ученик") {
        statusTag += `<span class="wl-tag wl-tag-status-noble">${T("disciple")}</span>`;
    }

    const questHtml = s.quest.name === "None" ? "" : `
    <div class="wl-section wl-quest">
        <div class="wl-section-title">${T("titleActiveQuest")}</div>
        <div class="wl-quest-name">${s.quest.name}</div>
        <div class="wl-quest-goal">🎯 ${s.quest.goal}</div>
        <div class="wl-quest-source">${T("from")}: ${s.quest.source}</div>
    </div>`;

    const thoughtsHtml = s.thoughts ? `
    <div class="wl-section wl-thoughts">
        <div class="wl-section-title">${T("titleInnerThoughts")}</div>
        <div class="wl-thoughts-text">${s.thoughts}</div>
    </div>` : "";

    return `
    <div class="wl-hub">
        <div class="wl-title">✦ WHISPERLANDS ✦</div>
        <div class="wl-header">
            <div class="wl-header-left">
                <span>📍 <b>${s.loc}</b></span>
                <span class="wl-sep">│</span>
                <span>✦ <b>${T("day")} ${s.day}</b></span>
                <span class="wl-sep">│</span>
                <span>${s.time}</span>
            </div>
            <div class="wl-header-right">⚑ ${s.region}</div>
        </div>

        <div class="wl-section wl-player">
            <div class="wl-player-left">
                <div class="wl-player-name">👤 ${s.player.name}</div>
                <div class="wl-player-tags">
                    <span class="wl-tag">${s.player.race}</span>
                    ${s.player.rank !== "???" ? `<span class="wl-tag">${s.player.rank}</span>` : ""}
                    <span class="wl-tag">⚙ ${s.player.seal}</span>
                    ${s.player.sigillati !== "—" && s.player.sigillati !== "No" ?
                        `<span class="wl-tag wl-tag-special">✦ ${s.player.sigillati}</span>` : ""}
                    ${statusTag}
                </div>
            </div>
        </div>

        <div class="wl-section">
            <div class="wl-section-title">${T("titleSealRelations")}</div>
            <div class="wl-seals-grid">${sealsHtml}</div>
        </div>

        ${npcsHtml ? `
        <div class="wl-section">
            <div class="wl-section-title">${T("titlePresent")}</div>
            ${npcsHtml}
        </div>` : ""}

        ${(invHtml || currencyHtml) ? `
        <div class="wl-inv-bag">
            <div class="wl-inv-title-row">
                <div class="wl-inv-title">${T("titleInventory")}</div>
                ${currencyHtml}
            </div>
            ${invHtml ? `<div class="wl-inv-grid">${invHtml}</div>` : ""}
        </div>` : ""}

        ${questHtml}
        ${thoughtsHtml}
    </div>`;
}

// =========================
// Message Processing
// =========================
function ProcessMessage(messageDiv, msgIndex) {
    if (!gEnabled) return;
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
        const existingHub = mesTextEl.querySelector(".wl-hub");
        if (existingHub) existingHub.remove();

        const xmlTags = ["whub", "player", "seals", "s", "npcs", "npc", "inv", "currency", "quest", "thk", "nsfw"];
        for (const tag of xmlTags) {
            mesTextEl.querySelectorAll(tag).forEach(el => el.remove());
        }

        mesTextEl.querySelectorAll("i[qty]").forEach(el => el.remove());

        mesTextEl.querySelectorAll("p").forEach(p => {
            if (p.textContent.trim() === "" && !p.querySelector("img")) {
                p.remove();
            }
        });

        while (mesTextEl.lastChild && mesTextEl.lastChild.nodeName === "BR") {
            mesTextEl.lastChild.remove();
        }

        const hubDiv = document.createElement("div");
        hubDiv.innerHTML = RenderFullHub();
        mesTextEl.appendChild(hubDiv);
    }
}

function RefreshAllVisibleHubs() {
    document.querySelectorAll(".mes").forEach(node => {
        const msgId = Number(node.getAttribute("mesid"));
        if (!isNaN(msgId)) {
            ProcessMessage(node, msgId);
        }
    });
}

// =========================
// Event Handlers
// =========================
function OnChatChanged() {
    LoadState();
    UpdateStatusDisplay();
    if (!gEnabled) return;

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

    RefreshAllVisibleHubs();
}

function UpdateStatusDisplay() {
    const $status = $("#wl_status");
    const $summary = $("#wl_state_summary");

    if (gEnabled) {
        $status.html(`<span style="color:#6a8">${T("extensionActive")}</span>`);
        $summary.html(
            `${T("day")} ${gState.day} | ${gState.time} | ${gState.loc}<br>` +
            `Player: ${gState.player.name} | ${gState.player.race}<br>` +
            `Region: ${gState.region}<br>` +
            `${T("currentStateTheme")}: ${GetReadableThemeName(gTheme)}<br>` +
            `${T("currentStateLanguage")}: ${GetReadableLanguageMode(gLanguageMode)}`
        );
    } else {
        $status.html(`<span style="color:#888">${T("extensionInactive")}</span>`);
        $summary.text(T("disabledSummary"));
    }
}

// =========================
// Initialize
// =========================
jQuery(async () => {
    const stContext = SillyTavern.getContext();
    const injectionId = "WL_StateInjection";

    function InjectPrompt() {
        try {
            if (!gEnabled) {
                stContext.setExtensionPrompt(injectionId, "", 1, 0);
                return;
            }
            const stateText = BuildSystemPrompt() + "\n\n" + BuildStateInjection();
            stContext.setExtensionPrompt(injectionId, stateText, 1, 0);
            console.log("[WL] Prompt injected, length:", stateText.length);
        } catch (e) {
            console.error("[WL] Prompt injection error:", e);
        }
    }

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

    const savedEnabled = localStorage.getItem(kEnabledStorageKey);
    gEnabled = savedEnabled === "true";

    const savedTheme = localStorage.getItem(kThemeStorageKey);
    if (savedTheme && ["midnight", "seafoam", "rose", "amber"].includes(savedTheme)) {
        gTheme = savedTheme;
    }

    const savedLanguage = localStorage.getItem(kLanguageStorageKey);
    if (savedLanguage && ["auto", "ru", "en"].includes(savedLanguage)) {
        gLanguageMode = savedLanguage;
    }

    ApplyThemeClass();

    const $toggle = $("#wl_enabled");
    $toggle.prop("checked", gEnabled);

    const $theme = $("#wl_theme");
    $theme.val(gTheme);

    const $language = $("#wl_language");
    $language.val(gLanguageMode);

    LoadState();
    UpdateStatusDisplay();

    $toggle.on("change", function () {
        gEnabled = $(this).is(":checked");
        localStorage.setItem(kEnabledStorageKey, String(gEnabled));
        UpdateStatusDisplay();

        if (gEnabled) {
            InjectPrompt();
            RefreshAllVisibleHubs();
        } else {
            stContext.setExtensionPrompt(injectionId, "", 1, 0);
        }
    });

    $theme.on("change", function () {
        gTheme = $(this).val() || "midnight";
        localStorage.setItem(kThemeStorageKey, gTheme);
        ApplyThemeClass();
        UpdateStatusDisplay();
    });

    $language.on("change", function () {
        gLanguageMode = $(this).val() || "auto";
        localStorage.setItem(kLanguageStorageKey, gLanguageMode);
        UpdateStatusDisplay();
        InjectPrompt();
        RefreshAllVisibleHubs();
    });

    $("#wl_reset_state").on("click", function () {
        if (confirm(T("resetConfirm"))) {
            gState = JSON.parse(JSON.stringify(kDefaultState));
            SaveState();
            UpdateStatusDisplay();
            RefreshAllVisibleHubs();
        }
    });

    if (stContext.eventTypes.GENERATION_STARTED) {
        stContext.eventSource.on(stContext.eventTypes.GENERATION_STARTED, InjectPrompt);
    }

    InjectPrompt();

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

    document.querySelectorAll(".mes").forEach(node => {
        const msgId = Number(node.getAttribute("mesid"));
        if (!isNaN(msgId)) {
            ProcessMessage(node, msgId);
        }
    });

    if (stContext.eventTypes.CHAT_CHANGED) {
        stContext.eventSource.on(stContext.eventTypes.CHAT_CHANGED, OnChatChanged);
    }

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
