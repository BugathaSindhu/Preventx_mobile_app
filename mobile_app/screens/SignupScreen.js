import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../components/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { signup } = useContext(AuthContext);

    const handleSignup = async () => {
        if (!name || !email || !phone || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await signup({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password,
                role
            });
            if (res.success) {
                Alert.alert('Success', 'Account created successfully!', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') }
                ]);
            }
        } catch (error) {
            Alert.alert('Signup Failed', error.error || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.iconText}>🛡️</Text>
                        </View>
                        <Text style={styles.title}>PreventX</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Create Account</Text>
                    <Text style={styles.sectionSubtitle}>Join to continue exploring.</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />
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

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+91XXXXXXXXXX"
                            placeholderTextColor="#94a3b8"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
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

                    <View style={styles.roleContainer}>
                        <Text style={styles.roleLabel}>Select Role:</Text>
                        <View style={styles.roleButtonGroup}>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'user' && styles.roleButtonActive]}
                                onPress={() => setRole('user')}
                            >
                                <Text style={[styles.roleButtonText, role === 'user' && styles.roleButtonTextActive]}>User</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
                                onPress={() => setRole('admin')}
                            >
                                <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>Admin</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isSubmitting && styles.buttonDisabled]}
                        onPress={handleSignup}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.linkText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#102216', // Dark background
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        paddingTop: 48,
        paddingBottom: 24,
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
    roleContainer: {
        marginBottom: 24,
    },
    roleLabel: {
        color: '#cbd5e1',
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    roleButtonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roleButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(19, 236, 91, 0.2)',
        backgroundColor: 'rgba(19, 236, 91, 0.05)',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    roleButtonActive: {
        backgroundColor: '#13ec5b',
        borderColor: '#13ec5b',
    },
    roleButtonText: {
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    roleButtonTextActive: {
        color: '#102216',
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
