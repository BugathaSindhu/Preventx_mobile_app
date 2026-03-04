import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // In a real app, you'd check AsyncStorage here to persist login.
    // We'll keep it simple for now.

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const response = await authService.login(email, password);
            if (response.success) {
                setUser(response.user);
            }
            return response;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (userData) => {
        setIsLoading(true);
        try {
            const response = await authService.signup(userData);
            return response;
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
