import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../components/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useContext(AuthContext);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : (error.error || error.message || 'Invalid credentials');
            Alert.alert('Login Failed', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>🛡️</Text>
                </View>
                <Text style={styles.title}>PreventX</Text>
                <Text style={styles.subtitle}>Safety monitoring & risk prediction</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Welcome Back</Text>
                <Text style={styles.sectionSubtitle}>Sign in to your dashboard to monitor risks</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="name@company.com"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, isSubmitting && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                        <Text style={styles.linkText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#102216', // Dark background
    },
    header: {
        alignItems: 'center',
        paddingTop: 48,
        paddingBottom: 24,
        paddingHorizontal: 24,
    },
    iconContainer: {
        backgroundColor: 'rgba(19, 236, 91, 0.2)',
        padding: 12,
        borderRadius: 16,
        marginBottom: 16,
    },
    iconText: {
        fontSize: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#cbd5e1',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(19, 236, 91, 0.05)',
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 20,
        color: '#ffffff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 91, 0.2)',
    },
    button: {
        backgroundColor: '#13ec5b',
        borderRadius: 8,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    buttonDisabled: {
        backgroundColor: '#13ec5b',
        opacity: 0.5,
    },
    buttonText: {
        color: '#102216',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    footerText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    linkText: {
        fontSize: 14,
        color: '#13ec5b',
        fontWeight: 'bold',
    },
});
