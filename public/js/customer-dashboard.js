document.addEventListener("DOMContentLoaded", function () {
  initializeDashboard();

  setupEventListeners();

  loadDashboardData();
});

// Global variables
let currentUser = null;
let bookingsData = [];
let notificationsData = [];
let eventHistoryData = [];

// Initialize dashboard
function initializeDashboard() {
  checkAuthStatus();
  setupSidebarNavigation();
  setupModalHandlers();
  setupProfileImageUpload();
  setupFormHandlers();
  setupMobileSidebar();
}

// Check authentication status
async function checkAuthStatus() {
  try {
    showLoading();
    const response = await fetch("/api/auth/status", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.authenticated || !data.user) {
      window.location.href = "/html/login.html";
      return;
    }

    currentUser = data.user;
    updateUserInterface();
  } catch (error) {
    console.error("Auth check error:", error);
    showNotification("Authentication failed. Please login again.", "error");
    setTimeout(() => {
      window.location.href = "/html/login.html";
    }, 24000);
  } finally {
    hideLoading();
  }
}

// Update user interface with user data
function updateUserInterface() {
  if (!currentUser) return;

  const customerNameEl = document.getElementById("customerName");
  if (customerNameEl) {
    customerNameEl.textContent = currentUser.full_name || "Customer";
  }

  // Update profile form fields
  const fields = {
    fullName: currentUser.full_name || "",
    email: currentUser.email || "",
    phone: currentUser.phone_number || "",
    location: currentUser.location || "",
    dateOfBirth: currentUser.date_of_birth || "",
  };

  Object.entries(fields).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.value = value;
    }
  });

  // Handle profile image
  const profileImageEl = document.getElementById("profileImage");
  if (profileImageEl) {
    profileImageEl.src = `/api/customer/profile/image?t=${Date.now()}`;
  }


  // Handle preferences with proper error handling
  updatePreferencesSelect();
}

function updatePreferencesSelect() {
  const preferencesSelect = document.getElementById("preferences");
  if (!preferencesSelect || !currentUser.preferences) return;

  let preferences = [];

  try {
    if (typeof currentUser.preferences === "string") {
      if (
        currentUser.preferences.trim() !== "" &&
        currentUser.preferences !== "null"
      ) {
        preferences = JSON.parse(currentUser.preferences);
      }
    } else if (Array.isArray(currentUser.preferences)) {
      preferences = currentUser.preferences;
    }
  } catch (e) {
    console.error("Error parsing preferences:", e);
    preferences = [];
  }

  // Clear all selections first
  Array.from(preferencesSelect.options).forEach((option) => {
    option.selected = false;
  });

  // Set selected options
  if (Array.isArray(preferences) && preferences.length > 0) {
    Array.from(preferencesSelect.options).forEach((option) => {
      option.selected = preferences.includes(option.value);
    });
  }
}

function loadDashboardDataOffline() {
  try {
    // Load cached stats
    const cachedStats = localStorage.getItem("dashboardStats");
    if (cachedStats) {
      const stats = JSON.parse(cachedStats);
      updateStatsDisplay(stats);
    }

    // Load cached bookings
    const cachedBookings = localStorage.getItem("bookingsData");
    if (cachedBookings) {
      bookingsData = JSON.parse(cachedBookings);
      displayBookings(bookingsData);
    }

    // Load cached notifications
    const cachedNotifications = localStorage.getItem("notificationsData");
    if (cachedNotifications) {
      notificationsData = JSON.parse(cachedNotifications);
      displayNotifications(notificationsData);
      updateNotificationBadge();
    }

    showNotification(
      "Loaded cached data. Some information may be outdated.",
      "info"
    );
  } catch (error) {
    console.error("Error loading offline data:", error);
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
      case 'reviews':
        loadReviews();
        break;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
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

    // Load all data sequentially to handle dependencies
    await loadStats();
    await loadRecentActivity();
    await loadBookings();
    await loadEventHistory();
    await loadNotifications();
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showNotification(
      "Error loading dashboard data. Please refresh the page.",
      "error"
    );
  } finally {
    hideLoading();
  }
}

// Load statistics
function loadStats() {
  fetch('/api/customer/stats')
    .then(response => response.json())
    .then(stats => {
      document.getElementById('totalBookings').textContent = stats.totalBookings;
      document.getElementById('upcomingEvents').textContent = stats.upcomingEvents;
      document.getElementById('completedEvents').textContent = stats.completedEvents;
      
      // Format the total spent with commas and add Francs
      const formattedAmount = new Intl.NumberFormat('en-US').format(stats.totalSpent);
      document.getElementById('totalSpent').innerHTML = `${formattedAmount} <span>Francs</span>`;
    })
    .catch(error => {
      console.error('Error loading stats:', error);

      document.getElementById('totalSpent').innerHTML = '0 <span>Francs</span>';
    });
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const activities = await response.json();
    displayRecentActivity(activities);
  } catch (error) {
    console.error("Error loading recent activity:", error);
    displayRecentActivity([]);
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    bookingsData = await response.json();
    displayBookings(bookingsData);
  } catch (error) {
    console.error("Error loading bookings:", error);
    showNotification("Failed to load bookings", "warning");
    bookingsData = [];
    displayBookings([]);
  }
}


// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById("bookingsList");

  if (!bookings || bookings.length === 0) {
    container.innerHTML = `
      <div class="no-bookings">
        <i class="fas fa-calendar-times"></i>
        <h3>No bookings found</h3>
        <p>You haven't made any bookings yet. Start planning your next event!</p>
        <a href="../html/category.html" class="btn-primary">Book Your First Event</a>
      </div>
    `;
    return;
  }

  container.innerHTML = bookings
    .map(
      (booking) => `
        <div class="booking-card" onclick="showBookingDetails('${booking.id}')">
            <div class="booking-header">
                <div>
                    <div class="booking-title">${booking.event_type}</div>
                    <div class="booking-planner">Planner: ${
                      booking.planner_name || 'Not assigned'
                    }</div>
                </div>
                <span class="booking-status ${booking.status?.toLowerCase() || 'pending'}">${
                  booking.status || 'Pending'
                }</span>
            </div>
            <div class="booking-details">
                <div class="booking-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(booking.event_date)}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-clock"></i>
                    <span>${booking.event_time || 'Time TBD'}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${booking.location}</span>
                </div>
                <div class="booking-detail">
                    <i class="fas fa-tag"></i>
                    <span>${booking.category}</span>
                </div>
                ${booking.requirements ? `
                <div class="booking-detail">
                    <i class="fas fa-list"></i>
                    <span class="requirements-preview">${booking.requirements.substring(0, 50)}${booking.requirements.length > 50 ? '...' : ''}</span>
                </div>
                ` : ''}
            </div>
            <div class="booking-footer">
                <div class="booking-date-created">
                    Created: ${formatDate(booking.created_at)}
                </div>
                <button class="view-details-btn" onclick="event.stopPropagation(); showBookingDetails('${booking.id}')">
                    View Details
                </button>
            </div>
        </div>
    `
    )
    .join("");
}



// Show booking details in modal
async function showBookingDetails(bookingId) {
  try {
    showLoading();

    const localBooking = bookingsData.find(b => b.id == bookingId || b.id === bookingId);
    
    if (localBooking) {
      displayBookingModal(localBooking);
      hideLoading();
      return;
    }

    // Fetch Booking
    const response = await fetch(`/api/customer/bookings/${bookingId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      const stringBooking = bookingsData.find(b => String(b.id) === String(bookingId));
      if (stringBooking) {
        displayBookingModal(stringBooking);
        return;
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const booking = await response.json();
    displayBookingModal(booking);
  } catch (error) {
    console.error("Error loading booking details:", error);
    
    const fallbackBooking = bookingsData.find(b => 
      String(b.id) === String(bookingId) || 
      b.id == bookingId
    );
    
    if (fallbackBooking) {
      console.log("Using fallback booking data");
      displayBookingModal(fallbackBooking);
    } else {
      showNotification("Error loading booking details. Please try again.", "error");
    }
  } finally {
    hideLoading();
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
                    <span>${booking.event_type || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Date:</label>
                    <span>${booking.event_date ? formatDate(booking.event_date) : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Time:</label>
                    <span>${booking.event_time || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Location:</label>
                    <span>${booking.location || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Category:</label>
                    <span>${booking.category || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="booking-status ${(booking.status || 'pending').toLowerCase()}">${
                      booking.status || 'Pending'
                    }</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Planner Information</h3>
                <div class="detail-item">
                    <label>Planner:</label>
                    <span>${booking.planner_name || 'Not assigned'}</span>
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
                        <div class="timeline-content-small">${
                          booking.created_at ? formatDate(booking.created_at) : 'N/A'
                        }</div>
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
  if (contactBtn) {
    contactBtn.onclick = () =>
      contactPlanner(booking.planner_phone, booking.planner_email);
  }
}


// Load upcoming events
async function loadUpcomingEvents() {
  try {
    const response = await fetch("/api/customer/upcoming-events", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const events = await response.json();
    displayUpcomingEvents(events);
  } catch (error) {
    console.error("Error loading upcoming events:", error);
    showNotification("Failed to load upcoming events", "warning");
    displayUpcomingEvents([]);
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
function loadEventHistory() {
    try {
        const completedStatuses = ['completed', 'cancelled'];
        
        // Load reviews for completed bookings
        const loadEventHistoryWithReviews = async () => {
            try {
                // Get completed bookings
                const completedBookings = bookingsData.filter(booking => 
                    completedStatuses.includes(booking.status?.toLowerCase())
                );

                // If no completed bookings, display empty state
                if (completedBookings.length === 0) {
                    eventHistoryData = [];
                    displayEventHistory(eventHistoryData);
                    return;
                }

                // Load reviews for these bookings
                const response = await fetch('/api/customer/reviews', {
                    credentials: 'include'
                });

                let reviews = [];
                if (response.ok) {
                    reviews = await response.json();
                }

                // Combine booking data with review data
                eventHistoryData = completedBookings.map(booking => {
                    const review = reviews.find(r => r.booking_id == booking.id);
                    return {
                        ...booking,
                        rating: review ? review.rating : null,
                        review_comment: review ? review.comment : null,
                        review_created_at: review ? review.created_at : null
                    };
                }).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

                displayEventHistory(eventHistoryData);

            } catch (error) {
                console.error('Error loading event history with reviews:', error);
                
                eventHistoryData = bookingsData.filter(booking => 
                    completedStatuses.includes(booking.status?.toLowerCase())
                ).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
                
                displayEventHistory(eventHistoryData);
            }
        };

        loadEventHistoryWithReviews();

    } catch (error) {
        console.error("Error loading event history:", error);
        showNotification("Failed to load event history", "warning");
        eventHistoryData = [];
        displayEventHistory([]);
    }
}



// Display event history
function displayEventHistory(history) {
    const container = document.getElementById("eventHistoryList");

    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="no-history">
                <i class="fas fa-history"></i>
                <h3>No event history</h3>
                <p>Your completed events will appear here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = history
        .map(
            (event) => `
        <div class="history-card" onclick="showEventHistoryDetails('${event.id}')">
            <div class="history-content">
                <div class="history-header">
                    <h3>${event.event_type}</h3>
                    <span class="history-status ${event.status?.toLowerCase() || 'completed'}">${
                event.status || 'Completed'
            }</span>
                </div>
                <div class="history-details">
                    <div class="history-detail">
                        <i class="fas fa-user-tie"></i>
                        <span>Planner: ${event.planner_name || 'N/A'}</span>
                    </div>
                    <div class="history-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(event.event_date)}</span>
                    </div>
                    <div class="history-detail">
                        <i class="fas fa-clock"></i>
                        <span>${event.event_time || 'N/A'}</span>
                    </div>
                    <div class="history-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${event.location}</span>
                    </div>
                    <div class="history-detail">
                        <i class="fas fa-tag"></i>
                        <span>${event.category}</span>
                    </div>
                    ${event.rating ? `
                    <div class="history-detail">
                        <i class="fas fa-star"></i>
                        <span>Your Rating: ${generateStars(event.rating)} (${event.rating}/5)</span>
                    </div>
                    ` : ''}
                </div>
                ${event.requirements ? `
                <div class="history-requirements">
                    <i class="fas fa-list"></i>
                    <span>${event.requirements.substring(0, 100)}${event.requirements.length > 100 ? '...' : ''}</span>
                </div>
                ` : ''}
                <div class="history-footer">
                    <div class="history-meta">
                        <small class="text-muted">
                            Event Date: ${formatDate(event.event_date)}
                            ${event.completed_at ? ` | Completed: ${formatDate(event.completed_at)}` : ''}
                        </small>
                    </div>
                    ${event.status === 'completed' ? `
                    <div class="review-actions">
                        ${event.rating ? `
                            <button class="btn-sm-secondary" style="background: linear-gradient(135deg, #8b5cf6, #06b6d4 ) !important; color: #fff !important; height: 45px !important; padding: 6px 12px !important; border: 1px solid transparent !important;"  onclick="event.stopPropagation(); editReview(${event.id})" title="Edit your review">
                                <i class="fas fa-edit"></i> Edit Review
                            </button>
                        ` : `
                            <button class="btn-sm-primary" style="background: linear-gradient(135deg, #8b5cf6, #06b6d4 ) !important; color: #fff !important; height: 45px !important; padding: 6px 12px !important; border: 1px solid transparent !important;"  style="height: 40px !important; " onclick="event.stopPropagation(); showReviewModal(${event.id}, '${event.planner_name}', '${event.event_type}', '${event.event_date}')" title="Leave a review">
                                <i class="fas fa-star"></i> Leave Review
                            </button>
                        `}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `
        )
        .join("");
}


// Show event history details
function showEventHistoryDetails(eventId) {

  const event = eventHistoryData?.find(e => e.id == eventId);
  
  if (!event) {
    showNotification("Event details not found", "error");
    return;
  }

  const modalBody = document.getElementById("bookingModalBody");
  
  modalBody.innerHTML = `
    <div class="booking-detail-grid">
        <div class="detail-section">
            <h3>Event Information</h3>
            <div class="detail-item">
                <label>Event Type:</label>
                <span>${event.event_type || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Date:</label>
                <span>${event.event_date ? formatDate(event.event_date) : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Time:</label>
                <span>${event.event_time || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Location:</label>
                <span>${event.location || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Category:</label>
                <span>${event.category || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Status:</label>
                <span class="booking-status ${(event.status || 'completed').toLowerCase()}">${
                  event.status || 'Completed'
                }</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Planner Information</h3>
            <div class="detail-item">
                <label>Planner:</label>
                <span>${event.planner_name || 'Not assigned'}</span>
            </div>
            <div class="detail-item">
                <label>Contact:</label>
                <span>${event.planner_phone || "N/A"}</span>
            </div>
            <div class="detail-item">
                <label>Email:</label>
                <span>${event.planner_email || "N/A"}</span>
            </div>
        </div>
        
        <div class="detail-section full-width">
            <h3>Requirements</h3>
            <p>${event.requirements || "No specific requirements"}</p>
        </div>
        
        <div class="detail-section full-width">
            <h3>Event Timeline</h3>
            <div class="timeline-small">
                <div class="timeline-item-small completed">
                    <div class="timeline-date-small">Booked</div>
                    <div class="timeline-content-small">${
                      event.created_at ? formatDate(event.created_at) : 'N/A'
                    }</div>
                </div>
                ${
                  event.confirmed_at
                    ? `
                    <div class="timeline-item-small completed">
                        <div class="timeline-date-small">Confirmed</div>
                        <div class="timeline-content-small">${formatDate(
                          event.confirmed_at
                        )}</div>
                    </div>
                `
                    : ""
                }
                <div class="timeline-item-small completed">
                    <div class="timeline-date-small">Event Date</div>
                    <div class="timeline-content-small">${formatDate(
                      event.event_date
                    )}</div>
                </div>
                ${
                  event.completed_at
                    ? `
                    <div class="timeline-item-small completed">
                        <div class="timeline-date-small">Completed</div>
                        <div class="timeline-content-small">${formatDate(
                          event.completed_at
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
}




// Load notifications
async function loadNotifications() {
  try {
    const response = await fetch("/api/customer/notifications", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    notificationsData = await response.json();
    displayNotifications(notificationsData);
    updateNotificationBadge();
  } catch (error) {
    console.error("Error loading notifications:", error);
    showNotification("Failed to load notifications", "warning");
    notificationsData = [];
    displayNotifications([]);
    updateNotificationBadge();
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await loadNotifications(); 
    showNotification("All notifications marked as read", "success");
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await loadNotifications(); 
    showNotification("All notifications cleared", "success");
  } catch (error) {
    console.error("Error clearing notifications:", error);
    showNotification("Error clearing notifications", "error");
  }
}

// Setup profile image upload
function setupProfileImageUpload() {
    const profileImageSection = document.querySelector('.profile-image-section');
    const profileImageInput = document.getElementById('profileImageInput');
    
    if (profileImageSection && profileImageInput) {
        // Add a click listener to the entire profile image container
        profileImageSection.addEventListener('click', () => {
            profileImageInput.click();
        });

        // Add a change listener to the file input to handle the upload
        profileImageInput.addEventListener('change', handleProfileImageUpload);
    }
}
 

// Handle profile image upload
async function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
        showLoading();
        const response = await fetch('/api/customer/profile/upload-image', {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        const data = await response.json();
        
        if (response.ok) {
            showNotification('Profile image uploaded successfully', 'success');
            
            // To display the new image immediately, update the source
            const profileImageEl = document.getElementById("profileImage");
            if (profileImageEl) {
                profileImageEl.src = `/api/customer/profile/image?t=${Date.now()}`;
            }
        } else {
            showNotification(data.error || 'Error uploading image', 'error');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showNotification('Failed to upload image', 'error');
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
  const profileData = {};

  // Map form fields to database columns
  const fieldMapping = {
    fullName: "full_name",
    email: "email",
    phone: "phone_number",
    location: "location",
    dateOfBirth: "date_of_birth",
  };

  // Process form fields
  for (let [key, value] of formData.entries()) {
    if (key !== "preferences" && value && value.trim()) {
      const dbField = fieldMapping[key] || key;
      profileData[dbField] = value.trim();
    }
  }

  // Handle preferences
  const selectedPreferences = formData.getAll("preferences");
  profileData.preferences = selectedPreferences.filter(
    (pref) => pref && pref.trim()
  );

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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update profile");
    }

    const updatedUser = await response.json();
    currentUser = updatedUser;
    updateUserInterface();
    showNotification("Profile updated successfully", "success");
  } catch (error) {
    console.error("Error updating profile:", error);
    showNotification(error.message || "Error updating profile", "error");
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
            <div class="contact-buttons" style="margin-top: 30px !important;">
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

function showLoading() {
  document.getElementById("loadingOverlay").classList.add("show");
}

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

    window.location.href = "/html/login.html";
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "/html/login.html";
  }
}

async function logout2() {
  return logout();
}

function setupMobileSidebar() {
  const mobileToggle = document.getElementById("mobileToggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (!mobileToggle || !sidebar || !sidebarOverlay) return;

  const toggleIcon = mobileToggle.querySelector("i");

  // Toggle sidebar
  function toggleSidebar() {
    const isOpen = sidebar.classList.contains("open");

    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    mobileToggle.classList.add("active");
    if (toggleIcon) toggleIcon.className = "fas fa-times";
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    mobileToggle.classList.remove("active");
    if (toggleIcon) toggleIcon.className = "fas fa-bars";
    document.body.style.overflow = "auto";
  }

  mobileToggle.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Close sidebar when clicking on menu items (mobile)
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        setTimeout(closeSidebar, 300);
      }
    });
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeSidebar();
      sidebar.classList.remove("open");
      document.body.style.overflow = "auto";
    }
  });

  // Close sidebar on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("open")) {
      closeSidebar();
    }
  });
}




// Stat card clicking to showing content
function navigateToSection(sectionName) {

  showSection(sectionName);
  
   const sidebarMenuItems = document.querySelectorAll('.sidebar .menu-item');
  sidebarMenuItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionName) {
      item.classList.add('active');
    } 
  });
}


// Review and rating 

async function loadReviews() {
    try {
        showLoading();
        
        const response = await fetch('/api/customer/reviews', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const reviewsData = await response.json();
            displayCustomerReviews(reviewsData);
        } else {
            console.error('Failed to load reviews:', response.status);
            showNotification('Error loading reviews', 'error');
            displayCustomerReviews([]);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showNotification('Error loading reviews', 'error');
        displayCustomerReviews([]);
    } finally {
        hideLoading();
    }
}

// Display customer reviews
function displayCustomerReviews(reviews) {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="no-reviews">
                <i class="fas fa-star"></i>
                <h3>No reviews yet</h3>
                <p>Complete an event to leave your first review!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="planner-info">
                    <h4 style="color: #8b5cf6 !important;">${review.planner_name}</h4>
                    <p>${review.event_type} - ${formatDate(review.event_date)}</p>
                </div>
                <div class="review-rating" style="color: rgb(255, 217, 0) !important;">
                    ${generateStars(review.rating || 0)}
                    <span class="rating-number" style="color: rgb(0, 0, 0) !important;">${review.rating || 0}/5</span>
                </div>
            </div>
            <div class="review-content">
                <p>${review.comment || 'No comment provided'}</p>
            </div>
            <div class="review-footer">
                <small class="text-gray-500">
                    Reviewed on ${formatDate(review.created_at)}
                </small>
                ${review.rating ? `
                    <button class="btn-sm secondary" style="background: linear-gradient(135deg, #8b5cf6, #06b6d4 ) !important; color: #fff !important; height: 45px !important; padding: 6px 12px !important; border: 1px solid transparent !important;" onclick="editReview(${review.booking_id})">
                        <i class="fas fa-edit"></i> Edit Review
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Show review modal for completed bookings
function showReviewModal(bookingId, plannerName, eventType, eventDate) {
    const modalBody = document.getElementById('reviewModalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="review-form-container">
            <div class="booking-info">
                <h4>Review ${plannerName}</h4>
                <p><strong>Event:</strong> ${eventType}</p>
                <p><strong>Date:</strong> ${formatDate(eventDate)}</p>
            </div>
            
            <form id="reviewForm" onsubmit="submitReview(event, ${bookingId})">
                <div class="form-group">
                    <label>Rating*</label>
                    <div class="star-rating" id="starRating">
                        <i class="fas fa-star" data-rating="1"></i>
                        <i class="fas fa-star" data-rating="2"></i>
                        <i class="fas fa-star" data-rating="3"></i>
                        <i class="fas fa-star" data-rating="4"></i>
                        <i class="fas fa-star" data-rating="5"></i>
                    </div>
                    <input type="hidden" id="selectedRating" value="0" required>
                </div>
                
                <div class="form-group">
                    <label for="reviewComment">Your Review</label>
                    <textarea id="reviewComment" name="comment" rows="4" 
                        placeholder="Share your experience with this planner..." required></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Submit Review</button>
                </div>
            </form>
        </div>
    `;
    
    setupStarRating();
    
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Setup star rating interaction
function setupStarRating() {
    const stars = document.querySelectorAll('#starRating i');
    const ratingInput = document.getElementById('selectedRating');
    
    stars.forEach((star, index) => {
        star.addEventListener('mouseover', () => {
            highlightStars(index + 1);
        });
        
        star.addEventListener('click', () => {
            const rating = index + 1;
            ratingInput.value = rating;
            setStarRating(rating);
        });
    });
    
    // Reset on mouse leave
    document.getElementById('starRating').addEventListener('mouseleave', () => {
        const currentRating = parseInt(ratingInput.value) || 0;
        setStarRating(currentRating);
    });
}

// Highlight stars on hover
function highlightStars(count) {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach((star, index) => {
        if (index < count) {
            star.classList.add('highlighted');
            star.classList.remove('inactive');
        } else {
            star.classList.remove('highlighted');
            star.classList.add('inactive');
        }
    });
}

// Set permanent star rating
function setStarRating(rating) {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach((star, index) => {
        star.classList.remove('highlighted', 'inactive');
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// Submit review
async function submitReview(event, bookingId) {
    event.preventDefault();
    
    const rating = parseInt(document.getElementById('selectedRating').value);
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (rating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    if (!comment) {
        showNotification('Please write a review comment', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/customer/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                booking_id: bookingId,
                rating: rating,
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Review submitted successfully!', 'success');
            closeModal();
            
            loadEventHistory();
            
            const reviewsSection = document.getElementById('reviews');
            if (reviewsSection && reviewsSection.classList.contains('active')) {
                loadReviews();
            }
        } else {
            showNotification(data.error || 'Error submitting review', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('Error submitting review', 'error');
    } finally {
        hideLoading();
    }
}

// Edit existing review
async function editReview(bookingId) {
    try {
        showLoading();
        
        // Get current review data
        const response = await fetch(`/api/customer/reviews/${bookingId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const reviewData = await response.json();
            showEditReviewModal(reviewData);
        } else {
            showNotification('Error loading review data', 'error');
        }
    } catch (error) {
        console.error('Error loading review:', error);
        showNotification('Error loading review data', 'error');
    } finally {
        hideLoading();
    }
}

// Show edit review modal
function showEditReviewModal(reviewData) {
    const modalBody = document.getElementById('reviewModalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="review-form-container">
            <div class="booking-info">
                <h4>Edit Review for ${reviewData.planner_name}</h4>
                <p><strong>Event:</strong> ${reviewData.event_type}</p>
                <p><strong>Date:</strong> ${formatDate(reviewData.event_date)}</p>
            </div>
            
            <form id="editReviewForm" onsubmit="updateReview(event, ${reviewData.booking_id})">
                <div class="form-group">
                    <label>Rating*</label>
                    <div class="star-rating" id="starRating">
                        <i class="fas fa-star" data-rating="1"></i>
                        <i class="fas fa-star" data-rating="2"></i>
                        <i class="fas fa-star" data-rating="3"></i>
                        <i class="fas fa-star" data-rating="4"></i>
                        <i class="fas fa-star" data-rating="5"></i>
                    </div>
                    <input type="hidden" id="selectedRating" value="${reviewData.rating}" required>
                </div>
                
                <div class="form-group">
                    <label for="reviewComment">Your Review</label>
                    <textarea id="reviewComment" name="comment" rows="4" 
                        placeholder="Share your experience with this planner..." required>${reviewData.comment}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" style="background: linear-gradient(135deg, rgb(255, 67, 67), rgb(255, 158, 158) ) !important; color: #fff !important; height: 45px !important; padding: 6px 12px !important; border: 1px solid transparent !important;"   class="btn-danger" onclick="deleteReview(${reviewData.booking_id})">Delete Review</button>
                    <button type="button" style="background: linear-gradient(135deg, rgb(143, 141, 141), rgb(198, 198, 198) ) !important; color: #000 !important; height: 45px !important; padding: 6px 12px !important; border: 1px solid transparent !important;"  class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary" style="background: linear-gradient(135deg, #8b5cf6, #06b6d4 ) !important; color: #fff !important; height: 45px !important; padding: 6px 12px !important; border: 1px solid transparent !important;" >Update Review</button>
                </div>
            </form>
        </div>
    `;
    
    setupStarRating();
    setStarRating(reviewData.rating);
    
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Update existing review
async function updateReview(event, bookingId) {
    event.preventDefault();
    
    const rating = parseInt(document.getElementById('selectedRating').value);
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (rating === 0) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    if (!comment) {
        showNotification('Please write a review comment', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/customer/reviews/${bookingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                rating: rating,
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Review updated successfully!', 'success');
            closeModal();
            
            loadReviews();
            loadEventHistory();
        } else {
            showNotification(data.error || 'Error updating review', 'error');
        }
    } catch (error) {
        console.error('Error updating review:', error);
        showNotification('Error updating review', 'error');
    } finally {
        hideLoading();
    }
}

// Delete review
async function deleteReview(bookingId) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/customer/reviews/${bookingId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Review deleted successfully', 'success');
            closeModal();
            
            loadReviews();
            loadEventHistory();
        } else {
            showNotification(data.error || 'Error deleting review', 'error');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification('Error deleting review', 'error');
    } finally {
        hideLoading();
    }
}
