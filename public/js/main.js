/* Page-specific widgets. Scroll effects, header, back-to-top and reveals live in js/motion.js. */
(function ($) {
    "use strict";
    if (!$ || !$.fn || !$.fn.owlCarousel) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Testimonial carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: !reduce,
        autoplayHoverPause: true,
        smartSpeed: 900,
        dots: false,
        loop: true,
        margin: 24,
        nav: true,
        navText: [
            '<i class="fa fa-arrow-left" aria-hidden="true"></i><span class="visually-hidden">Previous</span>',
            '<i class="fa fa-arrow-right" aria-hidden="true"></i><span class="visually-hidden">Next</span>'
        ],
        responsive: {
            0: { items: 1 },
            768: { items: 2 },
            1200: { items: 3 }
        }
    });
})(window.jQuery);
