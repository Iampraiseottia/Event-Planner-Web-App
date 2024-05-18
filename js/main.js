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


