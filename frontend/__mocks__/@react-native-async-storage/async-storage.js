const store = {};

const AsyncStorage = {
  getItem: jest.fn((key) => {
    return Promise.resolve(store[key] || null);
  }),
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys) => {
    return Promise.resolve(keys.map((key) => [key, store[key] || null]));
  }),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([key, value]) => {
      store[key] = value;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => {
      delete store[key];
    });
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    return Promise.resolve();
  }),
  _getStore: () => store,
  _reset: () => {
    Object.keys(store).forEach((key) => delete store[key]);
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
    AsyncStorage.multiGet.mockClear();
    AsyncStorage.multiSet.mockClear();
    AsyncStorage.multiRemove.mockClear();
    AsyncStorage.clear.mockClear();
  },
};

export default AsyncStorage;
