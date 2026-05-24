import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { toByteArray } from 'base64-js';

/**
 * Prepares a local file URI (from image picker or image manipulator) into an uploadable
 * binary data object (Blob for Web, Uint8Array for Native iOS/Android).
 * This completely avoids empty/blank file uploads due to fetch(uri).blob() bugs on React Native.
 * 
 * @param {string} uri - The local file URI (e.g. file://... or blob:http...)
 * @returns {Promise<Blob|Uint8Array>} The binary payload ready for Supabase storage upload.
 */
export const prepareUploadPayload = async (uri) => {
    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob;
    } else {
        // Read file as Base64 on Native to guarantee it isn't blank/0 bytes, then convert to Uint8Array
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });
        return toByteArray(base64);
    }
};
