import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Keycloak from 'keycloak-js';

// 1. Define the Shape of our Auth State
interface AuthContextType {
    keycloak: Keycloak | null;
    authenticated: boolean;
    token: string | undefined;
    username: string | undefined;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. The Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
    const [authenticated, setAuthenticated] = useState(false);
    const isInitialized = useRef(false); // Prevents double-init in React Strict Mode

    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const kc = new Keycloak({
            url: 'http://localhost:8080',
            realm: 'shopping-realm',
            clientId: 'shopping-app',
        });

        kc.init({
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            pkceMethod: 'S256',
        })
            .then((auth) => {
                setKeycloak(kc);
                setAuthenticated(auth);

                // Token Refresh Logic: Keeps the session alive automatically
                setInterval(() => {
                    kc.updateToken(70).catch(() => {
                        console.error("Failed to refresh token");
                    });
                }, 60000); // Check every minute
            })
            .catch(console.error);
    }, []);

    const login = () => keycloak?.login();
    const logout = () => keycloak?.logout({ redirectUri: window.location.origin });

    const value = {
        keycloak,
        authenticated,
        token: keycloak?.token,
        username: (keycloak?.tokenParsed as any)?.preferred_username,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Only render children once Keycloak has attempted to initialize.
        This prevents the app from flashing "Logged Out" while checking status.
      */}
            {keycloak ? children : <div>Loading Security...</div>}
        </AuthContext.Provider>
    );
};

// 3. The Hook for easy access
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
