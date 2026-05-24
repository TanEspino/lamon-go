import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export const savePass = async ({ viewShotRef }) => {
    try {
        if (!viewShotRef.current) {
            Alert.alert("Error", "Pass card is not ready for snapshot.");
            return;
        }

        // Snap the view hierarchy directly (automatically includes SVG & Center logo image)
        const uri = await captureRef(viewShotRef, {
            format: 'png',
            quality: 1.0,
        });

        // Utilize native sharing dialog to save to photos or send
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Save your Chowmate Pass',
                UTI: 'public.png'
            });
        } else {
            Alert.alert("Error", "Sharing is not available on this device.");
        }
    } catch (error) {
        console.error("Failed to save native QR Code", error);
        Alert.alert("Error", "Failed to save or share the QR Code.");
    }
};
