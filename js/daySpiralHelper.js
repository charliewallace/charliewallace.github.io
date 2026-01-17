
function setDaySpiralStyle(styleName) {
    if (daySpiralRenderer) {
        daySpiralRenderer.setStyle(styleName);

        // Update UI buttons
        let btnClassic = select('#btn-style-classic');
        let btnSpiral = select('#btn-style-spiral');
        let btnGmt = select('#btn-gmt');

        if (styleName === 'Classic') {
            if (btnClassic) btnClassic.addClass('toggled-on');
            if (btnSpiral) btnSpiral.removeClass('toggled-on');
            // Show GMT button in Classic mode
            if (btnGmt) btnGmt.show();
        } else {
            // SpiralHours mode
            if (btnClassic) btnClassic.removeClass('toggled-on');
            if (btnSpiral) btnSpiral.addClass('toggled-on');
            // Hide GMT button in SpiralHours mode (no room for GMT display)
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
