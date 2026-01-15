// src/services/apiService.js

// In dev, Vite proxy handles routing to backend
const API_BASE_URL = "http://localhost:5297/api";

class ApiService {
async login(email, password) {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Email: email, Password: password }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
}


  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  }

  async getRoles() {
    const response = await fetch(`${API_BASE_URL}/roles`);
    if (!response.ok) throw new Error("Failed to fetch roles");
    return response.json();
  }

  async getRolesForSettings() {
    const response = await fetch(`${API_BASE_URL}/roles/frontend`);
    if (!response.ok) throw new Error("Failed to fetch roles for add user");
    return response.json();
  }

  async createUser(userData) {
    const payload = {
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      RoleId: userData.roleId,
      IsActive: true,
    };

    const response = await fetch(`${API_BASE_URL}/Users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Create user failed"));
    return this._readJsonOrSuccess(response, "User created successfully");
  }

  async updateUser(userId, userData) {
    const payload = {
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      RoleId: userData.roleId,
      IsActive: userData.isActive ?? true,
    };

    const response = await fetch(`${API_BASE_URL}/Users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Update user failed"));
    return this._readJsonOrSuccess(response, "User updated successfully");
  }

  async changePassword(userId, data) {
    const response = await fetch(`${API_BASE_URL}/Users/${userId}/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        CurrentPassword: data.currentPassword,
        NewPassword: data.newPassword,
        ConfirmPassword: data.confirmPassword,
      }),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Change password failed"));
    return this._readJsonOrSuccess(response, "Password changed successfully");
  }

  async resetPassword(email) {
    const response = await fetch(`${API_BASE_URL}/Users/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Email: email }),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Reset password failed"));
    return this._readJsonOrSuccess(response, "Reset password email sent");
  }

  async _readJsonOrSuccess(response, msg) {
    const len = response.headers.get("content-length");
    if (!len || len === "0") return { success: true, message: msg };
    try { return await response.json(); }
    catch { return { success: true, message: msg }; }
  }

  async _readError(response, fallback) {
    try {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return json.message || json.error || json.title || text || fallback;
      } catch {
        return text || fallback;
      }
    } catch {
      return fallback;
    }
  }
}

export default new ApiService();
