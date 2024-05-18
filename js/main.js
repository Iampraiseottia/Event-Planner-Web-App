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