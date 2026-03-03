// Tiny module-level bridge for passing the pending call phone number
// to DemoPage independently of React prop timing.
let _phone = '';
export function setPendingPhone(p) { _phone = p || ''; }
export function getPendingPhone()  { return _phone; }
export function clearPendingPhone() { _phone = ''; }
