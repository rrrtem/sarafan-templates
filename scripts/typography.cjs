// Apply to plain text (HTML markup must be handled separately).
// Horizontal whitespace only: explicit line and paragraph breaks remain intact.
const preposition = /(?<![\p{L}\p{N}_])(?:в|во|на|с|со|к|ко|о|об|обо|от|ото|до|из|изо|за|у|по|под|подо|над|при|про|без|безо|для|перед|передо|через|между|около|возле|после|среди|кроме|ради|вне|вдоль|против|благодаря|согласно)[ \t\u00a0]+(?=[\p{L}\p{N}«„“"(])/giu;
exports.bindPrepositions = text => String(text).replace(preposition, match => match.replace(/[ \t\u00a0]+$/u, '\u00a0'));
