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

/**
 * Update kit details (title, companyBrief, roleBreakdown, requirements)
 */
export async function updateKit(id, data) {
  return request(`/kits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an entire kit
 */
export async function deleteKit(id) {
  return request(`/kits/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Add a custom question to kit
 */
export async function addQuestion(id, questionData) {
  return request(`/kits/${id}/questions`, {
    method: 'POST',
    body: JSON.stringify(questionData),
  });
}

/**
 * Update an existing question
 */
export async function updateQuestion(id, questionId, questionData) {
  return request(`/kits/${id}/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(questionData),
  });
}

/**
 * Delete a question
 */
export async function deleteQuestion(id, questionId) {
  return request(`/kits/${id}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder questions
 */
export async function reorderQuestions(id, questionIds) {
  return request(`/kits/${id}/questions/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ questionIds }),
  });
}

/**
 * Update flashcard confidence / content
 */
export async function updateFlashcard(id, flashcardId, flashcardData) {
  return request(`/kits/${id}/flashcards/${flashcardId}`, {
    method: 'PATCH',
    body: JSON.stringify(flashcardData),
  });
}

/**
 * Regenerate Company Brief & Role Breakdown
 */
export async function regenerateBrief(id) {
  return request(`/kits/${id}/regenerate/brief`, {
    method: 'POST',
  });
}

/**
 * Regenerate questions for a specific category
 */
export async function regenerateCategoryQuestions(id, category) {
  return request(`/kits/${id}/regenerate/questions/${encodeURIComponent(category)}`, {
    method: 'POST',
  });
}

/**
 * Regenerate study schedule
 */
export async function regenerateSchedule(id) {
  return request(`/kits/${id}/regenerate/schedule`, {
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
  updateKit,
  deleteKit,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  updateFlashcard,
  regenerateBrief,
  regenerateCategoryQuestions,
  regenerateSchedule,
};

export default api;
