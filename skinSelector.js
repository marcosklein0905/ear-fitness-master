document.addEventListener('DOMContentLoaded', () => {
    const skinSelector = document.getElementById('skinSelector');
    const themeStylesheet = document.getElementById('themeStylesheet');
  
    // Load the last selected theme from localStorage (or use the default)
    const savedSkin = localStorage.getItem('selectedSkin') || './css/default.css';
    themeStylesheet.href = savedSkin;
  
    // Set the dropdown to reflect the saved skin
    skinSelector.value = savedSkin;
  
    // Update the theme and save the selection when the dropdown changes
    skinSelector.addEventListener('change', function () {
      const selectedSkin = this.value;
      themeStylesheet.href = selectedSkin;
      localStorage.setItem('selectedSkin', selectedSkin); // Save the selected theme
    });
  });
  