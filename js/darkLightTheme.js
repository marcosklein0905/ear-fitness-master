// SIDEBAR NAVIGATION TOGGLING

const menuBtn = document.querySelector('#menu-btn')
const closeBtn = document.querySelector('#close-btn')
const sidebar = document.querySelector('aside')

menuBtn.addEventListener('click', ()=> {
    sidebar.style.display = 'block'
})

closeBtn.addEventListener('click', ()=>{
    sidebar.style.display = 'none'
})

const themeBtn = document.querySelector('.theme-btn');

// ✅ Apply saved theme on load
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');

    // themeBtn.querySelector('span:first-child').classList.add('active');
    // themeBtn.querySelector('span:last-child').classList.remove('active');

    themeBtn.querySelector('span:first-child').classList.remove('active');
    themeBtn.querySelector('span:last-child').classList.add('active');

} else {
    document.body.classList.remove('dark-theme');

    // themeBtn.querySelector('span:first-child').classList.remove('active');
    // themeBtn.querySelector('span:last-child').classList.add('active');

    themeBtn.querySelector('span:first-child').classList.add('active');
    themeBtn.querySelector('span:last-child').classList.remove('active');
}

// ✅ Toggle theme and save preference
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');

    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    themeBtn.querySelector('span:first-child').classList.toggle('active');
    themeBtn.querySelector('span:last-child').classList.toggle('active');
});
