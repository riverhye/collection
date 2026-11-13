// Write notifications for live queries. The repository calls notifyDbChanged() after every write,
// so screens refresh without depending on SQLite's native change events.

let version = 0;
const listeners = new Set<() => void>();

export function notifyDbChanged() {
  version++;
  listeners.forEach((notify) => notify());
}

export function subscribeDbChanges(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function getDbVersion() {
  return version;
}
