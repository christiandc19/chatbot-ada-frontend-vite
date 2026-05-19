import React, { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Building2,
  Search,
  Globe,
  KeyRound,
  Bot,
  ClipboardList,
  FileText,
  DollarSign,
} from "lucide-react";

import "./Communities.css";
import Header from "./Header";
import apiService from "../services/apiService";

const Communities = ({ user, onLogout }) => {
  // =====================================================
  // STATE
  // communities: stores communities loaded from backend.
  // selectedCommunity: stores the community currently selected.
  // searchTerm: stores the value typed in the search box.
  // loading/error: controls loading and error screens.
  // =====================================================

  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // =====================================================
  // ADD COMMUNITY MODAL STATE
  // Controls the add community modal and form values.
  // =====================================================

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [formError, setFormError] = useState("");

  const [newCommunity, setNewCommunity] = useState({
    clientKey: "",
    communityName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    status: "Active",
    webAssistantEnabled: true,
    surveysEnabled: false,
    webformsEnabled: false,
  });


  // =====================================================
  // LOAD COMMUNITIES FROM BACKEND
  // This calls GET /api/Communities through apiService.
  // =====================================================

  useEffect(() => {
    const loadCommunities = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiService.getCommunities();
        const safeData = Array.isArray(data) ? data : [];

        setCommunities(safeData);
        setSelectedCommunity(safeData[0] || null);
      } catch (err) {
        console.error("Failed to load communities:", err);
        setError("Failed to load communities. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadCommunities();
  }, []);

  // =====================================================
  // SEARCH FILTER
  // Filters communities by communityName, clientKey, or email.
  // =====================================================

  const filteredCommunities = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return communities;

    return communities.filter((community) => {
      const communityName = community.communityName || "";
      const clientKey = community.clientKey || "";
      const email = community.email || "";

      return (
        communityName.toLowerCase().includes(keyword) ||
        clientKey.toLowerCase().includes(keyword) ||
        email.toLowerCase().includes(keyword)
      );
    });
  }, [communities, searchTerm]);

  // =====================================================
  // HELPERS
  // These keep the JSX cleaner and protect against null values.
  // =====================================================

  const getCommunityName = (community) => {
    return community?.communityName || "Unnamed Community";
  };

  const getClientKey = (community) => {
    return community?.clientKey || "No clientKey added";
  };

  const getWebsite = (community) => {
    return community?.website || community?.urlAddress || "No website added";
  };

  const getStatus = (community) => {
    return community?.status || "Active";
  };

  const getInitials = (name) => {
    const safeName = name || "Unnamed Community";

    return safeName
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };


// =====================================================
// ADD COMMUNITY FORM HANDLERS
// Updates form fields as the admin types.
// =====================================================

const handleNewCommunityChange = (e) => {
  const { name, value, type, checked } = e.target;

  setNewCommunity((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : value,
  }));
};

// =====================================================
// CREATE COMMUNITY
// Sends the new community to the backend.
// =====================================================

const handleCreateCommunity = async (e) => {
  e.preventDefault();

  setSavingCommunity(true);
  setFormError("");

  try {
    await apiService.createCommunity({
      ...newCommunity,
      urlAddress: newCommunity.website,
      logoUrl: "",
      companyId: null,
    });

    const refreshedCommunities = await apiService.getCommunities();
    const safeData = Array.isArray(refreshedCommunities)
      ? refreshedCommunities
      : [];

    setCommunities(safeData);
    setSelectedCommunity(safeData[0] || null);

    setIsAddModalOpen(false);

    setNewCommunity({
      clientKey: "",
      communityName: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      status: "Active",
      webAssistantEnabled: true,
      surveysEnabled: false,
      webformsEnabled: false,
    });
  } catch (err) {
    console.error("Failed to create community:", err);
    setFormError(err.message || "Failed to create community.");
  } finally {
    setSavingCommunity(false);
  }
};


  // =====================================================
  // LOADING STATE
  // Prevents the page from crashing while the API is loading.
  // =====================================================

  if (loading) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />

        <main className="community-loading-state">
          Loading communities...
        </main>
      </div>
    );
  }

  // =====================================================
  // ERROR STATE
  // Shows a friendly message if the API request fails.
  // =====================================================

  if (error) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />

        <main className="community-loading-state community-error-state">
          {error}
        </main>
      </div>
    );
  }

  // =====================================================
  // EMPTY STATE
  // Shows when the API works but no communities exist yet.
  // =====================================================

  if (!selectedCommunity) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />

        <main className="community-loading-state">
          No communities found.
        </main>
      </div>
    );
  }

  return (
    <div className="communities-container">
      <Header user={user} onLogout={onLogout} />

      <main className="communities-layout">
        {/* =====================================================
            LEFT PANEL
            Community list and search.
        ===================================================== */}

        <aside className="communities-sidebar">
          <div className="communities-sidebar-header">
            <p className="communities-eyebrow">ClientKey Communities</p>
            <h1>Communities</h1>
            <button
            type="button"
            className="add-community-button"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            Add Community
          </button>
          </div>

          <div className="communities-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, clientKey, or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="communities-list">
            {filteredCommunities.length === 0 ? (
              <div className="communities-empty-state">
                No matching communities found.
              </div>
            ) : (
              filteredCommunities.map((community) => {
                const communityName = getCommunityName(community);
                const clientKey = getClientKey(community);

                const isActive = selectedCommunity?.id === community.id;

                return (
                  <button
                    type="button"
                    key={community.id || clientKey}
                    className={`community-list-item ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCommunity(community)}
                  >
                    <span className="community-avatar">
                      {getInitials(communityName)}
                    </span>

                    <span className="community-list-copy">
                      <strong>{communityName}</strong>
                      <small>{clientKey}</small>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* =====================================================
            MAIN PANEL
            Selected community details.
        ===================================================== */}

        <section className="community-detail-panel">
          <div className="community-detail-header">
            <div className="community-title-wrap">
              <span className="community-large-avatar">
                {getInitials(getCommunityName(selectedCommunity))}
              </span>

              <div>
                <p className="communities-eyebrow">Selected Community</p>
                <h2>{getCommunityName(selectedCommunity)}</h2>
              </div>
            </div>

            <span className="community-status-pill">
              {getStatus(selectedCommunity)}
            </span>
          </div>

          {/* =====================================================
              DISABLED TABS
              Only Overview works for now.
          ===================================================== */}

          <div className="community-tabs">
            <button className="active">Overview</button>
            <button disabled>Branding</button>
            <button disabled>Products</button>
            <button disabled>Pricing</button>
            <button disabled>Analytics</button>
          </div>

          <div className="community-content-grid">
            <div className="community-info-card">
              <h3>Community Information</h3>

              <div className="community-info-list">
                <div>
                  <Building2 size={18} />
                  <span>{getCommunityName(selectedCommunity)}</span>
                </div>

                <div>
                  <KeyRound size={18} />
                  <span>{getClientKey(selectedCommunity)}</span>
                </div>

                <div>
                  <Globe size={18} />
                  <span>{getWebsite(selectedCommunity)}</span>
                </div>
              </div>
            </div>

            <div className="community-info-card">
              <h3>Product Status</h3>

              <div className="product-status-list">
                <div>
                  <Bot size={18} />
                  <span>Web Assistant</span>
                  <strong>
                    {selectedCommunity.webAssistantEnabled ? "Enabled" : "Disabled"}
                  </strong>
                </div>

                <div>
                  <ClipboardList size={18} />
                  <span>Surveys</span>
                  <strong>
                    {selectedCommunity.surveysEnabled ? "Enabled" : "Disabled"}
                  </strong>
                </div>

                <div>
                  <FileText size={18} />
                  <span>Webforms</span>
                  <strong>
                    {selectedCommunity.webformsEnabled ? "Enabled" : "Disabled"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="community-info-card community-pricing-card">
              <div className="pricing-card-header">
                <h3>Pricing Summary</h3>
                <DollarSign size={20} />
              </div>

              <div className="pricing-row">
                <span>Starting Cost</span>
                <strong>Not connected</strong>
              </div>

              <div className="pricing-row">
                <span>Independent Living</span>
                <strong>Not connected</strong>
              </div>

              <div className="pricing-row">
                <span>Assisted Living</span>
                <strong>Not connected</strong>
              </div>

              <div className="pricing-row">
                <span>Memory Care</span>
                <strong>Not connected</strong>
              </div>

              <p className="pricing-note">
                Pricing will later load from Settings → Pricing using this
                community&apos;s clientKey.
              </p>
            </div>
          </div>
        </section>
      </main>

    {/* =====================================================
        ADD COMMUNITY MODAL
        Allows admin/developer to create a new clientKey-based community.
    ===================================================== */}

    {isAddModalOpen && (
      <div className="community-modal-overlay">
        <div className="community-modal-card">
          <div className="community-modal-header">
            <div>
              <p className="communities-eyebrow">New Community</p>
              <h2>Add Community</h2>
            </div>

            <button
              type="button"
              className="community-modal-close"
              onClick={() => setIsAddModalOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {formError && (
            <div className="community-form-error">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateCommunity} className="community-form">
            <div className="community-form-grid">
              <label>
                Community Name
                <input
                  name="communityName"
                  value={newCommunity.communityName}
                  onChange={handleNewCommunityChange}
                  placeholder="Evergreen Heights Senior Living"
                  required
                />
              </label>

              <label>
                Client Key
                <input
                  name="clientKey"
                  value={newCommunity.clientKey}
                  onChange={handleNewCommunityChange}
                  placeholder="evergreen-heights"
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={newCommunity.email}
                  onChange={handleNewCommunityChange}
                  placeholder="info@example.com"
                  required
                />
              </label>

              <label>
                Phone
                <input
                  name="phone"
                  value={newCommunity.phone}
                  onChange={handleNewCommunityChange}
                  placeholder="5551234567"
                />
              </label>

              <label className="community-form-wide">
                Website
                <input
                  name="website"
                  value={newCommunity.website}
                  onChange={handleNewCommunityChange}
                  placeholder="https://example.com"
                />
              </label>

              <label className="community-form-wide">
                Address
                <input
                  name="address"
                  value={newCommunity.address}
                  onChange={handleNewCommunityChange}
                  placeholder="123 Main St"
                />
              </label>
            </div>

            <div className="community-toggle-group">
              <label>
                <input
                  type="checkbox"
                  name="webAssistantEnabled"
                  checked={newCommunity.webAssistantEnabled}
                  onChange={handleNewCommunityChange}
                />
                Web Assistant
              </label>

              <label>
                <input
                  type="checkbox"
                  name="surveysEnabled"
                  checked={newCommunity.surveysEnabled}
                  onChange={handleNewCommunityChange}
                />
                Surveys
              </label>

              <label>
                <input
                  type="checkbox"
                  name="webformsEnabled"
                  checked={newCommunity.webformsEnabled}
                  onChange={handleNewCommunityChange}
                />
                Webforms
              </label>
            </div>

            <div className="community-modal-actions">
              <button
                type="button"
                className="community-secondary-button"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="community-primary-button"
                disabled={savingCommunity}
              >
                {savingCommunity ? "Saving..." : "Create Community"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    </div>
  );
};

export default Communities;
