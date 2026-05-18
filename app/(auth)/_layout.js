import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="setup-profile" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
    );
}
