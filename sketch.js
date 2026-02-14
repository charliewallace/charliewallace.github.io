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
const APP_VERSION = "v0.5.7 ©2026 Charlie Wallace";

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

var Latitude = 99999, Longitude = 99999;
var NewLatitude, NewLongitude;
var LastLat, LastLong;
var LatLocal, LngLocal;
var TzOffset, TzOffsetLocal;
var IsPreciseLocal = false; // Tracks if the local cache is precise (GPS) or approx (IP)
var LastTz;
var IsSunRiseSetObtained;
var IsTimezoneMismatch; // true if browser timezone doesn't match IP location timezone
var TimezoneWarningShown = false;  // true if timezone mismatch warning has been shown
var IsPreciseLocation = false; // true if using GPS location
var IsRequestingPrecise = false; // true if a GPS request is currently in flight
var LocationFetchSerial = 0; // Incrementing ID to track async location requests
var OtherLocationFetchSerial = 0; // Separate ID for "Other" location requests to prevent race conditions
var IsUserInitiatedLocation = false; // true if location was set by user action (GPS, preset, city lookup, manual)
var IsLoadingLocation = false; // true if waiting for location data (network or GPS)
var IsSearchingForOtherLocation = false; // true if the current location lookup is for the secondary spiral

var OutputHour, OutputMin;
var SunsetHour, SunsetMin, SecondsToSunset = 64800, BaseMsSunset;
var SunriseHour, SunriseMin, SecondsToSunrise = 21600, BaseMsSunrise;

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



// Multi-provider IP location fetch with failover support
function fetchIpLocation() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] Starting multi-provider IP location fetch...`);
  IsRequestingPrecise = false;
  setLoadingState();
  IsDisplayingUserLocation = true;
  IsPreciseLocation = false;
  IsPreciseLocal = false; // IP is not precise
  IsUserInitiatedLocation = false;

  if (locManager) {
    // locManager.clearOtherLocation(); // Removed: preserving other location when locating primary user
  }

  const providers = [
    {
      name: 'freeipapi.com',
      url: 'https://freeipapi.com/api/json',
      parse: (d) => ({
        lat: d.latitude,
        lon: d.longitude,
        city: d.cityName,
        timezone: d.timeZone
      })
    },
    {
      name: 'ipwho.is',
      url: 'https://ipwho.is/',
      parse: (d) => ({
        lat: d.latitude,
        lon: d.longitude,
        city: d.city,
        timezone: d.timezone ? d.timezone.id : null
      })
    },
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      parse: (d) => ({
        lat: d.latitude,
        lon: d.longitude,
        city: d.city,
        timezone: d.timezone
      })
    }
  ];

  let currentProviderIndex = 0;

  const tryNextProvider = () => {
    if (requestId !== LocationFetchSerial) return;

    if (currentProviderIndex >= providers.length) {
      console.warn(`[${requestId}] All IP location providers failed.`);
      handleIpFallback(requestId, "All providers failed");
      return;
    }

    const provider = providers[currentProviderIndex];
    console.log(`[${requestId}] Attempting fetch from ${provider.name}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout per provider

    fetch(provider.url, { signal: controller.signal })
      .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (requestId !== LocationFetchSerial) return;

        const results = provider.parse(data);
        if (results.lat === undefined || results.lon === undefined) {
          throw new Error("Invalid data format from provider");
        }

        console.log(`[${requestId}] Location found via ${provider.name}:`, results);

        // Success!
        Latitude = round(parseFloat(results.lat), 3);
        Longitude = round(parseFloat(results.lon), 3);

        var locationString = results.city ? "Near " + results.city : "Approximate Location";
        LocaleTitle = locationString;
        LocaleTitleLocal = locationString;

        // VPN Detection
        var browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (results.timezone) {
          IsTimezoneMismatch = (browserTimezone !== results.timezone);
        }

        if (IsTimezoneMismatch && !TimezoneWarningShown) {
          console.log("⚠️ Timezone mismatch detected");
          alert("⚠️ Timezone mismatch detected - possible VPN usage. Open 'Location Details' to approve GPS for better accuracy.");
          IsTimezoneMismatch = false;
          TimezoneWarningShown = true;
        }

        // Update UI
        LatInput.value(str(Latitude));
        LngInput.value(str(Longitude));
        LatLocal = Latitude;
        LngLocal = Longitude;
        LastLat = Latitude;
        LastLong = Longitude;

        // Sync with LocationManager
        if (locManager) {
          locManager.latitude = Latitude;
          locManager.longitude = Longitude;
          locManager.cityName = results.city || "Approximate Location";
        }

        // Pass isAuto=true to prevent marking this as a user-initiated location
        getTzUsingLatLong(Latitude, Longitude, requestId, null, false, true);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        console.warn(`[${requestId}] ${provider.name} failed:`, error.message);
        currentProviderIndex++;
        tryNextProvider();
      });
  };

  tryNextProvider();
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

  // Sync with LocationManager fallback
  if (locManager) {
    locManager.latitude = Latitude;
    locManager.longitude = Longitude;
    locManager.cityName = "Melbourne";
  }

  let alertMsg = "IP-based location detection failed or timed out. Defaulting to Melbourne, Australia.\n\nYou can manually set your location using the 'Other Location' button.";
  if (error && error.name === 'AbortError') {
    alertMsg = "IP location request timed out. This can happen if the geolocation service is slow or unreachable. Defaulting to Melbourne, Australia.";
  }
  alert(alertMsg);

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

  // (Location fetch logic moved to end of function to ensure UI is ready)

  // ==== Bind to existing HTML elements ======
  // NOTE: CSS handles all positioning now (responsive design)

  // --- NEW MODAL BUTTONS ---
  select('#btn-about').mousePressed(() => openModal('modal-about'));

  // --- MODAL CLOSE BUTTONS ---
  selectAll('.btn-close-modal').forEach(btn => {
    btn.mousePressed(closeAllModals);
  });

  selectAll('.modal-close').forEach(btn => {
    btn.mousePressed(closeAllModals);
  });

  // --- MODAL SUBMIT BUTTONS ---

  // Note: "Go" button removed. The "OK" button (#btn-select-location-ok) now triggers lookup.
  var okSelectLocBtn = select('#btn-select-location-ok');
  if (okSelectLocBtn) {
    okSelectLocBtn.mousePressed(() => {
      let val = CityNameInput.value();
      if (val && val.trim().length > 0) {
        // Trigger lookup, pass callback to close modal on success
        handleCitySubmitUnified(() => closeAllModals());
      } else {
        // No input, just close (act as Cancel/Close)
        closeAllModals();
      }
    });
  }

  // Manual coords submit button
  var coordsSubmitBtn = select('#btn-coords-submit-modal');
  if (coordsSubmitBtn) coordsSubmitBtn.mousePressed(handleCoordsSubmitUnified);

  // Manual Lat/Long button (opens modal-coords)
  var openManualBtn = select('#btn-open-manual');
  if (openManualBtn) openManualBtn.mousePressed(openManualCoordsModal);

  // Your Location button in modal
  var useGpsBtn = select('#btn-use-gps');
  if (useGpsBtn) useGpsBtn.mousePressed(() => {
    // Clear other location to return to single-location mode
    locManager.clearOtherLocation();
    IsDisplayingUserLocation = true;

    // Trigger spiral regeneration
    if (daySpiralRenderer && daySpiralRenderer.active) {
      daySpiralRenderer.resize(width, height);
    }

    updateDualModeUI();

    // RESTORE from local cache instead of triggering GPS prompt
    if (LatLocal !== 99999 && LngLocal !== 99999) {
      console.log("📍 Restoring user location from cache (IsPrecise=" + IsPreciseLocal + ")");
      Latitude = LatLocal;
      Longitude = LngLocal;
      TzOffset = TzOffsetLocal;
      if (LocaleTitleLocal) LocaleTitle = LocaleTitleLocal;
      IsPreciseLocation = IsPreciseLocal;

      // Update UI fields
      if (LatInput) LatInput.value(str(Latitude));
      if (LngInput) LngInput.value(str(Longitude));
      if (TzInput) {
        let tzStr = str(TzOffset);
        if (TzOffset > 0) tzStr = "+" + tzStr;
        TzInput.value(tzStr);
      }

      IsSunRiseSetObtained = false;
      updateTimeThisDay();
      updateUrlHash();
    } else {
      // Fallback: This shouldn't normally happen as IP location is fetched on startup
      console.log("⚠️ No local cache found, triggering GPS as fallback");
      usePreciseLocation(false);
    }

    closeAllModals();
  });

  // --- PRESET MODAL BUTTONS (Unified) ---
  select('#btn-loc-silverado-u').mousePressed(() => { setSilverado(); closeAllModals(); });
  select('#btn-loc-berkeley-u').mousePressed(() => { setBerkeley(); closeAllModals(); });
  select('#btn-loc-sandiego-u').mousePressed(() => { setSanDiego(); closeAllModals(); });
  select('#btn-loc-london-u').mousePressed(() => { setLondon(); closeAllModals(); });
  select('#btn-loc-kc-u').mousePressed(() => { setKansasCity(); closeAllModals(); });
  select('#btn-loc-melbourne-u').mousePressed(() => { setMelbourne(); closeAllModals(); });




  // GMT button removed - feature deprecated

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

  // "GPS OK?" Button (Relocated to modal)
  var gpsBtnModal = select('#btn-gps-modal');
  if (gpsBtnModal) gpsBtnModal.mousePressed(() => {
    usePreciseLocation(false);
    closeAllModals();
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

  // DaySpiral Guided Transition Checkbox
  var transitionCheck = select('#check-dayspiral-guided-transition');
  if (transitionCheck) transitionCheck.changed(() => {
    if (daySpiralRenderer) {
      daySpiralRenderer.dualModeAnimationEnabled = transitionCheck.checked();
      updateUrlHash();
    }
  });


  // Select Different Location Button
  var selectLocBtn = select('#btn-select-loc');
  if (selectLocBtn) selectLocBtn.mousePressed(() => {
    IsSearchingForOtherLocation = true;
    openModal('modal-select-location');
  });

  // Location Details Button (opens same details modal)
  var detailsBtn = select('#btn-details-desktop');
  if (detailsBtn) detailsBtn.mousePressed(openDetailsModal);

  // Renderer Switching logic
  select('#opt-dayspiral').mousePressed(() => setClockMode('dayspiral'));
  select('#opt-mobius').mousePressed(() => setClockMode('mobius'));

  // DaySpiral Hours Toggle
  select('#btn-dayspiral-hours').mousePressed(toggleDaySpiralHours);

  // Initial UI state update for Dual Mode features
  updateDualModeUI();

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

  // ==== INITIAL LOCATION LOGIC ====

  // 1. Parse URL hash
  var locationStatus = parseUrlHash();

  // 2. Apply initial state (mode, settings, etc.)
  applyInitialState();

  // 3. Coordinate initial location fetch (GPS or IP)
  // Only skip if a PRIMARY location was found in the URL. 
  // If only an 'other' location was found, we still need to find 'you'.
  if (!locationStatus.primaryFound && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(function (result) {
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

      result.onchange = function () {
        console.log("Location permission changed to:", result.state);
        if (result.state !== 'granted') {
          if (IsPreciseLocation || IsRequestingPrecise) {
            console.log("Permission retracted, reverting to IP location.");
            IsRequestingPrecise = false;
            IsPreciseLocation = false;
            IsUserInitiatedLocation = false;
            NewLatitude = 99999;
            NewLongitude = 99999;

            if (LatLocal !== 99999 && LngLocal !== 99999) {
              console.log("Instantly restoring cached approximate location.");
              Latitude = LatLocal;
              Longitude = LngLocal;
              if (LocaleTitleLocal) LocaleTitle = LocaleTitleLocal;
              IsDisplayingUserLocation = true;
              LatInput.value(str(Latitude));
              LngInput.value(str(Longitude));
              clearLoadingState();
            } else {
              fetchIpLocation();
            }
            updateUIElements();
            IsSunRiseSetObtained = false;
            updateTimeThisDay();
          }
        } else {
          if (!IsPreciseLocation) {
            usePreciseLocation(true);
          }
        }
      };
    }).catch(err => {
      console.warn("Permissions query failed:", err);
      fetchIpLocation();
    });
  } else if (!locationStatus.primaryFound) {
    // Fallback if browser doesn't support permissions API or URL has no location
    console.log("Permissions API not available or no primary location in URL, defaulting to IP.");
    fetchIpLocation();
  }

  // Final check: if we found a location in URL, ensure we aren't "Finding you..."
  if (locationStatus.primaryFound || locationStatus.otherFound) {
    clearLoadingState();
  }
} // end of oneTimeInit()  ====================


// Parse location and state from URL hash
function parseUrlHash() {
  var hash = window.location.hash.substring(1); // remove #
  if (!hash) return { primaryFound: false, otherFound: false };

  var primaryFound = false;
  var otherFound = false;

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
  var daySpiralShowHours = params.get('daySpiralShowHours');
  var dualAnim = params.get('dualAnim');

  if (daySpiralStyle || daySpiralTimeFormat || daySpiralShowHours !== null || dualAnim !== null) {
    window._initialDaySpiralState = {
      style: daySpiralStyle || 'Classic',
      timeFormat: daySpiralTimeFormat || '12',
      showHours: daySpiralShowHours === '1', // Default false
      dualAnim: dualAnim !== '0' // Default true
    };
  }

  // Mobius state - store for later application
  // Only parse if we have at least one Mobius parameter
  if (params.has('timeStyle') || params.has('shapeHours') || params.has('rotation') ||
    params.has('demo') || params.has('showHours') || params.has('dali') || params.has('dayNight')) {
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
      dayNight: params.get('dayNight') !== '0' // Default true (enabled unless explicitly 0)
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
    IsDisplayingUserLocation = false; // We are showing a specific location from URL, not identifying user
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
    primaryFound = true;
  }

  // Parse Alternate Location attributes
  var otherLat = params.get('otherLat');
  var otherLon = params.get('otherLon');
  var otherTz = params.get('otherTz'); // might be null
  var otherCity = params.get('otherCity');

  // Check validity of coordinates
  var hasOtherCoords = isValidCoord(otherLat) && isValidCoord(otherLon);
  var hasOtherTz = isValidCoord(otherTz);

  if (hasOtherCoords) {
    // SCENARIO 1: We have coordinates
    if (hasOtherTz) {
      // 1A: Full data (Lat/Lon + TZ) -> Immediate apply
      console.log("Parsed alternate URL location:", { otherLat, otherLon, otherTz, otherCity });
      window._initialOtherLocation = {
        lat: parseFloat(otherLat),
        lon: parseFloat(otherLon),
        tz: parseFloat(otherTz),
        city: otherCity ? decodeURIComponent(otherCity) : "URL Location"
      };
      otherFound = true;

      // If city is missing (but we have coords+TZ), trigger reverse geocode to get a better name
      // Also trigger if the city is the generic fallback "URL Location"
      if (!otherCity || decodeURIComponent(otherCity) === "URL Location") {
        console.log("Parsed alternate URL coords but missing/generic City Name. Fetching name...");
        fetchReverseGeocodeWithFailover(parseFloat(otherLat), parseFloat(otherLon), 0, true, true);
      }
    } else {
      // 1B: Missing Timezone -> Async Fetch
      console.log("Parsed alternate URL coords but missing TZ. Fetching...", { otherLat, otherLon });
      // Trigger async TZ lookup.
      setLoadingState();
      getTzUsingLatLong(parseFloat(otherLat), parseFloat(otherLon), 0,
        otherCity ? decodeURIComponent(otherCity) : "URL Location", true, true);

      // If city is ALSO missing, trigger reverse geocode as well
      if (!otherCity || decodeURIComponent(otherCity) === "URL Location") {
        console.log("Parsed alternate URL coords also missing/generic City Name. Fetching name...");
        fetchReverseGeocodeWithFailover(parseFloat(otherLat), parseFloat(otherLon), 0, true, true);
      }
    }
  } else if (otherCity) {
    // SCENARIO 2: No coordinates, but we have a City Name -> Async Lookup
    console.log("Parsed alternate URL city only. Looking up:", otherCity);
    setLoadingState();
    // Trigger async City lookup. 
    // isOther=true
    getLocationUsingCityName(decodeURIComponent(otherCity), 0, true);
  }

  return { primaryFound, otherFound };
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

    // REMOVED: state.showHours support dropped.

    if (state.dualAnim !== undefined) {
      daySpiralRenderer.dualModeAnimationEnabled = state.dualAnim;
      const chk = select('#check-dayspiral-guided-transition');
      if (chk) chk.checked(state.dualAnim);
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
      mobiusRenderer.setDaliMode(state.dali, true);
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

  // Apply alternate location if specified
  if (window._initialOtherLocation) {
    const other = window._initialOtherLocation;
    console.log("  🌎 Applying initial alternate location:", other.city);
    setOtherLocation(other.lat, other.lon, other.tz, other.city);
    delete window._initialOtherLocation;
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
    'tickScheme', 'rotation', 'demo', 'showHours', 'dali', 'dayNight',
    'otherLat', 'otherLon', 'otherTz', 'otherCity'
  ];
  managedKeys.forEach(key => params.delete(key));

  // PRIVACY-FIRST LOCATION HANDLING:
  // Only include location if it was MANUALLY SELECTED (preset/city/manual entry)
  // Do NOT include user's current location (GPS or IP-based)
  if (!IsDisplayingUserLocation && Latitude !== 99999 && Longitude !== 99999 &&
    !isNaN(Latitude) && !isNaN(Longitude)) {

    var city = LocaleTitle || "";

    // FORCE-SAFEGUARD: Never include titles that look like IP-based approximations
    // OR if we suspect this is actually the user's location
    if (city.includes("Near ") || city === "Approximate Location" || city === "URL Location") {
      console.log("  ⚠️ Privacy Override: Title implies IP location, blocking URL leak");
    } else {
      params.set('lat', Latitude);
      params.set('lon', Longitude);
      params.set('tz', TzOffset);
      if (city) {
        params.set('city', city);
      }
      console.log("  📍 Including manually-selected location in URL");
    }
  } else {
    // Ensure no location data is in the URL
    console.log("  🔒 Privacy: Not including user's current location in URL");
    // ULTIMATE SAFEGUARD: Explicitly ensure they are deleted if they was somehow added
    params.delete('lat');
    params.delete('lon');
    params.delete('city');
  }

  // Include Alternate Location if active
  if (locManager && locManager.hasOtherLocation()) {
    const other = locManager.otherLocation;
    params.set('otherLat', other.latitude);
    params.set('otherLon', other.longitude);
    params.set('otherTz', other.tzOffset);
    if (other.cityName) {
      params.set('otherCity', other.cityName);
    }
    console.log("  🌎 Including alternate location in URL");
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

    // REMOVED: daySpiralShowHours is no longer persisted as the button is removed.
    // Numbers are implicitly managed (Hidden in Classic, Used in Dual Mode).

    // Add dualAnim setting (non-default: disabled)
    if (daySpiralRenderer.dualModeAnimationEnabled === false) {
      params.set('dualAnim', '0');
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

  if (typeof activeRenderer !== 'undefined' && typeof mobiusRenderer !== 'undefined' && activeRenderer === mobiusRenderer) {
    if (titleEl) titleEl.textContent = 'Mobius Clock';
    // Show condensed Mobius description for desktop
    var mobiusDescText = 'A Mobius strip shows 24-hour time on a 12-hour face. ' +
      'The hour indicator makes 2 full turns to return to its starting point.';
    if (descEl) descEl.textContent = mobiusDescText;
  } else {
    if (titleEl) titleEl.textContent = 'Day Spiral Clock';
    var descText = 'To show night and day you need a 24-hour clock; ' +
      'using a spiral is a way to squeeze 24 hours into a 12-hour clock face. ';
    if (descEl) descEl.textContent = descText;

    // Manage 'Hours' button visibility
    // REMOVED PER USER REQUEST: The "Hours" button is no longer needed in Classic/Single mode.
    // It is always hidden now.
    const btnHours = select('#btn-dayspiral-hours');
    if (btnHours) {
      btnHours.hide();
    }
  }

  // About modal text is now static and set in oneTimeInit()


  // Update locale title
  var localeEl = document.getElementById('locale-title');
  if (localeEl) {
    if (IsLoadingLocation) {
      if (!IsDesktop && window.innerHeight > window.innerWidth) {
        localeEl.textContent = "Loading...";
      } else {
        localeEl.textContent = "Loading Location...";
      }
    } else {
      // Prioritize showing the "Other" city name in the title if it exists
      if (locManager && locManager.hasOtherLocation()) {
        let mobileTitle = locManager.otherLocation.cityName || LocaleTitle;
        // DaySpiral Dual Mode: Show time next to location name (matching desktop behavior)
        if (activeRenderer === daySpiralRenderer) {
          const otherTimeStr = TimeKeeper.getFormattedTimeForOffset(locManager.otherLocation.tzOffset, false); // No seconds
          mobileTitle += " " + otherTimeStr;
        }
        localeEl.textContent = mobileTitle;
      } else {
        localeEl.textContent = LocaleTitle;
      }
    }
  }

  // NEW: Update Location Description (Desktop)
  var locDescEl = document.getElementById('location-description');
  if (locDescEl) {
    if (IsLoadingLocation) {
      locDescEl.textContent = "Finding you...";
    } else {
      // Prioritize showing the "Other" city name
      if (locManager && locManager.hasOtherLocation()) {
        let desc = locManager.otherLocation.cityName || LocaleTitle;
        // DaySpiral Dual Mode: User wants time next to location name
        if (activeRenderer === daySpiralRenderer) {
          const otherTimeStr = TimeKeeper.getFormattedTimeForOffset(locManager.otherLocation.tzOffset, false); // No seconds
          desc += " " + otherTimeStr;
        }
        locDescEl.textContent = desc;
      } else {
        locDescEl.textContent = LocaleTitle;
      }
    }

    // --- ANIMATION: Location Visibility & Blink (Dual Mode Transition) ---
    if (daySpiralRenderer && daySpiralRenderer.isAnimatingDualMode) {
      const stage = daySpiralRenderer.animationStage;
      if (stage === 1) {
        // Stage 1: Triple Blink Yellow (50% duty cycle square wave, 3 cycles)
        const progress = daySpiralRenderer.getAnimationProgress();
        const isVisible = (progress * 3 % 1.0) < 0.5;
        const colorStr = '#ffffaa';
        const opVal = isVisible ? '1' : '0';

        if (localeEl) { localeEl.style.color = colorStr; localeEl.style.opacity = opVal; }
        if (locDescEl) { locDescEl.style.color = colorStr; locDescEl.style.opacity = opVal; }
      } else if (stage >= 2 && stage <= 6) {
        // Stage 2-6: Completely hide DOM (migrated to canvas)
        if (localeEl) { localeEl.style.opacity = '0'; }
        if (locDescEl) { locDescEl.style.opacity = '0'; }
      }
    } else {
      // Reset color & opacity when not animating
      if (localeEl) {
        if (localeEl.style.color !== '') localeEl.style.color = '';
        if (localeEl.style.opacity !== '') localeEl.style.opacity = '';
      }
      if (locDescEl) {
        if (locDescEl.style.color !== '') locDescEl.style.color = '';
        if (locDescEl.style.opacity !== '') locDescEl.style.opacity = '';
      }
    }
  }

  // Update time display
  var timeEl = document.getElementById('time-display');
  if (timeEl) {
    if (IsLoadingLocation) {
      // keep empty or show dots?
    } else if (TimeString) {
      // For mobile 'time-display', stick to main time
      timeEl.textContent = TimeString;
    }
  }

  // NEW: Large Time Display
  var timeLargeEl = document.getElementById('time-display-large');
  if (timeLargeEl) {
    if (IsLoadingLocation) {
      timeLargeEl.textContent = "..."; // Blank out or show placeholder during loading
    } else {
      // Get primary (user) time
      const userTimeStr = TimeKeeper.getFormattedTimeForOffset(TzOffset, true);

      // Check if we are in Dual Mode (DaySpiral + Other Location)
      const isDualTimeMode = locManager && locManager.hasOtherLocation() && activeRenderer === daySpiralRenderer;

      if (isDualTimeMode) {
        // User requested the "other" time be in the location description (handled above).
        // So here we should show the LOCAL time (User's time) as the main clock.
        // OR: "Other Time | Local: User Time" ? 
        // User said: "I want to clarify that the whole 'dual mode' concept doesn't extend to the mobius clock"
        // and "I'd like the 'other' time to show up to the right of the location description."
        // This suggests cleaning up the header.
        // Let's show just Local Time here, since Other Time is now next to the Location Name.
        timeLargeEl.textContent = userTimeStr;
        if (timeEl) timeEl.textContent = userTimeStr; // Sync mobile

      } else if (locManager && locManager.hasOtherLocation() && activeRenderer === mobiusRenderer) {
        // Mobius Mode with an Other Location set (e.g. switched from DaySpiral):
        // Display the Other Location's time (Substitution behavior).
        const otherTimeStr = TimeKeeper.getFormattedTimeForOffset(locManager.otherLocation.tzOffset, true);
        timeLargeEl.textContent = otherTimeStr;
        if (timeEl) timeEl.textContent = otherTimeStr;
      } else {
        // standard single local time
        timeLargeEl.textContent = userTimeStr;
        if (timeEl) timeEl.textContent = userTimeStr;
      }
    }
  }

  // NEW: Update GPS OK Button State (Now in Modal)
  // We only show the button when we are in user location mode but NOT YET precise.
  var gpsBtnModal = document.getElementById('btn-gps-modal');
  var gpsAccMsg = document.getElementById('gps-accuracy-msg');

  if (gpsBtnModal) {
    if (IsDisplayingUserLocation && !IsPreciseLocation) {
      gpsBtnModal.classList.add('gps-show');
      if (gpsAccMsg) gpsAccMsg.classList.add('gps-show');
    } else {
      gpsBtnModal.classList.remove('gps-show');
      if (gpsAccMsg) gpsAccMsg.classList.remove('gps-show');
    }
  }

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
  // Force immediate update to hide day/night colors while loading
  if (typeof mobiusRenderer !== 'undefined') mobiusRenderer.refreshDayNight();
}

function clearLoadingState() {
  IsLoadingLocation = false;
  // Ensure Mobius updates its colors now that loading is finished
  if (typeof mobiusRenderer !== 'undefined') mobiusRenderer.refreshDayNight();
}

// --- MODAL FUNCTIONS ---

function openModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(modalId).classList.remove('hidden');

  // Clear inputs if opening select location modal
  if (modalId === 'modal-select-location') {
    let input = select('#city-search-input');
    if (input) input.value('');
    let err = select('#city-error-msg');
    if (err) err.html('');
  }
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));

  // Reset context flags
  IsSearchingForOtherLocation = false;

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
    // Check if we are in dual-location mode
    const isDual = locManager && locManager.hasOtherLocation() && activeRenderer === daySpiralRenderer;

    let targetLat, targetLon, targetTz, targetCity, targetSunriseHour, targetSunriseMin, targetSunsetHour, targetSunsetMin, targetTzStr, targetDstStr;

    if (isDual) {
      const other = locManager.otherLocation;
      targetLat = other.latitude;
      targetLon = other.longitude;
      targetTz = other.tzOffset;
      targetCity = other.cityName || "Other Location";
      // We use sunrise/sunset for 'other' location from TimeKeeper
      targetSunriseHour = timeKeeper.otherSunriseTime.hour;
      targetSunriseMin = timeKeeper.otherSunriseTime.minute;
      targetSunsetHour = timeKeeper.otherSunsetTime.hour;
      targetSunsetMin = timeKeeper.otherSunsetTime.minute;
      targetTzStr = (targetTz >= 0 ? "+" : "") + targetTz;
      targetDstStr = ""; // We don't track DST for 'other' location specifically in the same way
    } else {
      targetLat = Latitude;
      targetLon = Longitude;
      targetTz = TzOffset;
      targetCity = LocaleTitle;
      targetSunriseHour = SunriseHour;
      targetSunriseMin = SunriseMin;
      targetSunsetHour = SunsetHour;
      targetSunsetMin = SunsetMin;
      targetTzStr = (targetTz >= 0 ? "+" : "") + targetTz;
      targetDstStr = (typeof IsDst !== 'undefined') ? (IsDst ? "Active" : "Standard Time") : "Unknown";
    }

    // Calculate time for the target location
    let now = new Date();
    // BrowserTzOffset is negative minutes from UTC (e.g. PST is +480)
    // localTz here is GMT offset in hours (e.g. PST is -8)
    let localTz = (typeof BrowserTzOffset !== 'undefined') ? BrowserTzOffset : TzOffsetLocal;
    let offsetDiffHours = targetTz - localTz;
    let targetTime = new Date(now.getTime() + (offsetDiffHours * 3600000));

    let th = targetTime.getHours();
    let tm = targetTime.getMinutes();
    let tampm = th >= 12 ? 'PM' : 'AM';
    let th12 = th % 12 || 12;
    let targetTimeString = `${th12}:${nf(tm, 2, 0)} ${tampm}`;
    let targetDateString = targetTime.toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" });

    let htmlContent = `
      <div class="details-grid">
        <div class="details-column">
          <p><span class="label">City</span> <span class="value">${targetCity}</span></p>
          <p><span class="label">Time</span> <span class="value">${targetTimeString}</span></p>
          <p><span class="label">Date</span> <span class="value">${targetDateString}</span></p>
        </div>
        <div class="details-column">
          <p><span class="label">Lat / Lng</span> <span class="value">${nfc(targetLat, 2)}, ${nfc(targetLon, 2)}</span></p>
          <p><span class="label">Time Zone</span> <span class="value">GMT ${targetTzStr}</span></p>
          <p><span class="label">Sunrise</span> <span class="value">${getFormattedTime(targetSunriseHour, targetSunriseMin)}</span></p>
          <p><span class="label">Sunset</span> <span class="value">${getFormattedTime(targetSunsetHour, targetSunsetMin)}</span></p>
          ${targetDstStr ? `<p><span class="label">DST</span> <span class="value">${targetDstStr}</span></p>` : ''}
        </div>
      </div>
    `;

    content.innerHTML = htmlContent;
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
    const requestId = ++LocationFetchSerial;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;

    // Pass requestId to callback using a wrapper
    loadJSON(url, (data) => gotCityLocationDataModal(data, requestId), handleNetworkError);
  } else {
    errEl.html("Please enter a city name.");
  }
}

// Callback for mobile modal city lookup
function gotCityLocationDataModal(data, requestId) {
  if (requestId && requestId !== LocationFetchSerial) return;
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

    getTzUsingLatLong(Latitude, Longitude, requestId); // This updates TZ and closes loop
    closeAllModals();
    // If we have a success callback (from the OK button), call it now
    if (successCallback) {
      successCallback();
    }
    // Also clear input on success
    if (CityNameInput) CityNameInput.value('');

  } else {
    clearLoadingState();
    let errEl = select('#city-error-msg');
    if (errEl) errEl.html("City not found. Please try 'City, Country'.");
    // DO NOT call successCallback here, so modal stays open for user to fix input
  }
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

  SecondsRadius = radius * 0.82;
  MinutesRadius = radius * 0.80;
  HoursRadius = radius * 0.55;
  ClockDiameter = radius * 1.912;

  // radius to centers of numbers
  HourNumbersRadius = radius * 0.893;
  InnerFaceRadius = radius * 0.83;

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
  startFrac = 0.29;
  endFrac = 0.78;

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

  // Sync TimeKeeper with the new location/times
  if (typeof timeKeeper !== 'undefined') {
    timeKeeper.calculateSunTimes(Latitude, -Longitude, TzOffset, false);
  }
}



// ========================================================
// Update time-related vars.
function updateTimeThisDay() {
  // Sync TimeKeeper
  if (timeKeeper) timeKeeper.update(TzOffset);

  // Sync LocationManager (Always ensure it matches globals)
  if (locManager && Latitude !== 99999) {
    locManager.latitude = Latitude;
    locManager.longitude = Longitude;
    locManager.tzOffset = TzOffset;
  }


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
// Handler for the toggling DaySpiral Hours button
function toggleDaySpiralHours() {
  if (daySpiralRenderer) {
    daySpiralRenderer.toggleHours();

    // Update button visual state
    let btn = select('#btn-dayspiral-hours');
    if (daySpiralRenderer.hoursVisible) {
      btn.addClass('toggled-on');
    } else {
      btn.removeClass('toggled-on');
    }

    updateUrlHash();
  }
}


//-----------------------------------------------------------------
// Handler for location errors
function handleLocationError(error) {
  console.log("GPS location error:", error.message);
  clearLoadingState(); // Ensure we don't stay gray on error
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
  exitZenMode();
  var errorMsg = "Could not reach the location service. This may be due to a service outage, CORS issue, ad blocker, or network loss.";

  if (err && err.name === 'AbortError') {
    errorMsg = "The location request timed out. The service might be slow or experiencing downtime.";
  }

  alert(errorMsg);

  clearLoadingState();
  if (typeof CityNameInput !== 'undefined') CityNameInput.value('');

  if (!IsSearchingForOtherLocation && typeof PrevLocaleTitle !== 'undefined') {
    LocaleTitle = PrevLocaleTitle;
  }

  IsSearchingForOtherLocation = false;
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

  if (locManager) {
    // locManager.clearOtherLocation(); // Removed: preserving other location when upgrading to precise
  }

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

      // Update Local cache
      LatLocal = Latitude;
      LngLocal = Longitude;
      IsPreciseLocal = true; // GPS is precise

      // Update UI fields
      var latString = str(Latitude);
      LatInput.value(latString);
      LastLat = Latitude;

      var longString = str(Longitude);
      LngInput.value(longString);
      LastLong = Longitude;

      // Sync with LocationManager
      if (locManager) {
        locManager.latitude = Latitude;
        locManager.longitude = Longitude;
        locManager.cityName = "Your Location";
        locManager.isPrecise = true;
      }

      CityNameInput.value("");

      // Start failover-enabled lookups
      fetchReverseGeocodeWithFailover(Latitude, Longitude, requestId, isAuto);
      fetchTimezoneWithFailover(Latitude, Longitude, requestId, null, false, isAuto);

      if (IsUserInitiatedLocation) {
        updateUrlHash();
      }

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
  handlePresetLocation(33.743, -117.643, -8, "Silverado, CA", "Silverado, CA, USA");
}


//=======================
// Set location and timezone to London England
//  
function setLondon() {
  handlePresetLocation(51.507, -0.127, 0, "London, UK", "London, UK");
}

function setBerkeley() {
  handlePresetLocation(37.871, -122.273, -8, "Berkeley, CA", "Berkeley, CA, USA");
}

function setSanDiego() {
  handlePresetLocation(32.715, -117.161, -8, "San Diego, CA", "San Diego, CA, USA");
}

function setKansasCity() {
  handlePresetLocation(39.099, -94.578, -6, "Kansas City, MO", "Kansas City, MO, USA");
}

function setMelbourne() {
  handlePresetLocation(-37.814, 144.963, 11, "Melbourne, Australia", "Melbourne, Australia");
}

/**
 * Unified helper for preset location buttons
 */
function handlePresetLocation(lat, lon, tz, title, fullTitle) {
  if (IsSearchingForOtherLocation) {
    setOtherLocation(lat, lon, tz, title);
    closeAllModals();
    return;
  }

  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] setPresetLocation(${title})`);

  IsTimezoneMismatch = false;
  IsUserInitiatedLocation = true;
  IsDisplayingUserLocation = false;
  PrevLocaleTitle = LocaleTitle;

  if (CityNameInput) CityNameInput.value(fullTitle);
  LocaleTitle = title;

  Latitude = lat;
  Longitude = lon;
  TzOffset = tz;

  // Update LocationManager (Primary)
  if (locManager) {
    locManager.latitude = lat;
    locManager.longitude = lon;
    locManager.tzOffset = tz;
    locManager.cityName = title;
    locManager.isPrecise = true;
  }

  setLoadingState();
  getTzUsingLatLong(Latitude, Longitude, requestId);

  // Update UI inputs
  if (TzInput) {
    let tzStr = str(tz);
    if (tz > 0) tzStr = "+" + tzStr;
    TzInput.value(tzStr);
  }
  LastTz = TzOffset;

  if (LatInput) LatInput.value(str(lat));
  LastLat = lat;

  if (LngInput) LngInput.value(str(lon));
  LastLong = lon;

  IsSunRiseSetObtained = false;
  updateUrlHash();
  updateTimeThisDay();
  closeAllModals();
}


//=======================
// DELETED OLD DUPLICATE PRESETS (Merged into setOtherLocation logic at end of file)


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
//========================================================
// Handle City Search Submit (Unified for both Primary and Other)
// Now accepts an optional successCallback (used by OK button to close modal)
function handleCitySubmitUnified(successCallback = null) {
  // Determine context first
  var isOther = false;
  if (daySpiralRenderer && daySpiralRenderer.active) {
    // If DaySpiral is active, we check if we are setting the "Other" location
    // But wait, the modal is global. IsSearchingForOtherLocation should be set when opening.
    if (typeof IsSearchingForOtherLocation !== 'undefined') {
      isOther = IsSearchingForOtherLocation;
    }
  } else {
    // Mobius etc
    isOther = false;
  }

  // Also check explicit global flag which overrides renderer check
  if (typeof IsSearchingForOtherLocation !== 'undefined' && IsSearchingForOtherLocation) {
    isOther = true;
  }

  const requestId = isOther ? ++OtherLocationFetchSerial : ++LocationFetchSerial;
  console.log(`[${requestId}] handleCitySubmitUnified(isOther=${isOther})`);

  // Clear previous errors
  let errEl = select('#city-error-msg');
  if (errEl) errEl.html("");

  // Get input
  if (!CityNameInput) return;
  var rawInput = CityNameInput.value();

  if (!rawInput || rawInput.trim().length === 0) {
    // Should handle empty input? 
    // If called from OK button logic, this block might be unreachable if checked there,
    // but good for safety.
    return;
  }

  CityName = rawInput.trim(); // Global CityName updated

  // Use the full string entered by the user
  // Pass the callback down the chain
  getLocationUsingCityName(CityName, requestId, isOther, successCallback);

  // Clear the input field? Maybe wait until success?
  // If we clear now, and it fails, user has to retype. 
  // Better to clear only on success.
}

function handleCoordsSubmitUnified() {
  const requestId = ++LocationFetchSerial;
  console.log(`[${requestId}] handleCoordsSubmitUnified()`);
  // Use IDs from #modal-coords (shared mobile/desktop manual modal)
  var lat = parseFloat(select('#input-lat').value());
  var lng = parseFloat(select('#input-lon').value());
  var tz = parseFloat(select('#input-tz').value());

  if (isNaN(lat) || isNaN(lng)) {
    alert("Invalid Coordinates");
    return;
  }

  console.log("Submit Manual Coords: Lat=" + lat + " Lng=" + lng + " Tz=" + tz);

  // In DaySpiral mode, manual coordinates now target the alternate location
  if (daySpiralRenderer && daySpiralRenderer.active) {
    console.log("  📍 Setting manual alternate location");
    setOtherLocation(lat, lng, isNaN(tz) ? 0 : tz, "Manual Location");

    // Trigger reverse geocoding to find the city name
    // Signature: fetchReverseGeocodeWithFailover(lat, lon, requestId, isAuto, isOther)
    fetchReverseGeocodeWithFailover(lat, lng, 0, false, true);

    closeAllModals();
    return;
  }

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

  // Trigger reverse geocoding to find the city name
  // Signature: fetchReverseGeocodeWithFailover(lat, lon, requestId, isAuto, isOther)
  fetchReverseGeocodeWithFailover(lat, lng, 0, false, false);

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
// Alternate way to set location, timezone, and IsDst using passed city name.
function getLocationUsingCityName(passedCityName, requestId = 0, isOther = IsSearchingForOtherLocation, successCallback = null) {
  if (requestId === 0) {
    requestId = isOther ? ++OtherLocationFetchSerial : ++LocationFetchSerial;
  }
  console.log(`[${requestId}] getLocationUsingCityName(${passedCityName}, isOther=${isOther})`);

  if (!isOther) PrevLocaleTitle = LocaleTitle; // Only capture for primary location reversion

  CityName = passedCityName;

  let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(CityName)}`;
  setLoadingState();
  // Pass callback to the completion handler
  loadJSON(apiUrl, (data) => gotCityLocationDataOpenStMap(data, requestId, isOther, successCallback), handleNetworkError);
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
// The response to the API call for the city name has// Callback
function gotCityLocationDataOpenStMap(data, requestId, isOther = IsSearchingForOtherLocation, successCallback = null) {
  const currentSerial = isOther ? OtherLocationFetchSerial : LocationFetchSerial;
  if (requestId && requestId !== currentSerial) {
    console.log(`[${requestId}] gotCityLocationDataOpenStMap: Ignoring stale callback.`);
    return;
  }

  if (data.length != 0) {
    console.log("City location data from OpenStreetMap:")
    console.log(data[0]);

    let result = data[0];
    let extractedCity = "";

    if (result.display_name) {
      let parts = splitTokens(result.display_name, ',');
      if (parts.length > 0) extractedCity = trim(parts[0]);
    }

    if (!isOther) {
      LocaleTitle = extractedCity;
    }

    let lat = result.lat;
    let lon = result.lon;

    let timeZoneOffset = getTimeZoneOffset(lat, lon);

    if (!isOther) {
      TzOffset = timeZoneOffset;
    }

    if (lat > 90 || lat < -90 || lon < -180 || lon > 180) {
      console.log("Error, invalid lat or long.  Lat=" + str(lat) + " Long=" + str(lon))
      clearLoadingState();
    }
    else if (timeZoneOffset > 13 || timeZoneOffset < -13) {
      console.log("Error, invalid time zone offest=" + str(timeZoneOffset));
      clearLoadingState();
    }
    else {
      lat = round(lat, 3);
      lon = round(lon, 3);

      NewLatitude = lat;
      NewLongitude = lon;

      let timezoneUrl =
        `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=charliewallace`;
      console.log('timezoneUrl=' + timezoneUrl);

      // Add a timeout for the timezone fetch during city lookup
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      fetch(timezoneUrl, { signal: controller.signal })
        .then(response => {
          clearTimeout(timeoutId);
          return response.json();
        })
        .then(data => {
          // City search is NOT auto, it's user-initiated
          // Pass successCallback down to gotCityTzData
          gotCityTzData(data, requestId, lat, lon, extractedCity, isOther, false, successCallback);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error(`[${requestId}] City lookup timezone fetch error:`, error);
          handleNetworkError(error);
        });
    }
  }
  else {
    console.log(`No results found for ${CityName}`);
    alert(`Could not find location for: ${CityName}`);
    if (CityNameInput) CityNameInput.value('');
    if (!isOther) LocaleTitle = PrevLocaleTitle;
    clearLoadingState();
  }
}


// using GeoNames service.  Handler for fetching timezone.
// The response to the API call to get the city's time zone offset has arrived.
// There is a time delay between this and the code above where
// loadJSON is called.
/**
 * Timezone callback from GeoNames or failover
 */
function gotCityTzData(data, requestId, lat, lon, cityName, isOther = IsSearchingForOtherLocation, isAuto = false, successCallback = null) {
  const currentSerial = isOther ? OtherLocationFetchSerial : LocationFetchSerial;
  if (requestId && requestId !== currentSerial) {
    console.log(`[${requestId}] gotCityTzData: Ignoring stale callback.`);
    return;
  }
  console.log(`Entering gotCityTzData(lat=${lat}, lon=${lon}, isOther=${isOther}).`);

  if (data.length != 0) {
    let timeZoneOffset = data.gmtOffset;

    // DUAL MODE (DaySpiral Only)
    if (isOther && daySpiralRenderer && daySpiralRenderer.active) {
      console.log(`  🌎 Dual mode: Setting other location to ${cityName}`);
      setOtherLocation(lat, lon, timeZoneOffset, cityName);

      // Reset flags
      IsSearchingForOtherLocation = false;
      clearLoadingState();

      // Call success callback (closes modal)
      if (successCallback) successCallback();
      return;
    }

    // SUBSTITUTION MODE (Mobius or other)
    // If isOther is true but we aren't in DaySpiral, we treat this as a replacement 
    // of the primary location. We just let it fall through to the standard logic below.
    if (isOther) {
      console.log(`  🔄 Substitution mode: Replacing primary location with ${cityName}`);
      IsSearchingForOtherLocation = false; // Clear flag so it sticks as primary
      // We also need to ensure the UI updates the title to this new city
      // The logic below uses 'cityName' or 'CityName' global.
    }

    TzOffset = timeZoneOffset;

    let rawOffset = data.rawOffset;
    if (rawOffset == timeZoneOffset) {
      IsDst = false;
    }
    else {
      IsDst = true;
    }

    Latitude = lat;
    Longitude = lon;

    var tzString;
    if (timeZoneOffset > 0) {
      timeZoneOffset = int(timeZoneOffset);
      tzString = "+" + str(timeZoneOffset);
    }
    else {
      timeZoneOffset = -int(-timeZoneOffset);
      tzString = str(timeZoneOffset);
    }

    if (TzInput) TzInput.value(tzString);
    if (!isOther) {
      TzOffsetLocal = timeZoneOffset; // Update local cache
    }
    if (LatInput) LatInput.value(str(Latitude));
    if (LngInput) LngInput.value(str(Longitude));

    IsSunRiseSetObtained = false;

    if (!isAuto && !IsPreciseLocation && !IsRequestingPrecise) {
      IsUserInitiatedLocation = true;
      IsDisplayingUserLocation = false;
    }

    console.log(`City: ${cityName || CityName}`);
    console.log(`Latitude: ${Latitude}`);
    console.log(`Longitude: ${Longitude}`);
    console.log(`Time Zone Offset: ${timeZoneOffset} hours`);

    updateUrlHash();
    clearLoadingState();

    // Call success callback (closes modal) if provided
    if (successCallback) successCallback();
  }
  else {
    console.log(`No timezone results returned from GeoNames.`);
    TzOffset = getTimeZoneOffset(lat, lon);
    Latitude = lat;
    Longitude = lon;

    clearLoadingState();
  }
}

// Helper for reverse geocoding results from Nominatim
function gotReverseGeocodeData(data, requestId, isOther = IsSearchingForOtherLocation, isAuto = false) {
  // Reverse geocode is currently only used for primary location (GPS/IP)
  const currentSerial = isOther ? OtherLocationFetchSerial : LocationFetchSerial;
  if (requestId && requestId !== currentSerial) {
    console.log(`[${requestId}] gotReverseGeocodeData: Ignoring stale callback.`);
    return;
  }

  console.log("Reverse Geocode Data:", data);
  if (data && data.address) {
    let addr = data.address;
    let parts = [];

    // Order of local importance: hamlet, village, town, city, county, state, country
    let hierarchy = ['hamlet', 'village', 'town', 'city', 'county', 'state', 'country'];

    // Additional logic: if we find a county, ensure "County" is appended
    // (User specific request)
    if (addr.county && !addr.county.toLowerCase().endsWith(' county')) {
      addr.county = addr.county + " County";
    }

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

    // User Request: If a city/town/village/hamlet is provided, omit the county to save space
    if (activeParts['city'] || activeParts['town'] || activeParts['village'] || activeParts['hamlet']) {
      if (activeParts['county']) {
        delete activeParts['county'];
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

    let foundName = constructTitle(activeParts);

    // If too long, remove parts by priority: hamlet, village, town, county, country
    let removalPriority = ['hamlet', 'village', 'town', 'county', 'country'];
    for (let key of removalPriority) {
      if (foundName.length <= 35) break;
      if (activeParts[key]) {
        delete activeParts[key];
        foundName = constructTitle(activeParts);
      }
    }

    // Fallback if still too long or no parts found
    if (foundName.length === 0 && data.display_name) {
      foundName = data.display_name.split(',')[0];
    }

    // Prefix with "Near " if this was an automatic GPS/IP check and we don't have precise coords yet
    // Only applies to PRIMARY location
    if (!isOther && isAuto && IsDisplayingUserLocation && !IsPreciseLocation && !foundName.startsWith("Near ")) {
      foundName = "Near " + foundName;
    }

    console.log("Updated location name from reverse geocode:", foundName);

    if (isOther) {
      // Update Other Location Name
      if (locManager && locManager.otherLocation) {
        // Correctly target the nested property
        locManager.otherLocation.cityName = foundName;
        console.log(`Updated Other Location Name to: ${foundName}`);
      }
      updateUrlHash();
    } else {
      // Primary Location
      LocaleTitle = foundName;
      LocaleTitleLocal = foundName; // Update local cache
      if (IsUserInitiatedLocation || IsPreciseLocation) {
        updateUrlHash();
      }
      updateUIElements();
    }
  }
}

/**
 * Wrapper for the new failover-enabled timezone lookup
 */
function getTzUsingLatLong(lat, lon, requestId, cityName, isOther = IsSearchingForOtherLocation, isAuto = false) {
  fetchTimezoneWithFailover(lat, lon, requestId, cityName, isOther, isAuto);
}

/**
 * Multi-service reverse geocoding with failover
 */
function fetchReverseGeocodeWithFailover(lat, lon, requestId, isAuto, isOther = false) {
  // if requestId is 0, auto-assign
  if (requestId === 0) {
    requestId = isOther ? ++OtherLocationFetchSerial : ++LocationFetchSerial;
  }
  console.log(`[${requestId}] Starting reverse geocode lookup for ${lat}, ${lon} (isOther=${isOther})...`);

  const providers = [
    {
      name: 'Nominatim (OSM)',
      url: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      parse: (d) => {
        if (!d || !d.address) return null;
        return { address: d.address, display_name: d.display_name };
      }
    },
    {
      name: 'BigDataCloud',
      url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      parse: (d) => {
        if (!d) return null;
        // Construct address-like object for compatibility with gotReverseGeocodeData
        let city = d.city || d.locality || d.principalSubdivision;
        return {
          address: {
            city: city,
            state: d.principalSubdivision,
            country: d.countryName,
            county: d.localityInfo && d.localityInfo.administrative ?
              d.localityInfo.administrative.find(x => x.order == 6 || x.name && x.name.includes("County"))?.name
              : null
          },
          display_name: city
        };
      }
    }
  ];

  let currentIdx = 0;

  const tryNext = () => {
    const currentSerial = isOther ? OtherLocationFetchSerial : LocationFetchSerial;
    if (requestId !== currentSerial) return;
    if (currentIdx >= providers.length) {
      console.warn(`[${requestId}] All reverse geocode providers failed.`);
      return;
    }

    const provider = providers[currentIdx];
    console.log(`[${requestId}] Attempting reverse geocode via ${provider.name}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(provider.url, { signal: controller.signal })
      .then(resp => {
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(data => {
        const result = provider.parse(data);
        if (!result) throw new Error("No data found");
        console.log(`[${requestId}] Reverse geocode success via ${provider.name}`);
        gotReverseGeocodeData(result, requestId, isOther, isAuto);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.warn(`[${requestId}] ${provider.name} failed:`, err.message);
        currentIdx++;
        tryNext();
      });
  };

  tryNext();
}

/**
 * Multi-service timezone lookup with failover
 */
function fetchTimezoneWithFailover(lat, lon, requestId, cityName, isOther, isAuto) {
  console.log(`[${requestId}] Starting timezone lookup for ${lat}, ${lon}...`);

  const providers = [
    {
      name: 'GeoNames',
      url: `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=charliewallace`,
      parse: (d) => {
        if (!d || d.gmtOffset === undefined) return null;
        return d;
      }
    },
    {
      name: 'TimeAPI.io',
      url: `https://www.timeapi.io/api/Time/current/coordinate?latitude=${lat}&longitude=${lon}`,
      parse: (d) => {
        if (!d || !d.timeZone || !d.currentOffset) return null;
        // Map to GeoNames-like format
        return {
          gmtOffset: d.currentOffset.seconds / 3600,
          rawOffset: d.currentOffset.seconds / 3600, // imprecise for DST but better than zero
          timezoneId: d.timeZone
        };
      }
    }
  ];

  let currentIdx = 0;

  const tryNext = () => {
    const currentSerial = isOther ? OtherLocationFetchSerial : LocationFetchSerial;
    if (requestId !== currentSerial) return;

    if (currentIdx >= providers.length) {
      console.warn(`[${requestId}] All timezone APIs failed. Using mathematical estimate.`);
      const estimate = getTimeZoneOffset(lat, lon);
      // Map to GeoNames-like format for fallback
      const data = { gmtOffset: estimate, rawOffset: estimate };
      gotCityTzData(data, requestId, lat, lon, cityName, isOther, isAuto);
      return;
    }

    const provider = providers[currentIdx];
    console.log(`[${requestId}] Attempting timezone lookup via ${provider.name}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(provider.url, { signal: controller.signal })
      .then(resp => {
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(data => {
        const result = provider.parse(data);
        if (!result) throw new Error("Invalid/Empty data");
        console.log(`[${requestId}] Timezone success via ${provider.name}`);
        gotCityTzData(result, requestId, lat, lon, cityName, isOther, isAuto);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.warn(`[${requestId}] ${provider.name} failed:`, err.message);
        currentIdx++;
        tryNext();
      });
  };

  tryNext();
}

// Global error handler for JSON requests
// Redundant handleNetworkError removed (unified version at line 2431)




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

  var locationWarning = (!IsPreciseLocation && IsDisplayingUserLocation) ?
    'Approx location is used to estimate sunrise/set times; approve GPS for more accuracy.' : '';

  if (activeRenderer === daySpiralRenderer) {
    title = "About Day Spiral Clock";
    descText = 'To show night and day you need a 24-hour clock; ' +
      'using a spiral is a way to squeeze 24 hours into the more-familiar 12-hour clock face. ' +
      'The hour hand tip follows the spiral, making 1 turn for AM and 1 for PM. ' +
      'The darker part of the spiral indicates night. ' +
      'When showing both local and "Other" time, the green line shows when interaction is feasible. ';
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
// PRESET LOCATION FUNCTIONS
// These set the "other" location for dual-location mode
//============================================


/**
 * Helper function to set the "other" location for dual-location mode
 */
function setOtherLocation(lat, lon, tz, cityName) {
  console.log(`🌍 Setting other location: ${cityName}`);

  // Check if we're transitioning from single to dual mode (for animation trigger)
  const wasInSingleMode = !locManager.hasOtherLocation();

  // Set in LocationManager
  locManager.setOtherLocation(lat, lon, tz, cityName);

  // Calculate sunrise/sunset for other location
  // NOTE: Negate longitude to match the behavior in calculateSunTimes (East positive vs West positive logic)
  timeKeeper.calculateOtherLocationSunTimes(lat, -lon, tz, IsDst);

  // Trigger Mobius refresh if initialized
  if (typeof mobiusRenderer !== 'undefined') {
    mobiusRenderer.refreshDayNight();
  }

  // Trigger spiral regeneration and animation
  if (daySpiralRenderer && daySpiralRenderer.active) {
    // Start animation if transitioning from single to dual mode
    if (wasInSingleMode) {
      daySpiralRenderer.startDualModeAnimation();
    }
    daySpiralRenderer.resize(window.innerWidth, window.innerHeight);
  }

  // Update UI for dual mode (e.g., legend)
  updateDualModeUI();

  // Update URL hash to include the other location
  updateUrlHash();
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

//============================================
// Update UI elements that depend on Dual Mode state
function updateDualModeUI() {
  const legend = select('#awakeness-legend');
  if (legend) {
    if (locManager && locManager.hasOtherLocation()) {
      legend.removeClass('hidden');
    } else {
      legend.addClass('hidden');
    }
  }
}





