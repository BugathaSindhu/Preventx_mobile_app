import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HotspotsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.messageContainer}>
                <Text style={styles.title}>Hotspots Map</Text>
                <Text style={styles.messageText}>
                    The interactive map is not currently supported in the web browser preview.
                    Please use the Expo Go mobile app to view accident hotspots.
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    messageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    messageText: {
        color: '#aaa',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
});
