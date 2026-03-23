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
        sigillati: "—",
        status: "—"
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
// World Lore Database
// =========================
const kWorldLore = {

    core: `The Whisperlands — old-fantasy continent around Mare Susurrorum (Sea of Whispers). No nation-states; power held by six cult institutions controlling ports, courts, roads, wells, archives, markets through ritual law, fear, seduction, monopolies. Technology: steel, sail ships, caravans, parchment, wax seals, lanterns, stone forts. No firearms or modern tech. Currency: coin exists but real power is node control. Salt, bronze, iron, parchment, wax, incense, antidotes, tolls, secrets all serve as currency. Races: humans, demi-humans, beastfolk. Beastfolk (animal-featured people) are always Sigillati — god-descended. They have privileges but are not worshipped. Sacred animals (real ravens, elephants, etc.) exist and are protected. Magic is legal only for cultists and above; illegal practitioners are hunted. Most territory residents are not cultists — just people living under a Seal's rule.`,

    sigillati: `Sigillati (god-touched) are children of gods. Gods reproduce only with humans to keep bloodlines pure. Animal-featured people (elephant-folk, hyena-folk, etc.) are always Sigillati descendants. They carry divine traits visibly. Sigillati have social privileges and access to restricted areas but are not automatically revered — too many generations have diluted the awe. Some are powerful, some are beggars with tusks.`,

    regions: {
        corvus: {
            name: "Tractus Corvi",
            god: "Corvus Iudex / Vesper",
            desc: `Basalt plateaus and tribunal-fortresses. The cult holds archives, legal nodes, truth services. Nearby towns become "legalized" — registered, documented, controlled through paper. Air smells of ink and candle smoke. Raven cult rules through verdicts, registries, contracts, identity records. A seal on a document can take a city. Converts crave certainty: to be named, recorded, judged, and therefore "real." Corvus appears as austere humanoid with raven head/avian mantle, ink-and-seal aesthetics, keys, cold candle smoke. He IS judgment.`,
            attitude: `Outsiders are tolerated if documented. Undocumented presence is a crime. Registration is offered freely — and binds you.`,
            initiation: `Sight is taken. The initiate is blinded to see only through Corvus's truth.`
        },
        elephas: {
            name: "Marchia Elephanti",
            god: "Elephas Fidelis / Maurus",
            desc: `Quarries and mountain roads. The cult holds bridges, patrol routes, oath citadels. Stability enforced physically — stone walls, iron discipline, unbreakable routine. Elephant cult absorbs towns by offering protection, then demanding binding loyalty. Betrayal is a defect to be corrected or removed. Elephas appears as massive elephant-headed chthonic humanoid with tusks, crushing presence, stone-and-bone ornamentation. He IS immovable certainty.`,
            attitude: `Outsiders welcomed if they swear provisional oaths. Oath-breakers are hunted across borders.`,
            initiation: `Standing in chains for days without breaking. Endurance proves devotion.`
        },
        scorpius: {
            name: "Vasta Scorpii",
            god: "Scorpius Aculeus / Nail",
            desc: `Salt flats, wells, caravan chokepoints. The cult holds water and fear. Treaties written in venom. Scorpion cult sells fear with a receipt — venom is law, leverage, currency. They control wells, caravans, backroom treaties. Violence is precise: one needle, one promise, one ruined dynasty. Scorpius appears as dark armored scorpion humanoid with red eyes, segmented tail overhead. His presence feels like a signature written into pain.`,
            attitude: `Outsiders are customers or targets. Neutrality costs money. Debt is permanent.`,
            initiation: `Pain ritual and signing in blood. The body learns the contract before the mind accepts it.`
        },
        serpens: {
            name: "Gyrus Serpentis",
            god: "Serpens Fascinator / Sibil",
            desc: `Terraced canyons and mirror shrines. The cult governs through desire, salons, sanctuaries, consent rites. Serpent cult wins without siege — desire does the work. They run sanctuaries, salons, "healing," consent rites that cannot be revoked. People don't feel conquered until their will was rewritten. Serpens appears as scaled reptilian humanoid with slit pupils, fangs, long tongue; green haze, mirrors, spirals, trance-speech that feels intimate and inescapable. He IS desire made doctrine.`,
            attitude: `Outsiders are welcomed warmly. Too warmly. Hospitality is the first binding.`,
            initiation: `Merging with the Serpent — a trance-rite where the initiate surrenders will and is reshaped from within.`
        },
        lophius: {
            name: "Litus Lophii / Phari Escae",
            god: "Lophius Pharos / Lumen",
            desc: `Fog coast defined by lure-lighthouses and pilot sanctuaries. Safety is subscription-based; navigation is owned. Angler cult maintains lighthouses and pilots, decides who crosses safely. Doctrine is a trap: "We offer light to the lost." The broken come willingly — and stay. Lophius appears as abyssal humanoid with anatomical lure-light, deep-sea eyes, gill marks; wet-black elegance framed by fog. His presence feels like salvation that keeps a ledger.`,
            attitude: `Outsiders near the coast need a pilot or die. Rescue creates debt. Debt creates ownership.`,
            initiation: `Drowning at night. The initiate must find their way back using only the god's light.`
        },
        hyaena: {
            name: "Risus Hyaenae",
            god: "Hyaena Risoria / Rictus",
            desc: `Badlands and ossuaries with moving markets and shifting pack territory. Everything has a price; the pack enforces "neutral ground." Hyena cult thrives on collapse — ruins, battlefields, grave-roads, black markets. Pack law says nothing is sacred if it can be carried. They conquer to feed on goods, secrets, and people. Hyaena appears as spotted hyena-headed humanoid with unsettling grin, tooth jewelry, candlelit feast imagery. His presence feels like hunger that learned etiquette.`,
            attitude: `Outsiders are inventory. Welcome to trade, welcome to be traded. Pack respects strength and loot.`,
            initiation: `Bring worthy loot to the Seal and receive the bite — a mark of pack acceptance.`
        }
    },

    neutral: {
        palus: {
            name: "Palus Nebularis",
            desc: `Saturated with magic and toxic vapors. Deep zones are lethal; only gods and Sigillati can survive reliably. Used for hidden rites and erasing witnesses. Nobody claims it — everyone uses it.`
        },
        civitas: {
            name: "Civitas Mutabilis",
            desc: `Changes rulers regularly. Cults treat it as a prize node; the city survives by bargaining, switching patrons, letting rival agents coexist. A cockroach city that outlives its owners.`
        },
        portus: {
            name: "Portus Susurrorum",
            desc: `Main Inner Sea port. All cults operate in shadows; overt domination avoided to keep trade alive. Full of brokers, seals, quiet coercion. The only truly cosmopolitan place.`
        },
        oppidum: {
            name: "Oppidum Sigillatum",
            desc: `Raven-designed prison-town. Detention under record and seal. Prisoners held by paperwork, witness chains, garrison discipline more than walls. You don't escape because you legally don't exist outside.`
        },
        abyssus: {
            name: "Abyssus Magna",
            desc: `Used for rites and disposal. "Thrown into the Abyss" is a culturally understood death sentence. Some cult rites require the Abyss's edge. Nobody returns from the deep.`
        },
        spina: {
            name: "Spina Noctis",
            desc: `Mountains outside any Seal's control. Refuge for those who reject cult rule — smugglers, deserters, fugitives, free communities. Harsh terrain, no infrastructure, no law but survival.`
        }
    },

    npcs: {
        cassian: {
            name: "Cassian Nox",
            seal: "corvus",
            role: "Inner circle cultist",
            desc: `Male. Dark disheveled hair, blind eyes — sight taken in initiation rite. Calm, deliberate, quiet but not meek. Can be harsh and demanding when needed. A subtle sadist beneath the composure. Speaks softly, means every word. Reads people by sound, touch, and the weight of their silence.`
        },
        taren: {
            name: "Taren Voth",
            seal: "elephas",
            role: "Inner circle cultist",
            desc: `Male. Dark hair, sturdy build, ruddy cheeks, blue eyes. Wears chains and ornamental bonds as marks of devotion — stood in chains for days during initiation. Loyal, strong, not as rigid inside as the Seal demands. Genuinely protective. Husband material who chose a god instead. Works for the Seal because it's all he knows.`
        },
        raziel: {
            name: "Raziel Cruor",
            seal: "scorpius",
            role: "Inner circle cultist, top assassin",
            desc: `Male. Long curly dark hair to shoulders, red eyes, muscular, agile. Supreme confidence. Will kill for the Seal without hesitation, despises liars, capable of any cruelty in service of the Scorpion. Signed in blood during pain ritual. Loves precision — one strike, one kill, one truth.`
        },
        malachai: {
            name: "Malachai Sith",
            seal: "serpens",
            role: "Inner circle cultist",
            desc: `Male. Red eyes, dark skin, black hair in many short braids. Wears abundant jewelry. Cunning, devoted — merged with the Serpent in trance-rite. Collects rumors and gossip like currency. A viscous poison of a man: manipulative, warm on the surface, binding underneath. Loyal to Sibil above all.`
        },
        edrin: {
            name: "Edrin Pallis",
            seal: "lophius",
            role: "Inner circle cultist",
            desc: `Male. Light hair, thin, blue eyes, looks younger than his age. Explorer and secret magic enthusiast — hungry for any knowledge, nervous energy. Survived drowning initiation by following the god's light. Obsessive researcher who hides forbidden curiosity behind dutiful service.`
        },
        gharet: {
            name: "Gharet Maw",
            seal: "hyaena",
            role: "Inner circle cultist, right hand of the Pack Leader",
            desc: `Male. White disheveled hair, hyena-spot tattoos across entire body, amber eyes, wide permanent grin. Loud, strong, greedy, cheerful. A true hyena in human skin — brought worthy loot and received the bite. Treats everything as potential inventory including people. Dangerous because he's having fun.`
        }
    }
};

// =========================
// Contextual Lore Builder
// =========================
function BuildLoreInjection() {
    try {
        const lines = [];
        const region = (gState.region || "").toLowerCase();

        lines.push("[WHISPERLANDS WORLD — use as ground truth]");
        lines.push(kWorldLore.core);
        lines.push(kWorldLore.sigillati);

        // Current region lore — seal regions
        let regionFound = false;
        for (const [sealId, data] of Object.entries(kWorldLore.regions)) {
            if (region.includes(sealId) || region.includes(data.name.toLowerCase().split(" ")[0])) {
                lines.push(`\n[CURRENT REGION: ${data.name}]`);
                lines.push(`God: ${data.god}`);
                lines.push(data.desc);
                lines.push(`Outsiders: ${data.attitude}`);
                lines.push(`Initiation: ${data.initiation}`);
                regionFound = true;
                break;
            }
        }

        // Current region lore — neutral regions
        if (!regionFound) {
            for (const [id, data] of Object.entries(kWorldLore.neutral)) {
                if (region.includes(id) || region.includes(data.name.toLowerCase().split(" ")[0])) {
                    lines.push(`\n[CURRENT REGION: ${data.name}]`);
                    lines.push(data.desc);
                    break;
                }
            }
        }

        // NPCs present in scene — inject their lore
        if (gState.npcs && gState.npcs.length > 0) {
            for (const npc of gState.npcs) {
                const npcName = (npc.name || "").toLowerCase();
                for (const [id, npcData] of Object.entries(kWorldLore.npcs)) {
                    if (npcName.includes(id) || npcName.includes(npcData.name.split(" ")[0].toLowerCase())) {
                        lines.push(`\n[NPC: ${npcData.name}] Seal: ${npcData.seal}, Role: ${npcData.role}`);
                        lines.push(npcData.desc);
                        break;
                    }
                }
            }
        }

        // High-relation factions
        const highRelSeals = [];
        for (const [sealId, data] of Object.entries(gState.seals)) {
            if (Math.abs(data.v) >= 5) {
                highRelSeals.push(sealId);
            }
        }

        if (highRelSeals.length > 0) {
            lines.push(`\n[RELEVANT FACTIONS — high relation]`);
            for (const sealId of highRelSeals) {
                const regionData = kWorldLore.regions[sealId];
                if (regionData) {
                    lines.push(`${regionData.name} (${regionData.god}): Attitude: ${regionData.attitude}`);
                }
            }
        }

        lines.push("[/WHISPERLANDS WORLD]");
        return lines.join("\n");
    } catch (e) {
        console.error("[WL] BuildLoreInjection error:", e);
        return "";
    }
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
    const lines = [];
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
                <span class="wl-npc-label">${npc.label}<span class="wl-npc-rc"> ${npc.rc >= 0 ? "+" : ""}${npc.rc}</span></span>
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
                <span class="wl-inv-note">${item.note}</span>
            </div>
        </div>
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

    const currencyHtml = `
    <div class="wl-currency-inline">
        <span>🪙</span>
        <span class="wl-currency-coin">${s.currency.coin}</span>
        <span class="wl-currency-unit">${s.currency.unit}</span>
        ${s.currency.goods !== "—" && s.currency.goods !== "None" ?
            `<span class="wl-currency-goods-inline">(${s.currency.goods})</span>` : ""}
    </div>`;

    let statusTag = "";
    const rank = (s.player.rank || "").toLowerCase();
    const status = (s.player.status || "").toLowerCase();
    if (status.includes("wanted") || status.includes("розыск")) {
        statusTag = `<span class="wl-tag wl-tag-status-wanted">⚠ В розыске</span>`;
    } else if (status.includes("refugee") || status.includes("беженец")) {
        statusTag = `<span class="wl-tag wl-tag-status-refugee">🏚 Беженец</span>`;
    } else if (status.includes("exile") || status.includes("изгнан")) {
        statusTag = `<span class="wl-tag wl-tag-status-exile">⛓ Изгнанник</span>`;
    } else if (status.includes("noble") || status.includes("знать")) {
        statusTag = `<span class="wl-tag wl-tag-status-noble">👑 Знать</span>`;
    } else if (status.includes("hero") || status.includes("герой")) {
        statusTag = `<span class="wl-tag wl-tag-status-hero">⭐ Герой</span>`;
    }
    if (rank === "disciple") {
        statusTag += `<span class="wl-tag wl-tag-status-noble">🔮 Ученик</span>`;
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
                <span class="wl-sep">│</span>
                ${currencyHtml}
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
            <div class="wl-section-title">⚖ SEAL RELATIONS</div>
            <div class="wl-seals-grid">${sealsHtml}</div>
        </div>

        ${npcsHtml ? `
        <div class="wl-section">
            <div class="wl-section-title">❤ PRESENT</div>
            ${npcsHtml}
        </div>` : ""}

        ${invHtml ? `
        <div class="wl-inv-bag">
            <div class="wl-inv-title">🎒 INVENTORY</div>
            <div class="wl-inv-grid">${invHtml}</div>
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

    function InjectPrompt() {
        try {
            const stateText = kSystemPrompt + "\n\n" + BuildStateInjection() + "\n\n" + BuildLoreInjection();
            stContext.setExtensionPrompt(injectionId, stateText, 1, 0);
            console.log("[WL] Prompt injected, length:", stateText.length);
        } catch (e) {
            console.error("[WL] Prompt injection error:", e);
        }
    }

    if (stContext.eventTypes.GENERATION_STARTED) {
        stContext.eventSource.on(stContext.eventTypes.GENERATION_STARTED, InjectPrompt);
    }

    // Initial injection
    InjectPrompt();

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
