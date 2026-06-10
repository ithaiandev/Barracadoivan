// Nav mobile: injeta os links primários no dropdown quando tela ≤ 600px
(function() {
  function buildMobileNav() {
    var dropdown = document.getElementById('navDropdown');
    if (!dropdown) return;
    // remove injeções anteriores
    dropdown.querySelectorAll('.nav-mobile-item').forEach(function(el) { el.remove(); });
    if (window.innerWidth <= 860) {
      var primaryLinks = document.querySelectorAll('.nav-primary-links a');
      var frag = document.createDocumentFragment();
      primaryLinks.forEach(function(link) {
        var clone = link.cloneNode(true);
        clone.classList.add('nav-mobile-item');
        frag.appendChild(clone);
      });
      dropdown.insertBefore(frag, dropdown.firstChild);
    }
  }
  document.addEventListener('DOMContentLoaded', buildMobileNav);
  window.addEventListener('resize', buildMobileNav);
})();
