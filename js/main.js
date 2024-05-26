//About Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var aboutSection = document.querySelector("#About");
  
    var options = {
      threshold: 0.45,
    };
  
    var observer = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    }, options);
  
    observer.observe(aboutSection);
});
  

//Call Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var aboutSection = document.querySelector("#call-to-action");
  
    var options = {
      threshold: 0.35,
    };
  
    var observer = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    }, options);
  
    observer.observe(aboutSection);
  });
  

//Service Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var serviceSection = document.querySelector("#services");
  
    var serviceOptions = {
      threshold: 0.25,
    };
  
    var serviceObserver = new IntersectionObserver(function (
      serviceEntries,
      observer
    ) {
      serviceEntries.forEach(function (serviceEntry) {
        if (serviceEntry.isIntersecting) {
          serviceEntry.target.classList.add("serviceShow");
          observer.unobserve(serviceEntry.target);
        }
      });
    },
    serviceOptions);
  
    serviceObserver.observe(serviceSection);
  });

  //Team Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var teamSection = document.querySelector("#team");
  
    var teamOptions = {
      threshold: 0.29,
    };
  
    var teamObserver = new IntersectionObserver(function (teamEntries, observer) {
      teamEntries.forEach(function (teamEntry) {
        if (teamEntry.isIntersecting) {
          teamEntry.target.classList.add("teamShow");
          observer.unobserve(teamEntry.target);
        }
      });
    }, teamOptions);
  
    teamObserver.observe(teamSection);
  });

  

//Testimony Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var testimonySection = document.querySelector("#testimony");
  
    var testimonyOption = {
      threshold: 0.19,
    };
  
    var testimonyObserver = new IntersectionObserver(function (
      testimonyEntries,
      observer
    ) {
      testimonyEntries.forEach(function (testimonyEntry) {
        if (testimonyEntry.isIntersecting) {
          testimonyEntry.target.classList.add("testimonyShow");
          observer.unobserve(testimonyEntry.target);
        }
      });
    },
    testimonyOption);
  
    testimonyObserver.observe(testimonySection);
  });

  //contact Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var contactSection = document.querySelector("#contact");
  
    var contactOption = {
      threshold: 0.24,
    };
  
    var contactObserver = new IntersectionObserver(function (
      contactEntries,
      observer
    ) {
      contactEntries.forEach(function (contactEntry) {
        if (contactEntry.isIntersecting) {
          contactEntry.target.classList.add("contactShow");
          observer.unobserve(contactEntry.target);
        }
      });
    },
    contactOption);
  
    contactObserver.observe(contactSection);
  });


  
  //Newsletter Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var NewsletterSection = document.querySelector("#newletter");
  
    var NewsletterOption = {
      threshold: 0.30,
    };
  
    var NewsletterObserver = new IntersectionObserver(function (
      NewsletterEntries,
      observer
    ) {
      NewsletterEntries.forEach(function (NewsletterEntry) {
        if (NewsletterEntry.isIntersecting) {
          NewsletterEntry.target.classList.add("newsShow");
          observer.unobserve(NewsletterEntry.target);
        }
      });
    },
    NewsletterOption);
  
    NewsletterObserver.observe(NewsletterSection);
  });


    //Testimony Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var footerSection = document.querySelector("#footer");
  
    var footerOption = {
      threshold: 0.36,
    };
  
    var footerObserver = new IntersectionObserver(function (
      footerEntries,
      observer
    ) {
      footerEntries.forEach(function (footerEntry) {
        if (footerEntry.isIntersecting) {
          footerEntry.target.classList.add("footerShow");
          observer.unobserve(footerEntry.target);
        }
      });
    },
    footerOption);
  
    footerObserver.observe(footerSection);
  });


  // Responsiveness
  const close = document.getElementById('close');
  const menu = document.getElementById('menu');
  const navBar = document.querySelector('.nav');
  const header = document.getElementById('header');


  menu.addEventListener('click', () => {
    menu.style.visibility = 'hidden';
    close.style.visibility = 'visible';
    navBar.style.visibility = 'visible';
    header.style.height = 'auto';
  })

  close.addEventListener('click', () => {
    menu.style.visibility = 'visible';
    close.style.visibility = 'hidden';
    navBar.style.visibility = 'hidden';
    header.style.height = '50px';    
  })


  //Book

      function handleSubmit(event) {
          event.preventDefault(); 
          const formData = {}; 
  
          // Get values from the form fields
          const plannerName = document.querySelector('.planner-name').value;
          const fullName = document.querySelector('#name').value;
          const phoneNumber = document.querySelector('#phone_number').value;
          const email = document.querySelector('#email').value;
          const eventType = document.querySelectorAll('#Country')[0].value;
          const category = document.querySelectorAll('#Country')[1].value;
          const location = document.querySelector('#location').value;
          const date = document.querySelector('#date').value;
          const time = document.querySelector('#time').value;
          const requirements = document.querySelector('#order').value;
  
          // Store values in the formData object
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
  
          // Display the formData object in the console
          console.log(formData);
  
          // Reset form fields to blank
          document.querySelector('.planner-name').value = '';
          document.querySelector('#name').value = '';
          document.querySelector('#phone_number').value = '';
          document.querySelector('#email').value = '';
          document.querySelectorAll('#Country')[0].value = '';
          document.querySelectorAll('#Country')[1].value = '';
          document.querySelector('#location').value = '';
          document.querySelector('#date').value = '';
          document.querySelector('#time').value = '';
          document.querySelector('#order').value = '';
      }
  
      // Add event listener to the form submission
      const form = document.querySelector('form');
      form.addEventListener('submit', handleSubmit);


      // FORM Admin Register 
     