import { useEffect, useState } from 'react';

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 300;

let count = 0;
const genId = () => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
};

const TOAST_ADD = 'ADD_TOAST';
const TOAST_UPDATE = 'UPDATE_TOAST';
const TOAST_DISMISS = 'DISMISS_TOAST';
const TOAST_REMOVE = 'REMOVE_TOAST';

const timeouts = new Map();

const store = {
  state: { toasts: [] },
  listeners: new Set(),
};

function dispatch(action) {
  const { state } = store;

  switch (action.type) {
  case TOAST_ADD: {
    const next = [action.toast, ...state.toasts];
    store.state = { toasts: next.slice(0, TOAST_LIMIT) };
    break;
  }
  case TOAST_UPDATE: {
    const { id, patch } = action;
    store.state = {
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    break;
  }
  case TOAST_DISMISS: {
    const ids = action.id ? [action.id] : state.toasts.map((t) => t.id);
    ids.forEach((id) => {
      _update(id, { open: false });
      if (!timeouts.has(id)) {
        const timeout = setTimeout(() => _remove(id), TOAST_REMOVE_DELAY);
        timeouts.set(id, timeout);
      }
    });
    break;
  }
  case TOAST_REMOVE: {
    const id = action.id;
    if (timeouts.has(id)) {
      clearTimeout(timeouts.get(id));
      timeouts.delete(id);
    }
    store.state = { toasts: state.toasts.filter((t) => t.id !== id) };
    break;
  }
  default:
    break;
  }

  store.listeners.forEach((l) => l(store.state));
}

function _add(toast) {
  dispatch({ type: TOAST_ADD, toast });
}
function _update(id, patch) {
  dispatch({ type: TOAST_UPDATE, id, patch });
}
function _dismiss(id) {
  dispatch({ type: TOAST_DISMISS, id });
}
function _remove(id) {
  dispatch({ type: TOAST_REMOVE, id });
}

export function toast(opts = {}) {
  const id = genId();
  const { duration = 5000, title, description, action, ...rest } = opts;

  const t = {
    id,
    title,
    description,
    action,
    duration,
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        _dismiss(id);
      }
    },
    ...rest,
  };

  _add(t);

  if (duration !== Infinity) {
    const timeout = setTimeout(() => _dismiss(id), duration);
    timeouts.set(id, timeout);
  }

  return {
    id,
    dismiss: () => _dismiss(id),
    update: (patch) => _update(id, patch),
  };
}

export function dismiss(id) {
  _dismiss(id);
}

export function useToast() {
  const [state, setState] = useState(store.state);

  useEffect(() => {
    const listener = (s) => setState(s);
    store.listeners.add(listener);
    return () => {
      store.listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const ids = new Set(state.toasts.map((t) => t.id));
    Array.from(timeouts.keys()).forEach((id) => {
      if (!ids.has(id)) {
        clearTimeout(timeouts.get(id));
        timeouts.delete(id);
      }
    });
  }, [state.toasts]);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}
