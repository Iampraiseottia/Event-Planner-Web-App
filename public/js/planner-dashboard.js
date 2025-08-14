document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();
  setupEventListeners();
  loadDashboardData();
  setupMobileNavigation();
  setupResponsiveModals();
  setupResponsiveTables();
});

// Global variables
let currentPlanner = null;
let bookingsData = [];
let clientsData = [];
let earningsData = [];
let reviewsData = [];
let currentCalendarDate = new Date();
let currentBookingId = null;
let scheduleData = [];
let notificationsData = [];
let filteredNotifications = [];
let hasIdCard = false;
let hasBirthCertificate = false;

// Initialize dashboard
function initializeDashboard() {
  checkAuthStatus();
  setupSidebarNavigation();
  setupDocumentUploads();

  setTimeout(() => {
    setupMobileNavigation();
  }, 100);

  setupModalHandlers();
  setupResponsiveModals();
  setupProfileImageUpload();
  setupFormHandlers();
  setupCalendar();
  setupCharts();
  setupResponsiveTables();
}

// Check authentication status
async function checkAuthStatus() {
  try {
    showLoading();

    const statusResponse = await fetch("/api/auth/status", {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!statusResponse.ok) {
      console.log("Auth status check failed:", statusResponse.status);
      window.location.href = "/html/login.html";
      return;
    }

    const statusData = await statusResponse.json();
    console.log("Auth status:", statusData);

    if (!statusData.authenticated) {
      console.log("User not authenticated");
      window.location.href = "/html/login.html";
      return;
    }

    if (statusData.user.user_type !== "planner") {
      console.log("User is not a planner:", statusData.user.user_type);
      showNotification("Access denied. Planner account required.", "error");
      setTimeout(() => {
        window.location.href = "/html/login.html";
      }, 2000);
      return;
    }

    currentPlanner = statusData.user;

    // Check profile completion more thoroughly
    const profileCompleteResponse = await fetch("/api/planner/profile", {
      credentials: "include",
    });

    let isProfileComplete = false;
    if (profileCompleteResponse.ok) {
      const profileData = await profileCompleteResponse.json();
      const planner = profileData.planner;

      // Check if all required fields are present
      isProfileComplete = !!(
        planner.business_name &&
        planner.bio &&
        planner.experience &&
        planner.base_price &&
        planner.has_id_card &&
        planner.has_birth_certificate
      );
    }

    // Update current planner with profile completion status
    currentPlanner.profile_completed = isProfileComplete;

    // Profile completion status
    if (!isProfileComplete) {
      disableIncompleteSidebarLinks();
      showNotification(
        "Please complete your profile to access all features.",
        "warning"
      );

      showSection("profile");
    } else {
      enableAllSidebarLinks();
      removeProfileIncompleteWarning();
    }

    updateUserInterface();

    console.log("Auth check successful for planner:", currentPlanner.full_name);
  } catch (error) {
    console.error("Auth check error:", error);
    showNotification("Authentication error. Please login again.", "error");
    setTimeout(() => {
      window.location.href = "/html/login.html";
    }, 2000);
  } finally {
    hideLoading();
  }
}

// Disable sidebar links when profile is incomplete
function disableIncompleteSidebarLinks() {
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    const section = item.dataset.section;
    if (section !== "profile" && section !== "overview") {
      item.classList.add("disabled");
      item.style.opacity = "0.5";
      item.style.cursor = "not-allowed";

      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);

      newItem.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showNotification("Please complete your profile first.", "warning");
      });
    }
  });
}

// Enable all sidebar links when profile is complete
function enableAllSidebarLinks() {
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.classList.remove("disabled");
    item.style.opacity = "";
    item.style.cursor = "";
  });
  setupSidebarNavigation();
}

// Setup document uploads
function setupDocumentUploads() {
  const idCardInput = document.getElementById("idCardInput");
  const birthCertificateInput = document.getElementById(
    "birthCertificateInput"
  );

  if (idCardInput) {
    idCardInput.addEventListener("change", (e) =>
      handleDocumentUpload(e, "idCard")
    );
  }

  if (birthCertificateInput) {
    birthCertificateInput.addEventListener("change", (e) =>
      handleDocumentUpload(e, "birthCertificate")
    );
  }

  setupDragAndDrop("idCard");
  setupDragAndDrop("birthCertificate");
}

// Setup drag and drop
function setupDragAndDrop(docType) {
  const uploadArea = document.getElementById(`${docType}UploadArea`);
  if (!uploadArea) return;

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });

  uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const input = document.getElementById(`${docType}Input`);
      input.files = files;
      handleDocumentUpload({ target: input }, docType);
    }
  });
}

// Handle document upload
async function handleDocumentUpload(event, docType) {
  const file = event.target.files[0];
  if (!file) return;

  console.log(`Uploading ${docType}:`, file.name, file.type, file.size);

  // Validate file
  if (!validateDocumentFile(file, docType)) {
    return;
  }

  showDocumentPreview(file, docType);

  await uploadDocument(file, docType);
}

// Validate document file
function validateDocumentFile(file, docType) {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.type.toLowerCase())) {
    showNotification("Please select a valid image or PDF file", "error");
    return false;
  }

  if (file.size > 10 * 1024 * 1024) {
    showNotification("File size must be less than 10MB", "error");
    return false;
  }

  return true;
}

// Show document preview
function showDocumentPreview(file, docType) {
  const placeholder = document.getElementById(`${docType}Placeholder`);
  const preview = document.getElementById(`${docType}Preview`);
  const image = document.getElementById(`${docType}Image`);
  const pdfPreview = document.getElementById(`${docType}PdfPreview`);
  const pdfName = document.getElementById(`${docType}PdfName`);

  if (!placeholder || !preview) return;

  placeholder.style.display = "none";
  preview.style.display = "flex";

  if (file.type === "application/pdf") {
    // PDF preview
    image.style.display = "none";
    pdfPreview.style.display = "flex";
    if (pdfName) pdfName.textContent = file.name;
  } else {
    // Image preview
    pdfPreview.style.display = "none";
    image.style.display = "block";

    const reader = new FileReader();
    reader.onload = function (e) {
      image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// Upload document
async function uploadDocument(file, docType) {
  const formData = new FormData();
  const fieldName = docType === "idCard" ? "idCard" : "birthCertificate";
  const endpoint =
    docType === "idCard" ? "upload-id-card" : "upload-birth-certificate";

  formData.append(fieldName, file);

  const statusElement = document.getElementById(`${docType}Status`);

  try {
    if (statusElement) {
      statusElement.textContent = "Uploading...";
      statusElement.className = "upload-status uploading";
    }

    console.log(`=== UPLOADING ${docType.toUpperCase()} ===`);
    console.log("Endpoint:", `/api/planner/profile/${endpoint}`);
    console.log("Field name:", fieldName);

    const response = await fetch(`/api/planner/profile/${endpoint}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();
    console.log("Upload response:", result);

    if (response.ok) {
      if (statusElement) {
        statusElement.textContent = "Upload successful!";
        statusElement.className = "upload-status success";
      }

      // Update flags immediately
      if (docType === "idCard") {
        hasIdCard = true;
      } else {
        hasBirthCertificate = true;
      }

      // Update currentPlanner object
      if (currentPlanner) {
        if (docType === "idCard") {
          currentPlanner.has_id_card = true;
        } else {
          currentPlanner.has_birth_certificate = true;
        }
      }

      console.log("Document flags updated:", {
        hasIdCard,
        hasBirthCertificate,
      });

      // Check profile completion
      if (hasIdCard && hasBirthCertificate) {
        setTimeout(() => {
          refreshProfileCompletionStatus();
        }, 500);
      }

      showNotification(
        `${
          docType === "idCard" ? "ID Card" : "Birth Certificate"
        } uploaded successfully`,
        "success"
      );

      checkProfileCompletion();

      setTimeout(() => {
        if (statusElement) {
          statusElement.textContent = "";
          statusElement.className = "upload-status";
        }
      }, 3000);
    } else {
      throw new Error(result.error || "Upload failed");
    }
  } catch (error) {
    console.error(`Error uploading ${docType}:`, error);

    if (statusElement) {
      statusElement.textContent = "Upload failed. Please try again.";
      statusElement.className = "upload-status error";
    }

    showNotification(
      `Error uploading ${
        docType === "idCard" ? "ID Card" : "Birth Certificate"
      }`,
      "error"
    );

    resetDocumentPreview(docType);
  }
}

// Remove uploaded document
function removeUpload(docType, event) {
  event.preventDefault();
  event.stopPropagation();

  if (
    confirm(
      `Are you sure you want to remove the ${
        docType === "idCard" ? "ID Card" : "Birth Certificate"
      }?`
    )
  ) {
    resetDocumentPreview(docType);

    // Clear the file input
    const input = document.getElementById(`${docType}Input`);
    if (input) input.value = "";

    if (docType === "idCard") {
      hasIdCard = false;
    } else {
      hasBirthCertificate = false;
    }

    showNotification(
      `${docType === "idCard" ? "ID Card" : "Birth Certificate"} removed`,
      "info"
    );
    checkProfileCompletion();
  }
}

// Reset document preview
function resetDocumentPreview(docType) {
  const placeholder = document.getElementById(`${docType}Placeholder`);
  const preview = document.getElementById(`${docType}Preview`);
  const image = document.getElementById(`${docType}Image`);
  const statusElement = document.getElementById(`${docType}Status`);

  if (placeholder) placeholder.style.display = "block";
  if (preview) preview.style.display = "none";
  if (image) image.src = "";
  if (statusElement) {
    statusElement.textContent = "";
    statusElement.className = "upload-status";
  }
}

// Check if profile is complete
async function checkProfileCompletion() {
  try {
    const response = await fetch("/api/auth/status", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.user.profile_completed) {
        enableAllSidebarLinks();
        showNotification(
          "Profile completed! You can now access all features.",
          "success"
        );
      }
    }
  } catch (error) {
    console.error("Error checking profile completion:", error);
  }
}

// Update user interface with planner data
function updateUserInterface() {
  if (currentPlanner) {
    document.getElementById("plannerName").textContent =
      currentPlanner.business_name ||
      currentPlanner.full_name ||
      "Event Planner";

    // Populate profile form
    if (currentPlanner.business_name)
      document.getElementById("businessName").value =
        currentPlanner.business_name;
    if (currentPlanner.full_name)
      document.getElementById("ownerName").value = currentPlanner.full_name;
    if (currentPlanner.email)
      document.getElementById("email").value = currentPlanner.email;
    if (currentPlanner.phone_number)
      document.getElementById("phone").value = currentPlanner.phone_number;
    if (currentPlanner.location)
      document.getElementById("location").value = currentPlanner.location;
    if (currentPlanner.experience)
      document.getElementById("experience").value = currentPlanner.experience;
    if (currentPlanner.bio)
      document.getElementById("bio").value = currentPlanner.bio;
    if (currentPlanner.base_price)
      document.getElementById("basePrice").value = currentPlanner.base_price;
    if (currentPlanner.homeAddress)
      document.getElementById("homeAddress").value = currentPlanner.homeAddress;

    if (currentPlanner.profile_image) {
      document.getElementById("profileImage").src =
        currentPlanner.profile_image;
    }

    // Handle specializations
    if (currentPlanner.specializations) {
      const specializationSelect = document.getElementById("specializations");
      const specializations = Array.isArray(currentPlanner.specializations)
        ? currentPlanner.specializations
        : currentPlanner.specializations.split(",");

      Array.from(specializationSelect.options).forEach((option) => {
        option.selected = specializations.includes(option.value);
      });
    }

    // Set profile image
    const profileImageElement = document.getElementById("profileImage");
    if (profileImageElement) {
      profileImageElement.src = `/api/planner/profile/image?t=${Date.now()}`;
    }
  }
}

// Setup sidebar navigation
function setupSidebarNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      const section = this.dataset.section;
      showSection(section);

      menuItems.forEach((mi) => mi.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

// Show specific section
function showSection(sectionName) {
  // Check if profile is incomplete and trying to access restricted sections
  if (
    !currentPlanner?.profile_completed &&
    sectionName !== "profile" &&
    sectionName !== "overview"
  ) {
    showNotification(
      "Please complete your profile first to access this section.",
      "warning"
    );
    return;
  }

  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => section.classList.remove("active"));

  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add("active");

    switch (sectionName) {
      case "overview":
        if (!currentPlanner?.profile_completed) {
          addProfileIncompleteWarning();
        }
        break;
      case "bookings":
        loadBookings();
        const filterClientId = sessionStorage.getItem("filterClientId");
        if (filterClientId) {
          setTimeout(() => {
            applyClientFilter(filterClientId);
            sessionStorage.removeItem("filterClientId");
          }, 500);
        }
        break;
      case "schedule":
        loadSchedule();
        loadBlockedDates();
        break;
      case "clients":
        loadClients();
        break;
      case "earnings":
        loadEarnings();
        break;
      case "reviews":
        loadReviews();
        break;
      case "analytics":
        loadAnalytics();
        break;
      case "availability":
        loadWorkingHours();
        loadBlockedDates();
        break;
      case "notifications":
        loadNotifications();
        break;
    }
  }
}

// File size formatter
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Drag and drop visual
function addDragDropStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .drag-over {
      border-color: var(--primary-color) !important;
      background-color: rgba(var(--primary-color-rgb), 0.1) !important;
      transform: scale(1.02) !important;
    }
    
    .drag-over .upload-placeholder {
      color: var(--primary-color) !important;
    }
    
    .drag-over .upload-placeholder i {
      color: var(--primary-color) !important;
      transform: scale(1.2) !important;
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", function () {
  addDragDropStyles();
});

// Show Upload Progress
function showUploadProgress(docType, progress) {
  const statusElement = document.getElementById(`${docType}Status`);
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: ${progress}%"></div>
      </div>
      <span>Uploading... ${progress}%</span>
    `;
    statusElement.className = "upload-status uploading";
  }
}

// Error handling for uploads
function handleUploadError(error, docType) {
  console.error(`Upload error for ${docType}:`, error);

  const statusElement = document.getElementById(`${docType}Status`);
  if (statusElement) {
    statusElement.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      Upload failed: ${error.message || "Please try again"}
    `;
    statusElement.className = "upload-status error";
  }

  resetDocumentPreview(docType);

  setTimeout(() => {
    if (statusElement) {
      statusElement.textContent = "";
      statusElement.className = "upload-status";
    }
  }, 5000);
}

// Load notifications
async function loadNotifications() {
  try {
    showLoading();

    const response = await fetch("/api/planner/notifications", {
      credentials: "include",
    });

    if (response.ok) {
      notificationsData = await response.json();
      filteredNotifications = [...notificationsData];
      displayNotifications(filteredNotifications);
      updateNotificationCount();
    } else {
      console.error("Failed to load notifications:", response.status);
      displayNotifications([]);
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    displayNotifications([]);
  } finally {
    hideLoading();
  }
}

// Display notifications
function displayNotifications(notifications) {
  const container = document.getElementById("notificationsList");
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications</h3>
                <p>You're all caught up! New notifications will appear here.</p>
            </div>
        `;
    return;
  }

  // Sort by created_at desc, unread first
  notifications.sort((a, b) => {
    if (a.is_read !== b.is_read) {
      return a.is_read ? 1 : -1;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  container.innerHTML = notifications
    .map(
      (notification) => `
        <div class="notification-item ${
          notification.is_read ? "read" : "unread"
        }" 
             onclick="markAsRead(${notification.id})" 
             data-id="${notification.id}"
             data-type="${notification.type}">
            
            <div class="notification-icon ${notification.type}">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                
                <div class="notification-meta">
                    <div class="notification-time">
                        <i class="fas fa-clock"></i>
                        ${formatTimeAgo(notification.created_at)}
                    </div>
                    <div class="notification-actions-small">
                        ${
                          !notification.is_read
                            ? `
                            <button class="notification-action-btn" onclick="event.stopPropagation(); markAsRead(${notification.id})">
                                Mark Read
                            </button>
                        `
                            : ""
                        }
                        <button class="notification-action-btn delete" onclick="event.stopPropagation(); deleteNotification(${
                          notification.id
                        })">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
            
            ${
              notification.priority
                ? `<div class="notification-priority ${notification.priority}"></div>`
                : ""
            }
        </div>
    `
    )
    .join("");
}

// Get notification icon based on type
function getNotificationIcon(type) {
  const icons = {
    booking: "fa-calendar-plus",
    payment: "fa-dollar-sign",
    review: "fa-star",
    system: "fa-cog",
    reminder: "fa-bell",
    message: "fa-envelope",
    update: "fa-info-circle",
  };
  return icons[type] || "fa-bell";
}

// Update notification count in sidebar
function updateNotificationCount() {
  const unreadCount = notificationsData.filter((n) => !n.is_read).length;
  const countBadge = document.getElementById("notificationCount");
  const navCountBadge = document.getElementById("navNotificationCount");

  if (countBadge) {
    countBadge.textContent = unreadCount;
    countBadge.classList.toggle("zero", unreadCount === 0);
  }

  if (navCountBadge) {
    navCountBadge.textContent = unreadCount;
  }
}

// Mark notification as read
async function markAsRead(notificationId) {
  try {
    const response = await fetch(
      `/api/planner/notifications/${notificationId}/read`,
      {
        method: "PUT",
        credentials: "include",
      }
    );

    if (response.ok) {
      const notification = notificationsData.find(
        (n) => n.id === notificationId
      );
      if (notification) {
        notification.is_read = true;
      }

      const filteredNotification = filteredNotifications.find(
        (n) => n.id === notificationId
      );
      if (filteredNotification) {
        filteredNotification.is_read = true;
      }

      displayNotifications(filteredNotifications);
      updateNotificationCount();

      handleNotificationAction(notification);
    } else {
      showNotification("Error marking notification as read", "error");
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    showNotification("Error marking notification as read", "error");
  }
}

// Notification action
function handleNotificationAction(notification) {
  if (!notification || !notification.action_url) return;

  // Parse action URL to determine where to navigate
  if (notification.action_url.includes("/bookings/")) {
    const bookingId = notification.action_url.match(/\/bookings\/(\d+)/);
    if (bookingId) {
      showSection("bookings");
      setTimeout(() => {
        showBookingDetails(parseInt(bookingId[1]));
      }, 500);
    }
  } else if (notification.action_url.includes("/reviews")) {
    showSection("reviews");
  } else if (notification.action_url.includes("/earnings")) {
    showSection("earnings");
  }
}

// Delete notification
async function deleteNotification(notificationId) {
  if (!confirm("Are you sure you want to delete this notification?")) {
    return;
  }

  try {
    const response = await fetch(
      `/api/planner/notifications/${notificationId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (response.ok) {
      notificationsData = notificationsData.filter(
        (n) => n.id !== notificationId
      );
      filteredNotifications = filteredNotifications.filter(
        (n) => n.id !== notificationId
      );

      displayNotifications(filteredNotifications);
      updateNotificationCount();
      showNotification("Notification deleted", "success");
    } else {
      showNotification("Error deleting notification", "error");
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    showNotification("Error deleting notification", "error");
  }
}

// Mark all notifications as read
async function markAllAsRead() {
  const unreadNotifications = notificationsData.filter((n) => !n.is_read);

  if (unreadNotifications.length === 0) {
    showNotification("All notifications are already read", "info");
    return;
  }

  if (
    !confirm(`Mark all ${unreadNotifications.length} notifications as read?`)
  ) {
    return;
  }

  try {
    showLoading();

    const response = await fetch("/api/planner/notifications/mark-all-read", {
      method: "PUT",
      credentials: "include",
    });

    if (response.ok) {
      notificationsData.forEach((n) => (n.is_read = true));
      filteredNotifications.forEach((n) => (n.is_read = true));

      displayNotifications(filteredNotifications);
      updateNotificationCount();
      showNotification("All notifications marked as read", "success");
    } else {
      showNotification("Error marking notifications as read", "error");
    }
  } catch (error) {
    console.error("Error marking all as read:", error);
    showNotification("Error marking notifications as read", "error");
  } finally {
    hideLoading();
  }
}

// Clear all notifications
async function clearAllNotifications() {
  if (notificationsData.length === 0) {
    showNotification("No notifications to clear", "info");
    return;
  }

  if (
    !confirm(
      `Delete all ${notificationsData.length} notifications? This action cannot be undone.`
    )
  ) {
    return;
  }

  try {
    showLoading();

    const response = await fetch("/api/planner/notifications/clear-all", {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      notificationsData = [];
      filteredNotifications = [];
      displayNotifications([]);
      updateNotificationCount();
      showNotification("All notifications cleared", "success");
    } else {
      showNotification("Error clearing notifications", "error");
    }
  } catch (error) {
    console.error("Error clearing notifications:", error);
    showNotification("Error clearing notifications", "error");
  } finally {
    hideLoading();
  }
}

// Filter notifications
function filterNotifications() {
  const filterValue = document.getElementById("notificationFilter").value;

  if (filterValue === "all") {
    filteredNotifications = [...notificationsData];
  } else if (filterValue === "unread") {
    filteredNotifications = notificationsData.filter((n) => !n.is_read);
  } else if (filterValue === "read") {
    filteredNotifications = notificationsData.filter((n) => n.is_read);
  } else {
    filteredNotifications = notificationsData.filter(
      (n) => n.type === filterValue
    );
  }

  displayNotifications(filteredNotifications);
}

// Client filter to bookings
function applyClientFilter(clientId) {
  const filteredBookings = bookingsData.filter(
    (booking) => booking.customer_id == clientId
  );

  if (filteredBookings.length > 0) {
    displayBookings(filteredBookings);
    showNotification(
      `Showing bookings for selected client (${filteredBookings.length} found)`,
      "info"
    );
  } else {
    showNotification("No bookings found for selected client", "warning");
  }
}

// Setup event listeners
function setupEventListeners() {
  const logoutBtn = document.getElementById("logoutBtn3");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout3);
  }

  // Profile form
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", updateProfile);
  }

  // Working hours form
  const workingHoursForm = document.getElementById("workingHoursForm");
  if (workingHoursForm) {
    workingHoursForm.addEventListener("submit", updateWorkingHours);
  }

  // Booking filters
  const statusFilter = document.getElementById("statusFilter");
  const dateFilter = document.getElementById("dateFilter");
  const bookingSearch = document.getElementById("bookingSearch");

  if (statusFilter) statusFilter.addEventListener("change", filterBookings);
  if (dateFilter) dateFilter.addEventListener("change", filterBookings);
  if (bookingSearch) bookingSearch.addEventListener("input", searchBookings);

  // Calendar navigation
  const prevMonth = document.getElementById("prevMonth");
  const nextMonth = document.getElementById("nextMonth");

  if (prevMonth)
    prevMonth.addEventListener("click", () => navigateCalendar(-1));
  if (nextMonth) nextMonth.addEventListener("click", () => navigateCalendar(1));

  // Client search
  const clientSearch = document.getElementById("clientSearch");
  if (clientSearch) {
    clientSearch.addEventListener("input", searchClients);
  }

  // Profile image input
  const profileImageInput = document.getElementById("profileImageInput");
  if (profileImageInput) {
    profileImageInput.addEventListener("change", handleProfileImageUpload);
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    showLoading();

    await Promise.all([
      loadProfile(),
      loadStats(),
      loadRecentActivity(),
      loadUpcomingEvents(),
      loadBookings(),
      loadEarnings(),
      loadNotifications(),
    ]);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showNotification("Error loading dashboard data", "error");
  } finally {
    hideLoading();
  }
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch("/api/planner/stats", {
      credentials: "include",
    });

    if (response.ok) {
      const stats = await response.json();
      updateStatsDisplay(stats);
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Update stats display
function updateStatsDisplay(stats) {
  const totalEvents = document.getElementById("totalEvents");
  const pendingEvents = document.getElementById("pendingEvents");
  const monthlyEarnings = document.getElementById("monthlyEarnings");
  const averageRating = document.getElementById("averageRating");
  const pendingBookingsBadge = document.getElementById("pendingBookingsBadge");
  const navNotificationCount = document.getElementById("navNotificationCount");

  if (totalEvents) totalEvents.textContent = stats.totalEvents || 0;
  if (pendingEvents) pendingEvents.textContent = stats.pendingEvents || 0;
  if (monthlyEarnings)
    monthlyEarnings.textContent = `CFA ${formatNumber(
      stats.monthlyEarnings || 0
    )}`;
  if (averageRating)
    averageRating.textContent = (stats.averageRating || 0).toFixed(1);
  if (pendingBookingsBadge)
    pendingBookingsBadge.textContent = stats.pendingEvents || 0;
  if (navNotificationCount)
    navNotificationCount.textContent = stats.notifications || 0;
}

// Load recent activity
async function loadRecentActivity() {
  try {
    const response = await fetch("/api/planner/activity", {
      credentials: "include",
    });

    if (response.ok) {
      const activities = await response.json();
      displayRecentActivity(activities);
    }
  } catch (error) {
    console.error("Error loading recent activity:", error);
  }
}

// Display recent activity
function displayRecentActivity(activities) {
  const container = document.getElementById("recentActivityList");
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No recent activity</p>';
    return;
  }

  container.innerHTML = activities
    .map(
      (activity) => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
            <div class="activity-time">
                ${formatTimeAgo(activity.created_at)}
            </div>
        </div>
    `
    )
    .join("");
}

// Load upcoming events
async function loadUpcomingEvents() {
  try {
    const response = await fetch("/api/planner/upcoming-events", {
      credentials: "include",
    });

    if (response.ok) {
      const events = await response.json();
      displayUpcomingEvents(events);
    }
  } catch (error) {
    console.error("Error loading upcoming events:", error);
  }
}

// Display upcoming events
function displayUpcomingEvents(events) {
  const container = document.getElementById("upcomingEventsList");
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No upcoming events</p>';
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
        <div class="upcoming-item">
            <div class="upcoming-date">${formatDateShort(
              event.event_date
            )}</div>
            <div class="upcoming-content">
                <h4>${event.event_type}</h4>
                <p>Client: ${event.customer_name}</p>
                <p>Location: ${event.location}</p>
            </div>
        </div>
    `
    )
    .join("");
}

// Load bookings
async function loadBookings() {
  try {
    showLoading();

    const response = await fetch("/api/planner/bookings", {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      bookingsData = data.bookings || data || [];
      displayBookings(bookingsData);
      updateBookingStats(bookingsData);
    } else {
      console.error("Failed to load bookings:", response.status);

      if (response.status === 500) {
        console.log("Trying alternative bookings endpoint...");
        const altResponse = await fetch("/api/bookings/planner", {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          bookingsData = altData.bookings || altData || [];
          displayBookings(bookingsData);
          updateBookingStats(bookingsData);
        } else {
          throw new Error(
            `Alternative endpoint also failed: ${altResponse.status}`
          );
        }
      } else {
        throw new Error(`Failed to load bookings: ${response.status}`);
      }
    }
  } catch (error) {
    console.error("Error loading bookings:", error);
    showNotification(
      "Error loading bookings. Please try again later.",
      "error"
    );
    bookingsData = [];
    displayBookings(bookingsData);
    updateBookingStats(bookingsData);
  } finally {
    hideLoading();
  }
}

// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById("bookingsList");
  if (!container) return;

  if (!bookings || bookings.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No bookings found</p>';
    return;
  }

  const tableHTML = `
        <table class="bookings-table">
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Event Type</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bookings
                  .map(
                    (booking) => `
                    <tr>
                        <td>
                            <div>
                                <strong>${
                                  booking.customer_name || "N/A"
                                }</strong>
                                <br>
                                <small>${booking.phone_number || "N/A"}</small>
                            </div>
                        </td>
                        <td>${booking.event_type}</td>
                        <td>${formatDate(booking.event_date)}</td>
                        <td>${booking.location}</td>
                        <td>${booking.category}</td>
                        <td>
                            <span class="booking-status ${booking.status
                              .toLowerCase()
                              .replace(" ", "-")}">
                                ${booking.status}
                            </span>
                        </td>
                        <td>
                            <div class="booking-actions">
                                <button class="action-btn-sm view" onclick="showBookingDetails(${
                                  booking.id
                                })" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${
                                  booking.status.toLowerCase() === "pending"
                                    ? `
                                    <button class="action-btn-sm accept" onclick="acceptBooking(${booking.id})" title="Accept Booking">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="action-btn-sm reject" onclick="rejectBooking(${booking.id})" title="Reject Booking">
                                        <i class="fas fa-times"></i>
                                    </button>
                                `
                                    : ""
                                }
                                ${
                                  booking.status.toLowerCase() !== "completed"
                                    ? `
                                    <button class="action-btn-sm delete" onclick="deleteBooking(${booking.id})" title="Delete Booking">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                `
                                    : ""
                                }
                            </div>
                        </td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
    `;

  container.innerHTML = tableHTML;
}

// Delete booking
async function deleteBooking(bookingId) {
  console.log("Delete booking called with ID:", bookingId);

  if (!bookingId || bookingId === "undefined") {
    showNotification("Invalid booking ID", "error");
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this booking? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      showNotification("Booking deleted successfully", "success");
      loadBookings();
    } else {
      const error = await response.json();
      showNotification(error.error || "Error deleting booking", "error");
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    showNotification("Error deleting booking", "error");
  }
}

// Filter bookings
function filterBookings() {
  const statusFilter = document.getElementById("statusFilter");
  const dateFilter = document.getElementById("dateFilter");

  if (!statusFilter || !dateFilter) return;

  const statusValue = statusFilter.value;
  const dateValue = dateFilter.value;

  let filteredBookings = [...bookingsData];

  // Filter by status
  if (statusValue !== "all") {
    filteredBookings = filteredBookings.filter(
      (booking) => booking.status.toLowerCase() === statusValue.toLowerCase()
    );
  }

  // Filter by date (month)
  if (dateValue) {
    const filterMonth = dateValue.substring(0, 7);
    filteredBookings = filteredBookings.filter(
      (booking) => booking.event_date.substring(0, 7) === filterMonth
    );
  }

  displayBookings(filteredBookings);
}

// Search bookings
function searchBookings() {
  const searchInput = document.getElementById("bookingSearch");
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();

  if (!searchTerm) {
    displayBookings(bookingsData);
    return;
  }

  const filteredBookings = bookingsData.filter(
    (booking) =>
      (booking.customer_name &&
        booking.customer_name.toLowerCase().includes(searchTerm)) ||
      (booking.event_type &&
        booking.event_type.toLowerCase().includes(searchTerm)) ||
      (booking.location &&
        booking.location.toLowerCase().includes(searchTerm)) ||
      (booking.category && booking.category.toLowerCase().includes(searchTerm))
  );

  displayBookings(filteredBookings);
}

// Update booking stats
function updateBookingStats(bookings) {
  const pendingCount = bookings.filter(
    (b) => b.status.toLowerCase() === "pending"
  ).length;
  const confirmedCount = bookings.filter(
    (b) => b.status.toLowerCase() === "confirmed"
  ).length;
  const completedCount = bookings.filter(
    (b) => b.status.toLowerCase() === "completed"
  ).length;

  const pendingCountEl = document.getElementById("pendingCount");
  const confirmedCountEl = document.getElementById("confirmedCount");
  const completedCountEl = document.getElementById("completedCount");

  if (pendingCountEl) pendingCountEl.textContent = pendingCount;
  if (confirmedCountEl) confirmedCountEl.textContent = confirmedCount;
  if (completedCountEl) completedCountEl.textContent = completedCount;
}

// Show booking details
async function showBookingDetails(bookingId) {
  console.log("Show booking details called with ID:", bookingId);

  if (!bookingId || bookingId === "undefined") {
    showNotification("Invalid booking ID", "error");
    return;
  }

  try {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      displayBookingModal(data.booking);
    } else {
      const error = await response.json();
      showNotification(error.error || "Error loading booking details", "error");
    }
  } catch (error) {
    console.error("Error loading booking details:", error);
    showNotification("Error loading booking details", "error");
  }
}

// Display booking modal
function displayBookingModal(booking) {
  currentBookingId = booking.id;

  const modalBody = document.getElementById("bookingModalBody");
  if (!modalBody) return;

  modalBody.innerHTML = `
        <div class="booking-detail-grid">
            <div class="detail-section">
                <h3>Event Information</h3>
                <div class="detail-item">
                    <label>Event Type:</label>
                    <span>${booking.event_type}</span>
                </div>
                <div class="detail-item">
                    <label>Date:</label>
                    <span>${formatDate(booking.event_date)}</span>
                </div>
                <div class="detail-item">
                    <label>Time:</label>
                    <span>${booking.event_time}</span>
                </div>
                <div class="detail-item">
                    <label>Location:</label>
                    <span>${booking.location}</span>
                </div>
                <div class="detail-item">
                    <label>Category:</label>
                    <span>${booking.category}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="booking-status ${booking.status
                      .toLowerCase()
                      .replace(" ", "-")}">${booking.status}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Client Information</h3>
                <div class="detail-item">
                    <label>Name:</label>
                    <span>${booking.customer_name}</span>
                </div>
                <div class="detail-item">
                    <label>Phone:</label>
                    <span>${booking.phone_number}</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>${booking.email}</span>
                </div>
            </div>
            
            <div class="detail-section full-width">
                <h3>Requirements</h3>
                <p>${booking.requirements || "No specific requirements"}</p>
            </div>
            
            <div class="detail-section full-width">
                <h3>Booking Timeline</h3>
                <div class="timeline-small">
                    <div class="timeline-item-small">
                        <div class="timeline-date-small">Booked</div>
                        <div class="timeline-content-small">${formatDate(
                          booking.created_at
                        )}</div>
                    </div>
                    ${
                      booking.confirmed_at
                        ? `
                        <div class="timeline-item-small">
                            <div class="timeline-date-small">Confirmed</div>
                            <div class="timeline-content-small">${formatDate(
                              booking.confirmed_at
                            )}</div>
                        </div>
                    `
                        : ""
                    }
                    ${
                      booking.completed_at
                        ? `
                        <div class="timeline-item-small">
                            <div class="timeline-date-small">Completed</div>
                            <div class="timeline-content-small">${formatDate(
                              booking.completed_at
                            )}</div>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
            
            ${
              booking.status.toLowerCase() === "pending"
                ? `
                <div class="detail-section full-width">
                    <div class="modal-actions" style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                        <button id="acceptBtn" class="btn-primary" onclick="acceptBookingFromModal()">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button id="rejectBtn" class="btn-danger" onclick="rejectBookingFromModal()">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;

  const modal = document.getElementById("bookingModal");
  if (modal) {
    modal.style.display = "block";
  }
}

// Accept/Reject booking from modal
function acceptBookingFromModal() {
  if (currentBookingId) {
    acceptBooking(currentBookingId);
  } else {
    showNotification("Invalid booking ID", "error");
  }
}

function rejectBookingFromModal() {
  if (currentBookingId) {
    rejectBooking(currentBookingId);
  } else {
    showNotification("Invalid booking ID", "error");
  }
}

// Accept booking
async function acceptBooking(bookingId) {
  console.log("Accept booking called with ID:", bookingId);

  if (!bookingId || bookingId === "undefined") {
    showNotification("Invalid booking ID", "error");
    return;
  }

  if (!confirm("Are you sure you want to accept this booking?")) {
    return;
  }

  try {
    const response = await fetch(`/api/planner/bookings/${bookingId}/accept`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      showNotification("Booking accepted successfully", "success");
      loadBookings();
      closeModal();
    } else {
      showNotification(data.error || "Error accepting booking", "error");
    }
  } catch (error) {
    console.error("Error accepting booking:", error);
    showNotification("Error accepting booking", "error");
  }
}

// Reject booking
async function rejectBooking(bookingId) {
  console.log("Reject booking called with ID:", bookingId);

  if (!bookingId || bookingId === "undefined") {
    showNotification("Invalid booking ID", "error");
    return;
  }

  const reason = prompt("Please provide a reason for rejection (optional):");
  if (reason === null) return;

  try {
    const response = await fetch(`/api/planner/bookings/${bookingId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification("Booking rejected successfully", "success");
      loadBookings();
      closeModal();
    } else {
      showNotification(data.error || "Error rejecting booking", "error");
    }
  } catch (error) {
    console.error("Error rejecting booking:", error);
    showNotification("Error rejecting booking", "error");
  }
}

// Calendar Functions
function setupCalendar() {
  generateCalendar();
}

function generateCalendar() {
  const calendar = document.getElementById("calendar");
  const monthHeader = document.getElementById("currentMonth");

  if (!calendar || !monthHeader) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  monthHeader.textContent = `${getMonthName(month)} ${year}`;

  calendar.innerHTML = "";

  // Day headers
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.textContent = day;
    dayHeader.style.cssText = `
            background: var(--gray-100);
            padding: 0.75rem;
            font-weight: 600;
            text-align: center;
            color: var(--gray-700);
        `;
    calendar.appendChild(dayHeader);
  });

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day empty";
    calendar.appendChild(emptyDay);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";

    dayElement.style.cursor = "pointer";
    dayElement.addEventListener("click", () => {
      const clickedDate = new Date(year, month, day);
      showDaySchedule(clickedDate);
    });

    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);

    const isToday =
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate();

    if (isToday) {
      dayElement.classList.add("today");
    }

    const dayEvents = document.createElement("div");
    dayEvents.className = "day-events";

    const dayDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const eventsForDay = scheduleData.filter((event) => {
      // Handle timezone
      const eventDate = new Date(event.event_date);
      const calendarDate = new Date(year, month, day);

      // Compare dates
      const eventLocalDate = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      const calendarLocalDate = new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth(),
        calendarDate.getDate()
      );

      return (
        eventLocalDate.getTime() === calendarLocalDate.getTime() &&
        event.status === "confirmed"
      );
    });

    if (eventsForDay.length > 0) {
      dayElement.classList.add("has-events");

      const eventIndicator = document.createElement("div");
      eventIndicator.className = "event-indicator";
      eventIndicator.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                width: 8px;
                height: 8px;
                background: var(--primary-color);
                border-radius: 50%;
                z-index: 1;
            `;
      dayElement.style.position = "relative";
      dayElement.appendChild(eventIndicator);
    }

    eventsForDay.forEach((event, index) => {
      if (index < 3) {
        const eventDot = document.createElement("div");
        eventDot.className = "event-dot";
        eventDot.style.cssText = `
                    width: 6px;
                    height: 6px;
                    background: var(--primary-color);
                    border-radius: 50%;
                    margin: 1px;
                    display: inline-block;
                `;
        eventDot.title = `${event.event_type} - ${event.customer_name}`;
        dayEvents.appendChild(eventDot);
      }
    });

    if (eventsForDay.length > 3) {
      const moreText = document.createElement("small");
      moreText.textContent = `+${eventsForDay.length - 3} more`;
      moreText.style.cssText = `
                font-size: 8px;
                color: var(--primary-color);
                display: block;
                text-align: center;
            `;
      dayEvents.appendChild(moreText);
    }

    dayElement.appendChild(dayEvents);
    calendar.appendChild(dayElement);

    if (isToday && eventsForDay.length > 0) {
      setTimeout(() => {
        const todayDate = new Date(year, month, day);
        showDaySchedule(todayDate);
      }, 100);
    }
  }
}

function navigateCalendar(direction) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
  loadSchedule();
}

function getMonthName(monthIndex) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex];
}

// Load schedule
async function loadSchedule() {
  try {
    showLoading();

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth() + 1;

    const response = await fetch(
      `/api/planner/schedule?year=${year}&month=${month}`,
      {
        credentials: "include",
      }
    );

    if (response.ok) {
      const schedule = await response.json();
      scheduleData = schedule.allEvents || [];

      const today = new Date();
      displayTodaySchedule(schedule.today || []);

      generateCalendar();

      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      if (
        currentCalendarDate.getMonth() === currentMonth &&
        currentCalendarDate.getFullYear() === currentYear
      ) {
        const todayEvents = scheduleData.filter((event) => {
          const eventDate = event.event_date.split("T")[0];
          const todayDate = today.toISOString().split("T")[0];
          return eventDate === todayDate && event.status === "confirmed";
        });

        if (todayEvents.length > 0) {
          displayDaySchedule(todayEvents, today);
        }
      }
    }
  } catch (error) {
    console.error("Error loading schedule:", error);
    showNotification("Error loading schedule", "error");
  } finally {
    hideLoading();
  }
}

function showDaySchedule(date) {
  const dateString = date.toISOString().split("T")[0];
  const eventsForDay = scheduleData.filter((event) => {
    const eventDate = event.event_date.split("T")[0];
    return eventDate === dateString && event.status === "confirmed";
  });

  displayDaySchedule(eventsForDay, date);
}

function displayDaySchedule(events, date) {
  const container = document.getElementById("todaySchedule");
  const scheduleTitle = document.querySelector(".schedule-list h3");

  if (!container) return;

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (scheduleTitle) {
    scheduleTitle.textContent = isToday
      ? "Today's Schedule"
      : `Schedule for ${formatDate(date)}`;
  }

  if (!events || events.length === 0) {
    const dateText = isToday ? "today" : formatDate(date);
    container.innerHTML = `<p class="text-center text-gray-500">No events scheduled for ${dateText}</p>`;
    return;
  }

  events.sort((a, b) => {
    const timeA = a.event_time || "00:00";
    const timeB = b.event_time || "00:00";
    return timeA.localeCompare(timeB);
  });

  container.innerHTML = events
    .map(
      (event) => `
        <div class="schedule-item" onclick="showEventDetails(${
          event.id
        })" style="cursor: pointer;">
            <div class="schedule-time">${formatTime(event.event_time)}</div>
            <div class="schedule-content">
                <h4>${event.event_type}</h4>
                <p><i class="fas fa-user"></i> Client: ${
                  event.customer_name
                }</p>
                <p><i class="fas fa-map-marker-alt"></i> Location: ${
                  event.location
                }</p>
                <p><i class="fas fa-phone"></i> Phone: ${
                  event.phone_number || "N/A"
                }</p>
                <div class="event-status">
                    <span class="booking-status confirmed">Confirmed</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function formatTime(timeString) {
  if (!timeString) return "Time TBD";

  try {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    return timeString;
  }
}

function showEventDetails(eventId) {
  const event = scheduleData.find((e) => e.id === eventId);
  if (!event) return;

  showNotification(
    `Event: ${event.event_type} with ${event.customer_name}`,
    "info"
  );
}

function displayTodaySchedule(schedule) {
  const container = document.getElementById("todaySchedule");
  if (!container) return;

  if (!schedule || schedule.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No events scheduled for today</p>';
    return;
  }

  container.innerHTML = schedule
    .map(
      (event) => `
        <div class="schedule-item">
            <div class="schedule-time">${event.event_time}</div>
            <div class="schedule-content">
                <h4>${event.event_type}</h4>
                <p>Client: ${event.customer_name}</p>
                <p>Location: ${event.location}</p>
            </div>
        </div>
    `
    )
    .join("");
}

// Load clients
async function loadClients() {
  try {
    showLoading();

    const response = await fetch("/api/planner/clients", {
      credentials: "include",
    });

    if (response.ok) {
      clientsData = await response.json();
      displayClients(clientsData);
    } else {
      console.error("Failed to load clients:", response.status);
      showNotification("Error loading clients", "error");
      clientsData = [];
      displayClients(clientsData);
    }
  } catch (error) {
    console.error("Error loading clients:", error);
    showNotification("Error loading clients", "error");
    clientsData = [];
    displayClients(clientsData);
  } finally {
    hideLoading();
  }
}

// Display clients
function displayClients(clients) {
  const container = document.getElementById("clientsList");
  if (!container) return;

  if (!clients || clients.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 1rem;"></i>
                <h3>No clients found</h3>
                <p>Clients who make bookings with you will appear here</p>
            </div>
        `;
    return;
  }

  container.innerHTML = clients
    .map(
      (client) => `
        <div class="client-card" onclick="showClientDetails(${client.id})">
            <div class="client-header">
                <div class="client-avatar">
                    ${
                      client.full_name
                        ? client.full_name.charAt(0).toUpperCase()
                        : "U"
                    }
                </div>
                <div class="client-info">
                    <h3>${client.full_name || "Unknown"}</h3>
                    <p><i class="fas fa-envelope"></i> ${
                      client.email || "No email"
                    }</p>
                    <p><i class="fas fa-phone"></i> ${
                      client.phone_number || "No phone"
                    }</p>
                    ${
                      client.location
                        ? `<p><i class="fas fa-map-marker-alt"></i> ${client.location}</p>`
                        : ""
                    }
                </div>
            </div>
            <div class="client-stats">
                <div class="client-stat">
                    <span class="number">${client.total_bookings || 0}</span>
                    <span class="label">Bookings</span>
                </div>
                <div class="client-stat">
                    <span class="number">CFA ${formatNumber(
                      client.total_spent || 0
                    )}</span>
                    <span class="label">Spent</span>
                </div>
                <div class="client-stat">
                    <span class="number">${
                      client.rating
                        ? parseFloat(client.rating).toFixed(1)
                        : "N/A"
                    }</span>
                    <span class="label">Rating</span>
                </div>
            </div>
            <div class="client-meta">
                <small class="text-gray-500">
                    <i class="fas fa-calendar"></i> 
                    Last booking: ${
                      client.last_booking_date
                        ? formatDate(client.last_booking_date)
                        : "N/A"
                    }
                </small>
            </div>
            <div class="client-actions">
                <button class="btn-sm primary" onclick="event.stopPropagation(); contactClient('${
                  client.phone_number
                }')" title="Call Client">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="btn-sm secondary" onclick="event.stopPropagation(); emailClient('${
                  client.email
                }')" title="Email Client">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="btn-sm info" onclick="event.stopPropagation(); viewClientBookings(${
                  client.id
                })" title="View Bookings">
                    <i class="fas fa-calendar-alt"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// View client bookings
function viewClientBookings(clientId) {
  sessionStorage.setItem("filterClientId", clientId);
  showSection("bookings");

  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((mi) => mi.classList.remove("active"));
  const bookingsMenuItem = document.querySelector('[data-section="bookings"]');
  if (bookingsMenuItem) {
    bookingsMenuItem.classList.add("active");
  }
}

// Search clients
function searchClients() {
  const searchInput = document.getElementById("clientSearch");
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();

  if (!searchTerm) {
    displayClients(clientsData);
    return;
  }

  const filteredClients = clientsData.filter(
    (client) =>
      (client.full_name &&
        client.full_name.toLowerCase().includes(searchTerm)) ||
      (client.email && client.email.toLowerCase().includes(searchTerm)) ||
      (client.phone_number &&
        client.phone_number.toLowerCase().includes(searchTerm)) ||
      (client.location && client.location.toLowerCase().includes(searchTerm))
  );

  displayClients(filteredClients);
}

// Contact functions
function contactClient(phoneNumber) {
  if (phoneNumber && phoneNumber !== "undefined") {
    window.location.href = `tel:${phoneNumber}`;
  }
}

function emailClient(email) {
  if (email && email !== "undefined") {
    window.location.href = `mailto:${email}`;
  }
}

// Show client details modal
async function showClientDetails(clientId) {
  try {
    showLoading();

    const response = await fetch(`/api/planner/clients/${clientId}/details`, {
      credentials: "include",
    });

    if (response.ok) {
      const clientDetails = await response.json();
      displayClientDetailsModal(clientDetails);
    } else {
      showNotification("Error loading client details", "error");
    }
  } catch (error) {
    console.error("Error loading client details:", error);
    showNotification("Error loading client details", "error");
  } finally {
    hideLoading();
  }
}

// Display client details modal
function displayClientDetailsModal(client) {
  const modalBody = document.getElementById("clientModalBody");
  if (!modalBody) return;

  modalBody.innerHTML = `
        <div class="client-detail-grid">
            <div class="detail-section">
                <h3>Contact Information</h3>
                <div class="detail-item">
                    <label>Name:</label>
                    <span>${client.full_name || "N/A"}</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>${client.email || "N/A"}</span>
                </div>
                <div class="detail-item">
                    <label>Phone:</label>
                    <span>${client.phone_number || "N/A"}</span>
                </div>
                <div class="detail-item">
                    <label>Location:</label>
                    <span>${client.location || "N/A"}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Booking Statistics</h3>
                <div class="detail-item">
                    <label>Total Bookings:</label>
                    <span>${client.total_bookings || 0}</span>
                </div>
                <div class="detail-item">
                    <label>Total Spent:</label>
                    <span>CFA ${formatNumber(client.total_spent || 0)}</span>
                </div>
                <div class="detail-item">
                    <label>Average Rating:</label>
                    <span>${
                      client.rating
                        ? parseFloat(client.rating).toFixed(1) + " stars"
                        : "Not rated yet"
                    }</span>
                </div>
                <div class="detail-item">
                    <label>Client Since:</label>
                    <span>${formatDate(client.created_at)}</span>
                </div>
            </div>
            
            ${
              client.bookings && client.bookings.length > 0
                ? `
                <div class="detail-section full-width">
                    <h3>Recent Bookings</h3>
                    <div class="bookings-list-small">
                        ${client.bookings
                          .slice(0, 5)
                          .map(
                            (booking) => `
                            <div class="booking-item-small">
                                <div class="booking-info">
                                    <strong>${booking.event_type}</strong>
                                    <span>${formatDate(
                                      booking.event_date
                                    )}</span>
                                </div>
                                <div class="booking-status">
                                    <span class="booking-status ${booking.status
                                      .toLowerCase()
                                      .replace(" ", "-")}">${
                              booking.status
                            }</span>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                        ${
                          client.bookings.length > 5
                            ? `<p><em>+${
                                client.bookings.length - 5
                              } more bookings...</em></p>`
                            : ""
                        }
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;

  const modal = document.getElementById("clientModal");
  if (modal) {
    modal.style.display = "block";
  }
}

// Load earnings
async function loadEarnings() {
  try {
    showLoading();

    const response = await fetch("/api/planner/earnings", {
      credentials: "include",
    });

    if (response.ok) {
      earningsData = await response.json();
      displayEarnings(earningsData);
      updateDashboardEarnings(earningsData);
    } else {
      console.error("Failed to load earnings:", response.status);
      showNotification("Error loading earnings data", "error");
    }
  } catch (error) {
    console.error("Error loading earnings:", error);
    showNotification("Error loading earnings data", "error");
  } finally {
    hideLoading();
  }
}

// Display earnings chart
function displayEarningsChart(monthlyTrends) {
  const chartContainer = document.getElementById("earningsChart");
  if (!chartContainer) {
    console.log("Earnings chart container not found");
    return;
  }

  const currentYear = new Date().getFullYear();

  const allMonths = [
    { name: "Jan", index: 1 },
    { name: "Feb", index: 2 },
    { name: "Mar", index: 3 },
    { name: "Apr", index: 4 },
    { name: "May", index: 5 },
    { name: "Jun", index: 6 },
    { name: "Jul", index: 7 },
    { name: "Aug", index: 8 },
    { name: "Sep", index: 9 },
    { name: "Oct", index: 10 },
    { name: "Nov", index: 11 },
    { name: "Dec", index: 12 },
  ];

  // Map of existing data
  const trendsMap = {};
  if (monthlyTrends && Array.isArray(monthlyTrends)) {
    monthlyTrends.forEach((trend) => {
      if (trend.year === currentYear) {
        trendsMap[trend.month] = trend.earnings;
      }
    });
  }

  // Complete data for all 12 months
  const completeData = allMonths.map((month) => {
    const earnings = trendsMap[month.name] || 0;
    return {
      month: month.name,
      earnings: earnings,
      hasEarnings: earnings > 0,
    };
  });

  // Calculate max earnings for proper scaling
  const maxEarnings = Math.max(
    ...completeData.map((data) => data.earnings),
    100000
  );

  chartContainer.innerHTML = `
        <div class="earnings-chart-content">
            <div class="chart-title">
                <h4>Monthly Earnings Trend - ${currentYear}</h4>
            </div>
            <div class="chart-bars">
                ${completeData
                  .map((data) => {
                    const percentage =
                      maxEarnings > 0
                        ? Math.max((data.earnings / maxEarnings) * 100, 3)
                        : 3;
                    const barClass = data.hasEarnings
                      ? "chart-bar has-earnings"
                      : "chart-bar no-earnings";

                    return `
                        <div class="chart-bar-container">
                            <div class="${barClass}" 
                                 style="height: ${percentage}%;" 
                                 title="${
                                   data.month
                                 } ${currentYear}: CFA ${formatNumber(
                      data.earnings
                    )}">
                            </div>
                            <div class="chart-label">${data.month}</div>
                            <div class="chart-value">CFA ${
                              data.earnings > 0
                                ? formatNumber(data.earnings)
                                : "0"
                            }</div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
    `;
}

// Display Earnings
function displayEarnings(earnings) {
  const totalEarningsEl = document.getElementById("totalEarnings");
  const monthlyEarnings2El = document.getElementById("monthlyEarnings2");
  const pendingPaymentsEl = document.getElementById("pendingPayments");

  if (totalEarningsEl)
    totalEarningsEl.textContent = `CFA ${formatNumber(earnings.total || 0)}`;
  if (monthlyEarnings2El)
    monthlyEarnings2El.textContent = `CFA ${formatNumber(
      earnings.thisMonth || 0
    )}`;
  if (pendingPaymentsEl)
    pendingPaymentsEl.textContent = `CFA ${formatNumber(
      earnings.pending || 0
    )}`;

  // Update the monthly change indicator
  const monthlyChangeEl = document.querySelector("#earnings .change");
  if (monthlyChangeEl && earnings.monthlyChange !== undefined) {
    const changePercent = earnings.monthlyChange;
    const isPositive = changePercent >= 0;

    monthlyChangeEl.className = `change ${
      isPositive ? "positive" : "negative"
    }`;
    monthlyChangeEl.innerHTML = `${isPositive ? "+" : ""}${Math.abs(
      changePercent
    ).toFixed(1)}% from last month`;
  }

  displayTransactions(earnings.transactions || []);

  displayEarningsChart(earnings.monthlyTrends || []);
}

// CSS styles for the earnings chart
const chartStyles = `
    .earnings-chart {
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-top: 20px;
    }
    
    .earnings-chart h4 {
        margin-bottom: 20px;
        color: var(--text-primary);
        text-align: center;
    }
    
    .chart-bars {
        display: flex;
        align-items: end;
        justify-content: space-between;
        height: 200px;
        gap: 10px;
        padding: 0 10px;
        border-bottom: 2px solid var(--gray-300);
    }
    
    .chart-bar-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
    }
    
    .chart-bar {
        width: 100%;
        min-height: 5px;
        max-width: 40px;
        background: var(--primary-color);
        border-radius: 4px 4px 0 0;
        transition: all 0.3s ease;
        cursor: pointer;
        margin-bottom: 5px;
    }
    
    .chart-bar:hover {
        opacity: 0.8;
        transform: translateY(-2px);
    }
    
    .chart-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-top: 5px;
    }
    
    .chart-value {
        font-size: 10px;
        color: var(--text-muted);
        text-align: center;
        word-break: break-word;
    }
    
    @media (max-width: 768px) {
        .chart-bars {
            height: 150px;
        }
        
        .chart-label {
            font-size: 10px;
        }
        
        .chart-value {
            font-size: 8px;
        }
    }
`;

if (!document.getElementById("earnings-chart-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "earnings-chart-styles";
  styleSheet.textContent = chartStyles;
  document.head.appendChild(styleSheet);
}

// Update dashboard earnings card
function updateDashboardEarnings(earnings) {
  const dashboardEarningsEl = document.getElementById("monthlyEarnings");
  const dashboardChangeEl = document.querySelector(
    '.stat-card[data-section="earnings"] .stat-change'
  );

  if (dashboardEarningsEl) {
    dashboardEarningsEl.textContent = `CFA ${formatNumber(
      earnings.thisMonth || 0
    )}`;
  }

  if (dashboardChangeEl && earnings.monthlyChange !== undefined) {
    const changePercent = earnings.monthlyChange;
    const isPositive = changePercent >= 0;

    dashboardChangeEl.className = `stat-change ${
      isPositive ? "positive" : "negative"
    }`;
    dashboardChangeEl.textContent = `${isPositive ? "+" : ""}${Math.abs(
      changePercent
    ).toFixed(1)}% from last month`;
  }
}

// Updated displayTransactions
function displayTransactions(transactions) {
  const container = document.getElementById("transactionsList");
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No transactions found</p>';
    return;
  }

  const tableHTML = `
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment Status</th>
                </tr>
            </thead>
            <tbody>
                ${transactions
                  .map((transaction) => {
                    const amount = transaction.calculated_amount || 0;

                    // Determine payment status based on booking status
                    const isPaid =
                      transaction.status === "confirmed" ||
                      transaction.status === "completed";
                    const paymentStatus = isPaid ? "Paid" : "Pending";
                    const paymentClass = isPaid ? "paid" : "pending";

                    return `
                        <tr>
                            <td>${formatDate(transaction.event_date)}</td>
                            <td>${transaction.customer_name}</td>
                            <td>${transaction.event_type}</td>
                            <td>
                                <span class="category-badge">${
                                  transaction.category
                                }</span>
                            </td>
                            <td class="transaction-amount ${
                              isPaid ? "positive" : "pending"
                            }">
                                CFA ${formatNumber(amount)}
                            </td>
                            <td>
                                <span class="booking-status ${transaction.status
                                  .toLowerCase()
                                  .replace(" ", "-")}">
                                    ${transaction.status}
                                </span>
                            </td>
                            <td>
                                <span class="payment-status ${paymentClass}">
                                    ${paymentStatus}
                                </span>
                            </td>
                        </tr>
                    `;
                  })
                  .join("")}
            </tbody>
        </table>
    `;

  container.innerHTML = tableHTML;
}

// Load reviews
async function loadReviews() {
  try {
    showLoading();

    const response = await fetch("/api/planner/reviews", {
      credentials: "include",
    });

    if (response.ok) {
      reviewsData = await response.json();
      displayReviews(reviewsData);
    } else {
      console.error("Failed to load reviews:", response.status);
      displayReviews({
        overall: { rating: 0, total: 0 },
        breakdown: {},
        reviews: [],
      });
    }
  } catch (error) {
    console.error("Error loading reviews:", error);
    displayReviews({
      overall: { rating: 0, total: 0 },
      breakdown: {},
      reviews: [],
    });
  } finally {
    hideLoading();
  }
}

// Display reviews
function displayReviews(reviews) {
  const overallRating = reviews.overall || { rating: 0, total: 0 };

  const overallRatingEl = document.getElementById("overallRating");
  const totalReviewsEl = document.getElementById("totalReviews");
  const starsContainer = document.getElementById("overallStars");

  if (overallRatingEl)
    overallRatingEl.textContent = overallRating.rating.toFixed(1);
  if (totalReviewsEl)
    totalReviewsEl.textContent = `${overallRating.total} reviews`;
  if (starsContainer)
    starsContainer.innerHTML = generateStars(overallRating.rating);

  // Rating breakdown with dynamic progress bars
  const breakdown = reviews.breakdown || {};
  for (let i = 1; i <= 5; i++) {
    const countEl = document.getElementById(`${getStarWord(i)}-star-count`);
    const progressEl = document.querySelector(
      `.rating-bar:nth-child(${6 - i}) .fill`
    );

    if (countEl) countEl.textContent = breakdown[i.toString()] || 0;
    if (progressEl) {
      const percentage =
        overallRating.total > 0
          ? ((breakdown[i.toString()] || 0) / overallRating.total) * 100
          : 0;
      progressEl.style.width = `${percentage}%`;
    }
  }

  displayIndividualReviews(reviews.reviews || []);
}

// Get star word
function getStarWord(num) {
  const words = ["", "one", "two", "three", "four", "five"];
  return words[num];
}

// Display individual reviews
function displayIndividualReviews(reviews) {
  const container = document.getElementById("reviewsList");
  if (!container) return;

  if (!reviews || reviews.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 1rem;"></i>
                <h3>No reviews yet</h3>
                <p>Customer reviews will appear here after they rate your services</p>
            </div>
        `;
    return;
  }

  container.innerHTML = reviews
    .map(
      (review) => `
        <div class="review-item">
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        ${
                          review.customer_name
                            ? review.customer_name.charAt(0).toUpperCase()
                            : "U"
                        }
                    </div>
                    <div class="reviewer-details">
                        <h4>${review.customer_name || "Anonymous"}</h4>
                        <p class="review-event-info">
                            <i class="fas fa-calendar"></i> ${
                              review.event_type
                            } - ${formatDate(review.event_date)}
                        </p>
                        <p class="review-booking-info">
                            <i class="fas fa-map-marker-alt"></i> ${
                              review.location
                            }
                        </p>
                    </div>
                </div>
                <div class="review-meta">
                    <div class="review-rating">
                        ${generateStars(review.rating)}
                        <span class="rating-number">${review.rating}/5</span>
                    </div>
                    <div class="review-date">
                        <small class="text-gray-500">
                            <i class="fas fa-clock"></i> ${formatTimeAgo(
                              review.created_at
                            )}
                        </small>
                    </div>
                </div>
            </div>
            <div class="review-content">
                <p>${review.comment || "No comment provided"}</p>
            </div>
            <div class="review-booking-status">
                <span class="booking-status ${review.booking_status
                  .toLowerCase()
                  .replace(" ", "-")}">
                    ${review.booking_status}
                </span>
            </div>
        </div>
    `
    )
    .join("");
}

// Load analytics
async function loadAnalytics() {
  try {
    showLoading();

    const response = await fetch("/api/planner/analytics", {
      credentials: "include",
    });

    if (response.ok) {
      const analytics = await response.json();
      displAlanalytics(analytics);
    } else {
      console.error("Failed to load analytics:", response.status);
      displAlanalytics(getDefaultAnalytics());
    }
  } catch (error) {
    console.error("Error loading analytics:", error);
    displAlanalytics(getDefaultAnalytics());
  } finally {
    hideLoading();
  }
}

// Default analytics data
function getDefaultAnalytics() {
  return {
    satisfaction: {
      rate: 0,
      averageRating: 0,
      repeatClientRate: 0,
    },
    bookingTrends: [],
    eventTypes: [],
    revenueGrowth: { data: [] },
    insights: {
      bookingGrowth: 0,
      averageRating: 0,
      averageResponseHours: 0,
    },
  };
}

// Display analytics
function displAlanalytics(analytics) {
  updateSatisfactionMetrics(analytics.satisfaction);

  createBookingTrendsChart(analytics.bookingTrends);
  createEventTypesChart(analytics.eventTypes);
  createRevenueGrowthChart(analytics.revenueGrowth.data);

  updatePerformanceInsights(analytics.insights);
}

// Update satisfaction metrics
function updateSatisfactionMetrics(satisfaction) {
  const satisfactionRateEl = document.querySelector(
    ".satisfaction-metrics .metric:nth-child(1) .metric-value"
  );
  const averageRatingEl = document.querySelector(
    ".satisfaction-metrics .metric:nth-child(2) .metric-value"
  );
  const repeatClientsEl = document.querySelector(
    ".satisfaction-metrics .metric:nth-child(3) .metric-value"
  );

  if (satisfactionRateEl)
    satisfactionRateEl.textContent = `${satisfaction.rate}%`;
  if (averageRatingEl)
    averageRatingEl.textContent = `${satisfaction.averageRating.toFixed(1)}/5`;
  if (repeatClientsEl)
    repeatClientsEl.textContent = `${satisfaction.repeatClientRate}%`;
}

// Create booking trends chart
function createBookingTrendsChart(trendsData) {
  const canvas = document.getElementById("bookingTrendsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = trendsData.map((item) => `${item.month} ${item.year}`);
  const bookings = trendsData.map((item) => item.bookings);

  // Clear previous chart
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawLineChart(ctx, {
    labels,
    data: bookings,
    color: "#3B82F6",
    title: "Monthly Bookings",
    width: canvas.width,
    height: canvas.height,
  });
}

// Create event types chart (pie chart)
function createEventTypesChart(eventTypesData) {
  const canvas = document.getElementById("eventTypesChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Clear previous chart
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  drawPieChart(ctx, {
    data: eventTypesData,
    colors,
    width: canvas.width,
    height: canvas.height,
  });
}

// Create revenue growth chart
function createRevenueGrowthChart(revenueData) {
  const canvas = document.getElementById("revenueGrowthChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = revenueData.map((item) => `${item.month}`);
  const revenue = revenueData.map((item) => item.revenue);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBarChart(ctx, {
    labels,
    data: revenue,
    color: "#10B981",
    title: "Monthly Revenue",
    width: canvas.width,
    height: canvas.height,
    formatValue: (value) => `CFA ${formatNumber(value)}`,
  });
}

// Update performance insights
function updatePerformanceInsights(insights) {
  const insightsList = document.querySelector(".insights-list");
  if (!insightsList) return;

  // Generate insights based on data
  const insightItems = [];

  // Booking growth insight
  if (insights.bookingGrowth > 0) {
    insightItems.push({
      type: "positive",
      icon: "fa-trend-up",
      title: "Booking Increase",
      message: `Your bookings increased by ${insights.bookingGrowth}% compared to last month`,
    });
  } else if (insights.bookingGrowth < 0) {
    insightItems.push({
      type: "warning",
      icon: "fa-trend-down",
      title: "Booking Decrease",
      message: `Your bookings decreased by ${Math.abs(
        insights.bookingGrowth
      )}% compared to last month`,
    });
  }

  // Rating insight
  if (insights.averageRating >= 4.5) {
    insightItems.push({
      type: "positive",
      icon: "fa-star",
      title: "Excellent Ratings",
      message: `Your average rating is ${insights.averageRating.toFixed(
        1
      )} stars - keep up the great work!`,
    });
  } else if (insights.averageRating >= 4.0) {
    insightItems.push({
      type: "info",
      icon: "fa-star",
      title: "Good Ratings",
      message: `Your average rating is ${insights.averageRating.toFixed(
        1
      )} stars`,
    });
  }

  // Response time insight
  if (insights.averageResponseHours > 24) {
    insightItems.push({
      type: "warning",
      icon: "fa-clock",
      title: "Response Time",
      message: "Consider improving response time to booking inquiries",
    });
  } else if (insights.averageResponseHours < 2) {
    insightItems.push({
      type: "positive",
      icon: "fa-bolt",
      title: "Quick Response",
      message: "Great job on responding quickly to booking requests!",
    });
  }

  // Default insights if no data
  if (insightItems.length === 0) {
    insightItems.push({
      type: "info",
      icon: "fa-info-circle",
      title: "Getting Started",
      message:
        "Complete more bookings to see detailed insights about your business performance",
    });
  }

  insightsList.innerHTML = insightItems
    .map(
      (item) => `
        <div class="insight-item ${item.type}">
            <i class="fas ${item.icon}"></i>
            <div>
                <h4>${item.title}</h4>
                <p>${item.message}</p>
            </div>
        </div>
    `
    )
    .join("");
}

// Update satisfaction metrics
function updateSatisfactionMetrics(satisfaction) {
  const satisfactionRateEl = document.querySelector(
    ".satisfaction-metrics .metric:nth-child(1) .metric-value"
  );
  const averageRatingEl = document.querySelector(
    ".satisfaction-metrics .metric:nth-child(2) .metric-value"
  );
  const repeatClientsEl = document.querySelector(
    ".satisfaction-metrics .metric:nth-child(3) .metric-value"
  );

  if (satisfactionRateEl)
    satisfactionRateEl.textContent = `${satisfaction.rate}%`;
  if (averageRatingEl)
    averageRatingEl.textContent = `${satisfaction.averageRating.toFixed(1)}/5`;
  if (repeatClientsEl)
    repeatClientsEl.textContent = `${satisfaction.repeatClientRate}%`;
}

// Create booking trends chart
function createBookingTrendsChart(trendsData) {
  const canvas = document.getElementById("bookingTrendsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = trendsData.map((item) => `${item.month} ${item.year}`);
  const bookings = trendsData.map((item) => item.bookings);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawLineChart(ctx, {
    labels,
    data: bookings,
    color: "#3B82F6",
    title: "Monthly Bookings",
    width: canvas.width,
    height: canvas.height,
  });
}

// Line Chart Drawing Function
function drawLineChart(ctx, options) {
  const { labels, data, color, width, height } = options;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  if (data.length === 0) return;

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const valueRange = maxValue - minValue || 1;

  ctx.clearRect(0, 0, width, height);

  // Draw axes
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;

  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();

  // Draw grid lines
  ctx.strokeStyle = "#F3F4F6";
  ctx.lineWidth = 0.5;

  // Horizontal grid lines
  for (let i = 1; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Draw line
  if (data.length > 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const stepX = chartWidth / (data.length - 1);

    data.forEach((value, index) => {
      const x = padding + stepX * index;
      const y =
        height - padding - ((value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = color;
    data.forEach((value, index) => {
      const x = padding + stepX * index;
      const y =
        height - padding - ((value - minValue) / valueRange) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // Draw labels
  ctx.fillStyle = "#6B7280";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  const labelStep = Math.ceil(labels.length / 6);
  labels.forEach((label, index) => {
    if (index % labelStep === 0) {
      const x = padding + (chartWidth / (labels.length - 1)) * index;
      ctx.fillText(label, x, height - 10);
    }
  });

  // Draw Y-axis labels
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const value = minValue + (valueRange / 4) * (4 - i);
    const y = padding + (chartHeight / 4) * i;
    ctx.fillText(Math.round(value).toString(), padding - 10, y + 4);
  }
}

// Create event types chart (pie chart)
function createEventTypesChart(eventTypesData) {
  const canvas = document.getElementById("eventTypesChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  drawPieChart(ctx, {
    data: eventTypesData,
    colors,
    width: canvas.width,
    height: canvas.height,
  });
}

// Create revenue growth chart
function createRevenueGrowthChart(revenueData) {
  const canvas = document.getElementById("revenueGrowthChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = revenueData.map((item) => `${item.month}`);
  const revenue = revenueData.map((item) => item.revenue);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBarChart(ctx, {
    labels,
    data: revenue,
    color: "#10B981",
    title: "Monthly Revenue",
    width: canvas.width,
    height: canvas.height,
    formatValue: (value) => `CFA ${formatNumber(value)}`,
  });
}

// Update performance insights
function updatePerformanceInsights(insights) {
  const insightsList = document.querySelector(".insights-list");
  if (!insightsList) return;

  const insightItems = [];

  // Booking growth insight
  if (insights.bookingGrowth > 0) {
    insightItems.push({
      type: "positive",
      icon: "fa-trend-up",
      title: "Booking Increase",
      message: `Your bookings increased by ${insights.bookingGrowth}% compared to last month`,
    });
  } else if (insights.bookingGrowth < 0) {
    insightItems.push({
      type: "warning",
      icon: "fa-trend-down",
      title: "Booking Decrease",
      message: `Your bookings decreased by ${Math.abs(
        insights.bookingGrowth
      )}% compared to last month`,
    });
  }

  // Rating insight
  if (insights.averageRating >= 4.5) {
    insightItems.push({
      type: "positive",
      icon: "fa-star",
      title: "Excellent Ratings",
      message: `Your average rating is ${insights.averageRating.toFixed(
        1
      )} stars - keep up the great work!`,
    });
  } else if (insights.averageRating >= 4.0) {
    insightItems.push({
      type: "info",
      icon: "fa-star",
      title: "Good Ratings",
      message: `Your average rating is ${insights.averageRating.toFixed(
        1
      )} stars`,
    });
  }

  // Response time insight
  if (insights.averageResponseHours > 24) {
    insightItems.push({
      type: "warning",
      icon: "fa-clock",
      title: "Response Time",
      message: "Consider improving response time to booking inquiries",
    });
  } else if (insights.averageResponseHours < 2) {
    insightItems.push({
      type: "positive",
      icon: "fa-bolt",
      title: "Quick Response",
      message: "Great job on responding quickly to booking requests!",
    });
  }

  // Default insights if no data
  if (insightItems.length === 0) {
    insightItems.push({
      type: "info",
      icon: "fa-info-circle",
      title: "Getting Started",
      message:
        "Complete more bookings to see detailed insights about your business performance",
    });
  }

  insightsList.innerHTML = insightItems
    .map(
      (item) => `
        <div class="insight-item ${item.type}">
            <i class="fas ${item.icon}"></i>
            <div>
                <h4>${item.title}</h4>
                <p>${item.message}</p>
            </div>
        </div>
    `
    )
    .join("");
}

function drawPieChart(ctx, options) {
  const { data, colors, width, height } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  if (data.length === 0) return;

  const total = data.reduce((sum, item) => sum + item.count, 0);

  let currentAngle = -Math.PI / 2;

  data.forEach((item, index) => {
    const sliceAngle = (item.count / total) * 2 * Math.PI;
    const color = colors[index % colors.length];

    // Draw slice
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // Draw label
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
    const labelY = centerY + Math.sin(labelAngle) * (radius + 20);

    ctx.fillStyle = "#374151";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${item.event_type}`, labelX, labelY);
    ctx.fillText(`${item.percentage}%`, labelX, labelY + 15);

    currentAngle += sliceAngle;
  });
}

function drawBarChart(ctx, options) {
  const { labels, data, color, width, height, formatValue } = options;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  if (data.length === 0) return;

  const maxValue = Math.max(...data, 1);
  const barWidth = (chartWidth / data.length) * 0.6;
  const barSpacing = chartWidth / data.length;

  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;

  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();

  // Draw bars
  ctx.fillStyle = color;
  data.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
    const y = height - padding - barHeight;

    ctx.fillRect(x, y, barWidth, barHeight);

    // Draw value on top of bar
    ctx.fillStyle = "#374151";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    const displayValue = formatValue ? formatValue(value) : value.toString();
    ctx.fillText(displayValue, x + barWidth / 2, y - 5);

    ctx.fillStyle = color;
  });

  // Draw labels
  ctx.fillStyle = "#6B7280";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  labels.forEach((label, index) => {
    const x = padding + index * barSpacing + barSpacing / 2;
    ctx.fillText(label, x, height - 10);
  });
}

// Setup charts
function setupCharts() {
  console.log("Charts setup placeholder");
}

// Profile Functions
function setupProfileImageUpload() {
  const profileImage = document.querySelector(".profile-image");
  const fileInput = document.getElementById("profileImageInput");

  if (profileImage && fileInput) {
    profileImage.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", handleProfileImageUpload);
  }
}

async function handleProfileImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showNotification("Please select a valid image file", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showNotification("Image file size must be less than 5MB", "error");
    return;
  }

  const formData = new FormData();
  formData.append("profileImage", file);

  try {
    showLoading();

    const response = await fetch("/api/planner/profile/upload-image", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      const profileImg = document.getElementById("profileImage");
      if (profileImg) {
        profileImg.src = `/api/planner/profile/image?t=${Date.now()}`;
      }
      showNotification("Profile image updated successfully", "success");
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    console.error("Error uploading profile image:", error);
    showNotification("Error uploading image", "error");
  } finally {
    hideLoading();
  }
}

// Form handlers
function setupFormHandlers() {
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("blur", validateInput);

      input.addEventListener("input", function () {
        if (this.classList.contains("error")) {
          this.classList.remove("error");
        }
      });
    });
  });
}

// Update profile
async function updateProfile(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const profileData = Object.fromEntries(formData.entries());

  const specializationSelect = document.getElementById("specializations");
  if (specializationSelect) {
    const specializations = Array.from(specializationSelect.selectedOptions)
      .map((option) => option.value)
      .filter((value) => value && value.trim() !== "");

    profileData.specializations =
      specializations.length > 0 ? specializations : [];
  }

  // Validate required fields
  if (
    !profileData.businessName ||
    !profileData.ownerName ||
    !profileData.email ||
    !profileData.phone ||
    !profileData.location ||
    !profileData.bio ||
    !profileData.basePrice ||
    !profileData.experience
  ) {
    showNotification("Please fill in all required fields", "error");
    return;
  }

  // Validate numeric fields
  const basePrice = parseFloat(profileData.basePrice);
  if (isNaN(basePrice) || basePrice < 0) {
    showNotification("Base Price must be a valid positive number.", "error");
    return;
  }

  const experience = parseInt(profileData.experience);
  if (isNaN(experience) || experience < 0 || experience > 100) {
    showNotification(
      "Experience must be a valid number (e.g., years).",
      "error"
    );
    return;
  }

  profileData.basePrice = basePrice;
  profileData.experience = experience;

  console.log("=== FRONTEND DEBUG ===");
  console.log("Form data being sent:", profileData);
  console.log("Specializations array:", profileData.specializations);

  try {
    showLoading();

    const response = await fetch("/api/planner/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(profileData),
    });

    const data = await response.json();
    console.log("Response from server:", data);

    if (response.ok) {
      currentPlanner = data.planner;
      updateUserInterface();

      // Check if profile is now complete
      if (data.profileComplete) {
        enableAllSidebarLinks();
        removeProfileIncompleteWarning();
        showProfileCompletionCelebration();

        // Update session storage
        currentPlanner.profile_completed = true;

        // Refresh auth status to update sidebar access
        setTimeout(() => {
          checkAuthStatus();
        }, 1000);
      }

      showNotification("Profile updated successfully", "success");
    } else {
      showNotification(data.error || "Error updating profile", "error");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    showNotification("Error updating profile", "error");
  } finally {
    hideLoading();
  }
}

// Force refresh profile completion status
async function refreshProfileCompletionStatus() {
  try {
    const response = await fetch("/api/auth/status", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.user.profile_completed) {
        currentPlanner.profile_completed = true;
        enableAllSidebarLinks();
        removeProfileIncompleteWarning();
        showNotification("All features are now available!", "success");
      }
    }
  } catch (error) {
    console.error("Error refreshing profile status:", error);
  }
}

// Load profile data
async function loadProfile() {
  try {
    console.log("=== LOADING PROFILE DATA ===");

    const response = await fetch("/api/planner/profile", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Profile data received:", data);

      currentPlanner = data.planner;

      if (currentPlanner) {
        Object.assign(currentPlanner, {
          business_name: data.planner.business_name,
          bio: data.planner.bio,
          experience: data.planner.experience,
          specializations: data.planner.specializations,
          base_price: data.planner.base_price,
          home_address: data.planner.home_address,
          has_id_card: data.planner.has_id_card,
          has_birth_certificate: data.planner.has_birth_certificate,
        });

        // Set global flags based on database status
        hasIdCard = data.planner.has_id_card || false;
        hasBirthCertificate = data.planner.has_birth_certificate || false;

        console.log("Document flags set:", {
          hasIdCard,
          hasBirthCertificate,
        });
      }

      populateProfileForm();

      setTimeout(() => {
        loadExistingDocuments();
      }, 100);
    } else {
      console.error("Failed to load profile:", response.status);
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

// Load existing documents
async function loadExistingDocuments() {
  if (!currentPlanner) return;

  console.log("=== LOADING EXISTING DOCUMENTS ===");
  console.log("Has ID Card:", currentPlanner.has_id_card);
  console.log("Has Birth Certificate:", currentPlanner.has_birth_certificate);

  // Load ID card
  if (currentPlanner.has_id_card) {
    try {
      const response = await fetch("/api/planner/profile/id-card", {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        showExistingDocument(url, "idCard", blob.type);
        hasIdCard = true;
        console.log("ID Card loaded successfully");
      } else {
        console.error("Failed to load ID card:", response.status);
      }
    } catch (error) {
      console.error("Error loading ID card:", error);
    }
  }

  // Load birth certificate
  if (currentPlanner.has_birth_certificate) {
    try {
      console.log("Attempting to load birth certificate...");

      const response = await fetch("/api/planner/profile/birth-certificate", {
        credentials: "include",
      });

      console.log("Birth certificate response status:", response.status);

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        showExistingDocument(url, "birthCertificate", blob.type);
        hasBirthCertificate = true;
        console.log("Birth certificate loaded successfully");
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to load birth certificate:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("Error loading birth certificate:", error);
    }
  } else {
    console.log("No birth certificate data available");
  }
}

// Show existing document
function showExistingDocument(url, docType, mimeType) {
  console.log(`=== SHOWING EXISTING DOCUMENT: ${docType} ===`);
  console.log("MIME Type:", mimeType);

  const placeholder = document.getElementById(`${docType}Placeholder`);
  const preview = document.getElementById(`${docType}Preview`);
  const image = document.getElementById(`${docType}Image`);
  const pdfPreview = document.getElementById(`${docType}PdfPreview`);
  const pdfName = document.getElementById(`${docType}PdfName`);

  if (!placeholder || !preview) {
    console.error(`Missing elements for ${docType}:`, {
      placeholder: !!placeholder,
      preview: !!preview,
    });
    return;
  }

  console.log(`Setting up preview for ${docType}`);

  placeholder.style.display = "none";
  preview.style.display = "flex";

  if (mimeType === "application/pdf") {
    console.log(`Showing PDF preview for ${docType}`);
    if (image) image.style.display = "none";
    if (pdfPreview) {
      pdfPreview.style.display = "flex";
      if (pdfName) {
        pdfName.textContent = `${
          docType === "idCard" ? "ID Card" : "Birth Certificate"
        }.pdf`;
      }
    }
  } else {
    console.log(`Showing image preview for ${docType}`);
    if (pdfPreview) pdfPreview.style.display = "none";
    if (image) {
      image.style.display = "block";
      image.src = url;

      image.onerror = function () {
        console.error(`Failed to load image for ${docType}`);
        placeholder.style.display = "block";
        preview.style.display = "none";
      };

      image.onload = function () {
        console.log(`Image loaded successfully for ${docType}`);
      };
    }
  }
}

// Populate profile form
function populateProfileForm() {
  if (!currentPlanner) return;

  const businessNameEl = document.getElementById("businessName");
  const ownerNameEl = document.getElementById("ownerName");
  const emailEl = document.getElementById("email");
  const phoneEl = document.getElementById("phone");
  const locationEl = document.getElementById("location");
  const homeAddressEl = document.getElementById("homeAddress");
  const bioEl = document.getElementById("bio");
  const basePriceEl = document.getElementById("basePrice");
  const experienceEl = document.getElementById("experience");
  const profileImageEl = document.getElementById("profileImage");

  if (currentPlanner.business_name && businessNameEl)
    businessNameEl.value = currentPlanner.business_name;
  if (currentPlanner.full_name && ownerNameEl)
    ownerNameEl.value = currentPlanner.full_name;
  if (currentPlanner.email && emailEl) emailEl.value = currentPlanner.email;
  if (currentPlanner.phone_number && phoneEl)
    phoneEl.value = currentPlanner.phone_number;
  if (currentPlanner.location && locationEl)
    locationEl.value = currentPlanner.location;
  if (currentPlanner.home_address && homeAddressEl)
    homeAddressEl.value = currentPlanner.home_address;
  if (currentPlanner.bio && bioEl) bioEl.value = currentPlanner.bio;
  if (currentPlanner.base_price && basePriceEl)
    basePriceEl.value = currentPlanner.base_price;
  if (currentPlanner.experience && experienceEl)
    experienceEl.value = currentPlanner.experience;

  if (currentPlanner.profile_image && profileImageEl) {
    profileImageEl.src = currentPlanner.profile_image;
  }

  // Handle specializations properly
  if (currentPlanner.specializations) {
    const specializations = Array.isArray(currentPlanner.specializations)
      ? currentPlanner.specializations
      : typeof currentPlanner.specializations === "string"
      ? JSON.parse(currentPlanner.specializations)
      : [];

    const selectElement = document.getElementById("specializations");
    if (selectElement) {
      Array.from(selectElement.options).forEach((option) => {
        option.selected = specializations.includes(option.value);
      });
    }
  }
}

// Show profile completion celebration
function showProfileCompletionCelebration() {
  const celebration = document.createElement("div");
  celebration.className = "profile-complete-celebration";
  celebration.innerHTML = `
    <div class="celebration-content">
      <i class="fas fa-check-circle"></i>
      <h2>Profile Complete! 🎉</h2>
      <p>Your profile is now complete and you can access all dashboard features.</p>
      <button class="btn-primary" onclick="hideProfileCompletionCelebration()">
        Get Started
      </button>
    </div>
  `;

  document.body.appendChild(celebration);

  setTimeout(() => {
    hideProfileCompletionCelebration();
  }, 5000);
}

// Hide profile completion celebration
function hideProfileCompletionCelebration() {
  const celebration = document.querySelector(".profile-complete-celebration");
  if (celebration) {
    celebration.remove();
  }
}

// Add profile completion warning to dashboard
function addProfileIncompleteWarning() {
  const overviewSection = document.getElementById("overview");
  if (!overviewSection) return;

  const warning = document.createElement("div");
  warning.className = "profile-incomplete-warning";
  warning.innerHTML = `
    <div class="document-type-icon">
      <i class="fas fa-exclamation-triangle"></i>
    </div>
    <h3>Profile Incomplete</h3>
    <p>Please complete your profile by uploading your ID card and birth certificate to access all dashboard features.</p>
    <button class="btn-primary" onclick="navigateToSection('profile')" style="margin-top: 1rem;">
      Complete Profile
    </button>
  `;

  const sectionHeader = overviewSection.querySelector(".section-header");
  if (sectionHeader) {
    sectionHeader.parentNode.insertBefore(warning, sectionHeader.nextSibling);
  }
}

// Remove profile incomplete warning
function removeProfileIncompleteWarning() {
  const warning = document.querySelector(".profile-incomplete-warning");
  if (warning) {
    warning.remove();
  }
}

// Update working hours
async function updateWorkingHours(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const workingHours = {};

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  days.forEach((day) => {
    const isEnabled = formData.get(day) === "on";
    const startTime = formData.get(`${day}-start`);
    const endTime = formData.get(`${day}-end`);

    workingHours[day] = {
      enabled: isEnabled,
      start: startTime,
      end: endTime,
    };
  });

  try {
    showLoading();

    const response = await fetch("/api/planner/working-hours", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ workingHours }),
    });

    if (response.ok) {
      showNotification("Working hours updated successfully", "success");
    } else {
      const error = await response.json();
      showNotification(
        error.message || "Error updating working hours",
        "error"
      );
    }
  } catch (error) {
    console.error("Error updating working hours:", error);
    showNotification("Error updating working hours", "error");
  } finally {
    hideLoading();
  }
}

// Utility functions
function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)} hours ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }
}

function getActivityIcon(type) {
  const icons = {
    booking: "fa-calendar-plus",
    payment: "fa-money-bill-wave",
    review: "fa-star",
    profile: "fa-user-edit",
    default: "fa-info-circle",
  };
  return icons[type] || icons["default"];
}

function generateStars(rating) {
  let stars = "";
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fas fa-star"></i>';
  }

  if (hasHalfStar) {
    stars += '<i class="fas fa-star-half-alt"></i>';
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="far fa-star"></i>';
  }

  return stars;
}

function showLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "flex";
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

function showNotification(message, type = "info") {
  let notification = document.getElementById("notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transition: opacity 0.3s ease;
        `;
    document.body.appendChild(notification);
  }

  const colors = {
    success: "#28a745",
    error: "#dc3545",
    warning: "#ffc107",
    info: "#17a2b8",
  };

  notification.style.backgroundColor = colors[type] || colors.info;
  notification.textContent = message;
  notification.style.display = "block";
  notification.style.opacity = "1";

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      notification.style.display = "none";
    }, 300);
  }, 3000);
}

// Modal handlers
function setupModalHandlers() {
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("close")) {
      closeModal();
    }
  });

  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

// Updated closeModal function to clear image preview

function closeModal() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    modal.style.display = "none";
  });

  // Clear image preview
  hideImagePreview();

  currentBookingId = null;
}

// Mobile navigation
function setupMobileNavigation() {
  const mobileToggle = document.getElementById("mobileToggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  // Debug logging
  console.log("Mobile toggle:", mobileToggle);
  console.log("Sidebar:", sidebar);
  console.log("Sidebar overlay:", sidebarOverlay);

  if (!mobileToggle || !sidebar || !sidebarOverlay) {
    console.log("Missing mobile navigation elements");
    return;
  }

  // Remove any existing event listeners to prevent duplicates
  mobileToggle.replaceWith(mobileToggle.cloneNode(true));
  const newMobileToggle = document.getElementById("mobileToggle");

  newMobileToggle.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    console.log("Mobile toggle clicked");

    const isActive = sidebar.classList.contains("active");

    if (isActive) {
      // Close sidebar
      sidebar.classList.remove("active");
      sidebarOverlay.style.display = "none";
      document.body.style.overflow = "";

      const icon = newMobileToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    } else {
      // Open sidebar
      sidebar.classList.add("active");
      sidebarOverlay.style.display = "block";
      document.body.style.overflow = "hidden";

      const icon = newMobileToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-bars");
        icon.classList.add("fa-times");
      }
    }
  });

  // Close sidebar when overlay is clicked
  sidebarOverlay.addEventListener("click", function () {
    sidebar.classList.remove("active");
    sidebarOverlay.style.display = "none";
    document.body.style.overflow = "";

    const icon = newMobileToggle.querySelector("i");
    if (icon) {
      icon.classList.remove("fa-times");
      icon.classList.add("fa-bars");
    }
  });

  // Close sidebar when menu items are clicked on mobile
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", function () {
      if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        sidebarOverlay.style.display = "none";
        document.body.style.overflow = "";

        const icon = newMobileToggle.querySelector("i");
        if (icon) {
          icon.classList.remove("fa-times");
          icon.classList.add("fa-bars");
        }
      }
    });
  });

  // Handle window resize
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768 && sidebar.classList.contains("active")) {
      sidebar.classList.remove("active");
      sidebarOverlay.style.display = "none";
      document.body.style.overflow = "";

      const icon = newMobileToggle.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-times");
        icon.classList.add("fa-bars");
      }
    }
  });
}

function setupResponsiveModals() {
  const modals = document.querySelectorAll(".modal");

  modals.forEach((modal) => {
    modal.addEventListener("show", function () {
      document.body.style.overflow = "hidden";
    });

    modal.addEventListener("hide", function () {
      document.body.style.overflow = "";
    });
  });

  let startY = 0;
  modals.forEach((modal) => {
    modal.addEventListener("touchstart", function (e) {
      startY = e.touches[0].clientY;
    });

    modal.addEventListener("touchend", function (e) {
      const endY = e.changedTouches[0].clientY;
      const deltaY = startY - endY;

      if (deltaY < -100) {
        closeModal();
      }
    });
  });
}

function setupResponsiveTables() {
  const tables = document.querySelectorAll(
    ".bookings-table, .transactions-table"
  );

  tables.forEach((table) => {
    if (window.innerWidth <= 768) {
      const container = table.closest(
        ".bookings-table-container, .transactions-table"
      );
      if (container && !container.querySelector(".scroll-hint")) {
        const hint = document.createElement("div");
        hint.className = "scroll-hint";
        hint.innerHTML =
          '<small style="color: var(--gray-500); text-align: center; display: block; margin-bottom: 0.5rem;"><i class="fas fa-arrows-alt-h"></i> Scroll horizontally to see all columns</small>';
        container.insertBefore(hint, table);
      }
    }
  });
}

// Logout
async function logout3() {
  try {
    showLoading();

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      showNotification("Logged out successfully", "success");
      setTimeout(() => {
        window.location.href = "/html/login.html";
      }, 1000);
    } else {
      throw new Error("Logout request failed");
    }
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Logout failed, redirecting...", "warning");
    setTimeout(() => {
      window.location.href = "/html/login.html";
    }, 2000);
  } finally {
    hideLoading();
  }
}

// Validate input
function validateInput(event) {
  const input = event.target;
  const value = input.value.trim();

  input.classList.remove("error");

  switch (input.type) {
    case "email":
      if (value && !isValidEmail(value)) {
        input.classList.add("error");
        showNotification("Please enter a valid email address", "error");
      }
      break;
    case "tel":
      if (value && !isValidPhone(value)) {
        input.classList.add("error");
        showNotification("Please enter a valid phone number", "error");
      }
      break;
    case "number":
      if (value && isNaN(value)) {
        input.classList.add("error");
        showNotification("Please enter a valid number", "error");
      }
      break;
  }

  if (input.hasAttribute("required") && !value) {
    input.classList.add("error");
  }
}

// Helper functions for validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
}

// Navigate to section from stat cards
function navigateToSection(sectionName) {
  showSection(sectionName);

  const sidebarMenuItems = document.querySelectorAll(".sidebar .menu-item");
  sidebarMenuItems.forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.section === sectionName) {
      item.classList.add("active");
    }
  });
}

// Block date
async function blockDate() {
  const dateInput = document.getElementById("blockDate");
  const reasonInput = document.getElementById("blockReason");

  if (!dateInput) {
    showNotification("Date input not found", "error");
    return;
  }

  const date = dateInput.value;
  const reason = reasonInput ? reasonInput.value.trim() : "";

  if (!date) {
    showNotification("Please select a date to block", "error");
    return;
  }

  // Check if date is in the past
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    showNotification("Cannot block dates in the past", "error");
    return;
  }

  try {
    showLoading();

    const response = await fetch("/api/planner/blocked-dates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ date, reason }),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification("Date blocked successfully", "success");

      dateInput.value = "";
      if (reasonInput) reasonInput.value = "";

      loadBlockedDates();
    } else {
      showNotification(data.error || "Error blocking date", "error");
    }
  } catch (error) {
    console.error("Error blocking date:", error);
    showNotification("Error blocking date", "error");
  } finally {
    hideLoading();
  }
}

// Load blocked dates
async function loadBlockedDates() {
  try {
    const response = await fetch("/api/planner/blocked-dates", {
      credentials: "include",
    });

    if (response.ok) {
      const blockedDates = await response.json();
      displayBlockedDates(blockedDates);
    } else {
      console.error("Failed to load blocked dates:", response.status);
      displayBlockedDates([]);
    }
  } catch (error) {
    console.error("Error loading blocked dates:", error);
    displayBlockedDates([]);
  }
}

// Display blocked dates
function displayBlockedDates(blockedDates) {
  const container = document.getElementById("blockedDatesList");
  if (!container) return;

  if (!blockedDates || blockedDates.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No blocked dates</p>';
    return;
  }

  // Sort by date
  blockedDates.sort(
    (a, b) => new Date(a.blocked_date) - new Date(b.blocked_date)
  );

  container.innerHTML = blockedDates
    .map(
      (blockedDate) => `
        <div class="blocked-date-item">
            <div class="blocked-date-info">
                <div class="blocked-date-date">
                    <i class="fas fa-calendar-times"></i>
                    ${formatDate(blockedDate.blocked_date)}
                </div>
                ${
                  blockedDate.reason
                    ? `
                    <div class="blocked-date-reason">
                        <i class="fas fa-comment"></i>
                        ${blockedDate.reason}
                    </div>
                `
                    : ""
                }
                <div class="blocked-date-created">
                    <small class="text-gray-500">
                        <i class="fas fa-clock"></i>
                        Blocked ${formatTimeAgo(blockedDate.created_at)}
                    </small>
                </div>
            </div>
            <div class="blocked-date-actions">
                <button class="action-btn-sm delete" onclick="removeBlockedDate(${
                  blockedDate.id
                })" title="Remove Block">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// Remove blocked date
async function removeBlockedDate(blockedDateId) {
  if (!confirm("Are you sure you want to unblock this date?")) {
    return;
  }

  try {
    const response = await fetch(
      `/api/planner/blocked-dates/${blockedDateId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (response.ok) {
      showNotification("Date unblocked successfully", "success");
      loadBlockedDates();
    } else {
      showNotification(data.error || "Error removing blocked date", "error");
    }
  } catch (error) {
    console.error("Error removing blocked date:", error);
    showNotification("Error removing blocked date", "error");
  }
}

function exportBookings() {
  console.log("Export bookings");
  showNotification("Export feature coming soon", "info");
}

function resetForm() {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  if (
    confirm(
      "Are you sure you want to reset the form? All changes will be lost."
    )
  ) {
    profileForm.reset();
    populateProfileForm();
  }
}

// Calendar event indicator styles
const eventIndicatorStyles = `
    .calendar-day {
        position: relative;
        min-height: 60px;
        border: 1px solid var(--gray-200);
        padding: 8px;
        background: white;
        transition: all 0.2s ease;
    }
    
    .calendar-day.has-events {
        background: #f8f9ff;
        border-color: var(--primary-color);
    }
    
    .calendar-day.today {
        background: var(--primary-color);
        color: white;
        font-weight: bold;
    }
    
    .calendar-day.today.has-events {
        background: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.3);
    }
    
    .calendar-day:hover {
        background: var(--gray-50);
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .calendar-day.today:hover {
        background: var(--primary-color);
        opacity: 0.9;
    }
    
    .event-indicator {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
`;

// Calender styles
if (!document.getElementById("calendar-event-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "calendar-event-styles";
  styleSheet.textContent = eventIndicatorStyles;
  document.head.appendChild(styleSheet);
}

// Load working hours
async function loadWorkingHours() {
  try {
    showLoading();

    const response = await fetch("/api/planner/working-hours", {
      credentials: "include",
    });

    if (response.ok) {
      const workingHours = await response.json();
      populateWorkingHoursForm(workingHours);
    } else {
      console.log("No working hours found, using defaults");
    }
  } catch (error) {
    console.error("Error loading working hours:", error);
  } finally {
    hideLoading();
  }
}

// Populate the working hours form
function populateWorkingHoursForm(workingHours) {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  days.forEach((day) => {
    const checkbox = document.querySelector(`input[name="${day}"]`);
    const startInput = document.querySelector(`input[name="${day}-start"]`);
    const endInput = document.querySelector(`input[name="${day}-end"]`);

    if (workingHours[day]) {
      const dayData = workingHours[day];

      if (checkbox) {
        checkbox.checked = dayData.is_available;
      }

      if (startInput && dayData.start_time) {
        startInput.value = dayData.start_time;
      }

      if (endInput && dayData.end_time) {
        endInput.value = dayData.end_time;
      }
    }
  });
}

// Mobile Toggle
const mobileCSSFix = `
@media (max-width: 768px) {
    .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        position: fixed;
        left: 0;
        top: 80px;
        height: calc(100vh - 80px);
        width: 280px;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(20px);
    }
    
    .sidebar.active {
        transform: translateX(0);
    }
    
    .mobile-toggle {
        display: block !important;
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1100;
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1.2rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    }
    
    .mobile-toggle:hover {
        background: var(--primary-dark);
        transform: scale(1.05);
    }
    
    .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 999;
        display: none;
    }
    
    .main-content {
        margin-left: 0;
        width: 100%;
        padding: 1rem;
    }
}

@media (min-width: 769px) {
    .mobile-toggle {
        display: none !important;
    }
    
    .sidebar-overlay {
        display: none !important;
    }
    
    .sidebar {
        transform: translateX(0) !important;
        position: fixed !important;
    }
}
`;

if (!document.getElementById("mobile-nav-fix-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "mobile-nav-fix-styles";
  styleSheet.textContent = mobileCSSFix;
  document.head.appendChild(styleSheet);
}
