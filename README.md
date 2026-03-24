# ✦ Whisperlands — RPG State Tracker for SillyTavern

<p align="center">
  <img src="https://i.postimg.cc/wTc1Xv1h/Sdelaj-ee-v-drugoj-poze-v-odezde-bolee-fentezi-ku-2026-03-24-08-49-29.jpg" alt="Whisperlands banner" width="100%">
</p>

<p align="center">
  A custom <b>RPG state tracker extension</b> for <b>SillyTavern</b>, created for my own lore-heavy world and roleplay card: <b>Whisperlands</b>.
</p>

<p align="center">
  Track location, time, relationships, inventory, currency, quests, and world-state directly inside chat.
</p>

---

## ✦ What this is

**Whisperlands** is a companion extension for my SillyTavern card and setting.

It parses a structured XML block from assistant replies, stores the current state locally per chat, injects that state back into the prompt during future generations, and renders everything as a styled in-message status hub.

In short:  
this is me taking my own lore and turning it into a proper little RPG system.

---

## ✦ Features

The tracker can display and maintain:

- **Current day / time / location / region**
- **Player identity, rank, seal, sigillati, and status**
- **Seal relations**
- **Present NPCs and relationship changes**
- **Inventory**
- **Currency**
  - copper
  - silver
  - gold
- **Active quest**
- **Inner thoughts / scene state**
- **Per-chat saved state**
- **Theme switching**
- **RU / EN interface support**

It also includes:

- built-in enable / disable toggle inside SillyTavern
- multiple UI themes
- compact multi-column inventory display
- live theme switching, including already rendered tracker hubs

---

## ✦ About memory / persistence

**Important:** this extension does **not** magically change the model's native memory.

What it does is:

1. read the structured RPG state from the assistant reply
2. save that state **locally per chat**
3. inject the saved state back into the prompt on future generations

So the roleplay becomes much better at maintaining continuity across the session.

It can help preserve things like:

- current world position
- inventory
- relationship values
- active quest
- currency
- recent RPG status changes

---

## ✦ Installation

Install it like a normal **SillyTavern extension**.

---

## ✦ Companion card

**Card + attached lorebook with vectors:**  
https://pixeldrain.com/u/NTt9cGaD

The lorebook is attached to the card, but I’m linking it separately below too just in case it doesn’t bind properly for someone.

---

## ✦ Lorebook

**Separate lorebook download — lorebook with vectors:**  
https://pixeldrain.com/u/XPcNTK5T

### Why vectors?

Because a regular keyword-only lorebook does **not** reveal this setting nearly as well as I want it to.

Whisperlands is lore-heavy, and the vector setup helps the bot access the world information in a much richer and more reliable way.

---

## ✦ World references

### Whisperlands Encyclopedia (RU / ENG)
https://kanonmama.github.io/Whisperlands_encyclopedia/

### Visual lorebook (RU / ENG)
https://heyzine.com/flip-book/5c2cf286a0.html

> Warning: the visual lorebook includes music.

---

## ✦ Author

If you want to see more of my bots / cards:

**JanitorAI profile:**  
https://janitorai.com/profiles/0d0dc7ff-06c1-4a85-8267-3d749d42ac5e_profile-of-kanon-mama

---

## ✦ Notes

- This extension is designed for the **Whisperlands** setting first, not as a universal RPG tracker for every bot without edits.
- It expects the assistant reply to include the required XML block.
- If the XML is missing or malformed, the tracker will not update correctly.
- Currency is fixed to:
  - `copper`
  - `silver`
  - `gold`
- State is stored locally in browser storage per chat.

---

## ✦ Why I made this

Because I wanted my own card to actually behave like a proper RPG experience: with continuity, tracked world-state, relationships, inventory, quests, and a UI that looks like it belongs in the setting.

And yes, also because I wanted to go completely feral with my own lore.
