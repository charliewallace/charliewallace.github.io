/** ===========================================================
 * CoolweirdClocks: A container for multiple clock types.
 * 
 * DaySpiral: Sunrise & Sunset shown on 12-hr clock face.
 * This clock shows the current 24-hour day as a spiral, with 2 turns because
 * of AM and PM on the 12-hour clock face.  
 *
 * A web service from OpenStreetMap is used to fetch location
 * of a user-entered city. 
 * A separate web servce at GeoNames is used to fetch the time zone.
 * That call requires a free account; if you clone this project, please
 * create your own login and revise the url.  However no API key is needed.
 *
 * MobiusClock: A 12-hour clock face showing the current time using a Mobius strip, with the
 * hour indicator moving along the edge of the strip, so it requires 2 turns to 
 * complete a full day. The minute and second indicators move along the center
 * of the strip. 
 *   
 * By Charlie Wallace coolweird.net
 * 

TODO Fix Bugs -----------------------
  * Replace lots of bare numeric color values with variables centrally set, used in fill()
  *   and stroke() calls.  Similar needed for other bare constants like podition offsets.
  * Fix to recalc the IsDst state on new day
  * Bug: spiral incorrect at exreme latitude where sunset&rise are on the same side of noon,
  *   usually due to daylight savings
  * Bug: On the first day of the year Jan 1st, the calc of rise/set was
    inaccurate. sunset was about 10-15min late, sunrise similar amt early.
  * Bug: Some combos of manually entered loc and tz cause all-night result. 
     Happens when sunset time is shifted back so far back (earlier) that is passes 
     midnight.  Shows flaw in logic - FIX 

Future Enhancement Ideas ------------
  * Replace SetDaySpiral() that uses a toggling button with a set of buttons 
  *  for each clock type,  programmed to work as radio buttons.  
  *  Will set ClockMode to indicate type.
  * Idea: add mode where the current time is always in the middle of the spiral, so
  *  both past and future are equally shown
  * Idea: an option to show a diff location's time in the spiral (like GMT) while  
  *  the hands show the local time. So both are viewable in one display
  *  ALT: add a second hour hand for the non-local time.
  * Consider using GeoNames for both location and timezone, thus eliminating
  *  need for nominatim.openstreetmap.org call; or could use it as fallback
  * Implement 24 hour mode
 
==== IMPL / FEATURE NOTES  =====
* The logic depends on the GMT offset that it fetches to be auto-adjusted 
   for daylight savings time. This appears to be the case.
* FEATURE: input field validation via delay - when I immediately remove invalid numbers,
   this doesn't allow temporarily wrong content, like a minus sign with nothing else. 
   FIX: allow invalid content to sit for a 2 seconds before overwriting, so the 
   user has time to fix typos etc. Otherwise would need a submit button.
   NOTE, this is not used for the city field since I rely on the web service return
   to determine if the field is valid.  Instead the submit button is used.
* Added fields allowing manual entry of lat/long/GMT, with button to reset to local.
* Added support for finding lat/long/tz from city name:
   OpenStreetmap (Nominitim) appears to work except it doesn't supply a time zone. 
   Example of the url used:
  `https://nominatim.openstreetmap.org/search?format=json&q=${CityName}`;
   It's also possible to get lat/long using geoNames, FWIW
   To get the time zone, used GeoNames; Example of url:
  `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=charliewallace`
* Added support for window resizing - see reInit and windowResized()
============================================================== */


//======== GLOBALS ===================================
// Name convention: global vars are capitalized
const APP_VERSION = "v0.5.1 ©2026 Charlie Wallace";

console.log("📦 CoolweirdClocks loaded");
var WebsiteLink;
var CityNameInput;

var CenterX, CenterY;
var SecondsRadius;
var MinutesRadius;
var HoursRadius;
var HourNumbersRadius;
var InnerFaceRadius;
var ClockDiameter;
var BkColor;

var FontScaleFactor;
var RefFontSize;
var CurrentFontSize;

var LastMillisec;

var HourDigitColor;



var SecondsSoFar;
var MsFromStartToResetTime;

var Latitude, Longitude;
var NewLatitude, NewLongitude;
var LastLat, LastLong;
var LatLocal, LngLocal;
var TzOffset, TzOffsetLocal;
var LastTz;
var IsSunRiseSetObtained;
var IsTimezoneMismatch; // true if browser timezone doesn't match IP location timezone
var TimezoneWarningShown = false;  // true if timezone mismatch warning has been shown
var IsPreciseLocation = false; // true if using GPS location
var IsRequestingPrecise = false; // true if a GPS request is currently in flight
var LocationFetchSerial = 0; // Incrementing ID to track async location requests
var IsUserInitiatedLocation = false; // true if location was set by user action (GPS, preset, city lookup, manual)
var IsLoadingLocation = false; // true if waiting for location data (network or GPS)

var OutputHour, OutputMin;
var SunsetHour, SunsetMin, SecondsToSunset, BaseMsSunset;
var SunriseHour, SunriseMin, SecondsToSunrise, BaseMsSunrise;

var SunriseMinString;
var SunriseAmpmString;
var SunriseHourString;

var SunsetMinString;
var SunsetAmpmString;
var SunsetHourString;


var DayState;
var ISec, IMin, IHour;
var IDow;
var IDowPrevious;
var IHour12;
var IsAM;
var TimeString;
var DateString;
var IMsSinceDayStart;

var InputFieldProcessingTimeout = 2000; // processing of field contents happens on timeout

var TzInput;
var TzInputTimestampMs;  // ms since pgm start when input happened
var LatInput;
var LatInputTimestampMs;  // ms since pgm start when input happened

var LngInput;
var LngInputTimestampMs;  // ms since pgm start when input happened


var GmtDisplayButton;
var GmtDisplayButtonLabel;  // needed when button label must change

var CitySubmitButton;

var IsDst; // daylight savings time


var YSpiralArray;
var RadiusSpiralArray;
var NumSpiralPointsPerTurn;
var NumSpiralTurns;
var SpiralStrokeWeight;       // Proportional weight for main spiral
var SpiralStrokeWeightSecondary; // Proportional weight for hands/ticks
var SpiralFontSize;              // Proportional font size for spiral text

var IsWindows;
var IsDesktop;



var IsGmtShown;
var ClockMode;


var CityName;

var LocaleTitle;
var PrevLocaleTitle;
var LocaleTitleLocal; // Stores the IP-based location name for fallback


// tracking for orientation/fullscreen attention cue
var WasMobileLandscapeLastCheck = false;

var IsZenMode = false;
var WasFullScreenLastCheck = false;


// Robust tracking of browser timezone
var BrowserTzOffset;

// Track if we are showing the user's own location (auto/IP/GPS) vs a remote manual location
var IsDisplayingUserLocation = true;

// == NEW CONTROLLERS ==
var timeKeeper;
var locManager;
var daySpiralRenderer;
var mobiusRenderer;
var activeRenderer;



// Fetch approximate location from IP geolocation API
function fetchIpLocation() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] Fetching approximate location from IP...`);
  IsRequestingPrecise = false; // Cancel any pending GPS request results
  setLoadingState();
  IsDisplayingUserLocation = true; // We are tracking user location
  IsPreciseLocation = false;
  IsUserInitiatedLocation = false; // IP location is automatic, not user-initiated

  // Using ipwho.is (CORS-friendly, no API key required for low-volume)
  fetch('https://ipwho.is/')
    .then(response => response.json())
    .then(data => {
      if (requestId !== LocationFetchSerial) {
        console.log(`[${requestId}] IP location fetch results ignored (stale/cancelled).`);
        return;
      }

      if (!data.success) {
        console.log(`[${requestId}] IP location API returned failure:`, data.message);
        handleIpFallback(requestId, data.message);
        return;
      }

      console.log(`[${requestId}] IP Geolocation data:`, data);

      // Extract and validate coordinates
      Latitude = parseFloat(data.latitude);
      Longitude = parseFloat(data.longitude);

      // Round to 3 places after decimal (city-level accuracy)
      Latitude = round(Latitude, 3);
      Longitude = round(Longitude, 3);

      console.log("latitude: " + Latitude);
      console.log("longitude: " + Longitude);

      // Extract city and region if available
      var city = data.city;
      var region = data.region;
      var locationString = "Approximate Location";

      if (city) {
        locationString = "Near " + city; // Add "Near" prefix for IP-based location
      }

      LocaleTitle = locationString;
      LocaleTitleLocal = locationString; // Save for fallback

      // Check for timezone mismatch (VPN detection)
      var browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var ipTimezone = data.timezone ? data.timezone.id : null;

      console.log("Browser timezone:", browserTimezone);
      console.log("IP location timezone:", ipTimezone);

      // Compare timezones - if different, might be using VPN
      if (ipTimezone) {
        IsTimezoneMismatch = (browserTimezone !== ipTimezone);
      }

      // Allow testing VPN warning via URL hash parameter.
      var urlHash = window.location.hash.toLowerCase();
      if (urlHash.includes('testvpn') || urlHash.includes('simulatevpn')) {
        IsTimezoneMismatch = true;
        console.log("🧪 TEST MODE: VPN simulation enabled via URL hash");
      }

      if (IsTimezoneMismatch) {
        if (!TimezoneWarningShown) {
          console.log("⚠️ Timezone mismatch detected - possible VPN/proxy usage");
          alert("⚠️ Timezone mismatch detected - possible VPN/proxy usage." +
            " This may affect the accuracy of the clock and sunrise/sunset times." +
            " To avoid this issue, select the GPS OK button."
          );
          IsTimezoneMismatch = false; // Reset flag after showing warning
          TimezoneWarningShown = true;
        }
      }

      // Update UI fields
      var latString = str(Latitude);
      LatInput.value(latString);
      LatLocal = Latitude;
      LastLat = Latitude;

      var longString = str(Longitude);
      LngInput.value(longString);
      LngLocal = Longitude;
      LastLong = Longitude;

      // Get timezone using existing GeoNames function
      getTzUsingLatLong(Latitude, Longitude, requestId);
    })
    .catch(error => {
      handleIpFallback(requestId, error);
    });
}

// Helper for consistent IP fallback
function handleIpFallback(requestId, error) {
  if (requestId !== LocationFetchSerial) return;
  clearLoadingState();
  exitZenMode(); // Ensure UI is visible to show details of fallback
  console.log("IP geolocation failed:", error);
  console.log("Using fallback location (Melbourne)");

  // Fallback to Melbourne
  Latitude = -37.8;
  Longitude = 144.96;
  TzOffset = 10; // assume DST

  LatLocal = Latitude;
  LngLocal = Longitude;
  TzOffsetLocal = TzOffset;
  LocaleTitleLocal = "Melbourne";
  LocaleTitle = "Melbourne";

  alert("IP-based location detection failed. Defaulting to Melbourne, Australia.");

  var tzString = str(TzOffset);
  if (TzOffset > 0) tzString = "+" + str(TzOffset);
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;
}

// This only runs at startup, see Init() below
function oneTimeInit() {
  // Debug: Check URL hash early
  console.log("🔍 Current URL:", window.location.href);
  console.log("🔍 URL Hash:", window.location.hash);

  // DaySpiral globals declared here.  ------------
  XSpiralArray = [];
  YSpiralArray = [];
  RadiusSpiralArray = [];
  NumSpiralPointsPerTurn = 300;
  NumSpiralTurns = 2;  // must set this in the init
  BkColor = 34; // Default Dark Gray (#222)
  LastMillisec = 0;
  HourDigitColor = color(25, 25, 25); //0xe8, 0xe0, 0x22);

  // DaySpiral state vars.  Preserve these thru window resize.
  IsGmtShown = false; //true; // false; //
  ClockMode = 0;


  // Prepare renderers for each clock type.
  daySpiralRenderer = new DaySpiralRenderer('canvas-container');
  daySpiralRenderer.init();

  mobiusRenderer = new MobiusRenderer('mobius-container');
  mobiusRenderer.init();

  // Select the default renderer and activate it.
  activeRenderer = daySpiralRenderer; // Start with default
  activeRenderer.activate();
  activeRenderer.resize(window.innerWidth, window.innerHeight); // FORCE RESIZE ON STARTUP


  // Overall app initialization ----------------

  // Use this to allow customizing layout for windows vs mobile
  IsWindows = (window.navigator.platform == "Win32");

  // IsDesktop is now calculated in reInit() to support dynamic toggling
  console.log("IsWindows=" + IsWindows);

  // Create canvas and parent it to the container
  var cnv = createCanvas(window.innerWidth, window.innerHeight);
  cnv.parent('canvas-container');

  // Init app-level controllers.
  timeKeeper = new TimeKeeper();
  locManager = new LocationManager();
  locManager.init(); // Minimal init

  // Fetch IP-based location - this is our fallback if no location is found in the URL
  fetchIpLocation();
  // (Location fetch logic moved to end of function to ensure UI is ready)

  // ==== Bind to existing HTML elements ======
  // NOTE: CSS handles all positioning now (responsive design)

  // --- NEW MODAL BUTTONS ---
  select('#btn-about').mousePressed(() => openModal('modal-about'));

  // --- MODAL CLOSE BUTTONS ---
  selectAll('.btn-close-modal').forEach(btn => {
    btn.mousePressed(closeAllModals);
  });

  // --- MODAL SUBMIT BUTTONS ---
  // City search button in the Select Location modal
  var citySrchBtn = select('#btn-city-submit-unified');
  if (citySrchBtn) citySrchBtn.mousePressed(handleCitySubmitUnified);

  // Manual coords submit button
  var coordsSubmitBtn = select('#btn-coords-submit-modal');
  if (coordsSubmitBtn) coordsSubmitBtn.mousePressed(handleCoordsSubmitUnified);

  // Manual Lat/Long button (opens modal-coords)
  var openManualBtn = select('#btn-open-manual');
  if (openManualBtn) openManualBtn.mousePressed(openManualCoordsModal);

  // Your Location button in modal
  var useGpsBtn = select('#btn-use-gps');
  if (useGpsBtn) useGpsBtn.mousePressed(() => { usePreciseLocation(false); closeAllModals(); });

  // --- PRESET MODAL BUTTONS (Unified) ---
  select('#btn-loc-silverado-u').mousePressed(() => { setSilverado(); closeAllModals(); });
  select('#btn-loc-berkeley-u').mousePressed(() => { setBerkeley(); closeAllModals(); });
  select('#btn-loc-sandiego-u').mousePressed(() => { setSanDiego(); closeAllModals(); });
  select('#btn-loc-london-u').mousePressed(() => { setLondon(); closeAllModals(); });
  select('#btn-loc-kc-u').mousePressed(() => { setKansasCity(); closeAllModals(); });
  select('#btn-loc-melbourne-u').mousePressed(() => { setMelbourne(); closeAllModals(); });


  GmtDisplayButtonLabel = "Show GMT";
  GmtDisplayButton = select('#btn-gmt');
  GmtDisplayButton.mousePressed(setGmtDisplay);

  //    Location buttons - Removed old inline buttons, now using unified modal bindings below

  //     Input fields setup - Point to modal inputs
  TzInput = select('#input-tz');
  if (TzInput) TzInput.value("100");

  LatInput = select('#input-lat');
  LngInput = select('#input-lon');

  //    City Name Input
  CityNameInput = select('#city-search-input');
  //    City Submit Button (Unified handled below)

  //    Full Screen Button
  var fsBtn = select('#btn-fullscreen');
  if (fsBtn) {
    fsBtn.mousePressed(toggleFullScreen);
  }

  select('#btn-zen').mousePressed(toggleZenMode);

  // "GPS OK?" Button(s)
  var gpsBtns = [select('#btn-gps-ok'), select('#btn-gps-ok-mobile')];
  gpsBtns.forEach(btn => {
    if (btn) btn.mousePressed(() => {
      // If yellow/warning, it means we want to fetch precise. 
      // If not, maybe just re-fetch?
      usePreciseLocation(false);
    });
  });

  // Setup Button for Day Spiral Clock
  var setupBtn = select('#btn-setup-dayspiral');
  if (setupBtn) setupBtn.mousePressed(() => {
    openModal('modal-setup-dayspiral');
  });

  // DaySpiral Style Buttons
  select('#opt-style-classic').mousePressed(() => setDaySpiralStyle('Classic'));
  select('#opt-style-spiral').mousePressed(() => setDaySpiralStyle('SpiralHours'));

  // DaySpiral Time Format Dropdown
  var timeFormatSelect = select('#select-dayspiral-time-format');
  if (timeFormatSelect) timeFormatSelect.changed(() => {
    const format = timeFormatSelect.value();
    if (daySpiralRenderer) {
      daySpiralRenderer.setTimeFormat(format);
      updateUrlHash();
    }
  });


  // Select Different Location Button
  var selectLocBtn = select('#btn-select-loc');
  if (selectLocBtn) selectLocBtn.mousePressed(() => openModal('modal-select-location'));

  // Location Details Button (opens same details modal)
  var detailsBtn = select('#btn-details-desktop');
  if (detailsBtn) detailsBtn.mousePressed(openDetailsModal);

  // Renderer Switching logic
  select('#opt-dayspiral').mousePressed(() => setClockMode('dayspiral'));
  select('#opt-mobius').mousePressed(() => setClockMode('mobius'));

  // --- MOBIUS SPECIFIC CONTROLS ---
  var btnRotate = select('#btn-rotate');
  if (btnRotate) btnRotate.mousePressed(() => {
    if (mobiusRenderer.active) {
      mobiusRenderer.rotationEnabled = !mobiusRenderer.rotationEnabled;
      if (mobiusRenderer.rotationEnabled) btnRotate.addClass('toggled-on');
      else btnRotate.removeClass('toggled-on');
      // Update URL hash
      updateUrlHash();
    }
  });

  var btnDemo = select('#btn-demo');
  if (btnDemo) btnDemo.mousePressed(() => {
    if (mobiusRenderer.active) {
      mobiusRenderer.fastMode = !mobiusRenderer.fastMode;
      if (mobiusRenderer.fastMode) btnDemo.addClass('toggled-on');
      else btnDemo.removeClass('toggled-on');
      // Update URL hash
      updateUrlHash();
    }
  });

  var btnHideHours = select('#btn-hide-hours');
  if (btnHideHours) btnHideHours.mousePressed(() => {
    if (mobiusRenderer.active) {
      const isVisible = mobiusRenderer.toggleHourNumbers();
      if (isVisible) {
        btnHideHours.addClass('toggled-on');
      } else {
        btnHideHours.removeClass('toggled-on');
      }
      // Update URL hash
      updateUrlHash();
    }
  });

  var btnDali = select('#btn-dali');
  if (btnDali) btnDali.mousePressed(() => {
    if (mobiusRenderer.active) {
      const newState = !mobiusRenderer.daliMode;
      mobiusRenderer.setDaliMode(newState);
      if (newState) btnDali.addClass('toggled-on');
      else btnDali.removeClass('toggled-on');
      updateUrlHash();
    }
  });

  var btnDayNight = select('#btn-day-night');
  if (btnDayNight) btnDayNight.mousePressed(() => {
    if (mobiusRenderer.active) {
      const newState = !mobiusRenderer.dayNightMode;
      mobiusRenderer.setDayNight(newState);
      if (newState) btnDayNight.addClass('toggled-on');
      else btnDayNight.removeClass('toggled-on');
      updateUrlHash();
    }
  });

  var btnSetupMobius = select('#btn-setup-mobius');
  if (btnSetupMobius) btnSetupMobius.mousePressed(() => {
    openModal('modal-setup-mobius');
  });

  // Setup Modal Change Listeners
  var selHours = select('#select-shape-hours');
  if (selHours) selHours.changed(() => {
    mobiusRenderer.setIndicatorShape('hours', selHours.value());
    // Update URL hash
    updateUrlHash();
  });

  var selMinutes = select('#select-shape-minutes');
  if (selMinutes) selMinutes.changed(() => {
    mobiusRenderer.setIndicatorShape('minutes', selMinutes.value());
    // Update URL hash
    updateUrlHash();
  });

  var selSeconds = select('#select-shape-seconds');
  if (selSeconds) selSeconds.changed(() => {
    mobiusRenderer.setIndicatorShape('seconds', selSeconds.value());
    // Update URL hash
    updateUrlHash();
  });

  var selTicks = select('#select-tick-scheme');
  if (selTicks) selTicks.changed(() => {
    mobiusRenderer.setTickScheme(selTicks.value());
    // Update URL hash
    updateUrlHash();
  });

  var selStyle = select('#select-time-style');
  if (selStyle) selStyle.changed(() => {
    mobiusRenderer.setTimeStyle(selStyle.value());
    // Update URL hash
    updateUrlHash();
  });


  // NEW: Unified Modal Bindings
  // City search is already bound above via #btn-city-search

  // PRESET MODAL BINDINGS (Legacy / Other - Keeping class-based for safety if used elsewhere)
  var presetBtns = selectAll('.preset');
  presetBtns.forEach(btn => {
    btn.mousePressed(() => {
      const lat = parseFloat(btn.attribute('data-lat'));
      const lon = parseFloat(btn.attribute('data-lon'));
      const tz = parseFloat(btn.attribute('data-tz'));
      const city = btn.attribute('data-city');

      // Set location
      if (!isNaN(lat)) Latitude = lat;
      if (!isNaN(lon)) Longitude = lon;
      if (!isNaN(tz)) TzOffset = tz;
      if (city) LocaleTitle = city;
      IsUserInitiatedLocation = true;
      IsDisplayingUserLocation = false;

      // Update UI
      if (LatInput && !isNaN(lat)) LatInput.value(str(lat));
      if (LngInput && !isNaN(lon)) LngInput.value(str(lon));
      if (TzInput && !isNaN(tz)) {
        let tzStr = str(tz);
        if (tz > 0) tzStr = '+' + tzStr;
        TzInput.value(tzStr);
      }

      // Recalculate times
      IsSunRiseSetObtained = false;
      updateTimeThisDay();
      updateUrlHash();
      closeAllModals();
    });
  });

  // get local time zone of the user's browser ============.
  // ATTN: by convention, this returns positive value when
  //   it should be negative. Returns minutes, must convert to hours.
  // ATTN: the returned gmt offset takes daylight savings
  //   into account.  

  // Use a constant for the browser's actual local timezone to avoid overwrites
  BrowserTzOffset = (-new Date().getTimezoneOffset()) / 60;

  TzOffset = BrowserTzOffset;
  TzOffsetLocal = BrowserTzOffset;
  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  if (new Date().dst())  // if daylight savings is in effect at browser location
  {
    IsDst = true;
  }
  console.log(">> DST is ", IsDst);

  // init the time zone field on screen
  if (TzInput) {
    TzInput.value(tzString);
  }
  LastTz = TzOffset;

  SecondsSoFar = 0;
  MsFromStartToResetTime = 0;

  CityName = ""
  LocaleTitle = "Local Time"
  PrevLocaleTitle = "";

  // init to unique value to allow detection when set properly
  Latitude = 99999;  // an illegal value
  Longitude = 99999;
  NewLatitude = 99999;
  NewLongitude = 99999;
  LastLat = 99999;
  LastLong = 99999;
  LatLocal = 99999;
  LngLocal = 99999;

  IsTimezoneMismatch = false; // will be set to true if VPN/proxy detected

  stroke(255);  // set white stroke color for lines and fonts

  // init last millisec
  // millis is ms since program started
  // (actually since setup was called, so should be 0 ish)
  LastMillisec = millis();

  // Website link is now in HTML
  WebsiteLink = select('#link-website');

  // Listen for fullscreen change events (ESC key, etc.)
  document.addEventListener("fullscreenchange", onFullScreenChange);
  document.addEventListener("webkitfullscreenchange", onFullScreenChange);
  document.addEventListener("mozfullscreenchange", onFullScreenChange);
  document.addEventListener("MSFullscreenChange", onFullScreenChange);

  // Sync UI with initial state (in case we launched in fullscreen)
  onFullScreenChange();

  // Watchdog to ensure UI stays in sync if events are missed (robust fallback)
  setInterval(onFullScreenChange, 500);

  // ==== Initialize About Modal Content ====
  updateAboutModalContent();

  // ==== Initial Location Fetch (Moved here) ====

  // Parse URL hash. This grabs app settings, clock settings, current clock selection, 
  //    and Location if provided. 
  // Returns true if location is in the URL hash
  var locationFoundInUrlHash = false;
  if (parseUrlHash()) {
    console.log("Location found in URL hash, using it.");
    // parseUrlHash already sets the globals and calls updateTimeThisDay
    locationFoundInUrlHash = true;
  }

  // Apply initial state from URL parameters (clock mode, settings, not location)
  // Must be called after the url hash is parsed.
  applyInitialState();

  // Window.IsDaliMode check removed - handled via applyInitialState

  // The url didn't contain a location. Check if we have location permission? 
  if (!locationFoundInUrlHash && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(function (result) {
      // Logic for initial check
      function checkPerm(state) {
        if (state === 'granted') {
          console.log("Location permission already granted, using precise.");
          usePreciseLocation(true);
        } else if (state === 'prompt') {
          console.log("Location permission prompt, defaulting to IP.");
          fetchIpLocation();
        } else {
          console.log("Location permission denied, defaulting to IP.");
          fetchIpLocation();
        }
      }

      checkPerm(result.state);

      // Listen for permission changes (e.g. user resets permission via URL bar)
      result.onchange = function () {
        console.log("Location permission changed to:", result.state);
        // If it was reset to prompt or denied, we should revert to IP
        if (result.state !== 'granted') {
          // If we were using precise or waiting for it, fall back
          if (IsPreciseLocation || IsRequestingPrecise) {
            console.log("Permission retracted, reverting to IP location.");
            IsRequestingPrecise = false; // Stop any GPS success callback from proceeding
            IsPreciseLocation = false;
            IsUserInitiatedLocation = false; // Back to automatic mode
            NewLatitude = 99999; // Clear any pending fetch flags
            NewLongitude = 99999;

            // Revert to cached local values immediately if we have them
            if (LatLocal !== 99999 && LngLocal !== 99999) {
              console.log("Instantly restoring cached approximate location.");
              Latitude = LatLocal;
              Longitude = LngLocal;
              if (LocaleTitleLocal) LocaleTitle = LocaleTitleLocal;
              IsDisplayingUserLocation = true; // Ensure we are back in local mode

              // Update UI input fields to match restored location
              LatInput.value(str(Latitude));
              LngInput.value(str(Longitude));
              // Note: TzOffset is left as is, getTzUsingLatLong will refresh it if needed
              clearLoadingState(); // Instant revert complete
            } else {
              // If no cache, we have to fetch IP-based location.
              fetchIpLocation();
            }

            // Now update URL and UI (Latitude/Longitude are now local or we are "Finding you...")
            //updateUrlHash(); We no longer update the URL based on user location.
            updateUIElements();

            // Recalculate times to match the restored location
            IsSunRiseSetObtained = false;
            updateTimeThisDay();
          }
        } else {
          // If it was granted (unlikely to happen mid-session without prompt, but possible)
          if (!IsPreciseLocation) {
            usePreciseLocation(true);
          }
        }
      };
    });
    //} else {  // ATTN: we already called this earlier
    //  fetchIpLocation();
  }
}  // end of oneTimeInit()  ====================


// Parse location and state from URL hash
function parseUrlHash() {
  var hash = window.location.hash.substring(1); // remove #
  if (!hash) return false;

  // Expected format: lat=33.743&lon=-117.643&tz=-8&city=Silverado&clock=mobius&...
  // or legacy comma separated: 33.743,-117.643,-8,Silverado

  var params = new URLSearchParams(hash);
  var lat = params.get('lat');
  var lon = params.get('lon');
  var tz = params.get('tz');
  var city = params.get('city');
  var zen = params.get('zen') || params.get('focus');
  var dali = params.get('dali'); // TEST, FINDME

  // Zen mode
  if (zen === '1') {
    IsZenMode = true;
    document.body.classList.add('zen-mode');
    BkColor = 0; // Black
  }

  // Dali mode
  // stored in initialMobiusState below

  // Clock mode - store for later application (after renderers are initialized)
  var clockMode = params.get('clock');
  if (clockMode === 'mobius' || clockMode === 'dayspiral') {
    window._initialClockMode = clockMode;
  }

  // DaySpiral state - store for later application
  var gmt = params.get('gmt');
  if (gmt === '1') {
    window._initialGmtEnabled = true;
  }

  var daySpiralStyle = params.get('daySpiralStyle');
  var daySpiralTimeFormat = params.get('daySpiralTimeFormat');
  if (daySpiralStyle || daySpiralTimeFormat) {
    window._initialDaySpiralState = {
      style: daySpiralStyle || 'Classic',
      timeFormat: daySpiralTimeFormat || '12'
    };
  }

  // Mobius state - store for later application
  // Only parse if we have at least one Mobius parameter
  if (params.has('timeStyle') || params.has('shapeHours') || params.has('rotation') ||
    params.has('demo') || params.has('showHours') || params.has('dali')) {
    window._initialMobiusState = {
      timeStyle: params.get('timeStyle') || 'ampm',
      shapeHours: params.get('shapeHours') || 'outer-ring',
      shapeMinutes: params.get('shapeMinutes') || 'ring',
      shapeSeconds: params.get('shapeSeconds') || 'sphere',
      tickScheme: params.get('tickScheme') || 'standard',
      rotation: params.get('rotation') === '1',
      demo: params.get('demo') === '1',
      showHours: params.get('showHours') !== '0', // Default true
      dali: params.get('dali') === '1',
      dayNight: params.get('dayNight') === '1'
    };
  }

  // Helper to validate coordinate strings from URL
  function isValidCoord(val) {
    if (!val || val === "undefined" || val === "NaN") return false;
    let n = parseFloat(val);
    return !isNaN(n) && n !== 99999;
  }

  // Fallback to comma separated if not key-value
  if (!isValidCoord(lat) && hash.includes(',')) {
    var parts = hash.split(',');
    if (parts.length >= 2) {
      lat = parts[0];
      lon = parts[1];
      tz = parts[2] || null;
      city = parts[3] || null;
    }
  }

  if (isValidCoord(lat) && isValidCoord(lon)) {
    console.log("Parsed URL location:", { lat, lon, tz, city });
    IsUserInitiatedLocation = true; // URL location is intentional (someone shared it)
    Latitude = parseFloat(lat);
    Longitude = parseFloat(lon);

    if (tz !== null) {
      TzOffset = parseFloat(tz);
      var tzString = str(TzOffset);
      if (TzOffset > 0) tzString = "+" + str(TzOffset);
      TzInput.value(tzString);
      LastTz = TzOffset;
    }

    if (city) {
      LocaleTitle = decodeURIComponent(city);
    } else {
      LocaleTitle = "URL Location";
    }

    LatInput.value(Latitude);
    LngInput.value(Longitude);
    LastLat = Latitude;
    LastLong = Longitude;

    // Also update fallback variables so any error handling doesn't override URL location
    LatLocal = Latitude;
    LngLocal = Longitude;
    if (tz !== null) {
      TzOffsetLocal = TzOffset;
    }
    LocaleTitleLocal = LocaleTitle;

    IsPreciseLocation = true; // Treating URL location as precise/intentional
    IsTimezoneMismatch = false;

    // Recalculate everything
    IsSunRiseSetObtained = false;
    updateTimeThisDay();
    return true;
  }

  return false;
}

// Apply initial state from URL parameters (called after renderers are initialized)
function applyInitialState() {
  console.log("🎨 Applying initial state from URL parameters...");

  // Apply clock mode if specified
  if (window._initialClockMode) {
    console.log("  📍 Applying clock mode:", window._initialClockMode);
    setClockMode(window._initialClockMode);
    delete window._initialClockMode; // Clean up
  }

  // Apply DaySpiral GMT state if specified (regardless of active renderer)
  if (window._initialGmtEnabled) {
    console.log("  🌍 Enabling GMT display");
    const gmtBtn = select('#btn-gmt');
    if (gmtBtn) {
      // Directly set the state without checking active renderer
      if (!gmtBtn.hasClass('toggled-on')) {
        // Manually apply the GMT state
        IsGmtShown = true;
        GmtDisplayButtonLabel = "Hide GMT";
        gmtBtn.html(GmtDisplayButtonLabel);
        gmtBtn.addClass('toggled-on');
      }
    }
    delete window._initialGmtEnabled; // Clean up
  }

  // Apply DaySpiral state if specified (regardless of active renderer)
  if (window._initialDaySpiralState) {
    console.log("  ⚙️ Applying DaySpiral settings:", window._initialDaySpiralState);
    const state = window._initialDaySpiralState;

    if (state.style) {
      daySpiralRenderer.setStyle(state.style);
      // UI Feedback (active class) is handled globally in updateUIElements()

      const btnGmt = select('#btn-gmt');
      if (state.style === 'Classic') {
        if (btnGmt) btnGmt.show();
      } else {
        // Hide GMT button in SpiralHours mode
        if (btnGmt) btnGmt.hide();
      }
    }

    if (state.timeFormat) {
      daySpiralRenderer.setTimeFormat(state.timeFormat);
      const selTimeFormat = select('#select-dayspiral-time-format');
      if (selTimeFormat) selTimeFormat.value(state.timeFormat);
    }

    delete window._initialDaySpiralState; // Clean up
  }

  // Apply Mobius state if specified (regardless of active renderer)
  if (window._initialMobiusState) {
    console.log("  ⚙️ Applying Mobius settings:", window._initialMobiusState);
    const state = window._initialMobiusState;

    // Apply time style
    if (state.timeStyle) {
      mobiusRenderer.setTimeStyle(state.timeStyle);
      const selStyle = select('#select-time-style');
      if (selStyle) selStyle.value(state.timeStyle);
    }

    // Apply indicator shapes
    if (state.shapeHours) {
      mobiusRenderer.setIndicatorShape('hours', state.shapeHours);
      const selHours = select('#select-shape-hours');
      if (selHours) selHours.value(state.shapeHours);
    }
    if (state.shapeMinutes) {
      mobiusRenderer.setIndicatorShape('minutes', state.shapeMinutes);
      const selMinutes = select('#select-shape-minutes');
      if (selMinutes) selMinutes.value(state.shapeMinutes);
    }
    if (state.shapeSeconds) {
      mobiusRenderer.setIndicatorShape('seconds', state.shapeSeconds);
      const selSeconds = select('#select-shape-seconds');
      if (selSeconds) selSeconds.value(state.shapeSeconds);
    }

    // Apply tick scheme
    if (state.tickScheme) {
      mobiusRenderer.setTickScheme(state.tickScheme);
      const selTicks = select('#select-tick-scheme');
      if (selTicks) selTicks.value(state.tickScheme);
    }

    // Apply rotation state
    if (state.rotation !== undefined) {
      mobiusRenderer.rotationEnabled = state.rotation;
      const btnRotate = select('#btn-rotate');
      if (btnRotate) {
        if (state.rotation) btnRotate.addClass('toggled-on');
        else btnRotate.removeClass('toggled-on');
      }
    }

    // Apply demo/fast mode
    if (state.demo !== undefined) {
      mobiusRenderer.fastMode = state.demo;
      const btnDemo = select('#btn-demo');
      if (btnDemo) {
        if (state.demo) btnDemo.addClass('toggled-on');
        else btnDemo.removeClass('toggled-on');
      }
    }

    // Apply hour visibility
    if (state.showHours !== undefined) {
      mobiusRenderer.hoursVisible = state.showHours;
      const btnHideHours = select('#btn-hide-hours');
      if (btnHideHours) {
        if (state.showHours) {
          btnHideHours.addClass('toggled-on');
        } else {
          btnHideHours.removeClass('toggled-on');
        }
      }
    }

    // Apply Dali mode
    if (state.dali !== undefined) {
      mobiusRenderer.setDaliMode(state.dali);
      const btnDali = select('#btn-dali');
      if (btnDali) {
        if (state.dali) btnDali.addClass('toggled-on');
        else btnDali.removeClass('toggled-on');
      }
    }

    // Apply Day/Night mode
    if (state.dayNight !== undefined) {
      mobiusRenderer.setDayNight(state.dayNight);
      const btnDayNight = select('#btn-day-night');
      if (btnDayNight) {
        if (state.dayNight) btnDayNight.addClass('toggled-on');
        else btnDayNight.removeClass('toggled-on');
      }
    }

    delete window._initialMobiusState; // Clean up
  }

  console.log("  ✅ Initial state applied");
  updateUrlHash(); // Ensure URL reflects all applied state
}

// Update URL hash with current state
function updateUrlHash() {
  console.log("🔗 updateUrlHash() called");

  // Use URLSearchParams to preserve non-state parameters (like #testvpn)
  var currentHash = window.location.hash.substring(1);
  var params = new URLSearchParams(currentHash);

  // Clear managed parameters to re-add them based on current state
  const managedKeys = [
    'lat', 'lon', 'tz', 'city', 'zen', 'focus', 'clock', 'gmt',
    'daySpiralStyle', 'daySpiralTimeFormat',
    'timeStyle', 'shapeHours', 'shapeMinutes', 'shapeSeconds',
    'tickScheme', 'rotation', 'demo', 'showHours', 'dali', 'dayNight'
  ];
  managedKeys.forEach(key => params.delete(key));

  // PRIVACY-FIRST LOCATION HANDLING:
  // Only include location if it was MANUALLY SELECTED (preset/city/manual entry)
  // Do NOT include user's current location (GPS or IP-based)
  if (!IsDisplayingUserLocation && Latitude !== 99999 && Longitude !== 99999 &&
    !isNaN(Latitude) && !isNaN(Longitude)) {
    var city = LocaleTitle || "";
    // Don't include generic location names
    if (city === "Precise Location" || city === "Approximate Location" || city === "URL Location") {
      city = "";
    }

    params.set('lat', Latitude);
    params.set('lon', Longitude);
    params.set('tz', TzOffset);
    if (city) {
      params.set('city', city);
    }
    console.log("  📍 Including manually-selected location in URL");
  } else if (IsDisplayingUserLocation) {
    console.log("  🔒 Privacy: Not including user's current location in URL");
  }

  // Zen mode
  if (IsZenMode) {
    params.set('zen', '1');
  }

  // Clock mode
  if (typeof activeRenderer !== 'undefined' && typeof mobiusRenderer !== 'undefined') {
    if (activeRenderer === mobiusRenderer) {
      params.set('clock', 'mobius');
    } else {
      params.set('clock', 'dayspiral');
    }
  }

  // DaySpiral-specific state
  if (typeof daySpiralRenderer !== 'undefined') {
    const gmtBtn = select('#btn-gmt');
    if (gmtBtn && gmtBtn.hasClass('toggled-on')) {
      params.set('gmt', '1');
    }

    // Add DaySpiral style
    if (daySpiralRenderer.style && daySpiralRenderer.style !== 'Classic') {
      params.set('daySpiralStyle', daySpiralRenderer.style);
    }

    // Add DaySpiral time format
    if (daySpiralRenderer.timeFormat && daySpiralRenderer.timeFormat !== '12') {
      params.set('daySpiralTimeFormat', daySpiralRenderer.timeFormat);
    }
  }

  // Mobius-specific state
  if (typeof mobiusRenderer !== 'undefined') {
    if (mobiusRenderer.timeStyle !== 'ampm') {
      params.set('timeStyle', mobiusRenderer.timeStyle);
    }
    if (mobiusRenderer.indicatorShapes.hours !== 'outer-ring') {
      params.set('shapeHours', mobiusRenderer.indicatorShapes.hours);
    }
    if (mobiusRenderer.indicatorShapes.minutes !== 'ring') {
      params.set('shapeMinutes', mobiusRenderer.indicatorShapes.minutes);
    }
    if (mobiusRenderer.indicatorShapes.seconds !== 'sphere') {
      params.set('shapeSeconds', mobiusRenderer.indicatorShapes.seconds);
    }
    if (mobiusRenderer.tickScheme !== 'standard') {
      params.set('tickScheme', mobiusRenderer.tickScheme);
    }
    if (mobiusRenderer.rotationEnabled !== false) {
      params.set('rotation', '1');
    }
    if (mobiusRenderer.fastMode !== false) {
      params.set('demo', '1');
    }
    if (mobiusRenderer.hoursVisible !== true) {
      params.set('showHours', '0');
    }
    if (mobiusRenderer.daliMode === true) {
      params.set('dali', '1');
    }
    if (mobiusRenderer.dayNightMode === true) {
      params.set('dayNight', '1');
    }
  }

  var hash = params.toString().replace(/=(&|$)/g, '$1');
  console.log("  📝 Generated hash (refined):", hash);

  // Update URL without triggering hashchange
  var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  if (hash) {
    newUrl += "#" + hash;
  } else {
    console.log("  🧹 Hash is empty, clearing URL hash");
  }

  console.log("  🌐 Final URL:", newUrl);
  window.history.replaceState({ path: newUrl }, '', newUrl);
  console.log("  ✅ URL updated successfully");
}

// Helper to check fullscreen state across browsers
// Helper to check fullscreen state across browsers
function isFullScreen() {
  // Check standard Fullscreen API
  var std = document.fullscreenElement;
  var webkit = document.webkitFullscreenElement;
  var moz = document.mozFullScreenElement;
  var ms = document.msFullscreenElement;

  var hasElement = (std || webkit || moz || ms) != null;

  // Check for our custom iOS fixes
  if (!hasElement && document.body.classList.contains('ios-fullscreen-fix')) {
    return true;
  }

  return hasElement;
}


// Toggle Full Screen Mode
function toggleFullScreen() {
  // Detect iOS (iPhone/iPad)
  // Note: iPad can report as Macintosh if 'Request Desktop Website' is on, 
  // but checking maxTouchPoints helps distinguish.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    if (document.body.classList.contains('ios-fullscreen-fix')) {
      // Turn OFF
      document.body.classList.remove('ios-fullscreen-fix');
      window.scrollTo(0, 0); // Reset scroll
    } else {
      // Turn ON
      document.body.classList.add('ios-fullscreen-fix');
      // Prompt user
      alert("Swipe UP to hide the address bar.");
      // Attempt to help scrolling
      setTimeout(() => window.scrollTo(0, 1), 100);
    }
    // Force UI update since no 'fullscreenchange' event fires for class changes
    onFullScreenChange();
  } else {
    // Standard Desktop/Android
    var fs = isFullScreen();
    fullscreen(!fs);
  }
}

// Handle fullscreen change events (from button or ESC key)
// NOTE: This is called both when we transition into and out of full screen mode, plus
//  every 500 ms as a watchdog
function onFullScreenChange(e) {
  // Check if we are currently in full screen mode
  // Use robust helper to be sure
  var fs = isFullScreen();

  // Update button text based on new state
  var fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) {
    // transition to/from full screen mode
    fsBtn.textContent = fs ? 'Exit Full Screen' : 'Full Screen';


  }






  // Toggle the active class for visual feedback
  if (fsBtn) {
    if (fs) {
      fsBtn.classList.add('toggled-on');
      fsBtn.classList.remove('fs-highlight-pulse'); // Clear attention cue if we are now in FS
    } else {
      fsBtn.classList.remove('toggled-on');
    }
  }
  WasFullScreenLastCheck = fs; // save state for next check
}

// Update HTML UI elements with current data
function updateUIElements() {
  // Update title based on mode
  var titleEl = document.getElementById('app-title');
  var versionEl = document.getElementById('app-version');
  var descEl = document.getElementById('app-description');

  if (versionEl) {
    let verOnly = APP_VERSION.split(' ')[0]; // e.g. "v0.4.3"
    versionEl.textContent = 'CoolweirdClocks ' + verOnly;
  }

  var locationWarning = (!IsPreciseLocation) ?
    'Approx location is used to estimate sunrise/set times; approve GPS for more accuracy.' : '';

  if (typeof activeRenderer !== 'undefined' && typeof mobiusRenderer !== 'undefined' && activeRenderer === mobiusRenderer) {
    if (titleEl) titleEl.textContent = 'Mobius Clock';
    // Show condensed Mobius description for desktop
    var mobiusDescText = 'A Mobius strip shows 24-hour time on a 12-hour face. ' +
      'The hour indicator makes 2 full turns to return to its starting point.';
    if (locationWarning) mobiusDescText += ' ' + locationWarning;
    if (descEl) descEl.textContent = mobiusDescText;
  } else {
    if (titleEl) titleEl.textContent = 'Day Spiral Clock';
    var descText = 'To show night and day you need a 24-hour clock; ' +
      'using a spiral is a way to squeeze 24 hours into a 12-hour clock face. ';
    if (locationWarning) descText += locationWarning;
    if (descEl) descEl.textContent = descText;
  }

  // About modal text is now static and set in oneTimeInit()


  // Update locale title
  var localeEl = document.getElementById('locale-title');
  if (localeEl) {
    if (IsLoadingLocation) {
      // Check for mobile portrait mode to use shorter string
      if (!IsDesktop && window.innerHeight > window.innerWidth) {
        localeEl.textContent = "Loading...";
      } else {
        localeEl.textContent = "Loading Location...";
      }
    } else {
      localeEl.textContent = LocaleTitle;
    }
  }

  // NEW: Update Location Description (Desktop)
  var locDescEl = document.getElementById('location-description');
  if (locDescEl) {
    if (IsLoadingLocation) {
      locDescEl.textContent = "Finding you...";
    } else {
      locDescEl.textContent = LocaleTitle;
    }
  }

  // Update time display
  var timeEl = document.getElementById('time-display');
  if (timeEl) {
    if (IsLoadingLocation) {
      // keep empty or show dots?
    } else if (TimeString) {
      timeEl.textContent = TimeString;
    }
  }

  // NEW: Large Time Display
  var timeLargeEl = document.getElementById('time-display-large');
  if (timeLargeEl) {
    if (IsLoadingLocation) {
      timeLargeEl.textContent = "..."; // Blank out or show placeholder during loading
    } else if (TimeString) {
      // Calculate target time based on Time Zone Offset difference
      let now = new Date();
      // TzOffset and TzOffsetLocal are in hours.
      let localTz = (typeof BrowserTzOffset !== 'undefined') ? BrowserTzOffset : TzOffsetLocal;
      let offsetDiffHours = TzOffset - localTz;
      let targetTime = new Date(now.getTime() + (offsetDiffHours * 3600000));

      let h = targetTime.getHours();
      let m = targetTime.getMinutes();
      let s = targetTime.getSeconds();

      let ampm = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      h12 = h12 ? h12 : 12; // hour '0' should be '12'

      let mStr = nf(m, 2, 0); // Use p5 nf() for zero padding
      let sStr = nf(s, 2, 0);

      let formattedTime = `${h12}:${mStr}:${sStr} ${ampm}`;

      timeLargeEl.textContent = formattedTime;

      // Also update mobile time display
      if (timeEl) timeEl.textContent = formattedTime;

    } else { // Fallback if TimeString is not available or loading
      timeLargeEl.textContent = TimeString;
    }
  }

  // NEW: Update GPS OK Button(s) State
  // We only show the button when we are in user location mode but NOT YET precise.
  var gpsBtnDesktop = document.getElementById('btn-gps-ok');
  var gpsBtnMobile = document.getElementById('btn-gps-ok-mobile');
  [gpsBtnDesktop, gpsBtnMobile].forEach(btn => {
    if (btn) {
      if (IsDisplayingUserLocation && !IsPreciseLocation) {
        // Show button (yellow) if we are in user mode but don't have GPS yet
        btn.classList.add('gps-show');
        btn.classList.add('warning-bg');
      } else {
        // Hide if looking at a manual/preset location OR if already precise
        if (btn.classList.contains('gps-show')) {
          console.log(`Hiding GPS button. IsDisplayingUserLocation=${IsDisplayingUserLocation}, IsPreciseLocation=${IsPreciseLocation}`);
        }
        btn.classList.remove('warning-bg');
        btn.classList.remove('gps-show');
      }
    }
  });

  // Update date display
  var dateEl = document.getElementById('date-display');
  if (dateEl && DateString) {
    dateEl.textContent = DateString;
  }

  // Update day of week display
  var dayEl = document.getElementById('day-display');
  if (dayEl && typeof IDow !== 'undefined') {
    dayEl.textContent = getDayStringLong(IDow);
  }

  // Update live time/date in details modal if open
  var modalTimeEl = document.getElementById('modal-time-display');
  if (modalTimeEl && TimeString) {
    modalTimeEl.textContent = TimeString + (IsAM ? ' AM' : ' PM');
  }
  var modalDateEl = document.getElementById('modal-date-display');
  if (modalDateEl && DateString) {
    modalDateEl.textContent = DateString;
  }

  // Update DST display
  var dstEl = document.getElementById('dst-display');
  if (dstEl && Latitude != 99999 && Longitude != 99999) {
    dstEl.textContent = 'Daylight Savings: ' + (IsDst ? 'Yes' : 'No');
  }

  // Update sunrise/sunset display
  var sunriseEl = document.getElementById('sunrise-display');
  var sunsetEl = document.getElementById('sunset-display');
  if (sunriseEl && sunsetEl) {
    if (SunriseHour >= 0) {
      sunriseEl.textContent = 'Sunrise: ' + SunriseHourString + ':' + SunriseMinString + SunriseAmpmString;
      sunsetEl.textContent = 'Sunset: ' + SunsetHourString + ':' + SunsetMinString + SunsetAmpmString;
    } else if (SunriseHour == -2) {
      sunriseEl.textContent = 'Light All Day';
      sunsetEl.textContent = '';
    } else if (SunriseHour == -1) {
      sunriseEl.textContent = 'Dark All Day';
      sunsetEl.textContent = '';
    } else {
      sunriseEl.textContent = '';
      sunsetEl.textContent = '';
    }
  }


  // Update Zen Mode button labels
  var zenBtn = document.getElementById('btn-zen');
  var label = IsZenMode ? "Show Interface" : "Zen";

  if (zenBtn) zenBtn.textContent = label;

  // Update Clock Selector Highlighting
  var optSpiral = select('#opt-dayspiral');
  var optMobius = select('#opt-mobius');
  if (activeRenderer === daySpiralRenderer) {
    if (optSpiral) optSpiral.addClass('active');
    if (optMobius) optMobius.removeClass('active');
  } else {
    if (optSpiral) optSpiral.removeClass('active');
    if (optMobius) optMobius.addClass('active');
  }

  // Update DaySpiral Style Selector Highlighting
  var optClassic = select('#opt-style-classic');
  var optSpiralHours = select('#opt-style-spiral');
  if (daySpiralRenderer && daySpiralRenderer.style === 'Classic') {
    if (optClassic) optClassic.addClass('active');
    if (optSpiralHours) optSpiralHours.removeClass('active');
  } else {
    if (optClassic) optClassic.removeClass('active');
    if (optSpiralHours) optSpiralHours.addClass('active');
  }
}

// --- LOADING STATE HELPER FUNCTIONS ---
function setLoadingState() {
  IsLoadingLocation = true;
  IsSunRiseSetObtained = false; // Force recalc when done
}

function clearLoadingState() {
  IsLoadingLocation = false;
  // Note: IsSunRiseSetObtained will be handled by updateTimeThisDay() eventually
}

// --- MODAL FUNCTIONS ---

function openModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(modalId).classList.remove('hidden');
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));
  // Clear errors
  var errEl = document.getElementById('city-error-msg');
  if (errEl) errEl.textContent = '';
}

// --- Readme Modal Helper ---
window.showReadme = function () {
  openModal('modal-readme');
  var readmeContentEl = document.getElementById('readme-content');
  readmeContentEl.innerHTML = '<p>Loading README...</p>';

  // Fetch from local README.md
  fetch('README.md')
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch README.md');
      return response.text();
    })
    .then(text => {
      // Use marked to parse the markdown
      if (typeof marked !== 'undefined') {
        readmeContentEl.innerHTML = marked.parse(text);
      } else {
        readmeContentEl.innerHTML = '<pre style="white-space: pre-wrap; color: black;">' + text + '</pre>';
      }
    })
    .catch(error => {
      console.error('Error loading README:', error);
      readmeContentEl.innerHTML = '<p style="color: red;">Error loading README.md. Please check your internet connection or try again later.</p>';
    });
};


// --- Helper for Manual Coords Modal ---
function openManualCoordsModal() {
  // Populate fields with current values if available
  var latField = select('#input-lat');
  var lngField = select('#input-lon');
  var tzField = select('#input-tz');

  if (typeof Latitude !== 'undefined' && Latitude != 99999) latField.value(Latitude);
  else latField.value('');

  if (typeof Longitude !== 'undefined' && Longitude != 99999) lngField.value(Longitude);
  else lngField.value('');

  if (typeof TimeZone !== 'undefined' && TimeZone != 99999) tzField.value(TimeZone);
  else {
    // try global TzOffset
    if (typeof TzOffset !== 'undefined') {
      var tzString = str(TzOffset);
      if (TzOffset > 0) {
        tzString = "+" + str(TzOffset);
      }
      tzField.value(tzString);
    } else {
      tzField.value('');
    }
  }

  openModal('modal-coords');
  select('#coords-error-msg').html(''); // Clear error message when opening
}

// Open the details modal and populate with live data
function openDetailsModal() {
  var content = document.getElementById('details-content');

  if (content) {
    // Generate Time Zone String
    var tzStr = (TzOffset >= 0 ? "+" : "") + TzOffset;
    var dstStr = (typeof IsDst !== 'undefined') ? (IsDst ? "Active" : "Standard Time") : "Unknown";

    // 2-Column Grid Layout
    content.innerHTML = `
      <div class="details-grid">
        <!-- Column 1: Time & Date -->
        <div class="details-column">
          <p>
            <span class="label">Time</span>
            <span class="value" id="modal-time-display">${TimeString} ${IsAM ? 'AM' : 'PM'}</span>
          </p>
          <p>
            <span class="label">Date</span>
            <span class="value" id="modal-date-display">${DateString}</span>
          </p>
          <p>
            <span class="label">Sunrise</span>
            <span class="value">${getFormattedTime(SunriseHour, SunriseMin)}</span>
          </p>
          <p>
            <span class="label">Sunset</span>
            <span class="value">${getFormattedTime(SunsetHour, SunsetMin)}</span>
          </p>
        </div>

        <!-- Column 2: Location Data -->
        <div class="details-column">
          <p>
            <span class="label">City</span>
            <span class="value">${LocaleTitle}</span>
          </p>
          <p>
            <span class="label">Lat / Lng</span>
            <span class="value">${nfc(Latitude, 2)}, ${nfc(Longitude, 2)}</span>
          </p>
          <p>
            <span class="label">Time Zone</span>
            <span class="value">GMT ${tzStr}</span>
          </p>
           <p>
            <span class="label">DST</span>
            <span class="value">${dstStr}</span>
          </p>
        </div>
      </div>
    `;
  }
  openModal('modal-details');
}

// Helper to format HH:MM for sunrise/sunset display
function getFormattedTime(h, m) {
  if (h == -1) return "Always Light (Midnight Sun)";
  if (h == -2) return "Always Dark";

  let ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  h12 = h12 ? h12 : 12;
  let mStr = nf(m, 2, 0);
  return `${h12}:${mStr} ${ampm}`;
}

function handleCitySubmitModal() {
  PrevLocaleTitle = LocaleTitle; // Capture for error reversion
  var city = select('#input-city-modal').value().trim();
  var errEl = select('#city-error-msg');
  errEl.html('Searching...'); // Use .html() for p5 element or .textContent for vanilla
  setLoadingState();


  if (city && city.length > 0) {
    var url = `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;

    // Use p5.js loadJSON instead of fetch to avoid CORS and ensure consistency
    loadJSON(url, gotCityLocationDataModal, handleNetworkError);
  } else {
    errEl.html("Please enter a city name.");
  }
}

// Callback for mobile modal city lookup
function gotCityLocationDataModal(data) {
  var errEl = select('#city-error-msg');

  if (data && data.length > 0) {
    // Success
    IsUserInitiatedLocation = true; // User entered city via modal
    var lat = parseFloat(data[0].lat);
    var lon = parseFloat(data[0].lon);
    Latitude = round(lat, 3);
    Longitude = round(lon, 3);

    CityNameInput.value(''); // Clear the main input
    select('#input-city-modal').value(''); // Clear the modal input
    LocaleTitle = data[0].display_name.split(',')[0];

    // Update other state
    LatLocal = Latitude;
    LngLocal = Longitude;
    LatInput.value(str(Latitude));
    LngInput.value(str(Longitude));

    getTzUsingLatLong(Latitude, Longitude); // This updates TZ and closes loop
    closeAllModals();
  } else {
    clearLoadingState();
    errEl.html("City not found. Please try 'City, Country'.");
  }
}

function handleCoordsSubmitModal() {
  var latVal = select('#input-lat-modal').value().trim();
  var lngVal = select('#input-lng-modal').value().trim();
  var tzVal = select('#input-tz-modal').value().trim();
  var errEl = select('#coords-error-msg');
  errEl.html('');

  var lat = parseFloat(latVal);
  var lng = parseFloat(lngVal);
  var tz = parseFloat(tzVal);

  if (latVal === "" || isNaN(lat) || lat < -90 || lat > 90) {
    errEl.html("Invalid Latitude: must be between -90 and 90.");
    return;
  }
  if (lngVal === "" || isNaN(lng) || lng < -180 || lng > 180) {
    errEl.html("Invalid Longitude: must be between -180 and 180.");
    return;
  }
  if (tzVal === "" || isNaN(tz) || tz < -13 || tz > 13) {
    errEl.html("Invalid Time Zone: must be between -13 and 13.");
    return;
  }

  // If we get here, all are valid
  IsUserInitiatedLocation = true; // User manually entered coordinates
  Latitude = lat;
  Longitude = lng;
  TzOffset = tz;

  // Update globals
  LatLocal = Latitude;
  LngLocal = Longitude;
  TzOffsetLocal = TzOffset;
  LastTz = TzOffset;

  // Update main UI inputs to match
  LatInput.value(str(Latitude));
  LngInput.value(str(Longitude));
  TzInput.value(str(TzOffset));

  // Create descriptive title for mobile context
  var tzStr = str(TzOffset);
  if (TzOffset > 0) tzStr = "+" + tzStr;

  LocaleTitle = "Lat:" + nfc(Latitude, 2) + " Lng:" + nfc(Longitude, 2) + " TZ:" + tzStr;
  updateTimeThisDay();
  closeAllModals();
}



//============================================================================
//============ Primary Entry Point ===========================================
//
function setup() {
  oneTimeInit();  // init that is not redone on window resize

  reInit();  // all init that must be redone on window resize

  //======================= UPDATE time vars ====================
  updateTimeThisDay();  // sets baseMs and MsFromStartToResetTime

  //document.cookie = "a cookie"

  // NOTE: we can't update the sunrise/sunset times here
  // because the call to navigator.geolocation.getCurrentPosition()
  // has not yet happened.  Must do it later in updateTimeThisDay()
  // after we have the lat/long.
}
//==========================================================================



//==================================================
// This is run at startup and also when window size changes
function reInit() {
  // Update environment state
  // Mobile/Compact mode is width <= 950 OR height <= 600.
  // Desktop/Regular mode is width > 950 AND height > 600.
  IsDesktop = (window.innerWidth > 950) && (window.innerHeight > 600);
  console.log("📐 reInit: IsDesktop=" + IsDesktop + " Width=" + window.innerWidth + " Height=" + window.innerHeight);

  // On phones, height looks ok, but width is too big
  TheHeight = window.innerHeight; //*0.8; //height * 0.7;
  TheWidth = window.innerWidth; //*0.9; //width * 0.7;

  var smallerDim = min(TheWidth, TheHeight);
  var radius = smallerDim / 2;

  SecondsRadius = radius * 0.73;
  MinutesRadius = radius * 0.7
  HoursRadius = radius * 0.44;
  ClockDiameter = radius * 1.78;

  // radius to centers of numbers
  HourNumbersRadius = radius * 0.83;
  InnerFaceRadius = HourNumbersRadius * 0.93;

  CenterX = TheWidth / 2;  // center
  CenterY = TheHeight / 2; // center

  genSpiral();  // pre-calc arrays used to size and position the spiral.
  // Above call depends on current CenterX/Y, nSpiralTurns, etc. 

  RefFontSize = 40;
  FontScaleFactor = smallerDim / 950; //240;

  CurrentFontSize = RefFontSize;

  // NOTE: Button and field positioning is now handled by CSS (responsive design)
  // No more .position() calls needed here

  // --- Fullscreen Attention Cue Logic ---
  // Mobile Landscape is when we are in compact/mobile mode AND width > height
  var isLandscape = (window.innerWidth > window.innerHeight);
  var isMobileLandscape = (!IsDesktop && isLandscape);

  if (isMobileLandscape && !WasMobileLandscapeLastCheck) {
    // We just transitioned into mobile landscape.
    // If not already in fullscreen, draw attention to the button.
    if (!isFullScreen()) {
      var fsBtn = document.getElementById('btn-fullscreen');
      if (fsBtn) {
        console.log("🔦 Triggering Fullscreen Attention Cue");
        // Remove class first to allow restart if they rotate back and forth quickly
        fsBtn.classList.remove('fs-highlight-pulse');
        // Force reflow to restart animation
        void fsBtn.offsetWidth;
        fsBtn.classList.add('fs-highlight-pulse');
      }
    }
  } else if (!isMobileLandscape || isFullScreen()) {
    // If we leave mobile landscape or we enter fullscreen, clear the highlight
    var fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.classList.remove('fs-highlight-pulse');
    }
  }

  // Update tracking var
  // We only track the transition when NOT in fullscreen to avoid loop glitches
  if (!isFullScreen()) {
    WasMobileLandscapeLastCheck = isMobileLandscape;
  }
}    // End of reInit()  ============================================



//======   Extend the Date object to allow detection of daylight savings. ======

// This compares january to july tz offsets to see which is largest; that will be 
// the non-dst (std) offset
Date.prototype.stdTimezoneOffset = function () {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

// Since timezone offset gets smaller during dst, can determine if dst in effect
Date.prototype.dst = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset();
}



//******************************************
// Resize the canvas when the
// browser's size changes.
//BUG NOTES: on resize, the pre-resize buttons remain active, while new active ones are 
//  created. A whole stack of functional working buttons
//  Looks like new code in Initialize is not successfully destroing the old buttons.
function windowResized() {
  console.log("Resize Detected;")
  resizeCanvas(window.innerWidth, window.innerHeight);

  if (activeRenderer) {
    activeRenderer.resize(window.innerWidth, window.innerHeight);
  }

  reInit();
  // Ensure fullscreen UI is synced on resize (often triggered by FS toggle)
  onFullScreenChange();
}
//*************************/




//=========================================================
// Generate the spiral arrays: radii, x-coords, and y-coords.
// The startFrac refers to the inner end of the spiral, as a 
//  fraction of the distance from center to the nearest edge
//  of the usable window. endFrac is the outer end.
function genSpiral() //III
{
  let startFrac = 0.1;
  let endFrac = 0.72;

  // Always Day Spiral settings
  startFrac = 0.24;
  endFrac = 0.6;

  var smallerDim = CenterX;
  if (CenterX > CenterY) {
    smallerDim = CenterY;
  }

  var startRadius = smallerDim * startFrac;
  var endRadius = smallerDim * endFrac;
  var nTurns = NumSpiralTurns; //2 per day! //wc4 // ==240123a
  var deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;

  // Set proportional stroke weights:
  // Main spiral weight is 2/3 of the distance between turns (deltaRadiusPerTurn)
  // This maintains a 2:1 ratio of spiral width to the gap between turns.
  SpiralStrokeWeight = deltaRadiusPerTurn * 0.66;
  // Secondary weight (for GMT lines, hands) is scaled proportionally
  SpiralStrokeWeightSecondary = SpiralStrokeWeight * 0.33;

  // Proportional font size for text on the spiral (DOW, GMT)
  // Set to roughly 2/3 of the spiral width for comfort
  SpiralFontSize = SpiralStrokeWeight * 0.66;

  console.log("🌀 Spiral Weights: Primary=" + nfc(SpiralStrokeWeight, 1) + " Secondary=" + nfc(SpiralStrokeWeightSecondary, 1) + " FontSize=" + nfc(SpiralFontSize, 1));

  // NOTE use of <= below, so the array lengths are 1+NumSpiralPointsPerTurn*nTurns
  for (var ii = 0; ii <= NumSpiralPointsPerTurn * nTurns; ii++) {
    var iiRadians = TWO_PI * (ii / NumSpiralPointsPerTurn) - HALF_PI;
    // example, for nTurns==2, iiRadians varies from -pi/2 to (4pi - pi/2), 2 full turns.
    // THe -pi/2 corrects the rotation so the spiral starts from the top rather than the right.
    var radius = endRadius - deltaRadiusPerTurn * (ii / NumSpiralPointsPerTurn);
    RadiusSpiralArray[ii] = radius;
    XSpiralArray[ii] = radius * cos(iiRadians);
    YSpiralArray[ii] = radius * sin(iiRadians);
  }


}

// Short label for the 7 days of the week.
// Wraps around to sunday (s) for dow==7.
function getDayStringShort(dow) // range 0-6
{
  //III
  var dayString = "s";
  switch (dow) {
    case 0:
      dayString = "s";
      break;
    case 1:
      dayString = "m";
      break;

    case 2:
      dayString = "tu";
      break;

    case 3:
      dayString = "w";
      break;

    case 4:
      dayString = "th";
      break;

    case 5:
      dayString = "f";
      break;

    case 6:
      dayString = "sa";
      break;

    default:
      dayString = "s";
      break;
  }
  return dayString;
}


//==========================================
// Long label for the 7 days of the week
// Wraps around to sunday for dow==7.
function getDayStringLong(dow) // range 0-6
{
  //III
  var dayString = "Sunday";
  switch (dow) {
    case 0:
      dayString = "Sunday";
      break;
    case 1:
      dayString = "Monday";
      break;

    case 2:
      dayString = "Tuesday";
      break;

    case 3:
      dayString = "Wednesday";
      break;

    case 4:
      dayString = "Thursday";
      break;

    case 5:
      dayString = "Friday";
      break;

    case 6:
      dayString = "Saturday";
      break;

    default:
      dayString = "Sunday";
      break;
  }
  return dayString;
}


//==============================================================
function calcSunRiseSet() {
  // calc sunrise
  calcRiseSetTimeWithOffset(
    true,  // calc sunrise
    0,
    Latitude,
    -Longitude,
    TzOffset,
    false);  // always set dst false since Tz offset takes dst into acct

  SunriseHour = OutputHour;
  SunriseMin = OutputMin;

  if (SunriseHour >= 0) {
    SecondsToSunrise = SunriseMin * 60 + SunriseHour * 3600;
    BaseMsSunrise = SecondsToSunrise * 1000;
  }
  else {
    SecondsToSunrise = SunriseHour;
    BaseMsSunrise = SunriseHour;  // -1 no day -2 no night  
  }

  // calc sunset
  calcRiseSetTimeWithOffset(
    false,  // calc sunset
    0,
    Latitude,
    -Longitude, // ??? passing neg longitude gives wrong answer
    TzOffset,
    false);  // always set dst false since Tz offset takes dst into acct
  SunsetHour = OutputHour;
  SunsetMin = OutputMin;

  if (SunsetHour >= 0) {
    SecondsToSunset = SunsetMin * 60 + SunsetHour * 3600;
    BaseMsSunset = SecondsToSunset * 1000;
  }
  else {
    SecondsToSunset = SunsetHour;
    BaseMsSunset = SunsetHour;  // -1 no day -2 no night  
  }

  // Create formatted strings for sunrise and set times 
  SunriseMinString = str(SunriseMin);
  if (SunriseMin < 10) {
    SunriseMinString = "0" + SunriseMinString;
  }
  SunriseAmpmString = " AM";
  SunriseHourString = nf(SunriseHour, 2, 0);//str(SunriseHour);
  if (SunriseHour > 12) {
    SunriseAmpmString = " PM"
    SunriseHourString = nf(SunriseHour - 12, 2, 0);
  }

  SunsetMinString = str(SunsetMin);
  if (SunsetMin < 10) {
    SunsetMinString = "0" + SunsetMinString;
  }

  SunsetAmpmString = " AM";
  SunsetHourString = nf(SunsetHour, 2, 0);
  if (SunsetHour > 12) {
    SunsetAmpmString = " PM"
    SunsetHourString = nf(SunsetHour - 12, 2, 0);
  }

  //print("Sunrise = " + SunriseHour + ":" + SunriseMin);
  //print("Sunset = " + SunsetHour + ":" + SunsetMin);  

  //print("Sunrise = " + SunriseHourString + ":" + SunriseMinString 
  //      + SunriseAmpmString);
  //print("Sunset = " + SunsetHourString + ":" + SunsetMinString
  //      + SunsetAmpmString);   
}



// ========================================================
// Update time-related vars.
function updateTimeThisDay() {
  // Sync TimeKeeper
  if (timeKeeper) timeKeeper.update(TzOffset);


  IDowPrevious = IDow; // save the previous day of week

  let currDate = new Date();

  // Start with local hour and day of week
  IDow = currDate.getDay(); // 0 is sunday 
  IHour = hour();

  // if time zone GMT offset differs from local,
  //  adjust the hour and day-of-week accordingly.
  // Always use the robust BrowserTzOffset if available, else fall back to TzOffsetLocal
  let localTz = (typeof BrowserTzOffset !== 'undefined') ? BrowserTzOffset : TzOffsetLocal;

  if (TzOffset != localTz) {

    // Here is the new simpler logic for tz correction
    let TzDiffHours = TzOffset - localTz;
    let TzDiffMs = TzDiffHours * 60 * 60 * 1000;

    // Rotate the date by the time zone difference
    currDate = new Date(currDate.getTime() + TzDiffMs);

    // Update day of week and hour based on corrected date currDate
    IDow = currDate.getDay(); // 0 is sunday 
    IHour = currDate.getHours();
  }

  // LOGGING for Debug
  // console.log(`TimeUpdate: LocalTz=${TzOffsetLocal} TargetTz=${TzOffset} IHour=${IHour}`);

  // now that we have the new adjusted day of week, check if it changed
  if (IDow != IDowPrevious) {
    // we have started a new day, so need to recompute the sunrise/sunset
    IsSunRiseSetObtained = false;
  }


  // Helper to get ms since midnight for interpolation 
  function msSinceMidnight(d) {
    var midnight = new Date(d);
    midnight.setHours(0, 0, 0, 0);
    return d - midnight;
  }

  // get the current time from the (possibly shifted) date object =========
  IMin = currDate.getMinutes();
  ISec = currDate.getSeconds();
  IMsSinceDayStart = msSinceMidnight(currDate);
  // Custom helper or calculation needed for ms since day start? 
  // Actually IMsSinceDayStart was used for interpolation. 
  // Let's rely on standard p5 millis() for animation smoothness, 
  // BUT we need an offset if we want smooth hands in another timezone.
  // For now, let's keep IMsSinceDayStart based on local millis for smooth animation, 
  // but we might see a jump if we strictly use IMin/ISec. 
  // Standard way:
  // We want the fractional second.
  let ms = currDate.getMilliseconds();
  //================================================
  //================================================

  var hoursSoFar = IHour;  // range 0-23
  MsFromStartToResetTime = IMsSinceDayStart;
  var msSinceSecond =
    int(fract(MsFromStartToResetTime / 1000) * 1000);
  SecondsSoFar = ISec + IMin * 60 + hoursSoFar * 3600 + msSinceSecond / 1000;

  IHour12 = IHour;
  IsAM = true;
  if (IHour == 0) {
    IHour12 = 12;
  }
  else if (IHour >= 12) {
    IsAM = false;
    if (IHour > 12) {
      IHour12 -= 12;
    }
  }

  // Set formatted global TimeString to show to user.
  TimeString = nf(IHour12, 2, 0) + ":" + nf(IMin, 2, 0);
  //console.log("Formatted time string: " + TimeString);

  // Set formatted global DateString to show to user.
  DateString = currDate.toLocaleDateString(
    'en-us', { year: "numeric", month: "short", day: "numeric" })


  // Delay updating the rise/set times until both lat and long are obtained.
  // This isn't until sometime after the setup() method completes.
  // Once it's done, no need to redo on each pass.
  if (!IsSunRiseSetObtained && Latitude != 99999 && Longitude != 99999) {
    calcSunRiseSet();  // also call this later if lat/long changed

    // init latitude field
    var latString = str(Latitude);
    LatInput.value(latString);
    LastLat = Latitude;

    // init longitude field
    var longString = str(Longitude);
    LngInput.value(longString);
    LastLong = Longitude;

    IsSunRiseSetObtained = true;

    // Fix for Mobius Day/Night not updating when location changes
    if (typeof mobiusRenderer !== 'undefined') {
      mobiusRenderer.refreshDayNight();
    }


  }

  if (IsSunRiseSetObtained) {
    IsDay = true;

    // Check for special cases
    if (SunsetHour == -1) // midnight sun
    {
      IsDay = true;
    }
    else if (SunsetHour == -2) // dark all day
    {
      IsDay = false;
    }
    else if (SecondsSoFar < SecondsToSunrise) {
      IsDay = false;
    }
    else if (SecondsSoFar > SecondsToSunset) {
      IsDay = false;
    }

    // Possible dayStates:
    // 1 - Midnight to sunrise.  Second half of a night
    // 2 - Sunrise to noon to sunset 
    // 3 - Sunset to midnight: first half of the night
    DayState = 2;
    if (SecondsSoFar < SecondsToSunrise) {
      DayState = 1;
    }
    else if (SecondsSoFar > SecondsToSunset) {
      DayState = 3;
    }

  }

} // END OF updateTimeThisDay() -----------------------------



//========================================================
//============ Button click handlers =====================

//=== TODO: replace this toggling button with a set of buttons for each clock type, 
// programmed to work as radio buttons.  Will set ClockMode to indicate type.






//-----------------------------------------------------------------
// Handler for the toggling SetGmtDisplay button
function setGmtDisplay()  // Toggling mode button
{
  if (IsGmtShown) {
    IsGmtShown = false;
    GmtDisplayButtonLabel = "Show GMT";
  }
  else {
    IsGmtShown = true;
    GmtDisplayButtonLabel = "Hide GMT";
  }

  // update button label
  GmtDisplayButton.html(GmtDisplayButtonLabel); // Change the button's HTML content

  // Toggle the active class
  if (IsGmtShown) {
    GmtDisplayButton.addClass('toggled-on');
  } else {
    GmtDisplayButton.removeClass('toggled-on');
  }

  // Update URL hash to reflect GMT state
  updateUrlHash();
}


//-----------------------------------------------------------------
// Handler for location errors
function handleLocationError(error) {
  console.log("GPS location error:", error.message);
  exitZenMode(); // Ensure UI is visible to show error details

  // Show user-friendly message based on error type
  var errorMsg = "";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      errorMsg = "Location permission denied";
      alert("Location permission was denied.\n\nPlease enable location access in your browser settings (usually by clicking the icon to the left of the address bar) and try again.");
      break;
    case error.POSITION_UNAVAILABLE:
      errorMsg = "Location unavailable";
      alert("Location services are unavailable on this device.");
      break;
    case error.TIMEOUT:
      errorMsg = "Location request timed out";
      alert("The location request timed out. This can happen if the browser permission prompt was not answered quickly enough. Please try again and click 'Allow' when the popup appears.");
      break;
    default:
      errorMsg = "Location error occurred";
      alert("An unknown location error occurred.");
  }

  console.log(errorMsg);
  CityNameInput.value(errorMsg);

  // If we are restoring a previous location, we might still be loading (waiting for TZ),
  // but if we are just failing, we should clear loading.
  // Actually, if we restore below, we call getTzUsingLatLong which continues the loading chain.
  // If we don't restore (fallback to IP), we call fetchIpLocation which sets loading.
  // So strictly speaking, we don't need to clear here IF we always take a path that handles it.
  // But to be safe, if we don't take those paths?
  // Let's check below.


  // Restore approximate location if available
  if (LatLocal !== 99999 && LngLocal !== 99999) {
    console.log("Restoring approximate location...");
    Latitude = LatLocal;
    Longitude = LngLocal;
    if (LocaleTitleLocal) {
      LocaleTitle = LocaleTitleLocal;
    }
    IsPreciseLocation = false; // We are back to IP/approximate location

    // Restore timezone
    getTzUsingLatLong(Latitude, Longitude);

    // Recalculate times
    IsSunRiseSetObtained = false;
    updateTimeThisDay();
    updateUIElements();

    // Clear mismatch flag since we are back to IP location
    // (or keep it if we want to warn about VPN still? 
    //  Actually if we restore IP loc, we are back to the state where mismatch might exist)
    // But let's check if we should re-evaluate mismatch. 
    // For now, let's assume the previous mismatch state is still valid or will be re-checked.
    // However, getTzUsingLatLong might not re-check mismatch.
    // Let's just leave IsTimezoneMismatch as is, or maybe re-run the check?
    // Simpler to just restore the values.
  } else {
    // No fallback location available (e.g. failed on startup), try IP location
    console.log("No fallback location available. Trying IP location.");
    fetchIpLocation();
    IsPreciseLocation = false;
    updateUIElements();
  }
}

// Helper to force exit Zen Mode (e.g. on error)
function exitZenMode() {
  if (IsZenMode) {
    toggleZenMode();
  }
}

// -----------------------------------------------------------------
// Unified handler for network and CORS errors during API calls
function handleNetworkError(err) {
  console.log("Network/CORS error:", err);
  exitZenMode(); // Ensure UI is visible to show error details
  var errorMsg = "Network error: Could not reach the location service. This may be due to a CORS issue, ad blocker, or network loss.";

  // Try to be more specific if possible
  if (err && err.message) {
    console.log("Error details:", err.message);
  }

  alert(errorMsg);

  // Revert UI state
  clearLoadingState();
  if (typeof CityNameInput !== 'undefined') CityNameInput.value('');
  if (typeof PrevLocaleTitle !== 'undefined') LocaleTitle = PrevLocaleTitle;
}


//-----------------------------------------------------------------
// Toggle Zen Mode
function toggleZenMode() {
  IsZenMode = !IsZenMode;

  if (IsZenMode) {
    document.body.classList.add('zen-mode');
    BkColor = 0; // Black
  } else {
    document.body.classList.remove('zen-mode');
    BkColor = 34; // Dark Gray (#222)
  }

  updateUrlHash();
}

//-----------------------------------------------------------------
// Handler for the Use Precise Location button
// Requests browser GPS coordinates (will show permission prompt)
function usePreciseLocation(isAuto = false) {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] Requesting precise GPS location (isAuto=${isAuto})...`);
  IsRequestingPrecise = true;
  setLoadingState();

  IsDisplayingUserLocation = true; // We are tracking user location

  IsTimezoneMismatch = false; // User intentionally requesting location
  IsUserInitiatedLocation = !isAuto; // Trigger URL update only if NOT auto-fetch
  PrevLocaleTitle = LocaleTitle; // Capture for error reversion

  // Options for getCurrentPosition call below, designed for speed over accuracy.
  const options = {
    enableHighAccuracy: false,
    timeout: 30000,
    maximumAge: 120000 // Allow a location up to 2 minutes old
  };

  navigator.geolocation.getCurrentPosition(
    // Success callback
    function (position) {
      if (requestId !== LocationFetchSerial) {
        console.log(`[${requestId}] GPS callback ignored (stale/cancelled).`);
        return;
      }
      IsRequestingPrecise = false;
      console.log(`[${requestId}] GPS location obtained:`, position.coords);

      IsPreciseLocation = true;

      // Get precise coordinates
      Latitude = position.coords.latitude;
      Longitude = position.coords.longitude;

      // Round to 3 places after decimal
      Latitude = round(Latitude, 3);
      Longitude = round(Longitude, 3);

      console.log("Precise latitude: " + Latitude);
      console.log("Precise longitude: " + Longitude);

      // Update UI fields
      var latString = str(Latitude);
      LatInput.value(latString);
      LastLat = Latitude;

      var longString = str(Longitude);
      LngInput.value(longString);
      LastLong = Longitude;

      CityNameInput.value("");
      // LocaleTitle = "Precise Location"; // Temporarily set until reverse geocode returns

      // Get reverse geocoding info from Nominatim
      let revGeoUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${Latitude}&lon=${Longitude}`;
      console.log(`[${requestId}] Reverse geocoding URL:`, revGeoUrl);
      loadJSON(revGeoUrl, (data) => gotReverseGeocodeData(data, requestId), handleNetworkError);

      if (IsUserInitiatedLocation) {
        updateUrlHash();
      }

      // Get timezone using existing GeoNames function
      getTzUsingLatLong(Latitude, Longitude, requestId);

      // Location changed, recalculate sunrise/sunset
      IsSunRiseSetObtained = false;
      updateTimeThisDay();
    },

    // Error callback
    function (error) {
      if (requestId !== LocationFetchSerial) return;
      IsRequestingPrecise = false;
      handleLocationError(error);
    },

    // Options, see above
    options
  );
}


//=======================
// Set location and timezone to Silverado
//  
function setSilverado() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setSilverado()`);
  IsTimezoneMismatch = false; // User manually selected location
  IsUserInitiatedLocation = true; // User clicked preset button
  IsDisplayingUserLocation = false; // Manually selected location
  PrevLocaleTitle = LocaleTitle;
  if (CityNameInput) CityNameInput.value("Silverado, CA, USA");
  LocaleTitle = "Silverado";

  // Skip Nominatim and go direct to Tz lookup
  Latitude = 33.743;
  Longitude = -117.643;
  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude);

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateUrlHash();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to London England
//  
function setLondon() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setLondon()`);
  IsTimezoneMismatch = false; // User manually selected location
  IsUserInitiatedLocation = true; // User clicked preset button
  IsDisplayingUserLocation = false; // Manually selected location
  PrevLocaleTitle = LocaleTitle;
  if (CityNameInput) CityNameInput.value("London, UK");
  LocaleTitle = "London";

  // Skip Nominatim and go direct to Tz lookup
  Latitude = 51.507;
  Longitude = -0.127;
  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude, requestId);

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateUrlHash();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Berkeley
//  
function setBerkeley() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setBerkeley()`);
  IsTimezoneMismatch = false; // User manually selected location
  IsUserInitiatedLocation = true; // User clicked preset button
  IsDisplayingUserLocation = false; // Manually selected location
  PrevLocaleTitle = LocaleTitle;
  if (CityNameInput) CityNameInput.value("Berkeley, CA, USA");
  LocaleTitle = "Berkeley";

  // Skip Nominatim and go direct to Tz lookup
  Latitude = 37.871;
  Longitude = -122.273;
  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude, requestId);

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateUrlHash();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Kansas City, MO
//  
function setKansasCity() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setKansasCity()`);
  IsTimezoneMismatch = false; // User manually selected location
  IsUserInitiatedLocation = true; // User clicked preset button
  IsDisplayingUserLocation = false; // Manually selected location
  PrevLocaleTitle = LocaleTitle;
  if (CityNameInput) CityNameInput.value("Kansas City, MO, USA");
  LocaleTitle = "Kansas City";

  // Skip Nominatim and go direct to Tz lookup
  Latitude = 39.099;
  Longitude = -94.578;
  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude, requestId);

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateUrlHash();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Melbourne
//  
function setMelbourne() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setMelbourne()`);
  IsTimezoneMismatch = false; // User manually selected location
  IsUserInitiatedLocation = true; // User clicked preset button
  IsDisplayingUserLocation = false; // Manually selected location
  PrevLocaleTitle = LocaleTitle;
  if (CityNameInput) CityNameInput.value("Melbourne, AU");
  LocaleTitle = "Melbourne";

  // Skip Nominatim and go direct to Tz lookup
  Latitude = -37.813;
  Longitude = 144.963;
  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude, requestId);

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;
  //tempTest = true; 
  updateUrlHash();
  updateTimeThisDay();
}

// ========================================
// Set location and timezone to San Diego
function setSanDiego() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setSanDiego()`);
  IsTimezoneMismatch = false; // User manually selected location
  IsUserInitiatedLocation = true; // User clicked preset button
  IsDisplayingUserLocation = false; // Manually selected location
  PrevLocaleTitle = LocaleTitle;
  if (CityNameInput) CityNameInput.value("San Diego, CA, USA");
  LocaleTitle = "San Diego";

  // Skip Nominatim and go direct to Tz lookup
  Latitude = 32.715;
  Longitude = -117.161;
  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude, requestId);

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }
  // init the UI field
  if (TzInput) TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  if (LatInput) LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  if (LngInput) LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateUrlHash();
  updateTimeThisDay();
}


// ========================================================
// Handler for the GMT Offset field.  This is called for all keystrokes in that field.
// The draw loop keeps track of how long it's been since the last keystroke, and
// triggers processing (below) when sufficient time has expired.  
// This approach avoids the need for an enter button.
function tzInputEvent() {
  console.log('you are typing tz=', this.value());
  TzInput.addClass('input-pending');
  TzInputTimestampMs = millis();
}

//==== delayed processing of tz input allows user to finish
//  typing, avoiding temporarily invalid numbers like "-"
function processTzInputEvent() {
  TzInputTimestampMs = -1;
  TzInput.removeClass('input-pending');
  TzOffset = Number(TzInput.value());

  if (isNaN(TzOffset) || TzOffset < -13 || TzOffset > 13) {
    if (isNaN(TzOffset)) {
      alert("Invalid Time Zone format. Please enter a number.");
    } else {
      alert("Time Zone must be between -13 and 13.");
    }
    // restore to previous
    TzOffset = LastTz;
    var tzString = str(TzOffset);
    if (TzOffset > 0) tzString = "+" + str(TzOffset);
    TzInput.value(tzString);
  }
  else {
    LastTz = TzOffset;
    IsTimezoneMismatch = false;
    CityNameInput.value("");
    LocaleTitle = "Entered Location";
    IsSunRiseSetObtained = false;
    updateTimeThisDay();
  }

}

// ===== keystroke detected in Latitude field
function latInputEvent() {
  console.log('you are typing latitude=', this.value());
  LatInput.addClass('input-pending');
  LatInputTimestampMs = millis();
}

// == delayed processing done after user finishes entering latitude
function processLatInputEvent() {
  LatInputTimestampMs = -1;
  LatInput.removeClass('input-pending');

  //Latitude = float(this.value());
  // NOTE: using float above is too tolerant,
  //  it only fails if the non-numeric char is the first,
  //  else just stops parsing 
  Latitude = Number(LatInput.value());

  if (isNaN(Latitude) || Latitude < -90 || Latitude > 90) {
    if (isNaN(Latitude)) {
      alert("Invalid Latitude format. Please enter a number.");
    } else {
      alert("Latitude must be between -90 and 90.");
    }
    // restore to previous
    Latitude = LastLat;
    LatInput.value(LastLat);
  }
  else {
    LastLat = Latitude;
    IsTimezoneMismatch = false;
    CityNameInput.value("");
    LocaleTitle = "Entered Location";
    IsSunRiseSetObtained = false;
    updateTimeThisDay();
  }
  //print("lat=" + Latitude)
}



// ===== keystroke detected in longitude field
function longInputEvent() {
  console.log('you are typing longitude=', this.value());
  LngInput.addClass('input-pending');
  LngInputTimestampMs = millis();
}

// == delayed processing done after user finishes entering longitude
function processLongInputEvent() {
  LngInputTimestampMs = -1;
  LngInput.removeClass('input-pending');
  Longitude = Number(LngInput.value());

  if (isNaN(Longitude) || Longitude < -180 || Longitude > 180) {
    if (isNaN(Longitude)) {
      alert("Invalid Longitude format. Please enter a number.");
    } else {
      alert("Longitude must be between -180 and 180.");
    }
    // restore to previous
    Longitude = LastLong;
    LngInput.value(LastLong);
  }
  else {
    LastLong = Longitude;
    IsTimezoneMismatch = false;
    CityNameInput.value("");
    LocaleTitle = "Entered Location";
    IsSunRiseSetObtained = false;
    updateUrlHash();
    updateTimeThisDay();
  }

}


// ==230112a
//findme
// ==240120d
// handler for the Submit button that enters a city name
// The entered city name may contain additional fields such as state/province and 
// country, comma separated.
function handleCitySubmitUnified() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] handleCitySubmitUnified()`);
  var input = select('#city-search-input');
  var city = input.value();
  if (city && city.length > 1) {
    getLocationUsingCityName(city, requestId);
    closeAllModals();
  } else {
    var errEl = select('#city-error-msg');
    if (errEl) errEl.html("Please enter a valid city name.");
  }
}

function handleCoordsSubmitUnified() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] handleCoordsSubmitUnified()`);
  // Use IDs from #modal-coords (shared mobile/desktop manual modal)
  var lat = parseFloat(select('#input-lat').value());
  var lng = parseFloat(select('#input-lon').value());
  var tz = parseFloat(select('#input-tz').value());

  // Debug Alert - REMOVED

  if (isNaN(lat) || isNaN(lng)) {
    // error handling?
    alert("Invalid Coordinates");
    return;
  }

  console.log("Submit Manual Coords: Lat=" + lat + " Lng=" + lng + " Tz=" + tz);

  Latitude = lat;
  LastLat = lat;

  Longitude = lng;
  LastLong = lng;

  if (!isNaN(tz)) {
    TzOffset = tz;
    LastTz = tz;
  }

  IsPreciseLocation = true; // Manual entry is precise
  IsDisplayingUserLocation = false; // Manually entered location
  IsUserInitiatedLocation = true;
  IsLoadingLocation = false; // Ensure not loading
  LocaleTitle = "Manual Location";

  updateTimeThisDay();
  updateUrlHash();
  closeAllModals();
}

// Handle City Submit (Desktop Inline - Leftover, can fail gracefully if element missing)
function handleCitySubmit() {
  if (!CityNameInput) return; // Guard
  var city = CityNameInput.value();
  PrevLocaleTitle = LocaleTitle;

  //LocaleTitle = CityNameInput.value(); << need to extract just the city

  // We don't have room for the full city name with state and country, so
  // must extract just the city name.
  // When splitting at commas, some spaces may remain, so must trim below.
  let splitString = splitTokens(CityNameInput.value(), ',');

  //console.log(splitString);
  //console.log("splitString array len = >" + str(splitString.length) + "<")
  if (str(splitString.length) > 0)  // If a city was found
  {
    LocaleTitle = trim(splitString[0]);

    // url used for OpenStreetmap (Nominatim)
    // Use the full string entered by the user, may contain state or country.
    let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${CityName}`;

    // ATTN: the gotCityLocationDataOpenStMap() fcn will be called a bit later, when the  
    // response to the url call comes in.  We won't know the lat/lon until then.
    //  THis means the subsequent API call to get the time zone can't happen until then.
    setLoadingState();
    loadJSON(apiUrl, gotCityLocationDataOpenStMap, handleNetworkError);

    // Clear the input field
    CityNameInput.value('');
  }
  else // no city name was found
  {
    LocaleTitle = PrevLocaleTitle;
  }

  // ALT way to get lat/long
  //let geoApiUrl = 
  // `https://secure.geonames.org/searchJSON?q=${CityName}&maxRows=1&username=charliewallace`; 
  //loadJSON(geoApiUrl, gotCityLocationDataGeoNames);
}

// ==============
// Alternate way to set location, timezone, and IsDst using passed city name.
function getLocationUsingCityName(passedCityName, requestId = 0) {
  if (requestId === 0) requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] getLocationUsingCityName(${passedCityName})`);
  PrevLocaleTitle = LocaleTitle; // Capture for error reversion
  IsUserInitiatedLocation = true; // User entered city name
  IsDisplayingUserLocation = false; // Looking up a specific city
  CityName = passedCityName;

  // url used for OpenStreetmap (Nominatim)
  let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(CityName)}`;

  // Make a GET request to the Nominatim API (OpenStreetMap)
  // ATTN: the gotCityLocationDataOpenStMap() fcn will be called a bit later, when the  
  // response to the url call comes in.  We won't know the lat/lon until then.
  //  THis means the subsequent API call to get the time zone can't happen until then.
  setLoadingState();
  loadJSON(apiUrl, gotCityLocationDataOpenStMap, handleNetworkError);

  // ALT way to get lat/long - this works! SAVE ======
  //let geoApiUrl = `https://secure.geonames.org/searchJSON?q=${CityName}&maxRows=1&username=charliewallace`; 
  //loadJSON(geoApiUrl, gotCityLocationDataGeoNames);
}



/********************************************  SAVE
// NOT currently using this!!! <<<<<<<<<<<<< ATTN <<<<<<<<<
// This is the handler for the commented out web service call just above, using
//   https://secure.geonames.org/... etc
// Instead I'm using the nominatim.openstreetmap.org in getLocationUsingCityName() above,
// that triggers call to gotCityLocationDataOpenStMap() just below.
// This will need some work if it's ever used - needs to make service call to get tz.
function gotCityLocationDataGeoNames(data) 
{
  //console.log("Entering gotCityLocationDataGeoNames()");
 
  // Check if the response contains any results
  var isError = false;
  if (data.length != 0) 
  {
    console.log("City location data from GeoNames:")
    console.log(data[0].goenames[0]);
 
    let result = data.geonames[0];
    // Take the first result
 
    // Extract latitude, longitude, and time zone offset
    let lat = result.lat;
    let lon = result.lng;
    
    // Display the information
    console.log(`City: ${CityName} using GeoNames`);
    console.log(`Latitude: ${lat}`);
    console.log(`Longitude: ${lon}`);
  } 
  else 
  {
    console.log(`In gotCityLocationDataGeoNames(): No results found for ${CityName}`);
  }  
}  // this function is not currently used but basically works.
************************/


// using Nominatim OpenStreetMap API
// The response to the API call for the city name has arrived.
function gotCityLocationDataOpenStMap(data, requestId) {
  if (requestId && requestId !== LocationFetchSerial) {
    console.log(`[${requestId}] gotCityLocationDataOpenStMap: Ignoring stale callback.`);
    return;
  }
  //console.log("Entering gotCityLocationDataOpenStMap().");

  // Check if the response contains any results
  var isError = false;
  if (data.length != 0) {
    console.log("City location data from OpenStreetMap:")
    console.log(data[0]);

    let result = data[0]; // Take the first result

    // Extract formatted name for display (e.g. "Boston, Massachusetts, United States")
    // Use just the first part for LocaleTitle
    if (result.display_name) {
      let parts = splitTokens(result.display_name, ',');
      if (parts.length > 0) LocaleTitle = trim(parts[0]);
    }

    // Extract latitude, longitude, and time zone offset
    let lat = result.lat;
    let lon = result.lon;

    // ==240111a
    // initialize time zone to estimate based on longitude.
    let timeZoneOffset = getTimeZoneOffset(lat, lon);

    TzOffset = timeZoneOffset;  // store into global

    // validate the new location
    if (lat > 90 || lat < -90 || lon < -180 || lon > 180) {
      isError = true;
      print("Error, invalid lat or long.  Lat=" + str(lat) + " Long=" + str(lon))
      clearLoadingState();
    }
    //else if (timeZoneOffset/3600 > 13 || timeZoneOffset/3600 < -13) 
    else if (timeZoneOffset > 13 || timeZoneOffset < -13) {
      isError = true;
      print("Error, invalid time zone offest=" + str(timeZoneOffset));
      clearLoadingState();
    }
    else // looks like a valid offset
    {
      lat = round(lat, 3); // round to 3 places
      lon = round(lon, 3); // round to 3 places

      // save into intermediate globals.
      // We are not yet ready to change the real latitude/longitude
      // because we don't have the new time zone yet.
      // We'll get it via the loadJSON() call below, but the new tz
      // won't show up until a bit later.
      // In the meantime, the main draw() method will bail out (not draw)
      // as long as either of these is not equal to 99999. That starts here.
      NewLatitude = lat;
      NewLongitude = lon;

      //console.log("OpenStMap: lat=" + str(lat) + " lon=" + str(lon));

      // Now that we have the lat/lon, we need one more API call to geonames
      // in order to fetch the time zone offset.    
      // GeoNames API URL for timezone lookup
      let timezoneUrl =
        `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=charliewallace`;
      console.log('timezoneUrl=' + timezoneUrl);

      // Make a GET request using Geonames to get timezone details.
      // The gotCityTzData() fcn will run a bit later when the response arrives.
      loadJSON(timezoneUrl, (data) => gotCityTzData(data, requestId), handleNetworkError);
    }
  }
  else {
    console.log(`No results found for ${CityName}`);
    alert(`Could not find location for: ${CityName}`);
    if (CityNameInput) CityNameInput.value('');
    LocaleTitle = PrevLocaleTitle;
    clearLoadingState();
  }

}


// using GeoNames service.  Handler for fetching timezone.
// The response to the API call to get the city's time zone offset has arrived.
// There is a time delay between this and the code above where
// loadJSON is called.
function gotCityTzData(data, requestId) {
  if (requestId && requestId !== LocationFetchSerial) {
    console.log(`[${requestId}] gotCityTzData: Ignoring stale callback.`);
    // Note: We don't clear loading state here because a newer request is already in progress
    return;
  }
  console.log("Entering gotCityTzData().");

  // Check if the response contains any results
  var isError = false;
  if (data.length != 0) {
    console.log('in gotCityTzData():')
    console.log(data);  // dump the returned data

    // Extract time zone offset.  This takes daylight savings into acct.
    let timeZoneOffset = data.gmtOffset;
    // ATTN: if the data.rawOffset differs from the data.gmtOffset,
    // that means daylight savings time ("Summer time") is active.  

    //console.log('Geonames tz offset = ' + str(timeZoneOffset));
    TzOffset = timeZoneOffset;    // store into global

    // figure out if the city is using daylight savings time.
    let rawOffset = data.rawOffset;
    if (rawOffset == timeZoneOffset) {
      IsDst = false;
    }
    else {
      IsDst = true;
    }

    // Now that we have the time zone, we can update the global
    //  latitude and longitude; if done earlier, and there was a call to 
    //  draw() before the fetch of time zone was complete, we would
    //  update the clock with the old timezone momentarily, then 
    //  shortly after, the new tz would come in, and fix things.
    //  Caused a glitch.  This avoids that.
    // ASSUMPTION: we assume that if we got here, we have valid values
    //  of NewLatitude and NewLongitude.  No need to check here to
    //  ensure we have the new values.
    Latitude = NewLatitude;
    Longitude = NewLongitude;

    // reset the NewLatitude and NewLongitude to illegal values 99999
    // to allow the redraw
    NewLatitude = 99999;
    NewLongitude = 99999;

    // this is kept local
    var tzString;

    // Create string version of tz. Add a leading plus sign if not negative
    if (timeZoneOffset > 0) {
      timeZoneOffset = int(timeZoneOffset); // round downward
      tzString = "+" + str(timeZoneOffset);
    }
    else {
      timeZoneOffset = -int(-timeZoneOffset); // round upward      
      tzString = str(timeZoneOffset);
    }
    //console.log("tz after possibly adding leading plus sign:" + tzString);

    // Update fields on-screen.
    if (TzInput) TzInput.value(tzString);
    if (LatInput) LatInput.value(str(Latitude));
    if (LngInput) LngInput.value(str(Longitude));

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
    IsSunRiseSetObtained = false;

    // Display the information
    console.log(`City: ${CityName}`);
    console.log('Location based on OpenStreetMap data:')
    console.log(`Latitude: ${Latitude}`);
    console.log(`Longitude: ${Longitude}`);
    console.log('==tz based on GeoNames data==')
    console.log(`Time Zone Offset: ${timeZoneOffset} hours`);

    // Only update URL for user-initiated location changes, or ALWAYS for precise locations
    if (IsUserInitiatedLocation || (IsPreciseLocation && Latitude !== 99999)) {
      updateUrlHash();
      // We don't reset flag here anymore to avoid race condition with reverse geocode callback
    }
    clearLoadingState();
  }
  else {
    isError = true;
    console.log(`No timezone results returned from GeoNames, will use estimate based on longitude.`);

    // Our main way of updating time zone has failed.
    // This call is a backup method that set tz purely based on longitude.
    TzOffset = getTimeZoneOffset(Latitude, Longitude);
    Latitude = NewLatitude;
    Longitude = NewLongitude;

    NewLatitude = 99999; // allow draw() to resume
    NewLongitude = 99999;
    clearLoadingState();
  }
}

// Helper for reverse geocoding results from Nominatim
function gotReverseGeocodeData(data, requestId) {
  if (requestId && requestId !== LocationFetchSerial) {
    console.log(`[${requestId}] gotReverseGeocodeData: Ignoring stale callback.`);
    return;
  }

  console.log("Reverse Geocode Data:", data);
  if (data && data.address) {
    let addr = data.address;
    let parts = [];

    // Order of local importance: hamlet, village, town, city, county, state, country
    let hierarchy = ['hamlet', 'village', 'town', 'city', 'county', 'state', 'country'];

    // Gather all parts first
    let activeParts = {};
    for (let key of hierarchy) {
      if (addr[key]) {
        // Skip country if it's the USA
        if (key === 'country' && (addr[key] === 'United States' || addr.country_code === 'us')) {
          continue;
        }
        activeParts[key] = addr[key];
      }
    }

    // Function to construct LocaleTitle from activeParts
    const constructTitle = (partsObj) => {
      let tempParts = [];
      for (let key of hierarchy) {
        if (partsObj[key]) tempParts.push(partsObj[key]);
      }
      return tempParts.join(", ");
    };

    LocaleTitle = constructTitle(activeParts);

    // If too long, remove parts by priority: hamlet, village, town, county, country
    let removalPriority = ['hamlet', 'village', 'town', 'county', 'country'];
    for (let key of removalPriority) {
      if (LocaleTitle.length <= 35) break;
      if (activeParts[key]) {
        delete activeParts[key];
        LocaleTitle = constructTitle(activeParts);
      }
    }

    // Fallback if still too long or no parts found
    if (LocaleTitle.length === 0 && data.display_name) {
      LocaleTitle = data.display_name.split(',')[0];
    }

    console.log("Updated LocaleTitle from reverse geocode:", LocaleTitle);
    if (IsUserInitiatedLocation || IsPreciseLocation) {
      updateUrlHash();
    }
    updateUIElements();
  }
}


// Instead of using city name, use GeoNames to get the tz and IsDst based on
// a known lat/long
// using Nominatim OpenStreetMap API
// The response to the API call for the city name has arrived.
function getTzUsingLatLong(lat, lon, requestId) {
  console.log(`[${requestId}] Entering getTzUsingLatLong().`);
  // Check if the response contains any results
  var isError = false;

  // initialize time zone to estimate based on longitude.
  let timeZoneOffset = getTimeZoneOffset(lat, lon);

  TzOffset = timeZoneOffset;  // store into global

  // validate the new location
  if (lat > 90 || lat < -90 || lon < -180 || lon > 180) {
    isError = true;
    print("Error, invalid lat or long.  Lat=" + str(lat) + " Long=" + str(lon))
    clearLoadingState();
  }
  else if (timeZoneOffset > 13 || timeZoneOffset < -13) {
    isError = true;
    print("Error, invalid time zone offest=" + str(timeZoneOffset));
    clearLoadingState();
  }
  else // looks like a valid offset
  {
    lat = round(lat, 3); // round to 3 places
    lon = round(lon, 3); // round to 3 places

    // save into intermediate globals.
    // We are not yet ready to change the real latitude/longitude
    // because we don't have the new time zone yet.
    // We'll get it via the loadJSON() call below, but the new tz
    // won't show up until a bit later.
    // In the meantime, the main draw() method will bail out (not draw)
    // as long as either of these is not equal to 99999. That starts here.
    NewLatitude = lat;
    NewLongitude = lon;

    // Now that we have the lat/lon, we need one more API call to geonames
    // in order to fetch the time zone offset.    
    // GeoNames API URL for timezone lookup
    let timezoneUrl =
      `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=charliewallace`;
    console.log('timezoneUrl=' + timezoneUrl);

    // Make a GET request using Geonames to get timezone details.
    // The gotCityTzData() fcn will run a bit later when the response arrives.
    // It sets the global time zone offset and also sets IsDst.
    loadJSON(timezoneUrl, (data) => gotCityTzData(data, requestId), handleNetworkError);
  }


}

// Global error handler for JSON requests
function handleNetworkError(response) {
  console.log("Network Error details:", response);
  alert("Network Error: Could not fetch location data. Please check your connection.");
  clearLoadingState();
  if (typeof PrevLocaleTitle !== 'undefined' && PrevLocaleTitle) {
    LocaleTitle = PrevLocaleTitle;
  }
}




// estimate tz offset from longitude/15.  This can be used as a backup
// when the geoNames call to get the timezone fails.
function getTimeZoneOffset(lat, lon) {
  // Create a date object for the current time in the specified city

  let date = new Date();
  let utc = date.getTime() + date.getTimezoneOffset() * 60000; // Convert to UTC
  let cityTime = new Date(utc + 3600000 * lon / 15); // Adjust for longitude

  let timezonesPerDegree = 24 / 360;
  let lonTimeZone = lon * timezonesPerDegree;
  if (lonTimeZone >= 0) {
    lonTimeZone = int(lonTimeZone);
  }
  else {
    lonTimeZone = -1 * (int(-lonTimeZone));
  }
  //lonTimeZone = lonTimeZone * 3600; // convert to seconds
  console.log("Timezone estimate based on longitude is " + str(lonTimeZone));

  return lonTimeZone;
}



// =====================================================================================
// The main draw routine that is called continuously
// ==240122a
// 
// =====================================================================================
// The main draw routine that is called continuously
// 
function draw() {
  // Ensure time variables are updated every frame
  updateTimeThisDay();

  // Ensure UI elements (GPS button, descriptions) are updated
  updateUIElements();

  // handle delayed processing of position & gmt offset fields
  if (TzInputTimestampMs > 0 && millis() - TzInputTimestampMs > InputFieldProcessingTimeout) {
    processTzInputEvent();
  }

  if (LatInputTimestampMs > 0 && millis() - LatInputTimestampMs > InputFieldProcessingTimeout) {
    processLatInputEvent();
  }

  if (LngInputTimestampMs > 0 && millis() - LngInputTimestampMs > InputFieldProcessingTimeout) {
    processLongInputEvent();
  }

  // Sync Location Manager (Bridge)
  if (typeof Latitude !== 'undefined') {
    locManager.latitude = Latitude;
    locManager.longitude = Longitude;
    locManager.tzOffset = TzOffset;
    // locManager.cityName = LocaleTitle; // Optional
  }

  // Pass calculated sun times to TimeKeeper if we computed them here (legacy flow)
  // OR rely on TimeKeeper to do it. 
  // For now, let's inject the legacy calculated sun times into TimeKeeper so Renderers see them
  // without re-implementing the connection yet.
  timeKeeper.sunriseTime.totalSeconds = SecondsToSunrise;
  timeKeeper.sunsetTime.totalSeconds = SecondsToSunset;
  // This ensures DaySpiralRenderer works with the existing calc logic in sketch.js

  // Update Active Renderer
  activeRenderer.update(timeKeeper, locManager);
}

function setClockMode(mode) {
  if ((mode === 'dayspiral' && activeRenderer === daySpiralRenderer) ||
    (mode === 'mobius' && activeRenderer === mobiusRenderer)) {
    return; // Already in this mode
  }

  activeRenderer.deactivate();

  if (mode === 'mobius') {
    activeRenderer = mobiusRenderer;
    // Switch Control Groups
    select('#controls-dayspiral').addClass('hidden');
    select('#controls-mobius').removeClass('hidden');
  } else {
    activeRenderer = daySpiralRenderer;
    // Switch Control Groups
    select('#controls-mobius').addClass('hidden');
    select('#controls-dayspiral').removeClass('hidden');
  }

  activeRenderer.activate();
  activeRenderer.resize(window.innerWidth, window.innerHeight);
  updateUIElements(); // Ensure title/desc update immediately
  updateAboutModalContent(); // Update About content based on clock

  // Update URL hash to reflect clock mode change
  updateUrlHash();
}

/**
 * Updates the About modal content based on the active clock renderer.
 */
function updateAboutModalContent() {
  const aboutTitleEl = select('#modal-about h2');
  const aboutDescEl = document.getElementById('about-description');

  if (!aboutDescEl) return;

  let title = "About CoolweirdClocks";
  let descText = 'CoolweirdClocks is a collection of unique world-time visualizations by Charlie Wallace. ' +
    'The app currently features the Day Spiral and Mobius clocks, with more to come.';

  var locationWarning = (!IsPreciseLocation) ?
    'Approx location is used to estimate sunrise/set times; approve GPS for more accuracy.' : '';

  if (activeRenderer === daySpiralRenderer) {
    title = "About Day Spiral Clock";
    descText = 'To show night and day you need a 24-hour clock; ' +
      'using a spiral is a way to squeeze 24 hours into the more-familiar 12-hour clock face. ' +
      'The hour hand tip follows the spiral, making 1 turn for AM and 1 for PM. ' +
      'The darker part of the spiral indicates night. ';
    if (locationWarning) descText += locationWarning;
  } else if (activeRenderer === mobiusRenderer) {
    title = "About Mobius Clock";
    descText = "The Mobius clock shows 24-hour time on a 12-hour clock face. " +
      "Since the hour indicator moves along the single edge of the Mobius strip, it must make 2 full turns to return to its starting point. " +
      "Noon is at the bottom of the upper arch, and midnight is at the top. " +
      "The minute and second indicators move along the center of the strip, so they complete a cycle in only one turn.";
    if (locationWarning) descText += " " + locationWarning;
  }

  if (aboutTitleEl) aboutTitleEl.html(title);

  // Common footer elements
  const versionVal = APP_VERSION;
  const linkHref = "http://coolweird.com";
  const linkText = "Coolweird.com";

  aboutDescEl.innerHTML = '<p>' + descText + '</p>' +
    '<p style="margin-top: 15px; font-weight: bold;">CoolweirdClocks ' + versionVal + '</p>' +
    '<p style="margin-top: 5px;">' +
    '<a href="' + linkHref + '" target="_blank" style="color: var(--link-color); text-decoration: none; position: relative; z-index: 2000; pointer-events: auto;">' + linkText + '</a>' +
    '<span style="margin: 0 10px; color: #666;">|</span>' +
    '<a href="https://forms.gle/3zAVfRJFH6Kj5drR8" target="_blank" style="color: var(--link-color); text-decoration: none; position: relative; z-index: 2000; pointer-events: auto;">Contact Me</a>' +
    '<span style="margin: 0 10px; color: #666;">|</span>' +
    '<a href="#" onclick="showReadme(); return false;" style="color: var(--link-color); text-decoration: none; position: relative; z-index: 2000; pointer-events: auto;">Readme</a>' +
    '</p>' +
    '<p style="margin-top: 15px; font-size: 0.8rem; color: #888; border-top: 1px solid #444; pt-10">Privacy: Location data is used only for sunrise/sunset calculations and is not saved.</p>';
}

function toggleClockMode() {
  if (activeRenderer === daySpiralRenderer) {
    setClockMode('mobius');
  } else {
    setClockMode('dayspiral');
  }
}

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




//============================================
// Calculate the time of sunset or sunrise with timezone offset.
// Results are returned in globals OutputHour, OutputMin;
// Returns OutputHour = -1 if it's always dark, = -2 if always light

function calcRiseSetTimeWithOffset(
  isCalculatingSunrise,  // true = sunrise, false = sunset
  dayOffset,
  passedLatitude,
  passedLongitude,
  gmto,     // GMT offset (not the same as time zone)
  passedDST)      // daylight savings flag
{
  var fLati = radians(passedLatitude);    // convert to radians
  //print("latitude="+passedLatitude+" fLati="+fLati);
  var fLongi = radians(passedLongitude);  // convert to radians
  //print("longitude="+passedLongitude+" fLongi="+fLongi);

  var fGmto;  // GMT Offset in radians
  // convert the offset from GMT time (in hours) to radians:
  if (passedDST) {	// compensate for daylight savings time
    fGmto = (-gmto - 1) * 2 * PI / 24;  // convert to radians
  }
  else {
    fGmto = -gmto * 2 * PI / 24;  // convert to radians
  }

  var
    daynum,	// day number
    mm,	// solar true longitude
    tmp,	// temp          
    jj,
    kk,
    ll,
    pp,
    qq,
    ss,
    tt,
    vv,
    ww,
    xx,
    yy,
    zz;

  var mo, da, yr;

  OutputHour = 0;
  OutputMin = 0;


  var shiftedDate = new Date();
  shiftedDate.setDate(shiftedDate.getDate() + dayOffset);

  da = shiftedDate.getDate();
  mo = shiftedDate.getMonth() + 1; // note, getMonth is zero-based
  yr = shiftedDate.getFullYear();

  // calcs from astronomy mag 1984 article
  tmp = int((mo + 9) / 12);

  daynum = int(275 * mo / 9) + da - tmp - 30;

  if (isCalculatingSunrise)   // if sunrise
  {
    jj = PI / 2;
  }
  else {
    jj = PI * 2;
  }

  kk = daynum + ((jj + fLongi) / (2 * PI));
  ll = kk * 0.017202 - 0.0574039;
  mm = ll + 0.0334405 * sin(ll) + 0.000349066 * sin(2 * ll) + 4.93289;

  // normalize mm
  while (mm < 0) {
    mm += 2 * PI;
  }
  while (mm >= 2 * PI) {
    mm -= 2 * PI;
  }
  if (2 * mm / PI - int(2 * mm / PI) == 0) {
    mm += 4.84814E-06; //0.00000484814
  }
  pp = atan(0.91746 * (sin(mm) / cos(mm)));

  if (mm > PI / 2) {
    if (mm > 3 * PI / 2) {
      pp += 2 * PI;
    }
    else {
      pp += PI;
    }
  }

  qq = 0.39782 * sin(mm);
  qq = atan(qq / sqrt(1 - (qq * qq)));

  ss = (-0.014539 - (sin(qq) * sin(fLati))) / (cos(qq) * cos(fLati));

  // DEBUG PRINTOUT //////////////////////////////////////
  //	char tbuf[80];
  //	_snprintf(tbuf, 79, "ss = %12.8f", ss );
  //	AfxMessageBox(tbuf);   

  if (ss > 1) {
    // There is no sunset/sunrise, it is always dark
    OutputMin = 0;
    OutputHour = -1;
    return;
  }
  else if (ss < -1) {
    // There is no sunset/sunrise, it is always light
    OutputMin = 0;
    OutputHour = -2;
    return;
  }

  ss = -atan(ss / sqrt(1 - ss * ss)) + PI / 2;

  if (isCalculatingSunrise) {
    ss = 2 * PI - ss;
  }

  // tt is local apparent time
  tt = ss + pp - 0.0172028 * kk - 1.73364;

  // vv is wall clock time in radians unrounded
  vv = tt + fLongi - fGmto;

  zz = vv;

  // normalize zz
  while (zz < 0) {
    zz += 2 * PI;
  }
  while (zz >= 2 * PI) {
    zz -= 2 * PI;
  }

  zz *= 24 / (2 * PI);  // convert from radians to hours
  vv = int(zz);		// vv = hours

  ww = (zz - vv) * 60;	// ww = minutes unrounded

  xx = int(ww);
  yy = ww - xx; // yy is the frction of a minute

  // round minute up if needed
  if (yy >= 0.5) {
    xx += 1;
  }

  // if rounding up the minute caused the hour bound to be passed, fix hour
  if (xx >= 60) {
    vv += 1;
    xx = 0;
  }

  // Set output variables
  OutputHour = int(vv);
  OutputMin = int(xx);
}





