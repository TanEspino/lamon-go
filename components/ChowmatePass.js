import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

// Theme configuration
const THEMES = {
  daily_brew: {
    qrBg: '#FDF8F5', // Warm Crema
    qrDots: '#3E2723', // Deep Espresso
    button: '☕️',
    bgEmojis: ['☕️', '🤎', '🥐'],
    bgGradient: '#F5EBE6',
    label: 'Daily Brew'
  },
  comfort_bowl: {
    qrBg: '#FFFDE7', // Warm Yellow
    qrDots: '#D84315', // Spicy Red-Orange
    button: '🍜',
    bgEmojis: ['🍜', '🥟', '🥢'],
    bgGradient: '#FFF9C4',
    label: 'Comfort Bowl'
  },
  clean_balanced: {
    qrBg: '#F1F8E9', // Fresh Light Green
    qrDots: '#2E7D32', // Deep Forest Green
    button: '🥗',
    bgEmojis: ['🥗', '🥑', '🌱'],
    bgGradient: '#DCEDC8',
    label: 'Clean & Balanced'
  },
  midnight_snack: {
    qrBg: '#E0F7FA', // Cool Mint
    qrDots: '#006064', // Deep Teal
    button: '🌙',
    bgEmojis: ['🌙', '🍢', '🍻'],
    bgGradient: '#B2EBF2',
    label: 'Midnight Snack'
  }
};

// Fixed positions for the scattered background emojis to guarantee a deterministic design
const SCATTERED_POSITIONS = [
  { top: '8%', left: '12%', rotate: '15deg', size: 28 },
  { top: '10%', left: '78%', rotate: '-25deg', size: 34 },
  { top: '22%', left: '46%', rotate: '10deg', size: 24 },
  { top: '35%', left: '10%', rotate: '-15deg', size: 30 },
  { top: '38%', left: '80%', rotate: '35deg', size: 28 },
  { top: '55%', left: '12%', rotate: '40deg', size: 32 },
  { top: '64%', left: '74%', rotate: '-10deg', size: 26 },
  { top: '76%', left: '44%', rotate: '20deg', size: 36 },
  { top: '84%', left: '12%', rotate: '-30deg', size: 28 },
  { top: '88%', left: '78%', rotate: '15deg', size: 32 },
];

export default function ChowmatePass({ username = "lamongotester" }) {
  const [activeTheme, setActiveTheme] = useState('daily_brew');
  const viewShotRef = useRef(null);

  const theme = THEMES[activeTheme];

  // Action: Trigger export capture and share
  const handleShare = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        const sharingAvailable = await Sharing.isAvailableAsync();
        
        if (sharingAvailable) {
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Share your Chowmate Pass 🍕',
            mimeType: 'image/png'
          });
        } else {
          alert('Sharing is not supported on this platform.');
        }
      }
    } catch (error) {
      console.error('Error sharing Chowmate Pass:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. ViewShot (IG Story 9:16 Aspect Ratio) */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1.0 }}
        style={[styles.viewShot, { backgroundColor: theme.bgGradient }]}
      >
        {/* Scattered Emojis Wallpaper Background */}
        {SCATTERED_POSITIONS.map((pos, index) => {
          const emoji = theme.bgEmojis[index % theme.bgEmojis.length];
          return (
            <Text
              key={index}
              style={[
                styles.bgEmoji,
                {
                  top: pos.top,
                  left: pos.left,
                  fontSize: pos.size,
                  transform: [{ rotate: pos.rotate }],
                }
              ]}
            >
              {emoji}
            </Text>
          );
        })}

        {/* Centered White Card */}
        <View style={[styles.cardContainer, { shadowColor: theme.qrDots }]}>
          <Text style={[styles.header, { color: theme.qrDots }]}>Let's be Chowmates</Text>
          
          {/* QR Code Wrapper */}
          <View style={[styles.qrWrapper, { backgroundColor: theme.qrBg }]}>
            <QRCode
              value={`lamongo://add-chowmate/${username}`}
              size={220}
              color={theme.qrDots}
              backgroundColor={theme.qrBg}
              
              // Center Icon Setup (Temporarily commented out to prevent image asset crashes)
              // logo={require('./assets/icons/coffee-cup.png')}
              logoSize={55}
              logoBackgroundColor={theme.qrBg}
              logoMargin={4}
              logoBorderRadius={12}
            />
          </View>

          <Text style={[styles.username, { color: theme.qrDots }]}>@{username}</Text>
        </View>
      </ViewShot>

      {/* 2. Controls & Actions (Outside the ViewShot area) */}
      <View style={styles.controlsContainer}>
        {/* Horizontal Theme Selector */}
        <Text style={styles.sectionLabel}>Select Wallpaper Theme</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themesScrollView}
        >
          {Object.keys(THEMES).map((key) => {
            const isSelected = activeTheme === key;
            const t = THEMES[key];
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTheme(key)}
                style={[
                  styles.themeButton,
                  isSelected && styles.themeButtonSelected,
                  { borderColor: isSelected ? t.qrDots : 'rgba(0,0,0,0.1)' }
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.themeEmoji}>{t.button}</Text>
                <Text style={[styles.themeLabel, isSelected && { fontWeight: '800', color: t.qrDots }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Share Action Button */}
        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareButton}
          activeOpacity={0.8}
        >
          <Ionicons name="share-social-outline" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>Share Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  viewShot: {
    width: 320,
    height: 568, // Exactly 9:16 aspect ratio (IG Story Size)
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  bgEmoji: {
    position: 'absolute',
    opacity: 0.15, // Beautiful subtle wallpaper effect
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 24,
    alignItems: 'center',
    width: '82%',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 5,
  },
  header: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'Inter-Bold' : 'Inter',
    letterSpacing: -0.5,
  },
  qrWrapper: {
    padding: 10,
    borderRadius: 16,
  },
  username: {
    marginTop: 22,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'android' ? 'Inter-SemiBold' : 'Inter',
  },
  controlsContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingLeft: 4,
  },
  themesScrollView: {
    paddingBottom: 10,
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  themeButtonSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  themeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#00D2C4',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#00D2C4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});
