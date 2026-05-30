import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View, StyleSheet, Platform, Pressable } from 'react-native';
import { useState } from 'react';

export default function PhotoCard({ 
    item, 
    onPress, 
    onSavePress 
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Format rating cleanly (e.g. '★ 5.0' -> '5')
    const cleanRating = () => {
        if (!item.verdictRating) return '5';
        const ratingStr = String(item.verdictRating).replace(/★/g, '').trim();
        const num = parseFloat(ratingStr);
        return isNaN(num) ? '5' : num.toFixed(0);
    };

    // Main text content (comment/verdict comment/body text)
    const displayComment = item.bodyText || item.verdictComment || '';
    const shouldShowReadMore = displayComment.length > 100;

    return (
        <Pressable 
            onPress={onPress}
            style={styles.container}
        >
            {/* 1. Header (Unified & Premium) */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image 
                        source={{ uri: item.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' }} 
                        style={styles.avatar} 
                    />
                    <View>
                        <Text style={styles.username}>@{item.username || 'foodie_explorer'}</Text>
                        <View style={styles.dateRow}>
                            <Text style={styles.dateText}>{item.date || 'Oct 12, 2023'}</Text>
                            <Ionicons 
                                name="people-outline" 
                                size={12} 
                                color="#71717a" 
                                style={styles.headerPeopleIcon}
                            />
                        </View>
                    </View>
                </View>

                {/* Right-aligned recommended badge */}
                {item.isRecommended !== false && (
                    <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>
                            CHOWMATE RECO
                        </Text>
                    </View>
                )}
            </View>

            {/* 2. Media (Frameless & Full Width - No overlay elements) */}
            <View style={styles.mediaContainer}>
                <Image 
                    source={{ uri: item.photoUrl }} 
                    style={styles.mediaImage} 
                    resizeMode="cover"
                />
            </View>

            {/* 3. Anchored Info Block (With Teal vertical bar) */}
            <View style={styles.infoBlockContainer}>
                <View style={styles.infoBlockTealBar} />
                <View style={styles.infoBlockContent}>
                    <View style={styles.titleRow}>
                        <Text style={styles.dishTitle}>
                            {item.dishTitle}
                        </Text>
                        
                        {/* Soft rose rating pill badge */}
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color="#E11D48" style={styles.ratingStarIcon} />
                            <Text style={styles.ratingText}>
                                {cleanRating()}
                            </Text>
                        </View>
                    </View>

                    {/* Location / Price Row */}
                    <View style={styles.locationPriceRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                            <Ionicons 
                                name="location-outline" 
                                size={12} 
                                color="#71717a" 
                                style={styles.locationIcon}
                            />
                            <Text style={[styles.locationText, { flexShrink: 1 }]}>
                                {item.location || 'Trattoria Milano'}
                            </Text>
                        </View>
                        {item.price && (
                            <>
                                <Text style={[styles.bulletText, { marginHorizontal: 4 }]}> • </Text>
                                <Text style={styles.priceText}>{item.price}</Text>
                            </>
                        )}
                    </View>
                </View>
            </View>

            {/* 4. Body Text (Clean block under title/location) */}
            {!!displayComment && (
                <View style={styles.bodyContainer}>
                    <Text 
                        numberOfLines={isExpanded ? undefined : 2}
                        style={styles.bodyText}
                    >
                        {displayComment}
                    </Text>
                    {shouldShowReadMore && (
                        <TouchableOpacity 
                            onPress={() => setIsExpanded(!isExpanded)}
                            style={styles.readMoreButton}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.readMoreText}>
                                {isExpanded ? 'Show Less' : 'Read More'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* 5. Footer Interaction Block (High-fidelity design matches image exactly) */}
            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    {/* Teal circle containing bed and gas station icons */}
                    <View style={styles.tealCircleBadge}>
                        <MaterialCommunityIcons name="bed" size={14} color="#ffffff" style={{ marginRight: 1 }} />
                        <MaterialCommunityIcons name="gas-station" size={14} color="#ffffff" />
                    </View>

                    {/* Solid teal group pill badge */}
                    <TouchableOpacity style={styles.groupPillBadge} activeOpacity={0.8}>
                        <Ionicons name="people" size={13} color="#ffffff" style={{ marginRight: 3 }} />
                        <Text style={styles.groupPillText}>3.0</Text>
                        <Ionicons name="chevron-forward" size={11} color="#ffffff" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                </View>

                {/* bookmark interaction - solid red bookmark banner */}
                <TouchableOpacity 
                    onPress={onSavePress}
                    style={styles.saveButton}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name={item.isSaved ? "bookmark" : "bookmark-outline"} 
                        size={22} 
                        color={item.isSaved ? '#E11D48' : '#d1d5db'} 
                    />
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    username: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dateText: {
        fontSize: 11,
        color: '#71717a',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    headerPeopleIcon: {
        marginLeft: 6,
    },
    recommendedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E11D48',
        backgroundColor: 'transparent',
    },
    recommendedBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#E11D48',
        letterSpacing: 0.5,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 4/5,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    infoBlockContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4,
    },
    infoBlockTealBar: {
        width: 3.5,
        backgroundColor: '#00D2C4',
        borderRadius: 2,
        marginRight: 12,
    },
    infoBlockContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    dishTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        flex: 1,
        paddingRight: 12,
        lineHeight: 22,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
    },
    ratingStarIcon: {
        marginRight: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    locationPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    locationIcon: {
        marginRight: 4,
    },
    locationText: {
        fontSize: 12,
        color: '#4B5563',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    bulletText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    priceText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#111827',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    bodyContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingLeft: 31.5, // matches indentation with title/location text content due to teal bar
    },
    bodyText: {
        fontSize: 13,
        lineHeight: 18,
        color: '#374151',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    readMoreButton: {
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    readMoreText: {
        fontSize: 13,
        color: '#00D2C4',
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 31.5, // matches indentation with title/location text content due to teal bar
        paddingRight: 16,
        paddingVertical: 12,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tealCircleBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#00D2C4',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00D2C4',
        paddingHorizontal: 10,
        height: 30,
        borderRadius: 15,
        marginLeft: 8,
    },
    groupPillText: {
        color: '#ffffff',
        fontWeight: '800',
        fontSize: 12.5,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    saveButton: {
        padding: 4,
    },
});

