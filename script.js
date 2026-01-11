document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const frames = document.querySelectorAll('.app-frame');

    function switchTab(targetId) {
        // Hide all frames
        frames.forEach(frame => {
            frame.classList.remove('active');
        });

        // Show target frame
        const targetFrame = document.getElementById(targetId);
        if (targetFrame) {
            targetFrame.classList.add('active');
        }

        // Update nav state
        navItems.forEach(item => {
            if (item.dataset.target === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.dataset.target;
            switchTab(targetId);
        });
    });

    // Optional: Preload iframes or lazy load them?
    // Current approach loads them all on startup (browsers handle this efficiently usually)
    // but the `src` attribute is already set, so they will load.
});
