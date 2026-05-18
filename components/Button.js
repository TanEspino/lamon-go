import { Text, TouchableOpacity } from 'react-native';

export default function Button({ title, onPress, variant = 'primary' }) {
    const baseStyle = "p-4 rounded-xl items-center justify-center";
    const variantStyles = {
        primary: "bg-turquoise",
        secondary: "bg-gray-200",
        danger: "bg-red-500",
    };
    const textStyles = {
        primary: "text-white font-bold text-lg",
        secondary: "text-gray-800 font-bold text-lg",
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
