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

  //Testimony Section Appear
document.addEventListener("DOMContentLoaded", function () {
    var testimonySection = document.querySelector("#contact");
  
    var testimonyOption = {
      threshold: 0.24,
    };
  
    var testimonyObserver = new IntersectionObserver(function (
      testimonyEntries,
      observer
    ) {
      testimonyEntries.forEach(function (testimonyEntry) {
        if (testimonyEntry.isIntersecting) {
          testimonyEntry.target.classList.add("contactShow");
          observer.unobserve(testimonyEntry.target);
        }
      });
    },
    testimonyOption);
  
    testimonyObserver.observe(testimonySection);
  });

