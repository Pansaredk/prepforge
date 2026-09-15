const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Generic request helper with JSON headers and credentials included
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Required to send and receive HttpOnly session cookies across origins
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Register a new user
 */
export async function register(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Login user
 */
export async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Logout user
 */
export async function logout() {
  return request('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Get current authenticated user
 */
export async function getMe() {
  return request('/auth/me', {
    method: 'GET',
  });
}

/**
 * Access protected test endpoint
 */
export async function getProtectedTest() {
  return request('/auth/protected-test', {
    method: 'GET',
  });
}

/**
 * Create a new interview kit
 */
export async function createKit(kitData) {
  return request('/kits', {
    method: 'POST',
    body: JSON.stringify(kitData),
  });
}

/**
 * List all kits for the authenticated user
 */
export async function getKits() {
  return request('/kits', {
    method: 'GET',
  });
}

/**
 * Get a specific kit by ID
 */
export async function getKitById(id) {
  return request(`/kits/${id}`, {
    method: 'GET',
  });
}

/**
 * Trigger generation for a kit
 */
export async function generateKit(id) {
  return request(`/kits/${id}/generate`, {
    method: 'POST',
  });
}

const api = {
  register,
  login,
  logout,
  getMe,
  getProtectedTest,
  createKit,
  getKits,
  getKitById,
  generateKit,
};

export default api;
