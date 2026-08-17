// The preferences store persists through AsyncStorage, so anything that reads
// theme colours or formatting pulls the native module into the test run.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
