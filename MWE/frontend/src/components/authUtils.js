const TOKEN_KEY = 'jwt_token';

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

const USERNAME_KEY = 'username'; // Define a constant for consistency

export const setUsername = (username) => {
    localStorage.setItem(USERNAME_KEY, username);
    console.log(`[authUtils] SET: Username stored in localStorage under key '${USERNAME_KEY}' with value:`, username);
};

export const getUsername = () => {
    const username = localStorage.getItem(USERNAME_KEY);
    console.log(`[authUtils] GET: Retrieved username from localStorage under key '${USERNAME_KEY}':`, username);
    return username;
};

export const getAuthHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const getAuthHeadersMultipart = () => {
    const token = getToken();
    return {
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

// authUtils.js - Add this function
export const refreshTokenIfNeeded = async () => {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) return false;

        // Check if token is expired or about to expire
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        if (exp - now < bufferTime) {
            // Token is about to expire, refresh it
            const response = await fetch('http://127.0.0.1:5001/refresh-token', {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('jwt_token', data.token);
                console.log('Token refreshed successfully');
                return true;
            } else {
                console.warn('Token refresh failed');
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
};

// Add to authUtils.js
export const validateToken = () => {
    const token = getToken();
    if (!token) return false;
    
    try {
        // Check if token is expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        
        if (exp < now) {
            console.log('Token has expired');
            removeToken();
            return false;
        }
        
        console.log('Token is valid, user:', payload.username, 'role:', payload.role);
        return true;
    } catch (error) {
        console.error('Error validating token:', error);
        removeToken();
        return false;
    }
};