import React, { createContext, useContext, useState, useEffect } from 'react';
import { dataService } from '../services/data';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [permissions, setPermissions] = useState([]); // Array of permission keys for current user
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');

            if (storedUser && storedToken) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);
                await loadPermissions(parsedUser.role);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const loadPermissions = async (role) => {
        try {
            // We need a separate endpoint to get MY permissions or filter from the general one.
            // Since dataService.getPermissions() returns all, we filter here.
            // Ideally backend gives "my permissions", but we can use the existing list endpoint for now.
            // Note: getPermissions requires auth header, so token must be valid.
            const data = await dataService.getPermissions();
            const myPerms = data.rolePermissions
                .filter(rp => rp.role === role)
                .map(rp => rp.permission_key);
            setPermissions(myPerms);
        } catch (error) {
            console.error("Failed to load permissions", error);
            // Fallback?
        }
    };

    const login = async (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', authToken);
        await loadPermissions(userData.role);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setPermissions([]);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const isAdmin = () => {
        return user?.role === 'admin';
    };

    const hasPermission = (permKey) => {
        if (user?.role === 'admin') return true; // Admin has all implicitly
        return permissions.includes(permKey);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAdmin, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
