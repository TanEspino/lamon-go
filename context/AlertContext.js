import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import Button from '../components/Button';

const AlertContext = createContext(null);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return { showAlert: context.showAlert, hideAlert: context.hideAlert };
};

export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState(null);

    const showAlert = useCallback((title, message, buttons) => {
        setAlert({
            title,
            message,
            buttons: buttons || [{ text: 'OK' }],
            visible: true
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(prev => {
            if (!prev) return null;
            return { ...prev, visible: false };
        });
        
        // Short timeout before completely unmounting so transitions feel smooth
        setTimeout(() => {
            setAlert(null);
        }, 200);
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert, alert }}>
            {children}
        </AlertContext.Provider>
    );
};

export const CustomAlert = () => {
    const context = useContext(AlertContext);
    if (!context) return null;
    
    const { alert, hideAlert } = context;
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!alert || !alert.visible) return null;

    return (
        <View style={[StyleSheet.absoluteFillObject, styles.wrapper]} className="z-[99999]">
            {/* Dimmed Backdrop */}
            <Pressable 
                style={StyleSheet.absoluteFillObject} 
                onPress={hideAlert}
            />
            
            {/* Content Card */}
            <View style={[
                styles.card,
                {
                    backgroundColor: isDark ? '#151C2E' : '#ffffff',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'
                }
            ]}>
                {alert.title && (
                    <Text style={[
                        styles.title,
                        { color: isDark ? '#ffffff' : '#111827' }
                    ]}>
                        {alert.title}
                    </Text>
                )}
                {alert.message && (
                    <Text style={[
                        styles.message,
                        { color: isDark ? '#ffffff' : '#4b5563' }
                    ]}>
                        {alert.message}
                    </Text>
                )}
                <View style={[
                    styles.buttonContainer,
                    alert.buttons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
                ]}>
                    {alert.buttons.map((btn, index) => {
                        const onPress = () => {
                            hideAlert();
                            if (btn.onPress) {
                                // Short deferral to ensure overlay has started unmounting
                                setTimeout(() => {
                                    btn.onPress();
                                }, 150);
                            }
                        };
                        
                        // Determine button variant based on style
                        let variant = 'primary';
                        if (btn.style === 'destructive') {
                            variant = 'danger';
                        } else if (btn.style === 'cancel') {
                            variant = 'secondary';
                        } else if (alert.buttons.length > 1 && index === 0) {
                            variant = 'secondary';
                        }

                        return (
                            <View key={index} style={[
                                alert.buttons.length > 2 
                                    ? styles.verticalButtonWrapper 
                                    : styles.horizontalButtonWrapper,
                                index > 0 && (alert.buttons.length > 2 ? { marginTop: 10 } : { marginLeft: 12 })
                            ]}>
                                <Button
                                    title={btn.text}
                                    onPress={onPress}
                                    variant={variant}
                                    icon={btn.icon}
                                />
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        elevation: 9999,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
        marginBottom: 24,
        textAlign: 'center',
    },
    buttonContainer: {
        width: '100%',
    },
    buttonContainerHorizontal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buttonContainerVertical: {
        flexDirection: 'column',
    },
    horizontalButtonWrapper: {
        flex: 1,
    },
    verticalButtonWrapper: {
        width: '100%',
    }
});
