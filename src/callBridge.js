// Use window to guarantee a true singleton across Vite's code-split chunks.
// A module-level variable would be duplicated (inlined) into each chunk.
export function setPendingPhone(p)  { window.__smqCallPhone = p || ''; }
export function getPendingPhone()   { return window.__smqCallPhone || ''; }
export function clearPendingPhone() { window.__smqCallPhone = ''; }
