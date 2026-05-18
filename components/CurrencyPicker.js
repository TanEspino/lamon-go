import { View, Text, Modal, FlatList, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const COMMON_CURRENCIES = [
    'PHP', 'USD', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'HKD', 'CNY', 'KRW', 'INR', 'IDR', 'MYR', 'THB', 'VND'
].sort();

export default function CurrencyPicker({ visible, onClose, onSelect, currentCurrency }) {
    const [search, setSearch] = useState('');

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
                <View className="bg-white rounded-t-3xl h-3/4 p-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold">Select Currency</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close-circle" size={30} color="#E5E7EB" />
                        </Pressable>
                    </View>

                    <View className="bg-gray-100 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            className="flex-1 ml-2 text-base"
                            placeholder="Search currency..."
                            value={search}
                            onChangeText={setSearch}
                            autoCapitalize="characters"
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
                                className={`flex-row justify-between items-center p-4 border-b border-gray-100 ${item === currentCurrency ? 'bg-blue-50' : ''}`}
                            >
                                <Text className={`text-lg ${item === currentCurrency ? 'font-bold text-blue-600' : 'text-gray-900'}`}>{item}</Text>
                                {item === currentCurrency && <Ionicons name="checkmark" size={24} color="#2563EB" />}
                            </Pressable>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );
}
