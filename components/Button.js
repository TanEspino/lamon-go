import { Text, TouchableOpacity } from 'react-native';

export default function Button({ title, onPress, variant = 'primary' }) {
    const baseStyle = "p-4 rounded-xl items-center justify-center";
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

    return (
        <TouchableOpacity
            className={`${baseStyle} ${variantStyles[variant]}`}
            onPress={onPress}
        >
            <Text className={textStyles[variant]}>{title}</Text>
        </TouchableOpacity>
    );
}
