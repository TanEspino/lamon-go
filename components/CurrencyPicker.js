import { View, Text, Modal, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useColorScheme } from 'nativewind';

const COMMON_CURRENCIES = [
    'PHP', 'USD', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'HKD', 'CNY', 'KRW', 'INR', 'IDR', 'MYR', 'THB', 'VND',
    'AED', 'BRL', 'CHF', 'MXN', 'NZD', 'SAR', 'TRY', 'TWD', 'ZAR'
].sort();

export default function CurrencyPicker({ visible, onClose, onSelect, currentCurrency }) {
    const [search, setSearch] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const filteredCurrencies = COMMON_CURRENCIES.filter(c =>
        c.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white dark:bg-zinc-900 rounded-t-3xl h-3/4 p-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-black dark:text-white">Select Currency</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close-circle" size={30} color={isDark ? "#3F3F46" : "#E5E7EB"} />
                        </Pressable>
                    </View>
 
                    <View className={`bg-gray-100 dark:bg-zinc-800 border rounded-xl px-4 py-3 mb-4 flex-row items-center ${isFocused ? 'border-blue-500 bg-white dark:bg-zinc-900' : 'border-transparent'}`}>
                        <Ionicons name="search" size={20} color={isFocused ? "#3B82F6" : (isDark ? "#71717A" : "#9CA3AF")} />
                        <TextInput
                            className="flex-1 ml-2 text-base text-black dark:text-white"
                            placeholder="Search currency..."
                            placeholderTextColor={isDark ? "#71717A" : "#9CA3AF"}
                            value={search}
                            onChangeText={setSearch}
                            autoCapitalize="characters"
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{ outlineStyle: 'none' }}
                        />
                    </View>
 
                    <FlatList
                        data={filteredCurrencies}
                        keyExtractor={item => item}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                                className={`flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800 ${item === currentCurrency ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                            >
                                <Text className={`text-lg ${item === currentCurrency ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-zinc-100'}`}>{item}</Text>
                                {item === currentCurrency && <Ionicons name="checkmark" size={24} color={isDark ? "#60A5FA" : "#2563EB"} />}
                            </Pressable>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
}
