import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

export default function Button({ title, onPress, variant = 'primary', icon }) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const baseStyle = "p-4 rounded-xl items-center justify-center flex-row";
    const variantStyles = {
        primary: "bg-turquoise",
        secondary: "bg-gray-200 dark:bg-zinc-800",
        danger: "bg-red-500 dark:bg-red-600",
    };
    const textStyles = {
        primary: "text-gray-900 font-extrabold text-lg",
        secondary: "text-gray-800 dark:text-zinc-100 font-bold text-lg",
        danger: "text-white font-bold text-lg",
    };

    const getIconColor = () => {
        if (variant === 'primary') return '#111827';
        if (variant === 'danger') return '#FFFFFF';
        return isDark ? '#F3F4F6' : '#1F2937';
    };

    return (
        <TouchableOpacity
            className={`${baseStyle} ${variantStyles[variant]}`}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {icon && (
                <Ionicons 
                    name={icon} 
                    size={20} 
                    color={getIconColor()} 
                    style={{ marginRight: 10 }} 
                />
            )}
            <Text className={textStyles[variant]}>{title}</Text>
        </TouchableOpacity>
    );
}
