
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initializeDashboard();
    
    // Event listeners
    setupEventListeners();
    
    // Load initial data
    loadDashboardData();
});

// Global variables
let currentPlanner = null;
let bookingsData = [];
let clientsData = [];
let portfolioData = [];
let earningsData = [];
let reviewsData = [];
let currentCalendarDate = new Date();

// Initialize dashboard
function initializeDashboard() {
    checkAuthStatus();
    setupSidebarNavigation();
    setupModalHandlers();
    setupProfileImageUpload();
    setupFormHandlers();
    setupCalendar();
    setupCharts();
}

// Check authentication status
async function checkAuthStatus() {
    try {
        showLoading();
        
        const statusResponse = await fetch('/api/auth/status', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!statusResponse.ok) {
            console.log('Auth status check failed:', statusResponse.status);
            window.location.href = '/login';
            return;
        }
        
        const statusData = await statusResponse.json();
        console.log('Auth status:', statusData);
        
        if (!statusData.authenticated) {
            console.log('User not authenticated');
            window.location.href = '/login';
            return;
        }
        
        // Check if user is a planner
        if (statusData.user.user_type !== 'planner') {
            console.log('User is not a planner:', statusData.user.user_type);
            showNotification('Access denied. Planner account required.', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            return;
        }
        
        currentPlanner = statusData.user;
        updateUserInterface();
        
        console.log('Auth check successful for planner:', currentPlanner.full_name);
        
    } catch (error) {
        console.error('Auth check error:', error);
        showNotification('Authentication error. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    } finally {
        hideLoading();
    }
}

// Update user interface with planner data
function updateUserInterface() {
    if (currentPlanner) {
        document.getElementById('plannerName').textContent = currentPlanner.business_name || currentPlanner.full_name || 'Event Planner';
        
        // Update profile form
        if (currentPlanner.business_name) document.getElementById('businessName').value = currentPlanner.business_name;
        if (currentPlanner.full_name) document.getElementById('ownerName').value = currentPlanner.full_name;
        if (currentPlanner.email) document.getElementById('email').value = currentPlanner.email;
        if (currentPlanner.phone_number) document.getElementById('phone').value = currentPlanner.phone_number;
        if (currentPlanner.location) document.getElementById('location').value = currentPlanner.location;
        if (currentPlanner.experience) document.getElementById('experience').value = currentPlanner.experience;
        if (currentPlanner.bio) document.getElementById('bio').value = currentPlanner.bio;
        if (currentPlanner.base_price) document.getElementById('basePrice').value = currentPlanner.base_price;
        if (currentPlanner.website) document.getElementById('website').value = currentPlanner.website;
        
        if (currentPlanner.profile_image) {
            document.getElementById('profileImage').src = currentPlanner.profile_image;
        }
        
        // Update specializations
        if (currentPlanner.specializations) {
            const specializationSelect = document.getElementById('specializations');
            const specializations = Array.isArray(currentPlanner.specializations) 
                ? currentPlanner.specializations 
                : currentPlanner.specializations.split(',');
            
            Array.from(specializationSelect.options).forEach(option => {
                option.selected = specializations.includes(option.value);
            });
        }
    }
}

// Setup sidebar navigation
function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            showSection(section);
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        switch(sectionName) {
            case 'bookings':
                loadBookings();
                break;
            case 'schedule':
                loadSchedule();
                break;
            case 'clients':
                loadClients();
                break;
            case 'portfolio':
                loadPortfolio();
                break;
            case 'earnings':
                loadEarnings();
                break;
            case 'reviews':
                loadReviews();
                break;
            case 'analytics':
                loadAnalytics();
                break;
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
    
    // Working hours form
    document.getElementById('workingHoursForm').addEventListener('submit', updateWorkingHours);
    
    // Booking filters
    document.getElementById('statusFilter').addEventListener('change', filterBookings);
    document.getElementById('dateFilter').addEventListener('change', filterBookings);
    document.getElementById('bookingSearch').addEventListener('input', searchBookings);
    
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => navigateCalendar(-1));
    document.getElementById('nextMonth').addEventListener('click', () => navigateCalendar(1));
    
    // Client search
    document.getElementById('clientSearch').addEventListener('input', searchClients);
    
    // Portfolio filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterPortfolio(this.dataset.filter);
        });
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading();
        
        // Load all dashboard data in parallel
        await Promise.all([
            loadStats(),
            loadRecentActivity(),
            loadUpcomingEvents(),
            loadBookings()
        ]);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/planner/stats', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    document.getElementById('totalEvents').textContent = stats.totalEvents || 0;
    document.getElementById('pendingEvents').textContent = stats.pendingEvents || 0;
    document.getElementById('monthlyEarnings').textContent = `CFA ${formatNumber(stats.monthlyEarnings || 0)}`;
    document.getElementById('averageRating').textContent = (stats.averageRating || 0).toFixed(1);
    
    document.getElementById('pendingBookingsBadge').textContent = stats.pendingEvents || 0;
    document.getElementById('navNotificationCount').textContent = stats.notifications || 0;
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch('/api/planner/activity', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const activities = await response.json();
            displayRecentActivity(activities);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivityList');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No recent activity</p>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
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
    `).join('');
}

// Load upcoming events
async function loadUpcomingEvents() {
    try {
        const response = await fetch('/api/planner/upcoming-events', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const events = await response.json();
            displayUpcomingEvents(events);
        }
    } catch (error) {
        console.error('Error loading upcoming events:', error);
    }
}

// Display upcoming events
function displayUpcomingEvents(events) {
    const container = document.getElementById('upcomingEventsList');
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No upcoming events</p>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="upcoming-item">
            <div class="upcoming-date">${formatDateShort(event.event_date)}</div>
            <div class="upcoming-content">
                <h4>${event.event_type}</h4>
                <p>Client: ${event.customer_name}</p>
                <p>Location: ${event.location}</p>
            </div>
        </div>
    `).join('');
}

// Load bookings
async function loadBookings() {
    try {
        const response = await fetch('/api/planner/bookings', {
            credentials: 'include'
        });
        
        if (response.ok) {
            bookingsData = await response.json();
            displayBookings(bookingsData);
            updateBookingStats(bookingsData);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Display bookings
function displayBookings(bookings) {
    const container = document.getElementById('bookingsList');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No bookings found</p>';
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
                ${bookings.map(booking => `
                    <tr>
                        <td>
                            <div>
                                <strong>${booking.customer_name}</strong>
                                <br>
                                <small>${booking.phone_number}</small>
                            </div>
                        </td>
                        <td>${booking.event_type}</td>
                        <td>${formatDate(booking.event_date)}</td>
                        <td>${booking.location}</td>
                        <td>${booking.category}</td>
                        <td>
                            <span class="booking-status ${booking.status.toLowerCase().replace(' ', '-')}">
                                ${booking.status}
                            </span>
                        </td>
                        <td>
                            <div class="booking-actions">
                                <button class="action-btn-sm view" onclick="showBookingDetails(${booking.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${booking.status.toLowerCase() === 'pending' ? `
                                    <button class="action-btn-sm accept" onclick="acceptBooking(${booking.id})">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="action-btn-sm reject" onclick="rejectBooking(${booking.id})">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Update booking stats
function updateBookingStats(bookings) {
    const pendingCount = bookings.filter(b => b.status.toLowerCase() === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status.toLowerCase() === 'confirmed').length;
    const completedCount = bookings.filter(b => b.status.toLowerCase() === 'completed').length;
    
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('confirmedCount').textContent = confirmedCount;
    document.getElementById('completedCount').textContent = completedCount;
}

// Show booking details
async function showBookingDetails(bookingId) {
    try {
        const response = await fetch(`/api/planner/bookings/${bookingId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const booking = await response.json();
            displayBookingModal(booking);
        }
    } catch (error) {
        console.error('Error loading booking details:', error);
        showNotification('Error loading booking details', 'error');
    }
}

// Display booking modal
function displayBookingModal(booking) {
    const modalBody = document.getElementById('bookingModalBody');
    
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
                    <span class="booking-status ${booking.status.toLowerCase().replace(' ', '-')}">${booking.status}</span>
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
                <p>${booking.requirements || 'No specific requirements'}</p>
            </div>
            
            <div class="detail-section full-width">
                <h3>Booking Timeline</h3>
                <div class="timeline-small">
                    <div class="timeline-item-small">
                        <div class="timeline-date-small">Booked</div>
                        <div class="timeline-content-small">${formatDate(booking.created_at)}</div>
                    </div>
                    ${booking.confirmed_at ? `
                        <div class="timeline-item-small">
                            <div class="timeline-date-small">Confirmed</div>
                            <div class="timeline-content-small">${formatDate(booking.confirmed_at)}</div>
                        </div>
                    ` : ''}
                    ${booking.completed_at ? `
                        <div class="timeline-item-small">
                            <div class="timeline-date-small">Completed</div>
                            <div class="timeline-content-small">${formatDate(booking.completed_at)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('bookingModal').style.display = 'block';
}

// Accept booking
async function acceptBooking(bookingId) {
    if (!confirm('Are you sure you want to accept this booking?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/planner/bookings/${bookingId}/accept`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            showNotification('Booking accepted successfully', 'success');
            loadBookings();
            closeModal();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error accepting booking', 'error');
        }
    } catch (error) {
        console.error('Error accepting booking:', error);
        showNotification('Error accepting booking', 'error');
    }
}

// Reject booking
async function rejectBooking(bookingId) {
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return; 
    
    try {
        const response = await fetch(`/api/planner/bookings/${bookingId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
            showNotification('Booking rejected', 'success');
            loadBookings();
            closeModal();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error rejecting booking', 'error');
        }
    } catch (error) {
        console.error('Error rejecting booking:', error);
        showNotification('Error rejecting booking', 'error');
    }
}

// Setup calendar
function setupCalendar() {
    generateCalendar();
}

// Generate calendar
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const monthHeader = document.getElementById('currentMonth');
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthHeader.textContent = `${getMonthName(month)} ${year}`;
    
    calendar.innerHTML = '';
    
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
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
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendar.appendChild(emptyDay);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        if (year === today.getFullYear() && 
            month === today.getMonth() && 
            day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        const dayEvents = document.createElement('div');
        dayEvents.className = 'day-events';
        dayElement.appendChild(dayEvents);
        
        calendar.appendChild(dayElement);
    }
}

// Navigate calendar
function navigateCalendar(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    generateCalendar();
}

// Get month name
function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// Load schedule
async function loadSchedule() {
    try {
        const response = await fetch('/api/planner/schedule', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const schedule = await response.json();
            displayTodaySchedule(schedule.today || []);
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

// Display today's schedule
function displayTodaySchedule(schedule) {
    const container = document.getElementById('todaySchedule');
    
    if (!schedule || schedule.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No events scheduled for today</p>';
        return;
    }
    
    container.innerHTML = schedule.map(event => `
        <div class="schedule-item">
            <div class="schedule-time">${event.event_time}</div>
            <div class="schedule-content">
                <h4>${event.event_type}</h4>
                <p>Client: ${event.customer_name}</p>
                <p>Location: ${event.location}</p>
            </div>
        </div>
    `).join('');
}

// Load clients
async function loadClients() {
    try {
        const response = await fetch('/api/planner/clients', {
            credentials: 'include'
        });
        
        if (response.ok) {
            clientsData = await response.json();
            displayClients(clientsData);
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

// Display clients
function displayClients(clients) {
    const container = document.getElementById('clientsList');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No clients found</p>';
        return;
    }
    
    container.innerHTML = clients.map(client => `
        <div class="client-card" onclick="showClientDetails(${client.id})">
            <div class="client-header">
                <div class="client-avatar">
                    ${client.full_name.charAt(0).toUpperCase()}
                </div>
                <div class="client-info">
                    <h3>${client.full_name}</h3>
                    <p>${client.email}</p>
                    <p>${client.phone_number}</p>
                </div>
            </div>
            <div class="client-stats">
                <div class="client-stat">
                    <span class="number">${client.total_bookings || 0}</span>
                    <span class="label">Bookings</span>
                </div>
                <div class="client-stat">
                    <span class="number">CFA ${formatNumber(client.total_spent || 0)}</span>
                    <span class="label">Spent</span>
                </div>
                <div class="client-stat">
                    <span class="number">${client.rating || 'N/A'}</span>
                    <span class="label">Rating</span>
                </div>
            </div>
            <div class="client-actions">
                <button class="btn-sm primary" onclick="event.stopPropagation(); contactClient('${client.phone_number}')">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="btn-sm secondary" onclick="event.stopPropagation(); emailClient('${client.email}')">
                    <i class="fas fa-envelope"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Load portfolio
async function loadPortfolio() {
    try {
        const response = await fetch('/api/planner/portfolio', {
            credentials: 'include'
        });
        
        if (response.ok) {
            portfolioData = await response.json();
            displayPortfolio(portfolioData);
        }
    } catch (error) {
        console.error('Error loading portfolio:', error);
    }
}

// Display portfolio
function displayPortfolio(portfolio) {
    const container = document.getElementById('portfolioGrid');
    
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No portfolio items found</p>';
        return;
    }
    
    container.innerHTML = portfolio.map(item => `
        <div class="portfolio-item" data-category="${item.category}">
            <div class="portfolio-image">
                <img src="${item.image_url || '/img/default-portfolio.jpg'}" alt="${item.title}">
                <div class="portfolio-overlay">
                    <i class="fas fa-eye"></i>
                </div>
            </div>
            <div class="portfolio-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <span class="portfolio-category">${item.category}</span>
            </div>
        </div>
    `).join('');
}

// Filter portfolio
function filterPortfolio(category) {
    const items = document.querySelectorAll('.portfolio-item');
    
    items.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Load earnings
async function loadEarnings() {
    try {
        const response = await fetch('/api/planner/earnings', {
            credentials: 'include'
        });
        
        if (response.ok) {
            earningsData = await response.json();
            displayEarnings(earningsData);
        }
    } catch (error) {
        console.error('Error loading earnings:', error);
    }
}

// Display earnings
function displayEarnings(earnings) {
    document.getElementById('totalEarnings').textContent = `CFA ${formatNumber(earnings.total || 0)}`;
    document.getElementById('monthlyEarnings2').textContent = `CFA ${formatNumber(earnings.thisMonth || 0)}`;
    document.getElementById('pendingPayments').textContent = `CFA ${formatNumber(earnings.pending || 0)}`;
    
    displayTransactions(earnings.transactions || []);
}

// Display transactions
function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No transactions found</p>';
        return;
    }
    
    const tableHTML = `
        <table class="transactions-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Event</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(transaction => `
                    <tr>
                        <td>${formatDate(transaction.date)}</td>
                        <td>${transaction.client_name}</td>
                        <td>${transaction.event_type}</td>
                        <td class="transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}">
                            CFA ${formatNumber(Math.abs(transaction.amount))}
                        </td>
                        <td>
                            <span class="booking-status ${transaction.status.toLowerCase()}">
                                ${transaction.status}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Load reviews
async function loadReviews() {
    try {
        const response = await fetch('/api/planner/reviews', {
            credentials: 'include'
        });
        
        if (response.ok) {
            reviewsData = await response.json();
            displayReviews(reviewsData);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Display reviews
function displayReviews(reviews) {
    // Update overall rating
    const overallRating = reviews.overall || { rating: 0, total: 0 };
    document.getElementById('overallRating').textContent = overallRating.rating.toFixed(1);
    document.getElementById('totalReviews').textContent = `${overallRating.total} reviews`;
    
    // Update stars
    const starsContainer = document.getElementById('overallStars');
    starsContainer.innerHTML = generateStars(overallRating.rating);
    
    // Update rating breakdown
    const breakdown = reviews.breakdown || {};
    document.getElementById('five-star-count').textContent = breakdown['5'] || 0;
    document.getElementById('four-star-count').textContent = breakdown['4'] || 0;
    document.getElementById('three-star-count').textContent = breakdown['3'] || 0;
    document.getElementById('two-star-count').textContent = breakdown['2'] || 0;
    document.getElementById('one-star-count').textContent = breakdown['1'] || 0;
    
    displayIndividualReviews(reviews.reviews || []);
}

// Display individual reviews
function displayIndividualReviews(reviews) {
    const container = document.getElementById('reviewsList');
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No reviews yet</p>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        ${review.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="reviewer-details">
                        <h4>${review.customer_name}</h4>
                        <p>${review.event_type} - ${formatDate(review.event_date)}</p>
                    </div>
                </div>
                <div class="review-rating">
                    ${generateStars(review.rating)}
                </div>
            </div>
            <div class="review-content">
                ${review.comment}
            </div>
        </div>
    `).join('');
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch('/api/planner/analytics', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const analytics = await response.json();
            displayAnalytics(analytics);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Display analytics
function displayAnalytics(analytics) {
    console.log('Analytics data:', analytics);
}

// Setup charts 
function setupCharts() {
    console.log('Charts setup placeholder');
}

// Profile and form functions
function setupProfileImageUpload() {
    const profileImage = document.querySelector('.profile-image');
    const fileInput = document.getElementById('profileImageInput');
    
    if (profileImage && fileInput) {
        profileImage.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleProfileImageUpload);
    }
}

async function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image file size must be less than 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('profileImage', file);
    
    try {
        showLoading();
        
        const response = await fetch('/api/planner/profile/upload-image', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            document.getElementById('profileImage').src = result.imageUrl;
            showNotification('Profile image updated successfully', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showNotification('Error uploading image', 'error');
    } finally {
        hideLoading();
    }
}

function setupFormHandlers() {
    // Add form validation and other handlers
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', validateInput);
        });
    });
}

async function updateProfile(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = Object.fromEntries(formData.entries());
    
    const specializations = Array.from(document.getElementById('specializations').selectedOptions)
        .map(option => option.value);
    profileData.specializations = specializations;
    
    try {
        showLoading();
        
        const response = await fetch('/api/planner/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            const updatedPlanner = await response.json();
            currentPlanner = updatedPlanner;
            updateUserInterface();
            showNotification('Profile updated successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error updating profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile', 'error');
    } finally {
        hideLoading();
    }
}

async function updateWorkingHours(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const workingHours = {};
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        const isEnabled = formData.get(day) === 'on';
        const startTime = formData.get(`${day}-start`);
        const endTime = formData.get(`${day}-end`);
        
        workingHours[day] = {
            enabled: isEnabled,
            start: startTime,
            end: endTime
        };
    });

    try {
        showLoading();
        
        const response = await fetch('/api/planner/working-hours', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ workingHours })
        });
        
        if (response.ok) {
            showNotification('Working hours updated successfully', 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error updating working hours', 'error');
        }
    } catch (error) {
        console.error('Error updating working hours:', error);
        showNotification('Error updating working hours', 'error');
    } finally {
        hideLoading();
    }
}



// Utility functions 
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
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
        'booking': 'fa-calendar-plus',
        'payment': 'fa-money-bill-wave',
        'review': 'fa-star',
        'profile': 'fa-user-edit',
        'default': 'fa-info-circle'
    };
    return icons[type] || icons['default'];
}

function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
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
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}



function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
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
    
    // Set notification style based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}




function setupModalHandlers() {
    // Close modal when clicking the X button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close')) {
            closeModal();
        }
    });
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}



function setupModalHandlers() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close')) {
            closeModal();
        }
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

