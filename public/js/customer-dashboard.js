
document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();

  setupEventListeners();

  loadDashboardData();
});



// Global variables
let currentUser = null;
let bookingsData = [];
let notificationsData = [];

// Initialize dashboard
function initializeDashboard() {
  checkAuthStatus();
  setupSidebarNavigation();
  setupModalHandlers();
  setupProfileImageUpload();
  setupFormHandlers();
}

// Check authentication status
async function checkAuthStatus() {
  try {
    showLoading();
    const response = await fetch("/api/auth/status", {
      credentials: "include",
    });

    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = "/html/login.html";
      return;
    }

    currentUser = data.user;
    updateUserInterface();
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "/html/login.html";
  } finally {
    hideLoading();
  }
}

// Update user interface with user data
function updateUserInterface() {
  if (currentUser) {
    document.getElementById("customerName").textContent =
      currentUser.full_name || "Customer";

    // Update profile form
    if (currentUser.full_name)
      document.getElementById("fullName").value = currentUser.full_name;
    if (currentUser.email)
      document.getElementById("email").value = currentUser.email;
    if (currentUser.phone_number)
      document.getElementById("phone").value = currentUser.phone_number;
    if (currentUser.location)
      document.getElementById("location").value = currentUser.location;
    if (currentUser.date_of_birth)
      document.getElementById("dateOfBirth").value = currentUser.date_of_birth;

    // Update profile image if available
    if (currentUser.profile_image) {
      document.getElementById("profileImage").src = currentUser.profile_image;
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

  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => section.classList.remove("active"));

  // Show selected section
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.classList.add("active");

    // Load section-specific data
    switch (sectionName) {
      case "bookings":
        loadBookings();
        break;
      case "upcoming":
        loadUpcomingEvents();
        break;
      case "history":
        loadEventHistory();
        break;
      case "notifications":
        loadNotifications();
        break;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("logoutBtn2").addEventListener("click", logout2);

  // Profile form
  document
    .getElementById("profileForm")
    .addEventListener("submit", updateProfile);

  // Booking filters
  document
    .getElementById("statusFilter")
    .addEventListener("change", filterBookings);
  document
    .getElementById("dateFilter")
    .addEventListener("change", filterBookings);
  document
    .getElementById("bookingSearch")
    .addEventListener("input", searchBookings);

  // FAQ items
  document.querySelectorAll(".faq-question").forEach((question) => {
    question.addEventListener("click", toggleFaqItem);
  });

  // Notification controls
  document
    .getElementById("markAllRead")
    .addEventListener("click", markAllNotificationsRead);
  document
    .getElementById("clearNotifications")
    .addEventListener("click", clearAllNotifications);
}

// Load dashboard data
async function loadDashboardData() {
  try {
    showLoading();

    await Promise.all([
      loadStats(),
      loadRecentActivity(),
      loadBookings(),
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
        const response = await fetch('/api/customer/stats', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalBookings').textContent = stats.totalBookings;
            document.getElementById('upcomingEvents').textContent = stats.upcomingEvents;
            document.getElementById('completedEvents').textContent = stats.completedEvents;
            document.getElementById('totalSpent').textContent = `CFA ${stats.totalSpent}`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
  document.getElementById("totalBookings").textContent =
    stats.totalBookings || 0;
  document.getElementById("upcomingEvents").textContent =
    stats.upcomingEvents || 0;
  document.getElementById("completedEvents").textContent =
    stats.completedEvents || 0;
  document.getElementById("totalSpent").textContent = `$${
    stats.totalSpent || 0
  }`;
}

// Load recent activity
async function loadRecentActivity() {
  try {
    const response = await fetch("/api/customer/activity", {
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

// Get activity icon based on type
function getActivityIcon(type) {
  const icons = {
    booking: "fa-calendar-plus",
    payment: "fa-credit-card",
    status_update: "fa-info-circle",
    review: "fa-star",
    message: "fa-message",
  };
  return icons[type] || "fa-bell";
}

// Load bookings
async function loadBookings() {
  try {
    const response = await fetch("/api/customer/bookings", {
      credentials: "include",
    });

    if (response.ok) {
      bookingsData = await response.json();
      displayBookings(bookingsData);
    }
  } catch (error) {
    console.error("Error loading bookings:", error);
  }
}

// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById("bookingsList");

  if (!bookings || bookings.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No bookings found</p>';
    return;
  }
}

// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById("bookingsList");

  if (!bookings || bookings.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No bookings found</p>';
    return;
  }

  container.innerHTML = bookings
    .map(
      (booking) => `
        <div class="booking-card" onclick="showBookingDetails(${booking.id})">
            <div class="booking-header">
                <div>
                    <div class="booking-title">${booking.event_type}</div>
                    <div class="booking-planner">Planner: ${
                      booking.planner_name
                    }</div>
                </div>
                <span class="booking-status ${booking.status.toLowerCase()}">${
        booking.status
      }</span>
            </div>
            <div class="booking-details">
                <div class="booking-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(booking.event_date)}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-clock"></i>
                    <span>${booking.event_time}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${booking.location}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-tag"></i>
                    <span>${booking.category}</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Show booking details in modal
async function showBookingDetails(bookingId) {
  try {
    const response = await fetch(`/api/customer/bookings/${bookingId}`, {
      credentials: "include",
    });

    if (response.ok) {
      const booking = await response.json();
      displayBookingModal(booking);
    }
  } catch (error) {
    console.error("Error loading booking details:", error);
    showNotification("Error loading booking details", "error");
  }
}

// Display booking modal
function displayBookingModal(booking) {
  const modalBody = document.getElementById("bookingModalBody");

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
                    <span class="booking-status ${booking.status.toLowerCase()}">${
    booking.status
  }</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Planner Information</h3>
                <div class="detail-item">
                    <label>Planner:</label>
                    <span>${booking.planner_name}</span>
                </div>
                <div class="detail-item">
                    <label>Contact:</label>
                    <span>${booking.planner_phone || "N/A"}</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>${booking.planner_email || "N/A"}</span>
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
        </div>
    `;

  document.getElementById("bookingModal").style.display = "block";

  // Update contact planner button
  const contactBtn = document.getElementById("contactPlannerBtn");
  contactBtn.onclick = () =>
    contactPlanner(booking.planner_phone, booking.planner_email);
}

// Load upcoming events
async function loadUpcomingEvents() {
  try {
    const response = await fetch("/api/customer/upcoming-events", {
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

// Display upcoming events in timeline
function displayUpcomingEvents(events) {
  const container = document.getElementById("upcomingEventsList");

  if (!events || events.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No upcoming events</p>';
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
        <div class="timeline-item">
            <div class="timeline-date">${formatDateShort(
              event.event_date
            )}</div>
            <div class="timeline-content">
                <h3>${event.event_type}</h3>
                <p>Planner: ${event.planner_name}</p>
                <p>Location: ${event.location}</p>
                <div class="timeline-meta">
                    <span>${event.event_time}</span>
                    <span class="booking-status ${event.status.toLowerCase()}">${
        event.status
      }</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Load event history
async function loadEventHistory() {
  try {
    const response = await fetch("/api/customer/event-history", {
      credentials: "include",
    });

    if (response.ok) {
      const history = await response.json();
      displayEventHistory(history);
    }
  } catch (error) {
    console.error("Error loading event history:", error);
  }
}

// Display event history
function displayEventHistory(history) {
  const container = document.getElementById("eventHistoryList");

  if (!history || history.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No event history</p>';
    return;
  }

  container.innerHTML = history
    .map(
      (event) => `
        <div class="history-card">
            <div class="history-image">
                <img src="${event.image || "/img/default-event.jpg"}" alt="${
        event.event_type
      }">
                <div class="history-overlay">${formatDate(
                  event.event_date
                )}</div>
            </div>
            <div class="history-content">
                <h3>${event.event_type}</h3>
                <p>Planner: ${event.planner_name}</p>
                <p>Location: ${event.location}</p>
                ${
                  event.rating
                    ? `
                    <div class="history-rating">
                        <div class="stars">
                            ${generateStars(event.rating)}
                        </div>
                        <span class="rating-text">${event.rating}/5</span>
                    </div>
                `
                    : ""
                }
                ${
                  event.review
                    ? `<p class="review-text">"${event.review}"</p>`
                    : ""
                }
            </div>
        </div>
    `
    )
    .join("");
}

// Load notifications
async function loadNotifications() {
  try {
    const response = await fetch("/api/customer/notifications", {
      credentials: "include",
    });

    if (response.ok) {
      notificationsData = await response.json();
      displayNotifications(notificationsData);
      updateNotificationBadge();
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
  }
}

// Display notifications
function displayNotifications(notifications) {
  const container = document.getElementById("notificationsList");

  if (!notifications || notifications.length === 0) {
    container.innerHTML =
      '<p class="text-center text-gray-500">No notifications</p>';
    return;
  }

  container.innerHTML = notifications
    .map(
      (notification) => `
        <div class="notification-item ${
          notification.read ? "" : "unread"
        }" data-id="${notification.id}">
            <div class="notification-icon ${notification.type}">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <div class="notification-time">${formatTimeAgo(
                  notification.created_at
                )}</div>
            </div>
        </div>
    `
    )
    .join("");
}

// Get notification icon
function getNotificationIcon(type) {
  const icons = {
    info: "fa-info-circle",
    success: "fa-check-circle",
    warning: "fa-exclamation-triangle",
    error: "fa-times-circle",
  };
  return icons[type] || "fa-bell";
}

// Update notification badge
function updateNotificationBadge() {
  const unreadCount = notificationsData.filter((n) => !n.read).length;
  document.getElementById("notificationBadge").textContent = unreadCount;
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  try {
    const response = await fetch("/api/customer/notifications/mark-all-read", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      loadNotifications();
      showNotification("All notifications marked as read", "success");
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    showNotification("Error updating notifications", "error");
  }
}

// Clear all notifications
async function clearAllNotifications() {
  if (!confirm("Are you sure you want to clear all notifications?")) {
    return;
  }

  try {
    const response = await fetch("/api/customer/notifications/clear", {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      loadNotifications();
      showNotification("All notifications cleared", "success");
    }
  } catch (error) {
    console.error("Error clearing notifications:", error);
    showNotification("Error clearing notifications", "error");
  }
}

// Setup profile image upload
function setupProfileImageUpload() {
  const profileImage = document.querySelector(".profile-image");
  const fileInput = document.getElementById("profileImageInput");

  profileImage.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", handleProfileImageUpload);
}

// Handle profile image upload
async function handleProfileImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showNotification("Please select a valid image file", "error");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("Image file size must be less than 5MB", "error");
    return;
  }

  const formData = new FormData();
  formData.append("profileImage", file);

  try {
    showLoading();

    const response = await fetch("/api/customer/profile/upload-image", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      document.getElementById("profileImage").src = result.imageUrl;
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

// Setup form handlers
function setupFormHandlers() {
  const profileForm = document.getElementById("profileForm");
  const inputs = profileForm.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    input.addEventListener("blur", validateInput);
    input.addEventListener("input", clearValidationError);
  });
}

// Update profile
async function updateProfile(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const profileData = Object.fromEntries(formData.entries());

  // Get selected preferences
  const preferences = Array.from(
    document.getElementById("preferences").selectedOptions
  ).map((option) => option.value);
  profileData.preferences = preferences;

  try {
    showLoading();

    const response = await fetch("/api/customer/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(profileData),
    });

    if (response.ok) {
      const updatedUser = await response.json();
      currentUser = updatedUser;
      updateUserInterface();
      showNotification("Profile updated successfully", "success");
    } else {
      const error = await response.json();
      showNotification(error.message || "Error updating profile", "error");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    showNotification("Error updating profile", "error");
  } finally {
    hideLoading();
  }
}

// Filter bookings
function filterBookings() {
  const statusFilter = document.getElementById("statusFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;

  let filteredBookings = [...bookingsData];

  if (statusFilter !== "all") {
    filteredBookings = filteredBookings.filter(
      (booking) => booking.status.toLowerCase() === statusFilter
    );
  }

  if (dateFilter) {
    const filterDate = new Date(dateFilter);
    filteredBookings = filteredBookings.filter((booking) => {
      const bookingDate = new Date(booking.event_date);
      return (
        bookingDate.getMonth() === filterDate.getMonth() &&
        bookingDate.getFullYear() === filterDate.getFullYear()
      );
    });
  }

  displayBookings(filteredBookings);
}

// Search bookings
function searchBookings(event) {
  const searchTerm = event.target.value.toLowerCase();

  const filteredBookings = bookingsData.filter(
    (booking) =>
      booking.event_type.toLowerCase().includes(searchTerm) ||
      booking.planner_name.toLowerCase().includes(searchTerm) ||
      booking.location.toLowerCase().includes(searchTerm)
  );

  displayBookings(filteredBookings);
}

// Toggle FAQ item
function toggleFaqItem(event) {
  const faqItem = event.currentTarget.closest(".faq-item");
  faqItem.classList.toggle("active");
}

// Setup modal handlers
function setupModalHandlers() {
  window.addEventListener("click", function (event) {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  });

  // Close modal with escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  // Close modal buttons
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", closeModal);
  });
}

// Close modal
function closeModal() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    modal.style.display = "none";
  });
}

// Contact planner
function contactPlanner(phone, email) {
  const contactOptions = [];

  if (phone) {
    contactOptions.push(
      `<a href="tel:${phone}" class="btn-primary">Call ${phone}</a>`
    );
  }

  if (email) {
    contactOptions.push(
      `<a href="mailto:${email}" class="btn-secondary">Email ${email}</a>`
    );
  }

  if (contactOptions.length === 0) {
    showNotification("No contact information available", "info");
    return;
  }

  const contactHtml = `
        <div class="contact-options">
            <h3>Contact Planner</h3>
            <div class="contact-buttons">
                ${contactOptions.join("")}
            </div>
        </div>
    `;

  const modalBody = document.getElementById("bookingModalBody");
  modalBody.innerHTML = contactHtml;
}

// Reset form
function resetForm() {
  if (
    confirm(
      "Are you sure you want to reset the form? All changes will be lost."
    )
  ) {
    document.getElementById("profileForm").reset();
    updateUserInterface();
  }
}

// Validate input
function validateInput(event) {
  const input = event.target;
  const value = input.value.trim();

  clearValidationError(event);

  let isValid = true;
  let errorMessage = "";

  if (input.hasAttribute("required") && !value) {
    isValid = false;
    errorMessage = "This field is required";
  } else if (input.type === "email" && value && !isValidEmail(value)) {
    isValid = false;
    errorMessage = "Please enter a valid email address";
  } else if (input.type === "tel" && value && !isValidPhone(value)) {
    isValid = false;
    errorMessage = "Please enter a valid phone number";
  }

  if (!isValid) {
    showInputError(input, errorMessage);
  }

  return isValid;
}

// Clear validation error
function clearValidationError(event) {
  const input = event.target;
  input.classList.remove("error");

  const errorElement = input.parentNode.querySelector(".error-message");
  if (errorElement) {
    errorElement.remove();
  }
}

// Show input error
function showInputError(input, message) {
  input.classList.add("error");

  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.textContent = message;
  errorElement.style.color = "var(--error-color)";
  errorElement.style.fontSize = "0.875rem";
  errorElement.style.marginTop = "0.25rem";

  input.parentNode.appendChild(errorElement);
}

// Utility functions

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
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

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return formatDate(dateString);
}

function generateStars(rating) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push('<i class="fas fa-star"></i>');
  }

  if (hasHalfStar) {
    stars.push('<i class="fas fa-star-half-alt"></i>');
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push('<i class="far fa-star"></i>');
  }

  return stars.join("");
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
}

// Show loading overlay
function showLoading() {
  document.getElementById("loadingOverlay").classList.add("show");
}

// Hide loading overlay
function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("show");
}

// Show notification
function showNotification(message, type = "info") {

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;


    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--white);
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 4000;
        min-width: 300px;
        border-left: 4px solid var(--${
          type === "error"
            ? "error"
            : type === "success"
            ? "success"
            : type === "warning"
            ? "warning"
            : "info"
        }-color);
        animation: slideInRight 0.3s ease;
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);

  // Close button handler
  notification
    .querySelector(".notification-close")
    .addEventListener("click", () => {
      notification.remove();
    });
}

// Logout function
async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      window.location.href = "/html/login.html";
    }
  } catch (error) {
    console.error("Logout error:", error); 
    window.location.href = "/html/login.html";
  }
}


async function logout2() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      window.location.href = "/html/login.html";
    }
  } catch (error) {
    console.error("Logout error:", error); 
    window.location.href = "/html/login.html";
  }
}

