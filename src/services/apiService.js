// src/services/apiService.js

// In dev (vite dev): VITE_API_BASE_URL=/api — Vite proxy routes /api → http://localhost:5297
// In production (vite build): VITE_API_BASE_URL=https://api.websmartassistant.com/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// API Keys for authentication
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY || "dev-admin-key-12345";

class ApiService {

  // Helper method to build headers with admin authentication
  _buildAdminHeaders(additionalHeaders = {}) {
    return {
      "X-Admin-Api-Key": ADMIN_API_KEY,
      ...additionalHeaders
    };
  }
async login(email, password) {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ Email: email, Password: password }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
}


  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this._buildAdminHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  }

  async getRoles() {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      headers: this._buildAdminHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch roles");
    return response.json();
  }

  async getRolesForSettings() {
    const response = await fetch(`${API_BASE_URL}/roles/frontend`, {
      headers: this._buildAdminHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch roles for add user");
    return response.json();
  }

  async getAnalyticsTraffic() {
  const response = await fetch(`${API_BASE_URL}/analytics/traffic`);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics traffic");
  }

  return response.json();
}

  async createUser(userData) {
    const payload = {
      Email: userData.email,
      FirstName: userData.firstName,
      LastName: userData.lastName,
      RoleId: userData.roleId,
      CompanyId: userData.companyId,
      IsActive: true,
    };

    const response = await fetch(`${API_BASE_URL}/Users`, {
      method: "POST",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
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
      CompanyId: userData.companyId,
      IsActive: userData.isActive ?? true,
    };

    const response = await fetch(`${API_BASE_URL}/Users/${userId}`, {
      method: "PUT",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Update user failed"));
    return this._readJsonOrSuccess(response, "User updated successfully");
  }

  async changePassword(userId, data) {
    const response = await fetch(`${API_BASE_URL}/Users/${userId}/change-password`, {
      method: "PUT",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
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
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ Email: email }),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Reset password failed"));
    return this._readJsonOrSuccess(response, "Reset password email sent");
  }

  async createCommunity(communityData) {
    const payload = {
      Email: communityData.email,
      Phone: communityData.phone,
      UrlAddress: communityData.urlAddress,
      CompanyId: communityData.companyId
    };

    const response = await fetch(`${API_BASE_URL}/Communities`, {
      method: "POST",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Failed to create community"));
    return this._readJsonOrSuccess(response, "Community created successfully");
  }

  async getCommunities() {
    const response = await fetch(`${API_BASE_URL}/Communities`, {
      headers: this._buildAdminHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch communities");
    return response.json();
  }

  async updateCommunity(communityData) {
    const payload = {
      Id: communityData.id,
      Email: communityData.email,
      Phone: communityData.phone,
      UrlAddress: communityData.urlAddress,
      CompanyId: communityData.companyId
    };

    const response = await fetch(`${API_BASE_URL}/Communities/${communityData.id}`, {
      method: "PUT",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Failed to update community"));
    return this._readJsonOrSuccess(response, "Community updated successfully");
  }

  async createCompany(companyData) {
    const payload = {
      CompanyName: companyData.companyName,
      Email: companyData.email,
      Phone: companyData.phone,
      UrlAddress: companyData.website
    };

    const response = await fetch(`${API_BASE_URL}/Companies`, {
      method: "POST",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Failed to create company"));
    return this._readJsonOrSuccess(response, "Company created successfully");
  }

  async getCompanies() {
    const response = await fetch(`${API_BASE_URL}/Companies`, {
      headers: this._buildAdminHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch companies");
    return response.json();
  }

  async updateCompany(companyData) {
    const payload = {
      Id: companyData.id,
      CompanyName: companyData.companyName,
      Email: companyData.email,
      Phone: companyData.phone,
      UrlAddress: companyData.urlAddress
    };

    const response = await fetch(`${API_BASE_URL}/Companies/${companyData.id}`, {
      method: "PUT",
      headers: this._buildAdminHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await this._readError(response, "Failed to update company"));
    return this._readJsonOrSuccess(response, "Company updated successfully");
  }

  async getConversations() {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: this._buildAdminHeaders()
    });
    if (!response.ok) throw new Error("Failed to fetch conversations");
    return response.json();
  }

  async getLeads() {
    try {
      const response = await fetch(`${API_BASE_URL}/leads`, {
        headers: this._buildAdminHeaders()
      });
      
      if (!response.ok) {
        const errorText = await this._readError(response, `HTTP ${response.status}: Failed to fetch leads`);
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText
        });
        throw new Error(errorText);
      }
      
      return response.json();
    } catch (error) {
      console.error('getLeads failed:', error);
      throw error;
    }
  }

  async getConversationsByLead(leadId) {
    try {
      const response = await fetch(`${API_BASE_URL}/Leads/${leadId}/conversations`, {
        headers: this._buildAdminHeaders()
      });
      
      if (!response.ok) {
        const errorText = await this._readError(response, `HTTP ${response.status}: Failed to fetch conversations for lead ${leadId}`);
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          leadId,
          errorText
        });
        throw new Error(errorText);
      }
      
      return response.json();
    } catch (error) {
      console.error('getConversationsByLead failed:', error);
      throw error;
    }
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
