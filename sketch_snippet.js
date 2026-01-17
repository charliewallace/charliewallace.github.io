
function setDaySpiralStyle(styleName) {
    if (daySpiralRenderer) {
        daySpiralRenderer.setStyle(styleName);

        // Update UI buttons
        let btnClassic = select('#btn-style-classic');
        let btnSpiral = select('#btn-style-spiral');

        if (styleName === 'Classic') {
            btnClassic.addClass('toggled-on');
            btnSpiral.removeClass('toggled-on');
        } else {
            btnClassic.removeClass('toggled-on');
            btnSpiral.addClass('toggled-on');
        }

        updateUrlHash();
    }
}
