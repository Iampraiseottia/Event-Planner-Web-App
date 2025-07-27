// Scrollspy and Smooth Scrolling Implementation
document.addEventListener("DOMContentLoaded", function () {
  
  const navLinks = document.querySelectorAll('.nav ul li a[href^="#"]');
  const sections = document.querySelectorAll("section[id], p[id]");

  // Create a mapping of nav href to actual section IDs
  const sectionMapping = {
    "#": "home-content", 
    "#about-scroll": "About", 
    "#call-to-action": "About", 
    "#service-scroll": "services", 
    "#our-team": "team", 
    "#testimony-main": "testimony", 
    "#contact-us": "contact", 
  };

  // Smooth scrolling for navigation links
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const href = this.getAttribute("href");
      let targetSection;

      // Handle home link 
      if (href === "#" || href === "") {
        targetSection = document.getElementById("home-content");
      } else {
        const targetId = href.substring(1);
        targetSection = document.getElementById(targetId);

        if (!targetSection && sectionMapping[href]) {
          targetSection = document.getElementById(sectionMapping[href]);
        }

        // For services, try both desktop and mobile versions
        if (!targetSection && href === "#service-scroll") {
          targetSection =
            document.getElementById("services-desktop") ||
            document.getElementById("services");
        }
      }

      if (targetSection) {
        document
          .querySelectorAll(".nav ul li")
          .forEach((li) => li.classList.remove("current"));

        this.parentElement.classList.add("current");

        const headerOffset = 80; 
        const elementPosition = targetSection.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    });
  });

  // Scrollspy - Update active nav link based on scroll position
  const updateActiveNavLink = () => {
    const scrollPosition = window.scrollY + 100; 

    let currentSection = "";
    let activeNavHref = "";

    // Check each section to see which one is currently in view
    const sectionsToCheck = [
      { id: "home-content", navHref: "#" },
      { id: "About", navHref: "#about-scroll" },
      { id: "services", navHref: "#service-scroll" },
      { id: "services-desktop", navHref: "#service-scroll" },
      { id: "team", navHref: "#our-team" },
      { id: "testimony", navHref: "#testimony-main" },
      { id: "contact", navHref: "#contact-us" },
    ];

    // Find which section is currently most visible
    for (let i = sectionsToCheck.length - 1; i >= 0; i--) {
      const section = document.getElementById(sectionsToCheck[i].id);
      if (section) {
        const sectionTop =
          section.getBoundingClientRect().top + window.pageYOffset;
        const sectionHeight = section.offsetHeight;
        const sectionBottom = sectionTop + sectionHeight;

        // Check if we're in the section
        if (
          scrollPosition >= sectionTop - 150 &&
          scrollPosition < sectionBottom
        ) {
          currentSection = sectionsToCheck[i].id;
          activeNavHref = sectionsToCheck[i].navHref;
          break;
        }
      }
    }

    // Special case for home section (when near top of page)
    if (scrollPosition < 300) {
      activeNavHref = "#";
    }

    navLinks.forEach((link) => {
      link.parentElement.classList.remove("current");
    });

    if (activeNavHref) {
      let activeLink;
      if (activeNavHref === "#") {
        activeLink =
          document.querySelector(".nav ul li:first-child a") ||
          document.querySelector('.nav ul li a[href="#"]') ||
          document.querySelector('.nav ul li a[href=""]');
      } else {
        activeLink = document.querySelector(
          `.nav ul li a[href="${activeNavHref}"]`
        );
      }

      if (activeLink) {
        activeLink.parentElement.classList.add("current");
      }
    }
  };

  // Optimized scroll event handler
  let ticking = false;

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateActiveNavLink);
      ticking = true;
      setTimeout(() => {
        ticking = false;
      }, 16);
    }
  }

  window.addEventListener("scroll", requestTick);

  setTimeout(updateActiveNavLink, 100);

  window.addEventListener("resize", debounce(updateActiveNavLink, 250));


  //  creating intersection observers
  function createScrollObserver(selector, className, threshold = 0.1) {
    const element = document.querySelector(selector);
    if (!element) return;

    const options = {
      threshold: threshold,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add(className);
          observer.unobserve(entry.target);
        }
      });
    }, options);

    observer.observe(element);
  }

  // Apply scroll animations to all sections
  createScrollObserver("#About", "show", 0.3);
  createScrollObserver("#call-to-action", "show", 0.35);
  createScrollObserver("#services", "serviceShow", 0.25);
  createScrollObserver("#services-desktop", "serviceShow", 0.25);
  createScrollObserver("#team", "teamShow", 0.29);
  createScrollObserver("#testimony", "testimonyShow", 0.19);
  createScrollObserver("#contact", "contactShow", 0.24);
  createScrollObserver("#newletter", "newsShow", 0.3);
  createScrollObserver("#footer", "footerShow", 0.36);

  // Additional animation for individual elements
  const observeMultipleElements = (selector, className, threshold = 0.1) => {
    const elements = document.querySelectorAll(selector);

    const options = {
      threshold: threshold,
      rootMargin: "0px 0px -30px 0px",
    };

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add(className);
        }
      });
    }, options);

    elements.forEach((element) => {
      observer.observe(element);
    });
  };

  // Animate individual service cards
  observeMultipleElements(".service-card", "animate-card", 0.2);
  observeMultipleElements(".team1", "animate-team", 0.3);
  observeMultipleElements(
    ".testimony1, .testimony2, .testimony3",
    "animate-testimony",
    0.2
  );
});


const close = document.getElementById("close");
const menu = document.getElementById("menu");
const navBar = document.querySelector(".nav");
const header = document.getElementById("header");
const body = document.body;

menu.addEventListener("click", () => {
  menu.style.visibility = "hidden";
  close.style.visibility = "visible";
  navBar.style.visibility = "visible";
  header.classList.add("menu-open");
  body.classList.add("menu-open");
});

close.addEventListener("click", () => {
  menu.style.visibility = "visible";
  close.style.visibility = "hidden";
  navBar.style.visibility = "hidden";
  header.classList.remove("menu-open");
  body.classList.remove("menu-open");
});

document.querySelectorAll(".nav ul li a").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      menu.style.visibility = "visible";
      close.style.visibility = "hidden";
      navBar.style.visibility = "hidden";
      header.classList.remove("menu-open");
      body.classList.remove("menu-open");
    }
  });
});


// Form validation functions
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone) {
  // Allow various phone number formats including international
  const re = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
  return re.test(phone.replace(/\s/g, ''));
}

function validateRequired(value) {
  return value.trim().length > 0;
}

function validateMinLength(value, minLength) {
  return value.trim().length >= minLength;
}

// Replace the existing handleSubmit function with this updated version
function handleSubmit(event) {
  event.preventDefault();
  
  // Clear any previous error styling
  clearErrors();
  
  const formData = {};
  const errors = [];

  // Get values from the contact form fields
  const fullName = document.querySelector("#admin_full_name")?.value || "";
  const eventType = document.querySelector("#admin_event_type")?.value || "";
  const email = document.querySelector("#admin_email")?.value || "";
  const phoneNumber = document.querySelector("#admin_phone_number")?.value || "";
  const cityTown = document.querySelector("#admin_city_street")?.value || "";
  const country = document.querySelector("#Country")?.value || "";
  const subject = document.querySelector("#admin_subject")?.value || "";
  const message = document.querySelector("#admin_request")?.value || "";

  // Validation checks
  if (!validateRequired(fullName)) {
    errors.push("Full Name is required");
    addErrorStyle("#admin_full_name");
  } else if (!validateMinLength(fullName, 2)) {
    errors.push("Full Name must be at least 2 characters long");
    addErrorStyle("#admin_full_name");
  }

  if (!validateRequired(eventType)) {
    errors.push("Event Type is required");
    addErrorStyle("#admin_event_type");
  }

  if (!validateRequired(email)) {
    errors.push("Email is required");
    addErrorStyle("#admin_email");
  } else if (!validateEmail(email)) {
    errors.push("Please enter a valid email address");
    addErrorStyle("#admin_email");
  }

  if (!validateRequired(phoneNumber)) {
    errors.push("Phone Number is required");
    addErrorStyle("#admin_phone_number");
  } else if (!validatePhone(phoneNumber)) {
    errors.push("Please enter a valid phone number");
    addErrorStyle("#admin_phone_number");
  }

  if (!validateRequired(cityTown)) {
    errors.push("City/Town is required");
    addErrorStyle("#admin_city_street");
  }

  if (!validateRequired(country) || country === "Select Your Country") {
    errors.push("Please select your country");
    addErrorStyle("#Country");
  }

  if (!validateRequired(subject)) {
    errors.push("Subject is required");
    addErrorStyle("#admin_subject");
  } else if (!validateMinLength(subject, 3)) {
    errors.push("Subject must be at least 3 characters long");
    addErrorStyle("#admin_subject");
  }

  if (!validateRequired(message)) {
    errors.push("Message is required");
    addErrorStyle("#admin_request");
  } else if (!validateMinLength(message, 10)) {
    errors.push("Message must be at least 10 characters long");
    addErrorStyle("#admin_request");
  }

  // If there are errors, display them and stop submission
  if (errors.length > 0) {
    displayErrors(errors);
    return;
  }

  // Build the form data object (only if validation passes)
  formData.fullName = fullName;
  formData.eventType = eventType;
  formData.email = email;
  formData.phoneNumber = phoneNumber;
  formData.cityTown = cityTown;
  formData.country = country;
  formData.subject = subject;
  formData.message = message;

  // Display the collected data in console
  console.log("Contact Form Data:", formData);

  // Optional: Display a more formatted version
  console.log("=== CONTACT FORM SUBMISSION ===");
  console.log("Full Name:", formData.fullName);
  console.log("Event Type:", formData.eventType);
  console.log("Email:", formData.email);
  console.log("Phone Number:", formData.phoneNumber);
  console.log("City/Town:", formData.cityTown);
  console.log("Country:", formData.country);
  console.log("Subject:", formData.subject);
  console.log("Message:", formData.message);
  console.log("===============================");

  // Clear form fields after submission
  document.querySelector("#admin_full_name").value = "";
  document.querySelector("#admin_event_type").value = "";
  document.querySelector("#admin_email").value = "";
  document.querySelector("#admin_phone_number").value = "";
  document.querySelector("#admin_city_street").value = "";
  document.querySelector("#Country").value = "";
  document.querySelector("#admin_subject").value = "";
  document.querySelector("#admin_request").value = "";

  // Show success message to user
  alert("Thank you for your message! We'll get back to you soon.");
}

// Error handling functions
function addErrorStyle(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.style.borderColor = "#dc3545";
    element.style.borderWidth = "2px";
    element.style.boxShadow = "0 0 0 0.2rem rgba(220, 53, 69, 0.25)";
  }
}

function clearErrors() {
  const formFields = [
    "#admin_full_name", "#admin_event_type", "#admin_email", 
    "#admin_phone_number", "#admin_city_street", "#Country", 
    "#admin_subject", "#admin_request"
  ];
  
  formFields.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.borderColor = "";
      element.style.borderWidth = "";
      element.style.boxShadow = "";
    }
  });
  
  // Remove any existing error message
  const existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
}

function displayErrors(errors) {
  // Create error message container
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.cssText = `
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 15px;
    margin: 20px 0;
    font-size: 14px;
    line-height: 1.4;
  `;
  
  const errorTitle = document.createElement("strong");
  errorTitle.textContent = "Please fix the following errors:";
  errorDiv.appendChild(errorTitle);
  
  const errorList = document.createElement("ul");
  errorList.style.marginTop = "10px";
  errorList.style.paddingLeft = "20px";
  
  errors.forEach(error => {
    const listItem = document.createElement("li");
    listItem.textContent = error;
    errorList.appendChild(listItem);
  });
  
  errorDiv.appendChild(errorList);
  
  // Insert error message at the top of the form
  const form = document.querySelector("form[action='./php/admin.php']");
  if (form) {
    form.insertBefore(errorDiv, form.firstChild);
    // Scroll to the error message
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Real-time validation on input blur
function setupRealTimeValidation() {
  const validations = [
    {
      selector: "#admin_full_name",
      validate: (value) => validateRequired(value) && validateMinLength(value, 2),
      message: "Full Name is required (minimum 2 characters)"
    },
    {
      selector: "#admin_event_type",
      validate: (value) => validateRequired(value),
      message: "Event Type is required"
    },
    {
      selector: "#admin_email",
      validate: (value) => validateRequired(value) && validateEmail(value),
      message: "Please enter a valid email address"
    },
    {
      selector: "#admin_phone_number",
      validate: (value) => validateRequired(value) && validatePhone(value),
      message: "Please enter a valid phone number"
    },
    {
      selector: "#admin_city_street",
      validate: (value) => validateRequired(value),
      message: "City/Town is required"
    },
    {
      selector: "#Country",
      validate: (value) => validateRequired(value) && value !== "Select Your Country",
      message: "Please select your country"
    },
    {
      selector: "#admin_subject",
      validate: (value) => validateRequired(value) && validateMinLength(value, 3),
      message: "Subject is required (minimum 3 characters)"
    },
    {
      selector: "#admin_request",
      validate: (value) => validateRequired(value) && validateMinLength(value, 10),
      message: "Message is required (minimum 10 characters)"
    }
  ];

  validations.forEach(({ selector, validate, message }) => {
    const element = document.querySelector(selector);
    if (element) {
      element.addEventListener('blur', function() {
        if (!validate(this.value)) {
          addErrorStyle(selector);
          showFieldError(selector, message);
        } else {
          clearFieldError(selector);
        }
      });
      
      // Clear error on focus
      element.addEventListener('focus', function() {
        clearFieldError(selector);
      });
    }
  });
}

function showFieldError(selector, message) {
  clearFieldError(selector);
  
  const element = document.querySelector(selector);
  if (element) {
    const errorSpan = document.createElement("span");
    errorSpan.className = "field-error";
    errorSpan.style.cssText = `
      color: #dc3545;
      font-size: 12px;
      display: block;
      margin-top: 5px;
    `;
    errorSpan.textContent = message;
    
    element.parentNode.appendChild(errorSpan);
  }
}

function clearFieldError(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.style.borderColor = "";
    element.style.borderWidth = "";
    element.style.boxShadow = "";
    
    const existingError = element.parentNode.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }
  }
}

// Make sure the form event listener targets the correct form
document.addEventListener("DOMContentLoaded", function() {
  const contactForm = document.querySelector("form[action='./php/admin.php']");
  if (contactForm) {
    contactForm.addEventListener("submit", handleSubmit);
  }
});

const form = document.querySelector("form");
if (form) {
  form.addEventListener("submit", handleSubmit);
}


document.addEventListener("DOMContentLoaded", function () {
  const newsletterBtn = document.querySelector(".news-btn");
  const newsletterInput = document.querySelector("#news-content input");

  if (newsletterBtn && newsletterInput) {
    newsletterBtn.addEventListener("click", function () {
      const email = newsletterInput.value.trim();

      if (email && validateEmail(email)) {
        alert("Thank you for subscribing to our newsletter!");
        newsletterInput.value = "";
      } else {
        alert("Please enter a valid email address.");
      }
    });

    newsletterInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        newsletterBtn.click();
      }
    });
  }
});

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}


// Create scroll to top button
const scrollToTopBtn = document.createElement("button");
scrollToTopBtn.innerHTML = "↑";
scrollToTopBtn.setAttribute("id", "scrollToTop");
scrollToTopBtn.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #37517e;
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 1000;
`;

document.body.appendChild(scrollToTopBtn);

// Show/hide scroll to top button based on scroll position
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    scrollToTopBtn.style.opacity = "1";
    scrollToTopBtn.style.visibility = "visible";
  } else {
    scrollToTopBtn.style.opacity = "0";
    scrollToTopBtn.style.visibility = "hidden";
  }
});

// Scroll to top when button is clicked
scrollToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});


// Debounce function for scroll events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
