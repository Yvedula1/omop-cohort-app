// mockAuth.js
// Simple client-side mock authentication using localStorage

const USERS_KEY = "mock_users";
const CURRENT_USER_KEY = "mock_current_user";

export const mockAuth = {
  // Register a new user
  register(email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");

    if (users[email]) {
      throw new Error("User already exists");
    }

    users[email] = { password };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, email);
  },

  // Login existing user
  login(email, password) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");

    if (!users[email]) {
      throw new Error("Account not found");
    }

    if (users[email].password !== password) {
      throw new Error("Invalid password");
    }

    localStorage.setItem(CURRENT_USER_KEY, email);
  },

  // Mock password reset
  resetPassword(email) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");

    if (!users[email]) {
      throw new Error("Account not found");
    }

    // Mock behavior: pretend email was sent
    return true;
  },

  // Logout
  logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  // Check auth state
  isLoggedIn() {
    return Boolean(localStorage.getItem(CURRENT_USER_KEY));
  },

  // Get current user
  currentUser() {
    return localStorage.getItem(CURRENT_USER_KEY);
  }
};
