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


function handleSubmit(event) {
  event.preventDefault();
  const formData = {};

  // Get values from the form fields
  const plannerName = document.querySelector(".planner-name")?.value || "";
  const fullName = document.querySelector("#name")?.value || "";
  const phoneNumber = document.querySelector("#phone_number")?.value || "";
  const email = document.querySelector("#email")?.value || "";
  const eventType = document.querySelectorAll("#Country")[0]?.value || "";
  const category = document.querySelectorAll("#Country")[1]?.value || "";
  const location = document.querySelector("#location")?.value || "";
  const date = document.querySelector("#date")?.value || "";
  const time = document.querySelector("#time")?.value || "";
  const requirements = document.querySelector("#order")?.value || "";

  formData.plannerName = plannerName;
  formData.fullName = fullName;
  formData.phoneNumber = phoneNumber;
  formData.email = email;
  formData.eventType = eventType;
  formData.category = category;
  formData.location = location;
  formData.date = date;
  formData.time = time;
  formData.requirements = requirements;

  console.log(formData);

  if (document.querySelector(".planner-name"))
    document.querySelector(".planner-name").value = "";
  if (document.querySelector("#name"))
    document.querySelector("#name").value = "";
  if (document.querySelector("#phone_number"))
    document.querySelector("#phone_number").value = "";
  if (document.querySelector("#email"))
    document.querySelector("#email").value = "";
  if (document.querySelectorAll("#Country")[0])
    document.querySelectorAll("#Country")[0].value = "";
  if (document.querySelectorAll("#Country")[1])
    document.querySelectorAll("#Country")[1].value = "";
  if (document.querySelector("#location"))
    document.querySelector("#location").value = "";
  if (document.querySelector("#date"))
    document.querySelector("#date").value = "";
  if (document.querySelector("#time"))
    document.querySelector("#time").value = "";
  if (document.querySelector("#order"))
    document.querySelector("#order").value = "";
}

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
