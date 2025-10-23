export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('jwt_token');

    if (!token) {
        // Redirect user to login if no token exists
        window.location.href = '/login'; 
        throw new Error('Authentication required.');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`, // Attach the token
        'Content-Type': 'application/json',
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        // Token invalid/expired/unauthorized - force logout
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
        throw new Error('Session expired or unauthorized.');
    }
    
    return response;
};