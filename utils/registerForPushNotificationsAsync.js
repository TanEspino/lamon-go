import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') {
        console.log('Push notifications are not supported on web.');
        return null;
    }

    if (!Device.isDevice) {
        console.log('Must use a physical device for Push Notifications. Simulators will not receive push tokens.');
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token because notification permissions were denied!');
            return null;
        }

        // Retrieve project ID from expoConfig
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        if (!projectId) {
            console.warn(
                '⚠️ EAS Project ID not found in app.json. For production push notifications, make sure to run "eas project:init" or set extra.eas.projectId in your app.json.'
            );
        }

        // Get the token using Expo's push service
        const tokenData = await Notifications.getExpoPushTokenAsync({
            ...(projectId ? { projectId } : {}),
        });

        console.log('🎫 Expo Push Token successfully retrieved:', tokenData.data);
        
        // Handle Android channel setup
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#E11D48',
            });
        }

        return tokenData.data;
    } catch (error) {
        console.error('❌ Error during registerForPushNotificationsAsync:', error);
        return null;
    }
}
