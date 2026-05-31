import React, { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Building2,
  Search,
  Globe,
  Phone,
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
  // ADD / EDIT COMMUNITY MODAL STATE
  // =====================================================

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(null);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [formError, setFormError] = useState("");

  const emptyCommunityForm = {
    clientKey: "",
    communityName: "",
    email: "",
    phone: "",
    website: "",
    // NEW: GA4 Property ID for analytics
    googlePropertyId: "",
    address: "",
    status: "Active",
    webAssistantEnabled: true,
    surveysEnabled: false,
    webformsEnabled: false,
  };

  const [newCommunity, setNewCommunity] = useState(emptyCommunityForm);

  // =====================================================
  // LOAD COMMUNITIES FROM BACKEND
  // =====================================================

  const loadCommunities = async (selectedCommunityId = null) => {
    const data = await apiService.getCommunities();
    const safeData = Array.isArray(data) ? data : [];

    setCommunities(safeData);

    if (selectedCommunityId) {
      const updatedSelected = safeData.find(
        (community) => Number(community.id) === Number(selectedCommunityId)
      );

      setSelectedCommunity(updatedSelected || safeData[0] || null);
      return;
    }

    setSelectedCommunity((currentSelected) => {
      if (!currentSelected) return safeData[0] || null;

      const stillExists = safeData.find(
        (community) => Number(community.id) === Number(currentSelected.id)
      );

      return stillExists || safeData[0] || null;
    });
  };

  useEffect(() => {
    const fetchInitialCommunities = async () => {
      try {
        setLoading(true);
        setError("");

        await loadCommunities();
      } catch (err) {
        console.error("Failed to load communities:", err);
        setError("Failed to load communities. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialCommunities();
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
      const address = community.address || "";
      const email = community.email || "";

      return (
        communityName.toLowerCase().includes(keyword) ||
        address.toLowerCase().includes(keyword) ||
        email.toLowerCase().includes(keyword)
      );
    });
  }, [communities, searchTerm]);

  // =====================================================
  // HELPERS
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

  const resetAddForm = () => {
    setNewCommunity(emptyCommunityForm);
    setFormError("");
  };

  // =====================================================
  // ADD COMMUNITY FORM HANDLER
  // =====================================================

  const handleNewCommunityChange = (e) => {
    const { name, value, type, checked } = e.target;

    setNewCommunity((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // =====================================================
  // EDIT COMMUNITY FORM HANDLER
  // =====================================================

  const handleEditCommunityChange = (e) => {
    const { name, value, type, checked } = e.target;

    setEditingCommunity((prev) => ({
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
        googlePropertyId: newCommunity.googlePropertyId,
        logoUrl: "",
        companyId: null,
      });

      await loadCommunities();

      setIsAddModalOpen(false);
      resetAddForm();
    } catch (err) {
      console.error("Failed to create community:", err);
      setFormError(err.message || "Failed to create community.");
    } finally {
      setSavingCommunity(false);
    }
  };

  // =====================================================
  // OPEN EDIT MODAL
  // Loads selected community into editable form.
  // =====================================================

  const handleOpenEditModal = () => {
    if (!selectedCommunity) return;

    setFormError("");

    setEditingCommunity({
      id: selectedCommunity.id,
      clientKey: selectedCommunity.clientKey || "",
      communityName: selectedCommunity.communityName || "",
      email: selectedCommunity.email || "",
      phone: selectedCommunity.phone || "",
      website: selectedCommunity.website || selectedCommunity.urlAddress || "",
      // NEW: Existing GA4 Property ID
      googlePropertyId: selectedCommunity.googlePropertyId || "",
      address: selectedCommunity.address || "",
      status: selectedCommunity.status || "Active",
      webAssistantEnabled: selectedCommunity.webAssistantEnabled || false,
      surveysEnabled: selectedCommunity.surveysEnabled || false,
      webformsEnabled: selectedCommunity.webformsEnabled || false,
    });

    setIsEditModalOpen(true);
  };

  // =====================================================
  // UPDATE COMMUNITY
  // Saves edited community changes.
  // =====================================================

  const handleUpdateCommunity = async (e) => {
    e.preventDefault();

    if (!editingCommunity) return;

    try {
      setSavingCommunity(true);
      setFormError("");

      await apiService.updateCommunity({
        id: editingCommunity.id,
        clientKey: editingCommunity.clientKey,
        communityName: editingCommunity.communityName,
        email: editingCommunity.email,
        phone: editingCommunity.phone,

        // Backend field
        urlAddress: editingCommunity.website,

        // Optional frontend field
        website: editingCommunity.website,

        // NEW: Save updated GA4 Property ID
        googlePropertyId: editingCommunity.googlePropertyId,

        address: editingCommunity.address,
        status: editingCommunity.status || "Active",

        logoUrl: selectedCommunity.logoUrl || "",
        companyId: selectedCommunity.companyId || null,

        webAssistantEnabled:
          editingCommunity.webAssistantEnabled,

        surveysEnabled:
          editingCommunity.surveysEnabled,

        webformsEnabled:
          editingCommunity.webformsEnabled,
      });

      await loadCommunities(editingCommunity.id);

      setIsEditModalOpen(false);
      setEditingCommunity(null);
    } catch (err) {
      console.error("Failed to update community:", err);
      setFormError(err.message || "Failed to update community.");
    } finally {
      setSavingCommunity(false);
    }
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />

        <main className="community-loading-state">Loading communities...</main>
      </div>
    );
  }

  // =====================================================
  // ERROR STATE
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
  // Allows adding the first community.
  // =====================================================

  if (!selectedCommunity) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />

        <main className="community-loading-state">
          <p>No communities found.</p>

          <button
            type="button"
            className="add-community-button"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            Add Community
          </button>
        </main>

        {isAddModalOpen && (
          <CommunityFormModal
            title="Add Community"
            eyebrow="New Community"
            community={newCommunity}
            savingCommunity={savingCommunity}
            formError={formError}
            submitLabel="Create Community"
            onChange={handleNewCommunityChange}
            onSubmit={handleCreateCommunity}
            onClose={() => {
              setIsAddModalOpen(false);
              resetAddForm();
            }}
          />
        )}
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
            <h1>Communities</h1>

            <button
              type="button"
              className="add-community-button"
              onClick={() => {
                setFormError("");
                setIsAddModalOpen(true);
              }}
            >
              <Plus size={16} />
              Add Community
            </button>
          </div>

          <div className="communities-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, address, or email"
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
                      <small>{community.address || "No address added"}</small>
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

            <div className="community-header-actions">
              <span className="community-status-pill">
                {getStatus(selectedCommunity)}
              </span>

              <button
                type="button"
                className="community-edit-button"
                onClick={handleOpenEditModal}
              >
                Edit Community
              </button>
            </div>
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
                  <Phone size={18} />
                  <span>
                    {selectedCommunity.phone || "No phone number"}
                  </span>
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
      ===================================================== */}

      {isAddModalOpen && (
        <CommunityFormModal
          title="Add Community"
          eyebrow="New Community"
          community={newCommunity}
          savingCommunity={savingCommunity}
          formError={formError}
          submitLabel="Create Community"
          onChange={handleNewCommunityChange}
          onSubmit={handleCreateCommunity}
          onClose={() => {
            setIsAddModalOpen(false);
            resetAddForm();
          }}
        />
      )}

      {/* =====================================================
          EDIT COMMUNITY MODAL
      ===================================================== */}

      {isEditModalOpen && editingCommunity && (
        <CommunityFormModal
          title="Edit Community"
          eyebrow="Community Settings"
          community={editingCommunity}
          savingCommunity={savingCommunity}
          formError={formError}
          submitLabel="Save Changes"
          onChange={handleEditCommunityChange}
          onSubmit={handleUpdateCommunity}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCommunity(null);
            setFormError("");
          }}
        />
      )}
    </div>
  );
};

// =====================================================
// REUSABLE COMMUNITY FORM MODAL
// Used by both Add Community and Edit Community.
// =====================================================

const CommunityFormModal = ({
  title,
  eyebrow,
  community,
  savingCommunity,
  formError,
  submitLabel,
  onChange,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="community-modal-overlay">
      <div className="community-modal-card">
        <div className="community-modal-header">
          <div>
            <p className="communities-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>

          <button
            type="button"
            className="community-modal-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {formError && <div className="community-form-error">{formError}</div>}

        <form onSubmit={onSubmit} className="community-form">
          <div className="community-form-grid">

          <label>
            <span className="field-label">
              Community Name
              <span className="required-star">*</span>
            </span>

            <input
              name="communityName"
              value={community.communityName}
              onChange={onChange}
              required
            />
          </label>

          <label>
            <span className="field-label">
              Website <span className="required-star">*</span>
            </span>

            <input
              name="website"
              value={community.website}
              onChange={onChange}
              required
            />
          </label>

          <label>
            <span className="field-label">
              Email <span className="required-star">*</span>
            </span>

            <input
              type="email"
              name="email"
              value={community.email}
              onChange={onChange}
              required
            />
          </label>

          <label>
            <span className="field-label">
              Phone <span className="required-star">*</span>
            </span>

            <input
              name="phone"
              value={community.phone}
              onChange={onChange}
              required
            />
          </label>

          <label className="community-form-wide">
            <span className="field-label">
              Google Property ID
            </span>

            <input
              name="googlePropertyId"
              value={community.googlePropertyId || ""}
              onChange={onChange}
            />
          </label>

          <label className="community-form-wide">
            <span className="field-label">
              Address <span className="required-star">*</span>
            </span>

            <input
              name="address"
              value={community.address}
              onChange={onChange}
              required
            />
          </label>



          </div>

          <div className="community-modal-actions">
            <button
              type="button"
              className="community-secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="community-primary-button"
              disabled={savingCommunity}
            >
              {savingCommunity ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Communities;
