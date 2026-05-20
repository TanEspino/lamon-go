import { Platform } from 'react-native';
import { StyleSheet } from 'react-native-css-interop';

if (Platform.OS === 'web') {
  const originalGetFlag = StyleSheet.getFlag;
  StyleSheet.getFlag = (name) => {
    if (name === 'darkMode') {
      return 'class dark';
    }
    return originalGetFlag ? originalGetFlag(name) : undefined;
  };
}
