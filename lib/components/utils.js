export const get = (t, path) => path.split('.').reduce((r, k) => r?.[k], t);
