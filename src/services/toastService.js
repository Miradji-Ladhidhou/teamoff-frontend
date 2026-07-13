const listeners = [];

export const toastService = {
  _toasts: [],
  _id: 0,

  add(message, type = 'success', duration = 4000) {
    const id = ++this._id;
    const toast = { id, message, type };
    this._toasts = [...this._toasts, toast];
    listeners.forEach(fn => fn([...this._toasts]));
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
    return id;
  },

  remove(id) {
    this._toasts = this._toasts.filter(t => t.id !== id);
    listeners.forEach(fn => fn([...this._toasts]));
  },

  subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  },
};
