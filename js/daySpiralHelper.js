
function setDaySpiralStyle(styleName) {
    if (daySpiralRenderer) {
        daySpiralRenderer.setStyle(styleName);

        // UI Feedback (active class) is handled globally in updateUIElements() in sketch.js

        // Manage GMT button visibility based on style
        let btnGmt = select('#btn-gmt');
        if (styleName === 'Classic') {
            // Show GMT button in Classic mode
            if (btnGmt) btnGmt.show();
        } else {
            // SpiralHours mode - Hide GMT button (no room for GMT display)
            if (btnGmt) {
                btnGmt.hide();
                // Also turn off GMT if it was on
                if (btnGmt.hasClass('toggled-on')) {
                    btnGmt.removeClass('toggled-on');
                    if (typeof IsGmtShown !== 'undefined') {
                        IsGmtShown = false;
                    }
                    btnGmt.html('Show GMT');
                }
            }
        }

        updateUrlHash();
    }
}
