/** ===========================================================
 * Day Spiral Clock V2: Sunrise & Sunset shown on 12-hr clock face.
 * This clock shows the current 24-hour day as a spiral, with 2 turns because
 * of AM and PM on the 12-hour clock face.  
 *
 * A web service from OpenStreetMap is used to fetch location
 * of a user-entered city. 
 * A separate web servce at GeoNames is used to fetch the time zone.
 * That call requires a free account; if you clone this project, please
 * create your own login and revise the url.  However no API key is needed.
 *
 * By Charlie Wallace coolweird.net
 * 

TODO Fixes  Bugs -----------------------
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
  * Idea: add today+tomorrow mode showing 2 days, or 4 turns of the spiral
  * Idea: an option to show a diff location's time in the spiral (like GMT) while  
  *  the hands show the local time. So both are viewable in one display
  *  ALT: add a second hour hand for the non-local time.
  * Consider using GeoNames for both location and timezone, thus eliminating
  *  need for nominatim.openstreetmap.org call; or could use it as fallback
  * Add Save Location button, makes cookie (?)
  * Implement 24 hour mode
 
==== IMPL / FEATURE NOTES  =====
* The logic depends on the GMT offset that it fetches to be auto-adjusted 
   for daylight savings time. This appears to be the case.
* ATTN, on first launch, browser will ask user for permission to get the location in
   order to fetch the lat/long needed for sunrise/sunset calcs. I added a message
   assuring user that it's not saved. The popup can be hard to find...
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
console.log("📦 Day Spiral Clock loaded");
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

// for monitoring window size
var Mywidth, Myheight;
var TheHeight, TheWidth;

var SecondsSoFar;
var MsFromStartToResetTime;

var Latitude, Longitude;
var NewLatitude, NewLongitude;
var LastLat, LastLong;
var LatLocal, LngLocal;
var TzOffset, TzOffsetLocal;
var LastTz;
var IsSunRiseSetObtained;
var IsSunRiseSetObtained;
var IsTimezoneMismatch; // true if browser timezone doesn't match IP location timezone
var IsPreciseLocation = false; // true if using GPS location
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

var IsDay;  // true when sun is up. Not used 240201 
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

var ResetToLocalButton;

var MelbourneButton;
var SanDiegoButton;
var KansasCityButton;
var LondonButton;
var BerkeleyButton;
var SilveradoButton;





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
//var tempTest = true;  // used only for testing


//================================================================
// Fetch approximate location from IP geolocation API
function fetchIpLocation() {
  console.log("Fetching approximate location from IP...");
  setLoadingState();
  IsPreciseLocation = false;
  // Using ipapi.co (free, no API key required)
  fetch('https://ipapi.co/json/')
    .then(response => response.json())
    .then(data => {
      console.log("IP Geolocation data:", data);

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
        locationString = "Near " + city;
        if (region) {
          // Optional: could add region too, but keeping it short for now
          // locationString += ", " + region;
        }
      }

      // CityNameInput.value(locationString); // Keep empty as per user request
      LocaleTitle = locationString;
      LocaleTitleLocal = locationString; // Save for fallback

      // Check for timezone mismatch (VPN detection)
      var browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var ipTimezone = data.timezone; // from ipapi.co

      console.log("Browser timezone:", browserTimezone);
      console.log("IP location timezone:", ipTimezone);

      // Compare timezones - if different, might be using VPN
      IsTimezoneMismatch = (browserTimezone !== ipTimezone);

      // Allow testing VPN warning via URL hash parameter
      // TODO: REMOVE THIS TEST CODE
      var urlHash = window.location.hash.toLowerCase();
      if (urlHash === '#testvpn' || urlHash === '#simulatevpn') {
        IsTimezoneMismatch = true;
        console.log("🧪 TEST MODE: VPN simulation enabled via URL hash");
      }

      if (IsTimezoneMismatch) {
        console.log("⚠️ Timezone mismatch detected - possible VPN/proxy usage");
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
      getTzUsingLatLong(Latitude, Longitude);
    })
    .catch(error => {
      clearLoadingState();
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
      // Add in a plus sign if not negative
      if (TzOffset > 0) {
        tzString = "+" + str(TzOffset);
      }
      // init the UI field
      TzInput.value(tzString);
      LastTz = TzOffset;

      var latString = str(Latitude);
      LatInput.value(latString);
      LastLat = Latitude;

      var longString = str(Longitude);
      LngInput.value(longString);
      LastLong = Longitude;
    });
}

// This only runs at startup, see Init() below
function oneTimeInit() {
  // Debug: Check URL hash early
  console.log("🔍 Current URL:", window.location.href);
  console.log("🔍 URL Hash:", window.location.hash);

  // state vars.  Preserve these thru window resize.

  // IsDaySpiral = true; // Removed
  IsGmtShown = false; //true; // false; //

  ClockMode = 0;


  // Use this to allow customizing layout for windows vs mobile
  IsWindows = (window.navigator.platform == "Win32");
  /******************************	
    if (IsWindows)
    {
      window.alert('Windows detected.');
    }
    else
    {
      window.alert('Windows not detected.');
    }
  	
    if (window.navigator.platform.indexOf("Mac") === 0)
    {
      window.alert('Mac detected.');
    }
    else
    {
      window.alert('Mac not detected.');
    }	
  ************************/

  // ==240212a
  // IsDesktop is now calculated in reInit() to support dynamic toggling
  console.log("IsWindows=" + IsWindows);

  // Create canvas and parent it to the container
  var cnv = createCanvas(window.innerWidth, window.innerHeight);
  cnv.parent('canvas-container');


  // (Location fetch logic moved to end of function to ensure UI is ready)


  // ==== Bind to existing HTML elements ======
  // NOTE: CSS handles all positioning now (responsive design)

  //     misc buttons
  ResetToLocalButton = select('#btn-reset-loc');
  ResetToLocalButton.mousePressed(usePreciseLocation);


  // --- NEW MODAL BUTTONS ---
  select('#btn-about').mousePressed(() => openModal('modal-about'));
  select('#btn-details').mousePressed(openDetailsModal);
  select('#btn-lookup-city').mousePressed(() => openModal('modal-city'));
  select('#btn-manual-coords').mousePressed(openManualCoordsModal);
  select('#btn-more-locs').mousePressed(() => openModal('modal-locations'));

  // --- MODAL CLOSE BUTTONS ---
  selectAll('.btn-close-modal').forEach(btn => {
    btn.mousePressed(closeAllModals);
  });

  // --- MODAL SUBMIT BUTTONS ---
  select('#btn-city-submit-modal').mousePressed(handleCitySubmitModal);
  select('#btn-coords-submit-modal').mousePressed(handleCoordsSubmitModal);

  // --- PRESET MODAL BUTTONS ---
  select('#btn-loc-silverado-m').mousePressed(() => { setSilverado(); closeAllModals(); });
  select('#btn-loc-berkeley-m').mousePressed(() => { setBerkeley(); closeAllModals(); });
  select('#btn-loc-sandiego-m').mousePressed(() => { setSanDiego(); closeAllModals(); });
  select('#btn-loc-london-m').mousePressed(() => { setLondon(); closeAllModals(); });
  select('#btn-loc-kc-m').mousePressed(() => { setKansasCity(); closeAllModals(); });
  select('#btn-loc-melbourne-m').mousePressed(() => { setMelbourne(); closeAllModals(); });



  GmtDisplayButtonLabel = "Show GMT";
  GmtDisplayButton = select('#btn-gmt');
  GmtDisplayButton.mousePressed(setGmtDisplay);

  //    Location buttons
  SilveradoButton = select('#btn-loc-silverado');
  SilveradoButton.mousePressed(setSilverado);

  BerkeleyButton = select('#btn-loc-berkeley');
  BerkeleyButton.mousePressed(setBerkeley);

  SanDiegoButton = select('#btn-loc-sandiego');
  SanDiegoButton.mousePressed(setSanDiego);

  LondonButton = select('#btn-loc-london');
  LondonButton.mousePressed(setLondon);

  KansasCityButton = select('#btn-loc-kc');
  KansasCityButton.mousePressed(setKansasCity);

  MelbourneButton = select('#btn-loc-melbourne');
  MelbourneButton.mousePressed(setMelbourne);

  //     Input fields setup
  TzInput = select('#input-tz');
  TzInput.value("100")
  TzInput.input(tzInputEvent);

  LatInput = select('#input-lat');
  LatInput.input(latInputEvent);

  LngInput = select('#input-lng');
  LngInput.input(longInputEvent);

  //    City Name Input
  CityNameInput = select('#input-city');
  //    City Submit Button
  CitySubmitButton = select('#btn-city-submit');
  CitySubmitButton.mousePressed(handleCitySubmit);

  //    Full Screen Button
  var fsBtn = select('#btn-fullscreen');
  if (fsBtn) {
    fsBtn.mousePressed(toggleFullScreen);
  }

  // get local time zone of the user's browser ============.
  // ATTN: by convention, this returns positive value when
  //   it should be negative. Returns minutes, must convert to hours.
  // ATTN: the returned gmt offset takes daylight savings
  //   into account.  
  TzOffset = (-new Date().getTimezoneOffset()) / 60;
  TzOffsetLocal = TzOffset;
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
  TzInput.value(tzString);
  LastTz = TzOffset;

  XSpiralArray = [];
  YSpiralArray = [];
  RadiusSpiralArray = [];
  NumSpiralPointsPerTurn = 300;
  NumSpiralTurns = 2;  // must set this in the init


  CityName = ""
  LocaleTitle = "Local Time"
  PrevLocaleTitle = "";

  BkColor = 0;
  LastMillisec = 0;
  HourDigitColor = color(25, 25, 25); //0xe8, 0xe0, 0x22);

  SecondsSoFar = 0;
  MsFromStartToResetTime = 0;

  // init to unique value to allow detection when set properly
  Latitude = 99999;  // an illegal value
  longitude = 99999;
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

  // ==== Initial Location Fetch (Moved here) ====
  // Check if we have permission? 
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(function (result) {
      if (result.state === 'granted') {
        console.log("Location permission already granted, using precise.");
        usePreciseLocation();
      } else if (result.state === 'prompt') {
        console.log("Location permission prompt, defaulting to IP.");
        fetchIpLocation();
      } else {
        console.log("Location permission denied, defaulting to IP.");
        fetchIpLocation();
      }
    });
  } else {
    fetchIpLocation();
  }
}  // end of oneTimeInit()  ====================

// Helper to check fullscreen state across browsers
// Helper to check fullscreen state across browsers
function isFullScreen() {
  var std = document.fullscreenElement;
  var webkit = document.webkitFullscreenElement;
  var moz = document.mozFullScreenElement;
  var ms = document.msFullscreenElement;

  var hasElement = (std || webkit || moz || ms) != null;
  var isMQ = false;

  // Use Media Query as a tiebreaker/validator if available
  if (window.matchMedia) {
    var mq = window.matchMedia('(display-mode: fullscreen)');
    isMQ = mq.matches;
    if (mq.media !== 'not all') {
      // If we have an element but MQ says no, we are likely not in FS
      if (hasElement && !isMQ) {
        // hasElement = false; // logic attempted previously
      }
    }
  }

  // Debug logging - Always log if we suspect an issue (or just throttle?)
  // For this debug session, let's log frequently but maybe check a global?
  // User explicitly asked for logs.
  // Debug logging - Removed for final version
  return hasElement;
}



// Toggle Full Screen Mode
function toggleFullScreen() {
  var fs = isFullScreen();
  fullscreen(!fs);
  // UI update is handled by onFullScreenChange event listener
}

// Handle fullscreen change events (from button or ESC key)
function onFullScreenChange(e) {
  // Check if we are currently in full screen mode
  // Use robust helper to be sure
  var fs = isFullScreen();

  // Update button text based on new state
  var fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) {
    fsBtn.textContent = fs ? 'Exit Full Screen' : 'Full Screen';
  }



  // Toggle the active class for visual feedback
  if (fsBtn) {
    if (fs) {
      fsBtn.classList.add('toggled-on');
    } else {
      fsBtn.classList.remove('toggled-on');
    }
  }
}

// Update HTML UI elements with current data
function updateUIElements() {
  // Update title based on mode
  var titleEl = document.getElementById('app-title');
  if (titleEl) {
    titleEl.textContent = 'Day Spiral Clock'; // Always Day Spiral
  }

  // Update description based on mode
  var descText = 'The hour hand tip follows the day spiral, making 1 turn for AM and 1 for PM. The darker part of the spiral indicates night.';

  var descEl = document.getElementById('app-description');
  if (descEl) {
    descEl.textContent = descText;
  }

  // Sync the About modal text (mobile)
  var aboutDescEl = document.getElementById('about-description');
  if (aboutDescEl) {
    aboutDescEl.innerHTML = '<p>' + descText + '</p>' +
      '<p style="margin-top: 10px; font-size: 0.8rem; color: #888;">Privacy: Location data is used only for sunrise/sunset calculations and is not saved.</p>';
  }

  // Update locale title
  var localeEl = document.getElementById('locale-title');
  if (localeEl) {
    if (IsLoadingLocation) {
      // Check for mobile portrait mode to use shorter string
      if (!IsDesktop && window.innerHeight > window.innerWidth) {
        localeEl.textContent = "Waiting for loc...";
      } else {
        localeEl.textContent = "Waiting for location...";
      }
    } else if (Latitude != 99999 && Longitude != 99999) {
      localeEl.textContent = LocaleTitle;
    }
  }

  // Update time display
  var timeEl = document.getElementById('time-display');
  if (timeEl && TimeString) {
    var amPmString = IsAM ? ' AM' : ' PM';
    timeEl.textContent = TimeString + amPmString;
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

  // Update VPN warning visibility
  var vpnWarning = document.getElementById('vpn-warning');
  if (vpnWarning) {
    if (IsTimezoneMismatch) {
      vpnWarning.classList.add('visible');
    } else {
      vpnWarning.classList.remove('visible');
    }
  }

  // Update precise location hint visibility
  var preciseHint = document.getElementById('precise-hint');
  if (preciseHint) {
    if (!IsPreciseLocation && !IsTimezoneMismatch && Latitude != 99999) {
      preciseHint.classList.add('visible');
    } else {
      preciseHint.classList.remove('visible');
    }
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


// --- Helper for Manual Coords Modal ---
function openManualCoordsModal() {
  // Populate fields with current values if available
  var latField = select('#input-lat-modal');
  var lngField = select('#input-lng-modal');
  var tzField = select('#input-tz-modal');

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

function openDetailsModal() {
  var content = '';
  if (Latitude != 99999) {
    content += '<p><strong>Date:</strong> ' + (DateString || '') + '</p>';
    content += '<p><strong>Day:</strong> ' + (typeof IDow !== 'undefined' ? getDayStringLong(IDow) : '') + '</p>';
    content += '<p><strong>DST:</strong> ' + (IsDst ? 'Yes' : 'No') + '</p>';
    if (SunriseHour >= 0) {
      content += '<p><strong>Sunrise:</strong> ' + SunriseHourString + ':' + SunriseMinString + SunriseAmpmString + '</p>';
      content += '<p><strong>Sunset:</strong> ' + SunsetHourString + ':' + SunsetMinString + SunsetAmpmString + '</p>';
    }
  } else {
    content = '<p>Location not set.</p>';
  }
  document.getElementById('details-content').innerHTML = content;
  openModal('modal-details');
}

function handleCitySubmitModal() {
  var city = select('#input-city-modal').value().trim();
  var errEl = select('#city-error-msg');
  errEl.html('Searching...'); // Use .html() for p5 element or .textContent for vanilla
  setLoadingState();


  if (city && city.length > 0) {
    var url = `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;

    // Use p5.js loadJSON instead of fetch to avoid CORS and ensure consistency
    loadJSON(url, gotCityLocationDataModal, (err) => {
      clearLoadingState();
      errEl.html("Search error (CORS/403). Try again or use desktop mode.");
      console.error(err);
    });
  } else {
    errEl.html("Please enter a city name.");
  }
}

// Callback for mobile modal city lookup
function gotCityLocationDataModal(data) {
  var errEl = select('#city-error-msg');

  if (data && data.length > 0) {
    // Success
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
  IsDesktop = (IsWindows || (window.navigator.platform.indexOf("Mac") === 0)) && (window.innerWidth > 950);
  console.log("📐 reInit: IsDesktop=" + IsDesktop + " Width=" + window.innerWidth);

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

  IDowPrevious = IDow; // save the previous day of week

  let currDate = new Date();

  // Start with local hour and day of week
  IDow = currDate.getDay(); // 0 is sunday 
  IHour = hour();

  // if time zone GMT offset differs from local,
  //  adjust the hour and day-of-week accordingly.
  if (TzOffset != TzOffsetLocal) {

    // Here is the new simpler logic for tz correction
    let TzDiffHours = TzOffset - TzOffsetLocal;
    let TzDiffMs = TzDiffHours * 60 * 60 * 1000;

    // Rotate the date by the time zone difference
    currDate = new Date(currDate.getTime() + TzDiffMs);

    // Update day of week and hour based on corrected date currDate
    IDow = currDate.getDay(); // 0 is sunday 
    IHour = currDate.getHours();
  }

  // now that we have the new adjusted day of week, check if it changed
  if (IDow != IDowPrevious) {
    // we have started a new day, so need to recompute the sunrise/sunset
    IsSunRiseSetObtained = false;
  }

  // get the current time ==========================
  IMin = minute();
  ISec = second();
  IMsSinceDayStart = millis();
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
}


//-----------------------------------------------------------------
// Handler for location errors
function handleLocationError(error) {
  console.log("GPS location error:", error.message);

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
      alert("The location request timed out. Please try again.");
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

    // Restore timezone
    getTzUsingLatLong(Latitude, Longitude);

    // Recalculate times
    IsSunRiseSetObtained = false;
    updateTimeThisDay();

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
  }
}

//-----------------------------------------------------------------
// Handler for the Use Precise Location button
// Requests browser GPS coordinates (will show permission prompt)
function usePreciseLocation() {
  console.log("Requesting precise GPS location...");
  setLoadingState();
  IsTimezoneMismatch = false; // User intentionally requesting location

  // Allow testing permission denial via URL hash parameter
  // TODO: REMOVE THIS TEST CODE
  var urlHash = window.location.hash.toLowerCase();
  if (urlHash === '#testdenyloc' || urlHash === '#simulatedenyloc') {
    console.log("🧪 TEST MODE: Simulating location permission denial");
    // Create a mock error object
    var mockError = {
      code: 1, // PERMISSION_DENIED
      message: "Simulated permission denial"
    };
    // Add constants to the mock error since the switch statement expects them
    mockError.PERMISSION_DENIED = 1;
    mockError.POSITION_UNAVAILABLE = 2;
    mockError.TIMEOUT = 3;

    handleLocationError(mockError);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    // Success callback
    function (position) {
      console.log("GPS location obtained:", position.coords);
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
      LocaleTitle = "Precise Location";

      // Get timezone using existing GeoNames function
      getTzUsingLatLong(Latitude, Longitude);

      // Location changed, recalculate sunrise/sunset
      IsSunRiseSetObtained = false;
      updateTimeThisDay();
    },

    // Error callback
    handleLocationError
  );
}


//=======================
// Set location and timezone to Silverado
//  
function setSilverado() {
  IsTimezoneMismatch = false; // User manually selected location
  CityNameInput.value("Silverado, CA, USA");
  LocaleTitle = "Silverado";
  getLocationUsingCityName("Silverado, CA, USA");

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateTimeThisDay();
}


//=======================
// Set location and timezone to London England
//  
function setLondon() {
  IsTimezoneMismatch = false; // User manually selected location
  CityNameInput.value("London, UK");
  LocaleTitle = "London";
  getLocationUsingCityName("London, UK");

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateTimeThisDay();
}


//=======================
// Set location and timezone to Berkeley
//  
function setBerkeley() {
  IsTimezoneMismatch = false; // User manually selected location
  CityNameInput.value("Berkeley, CA, USA");
  LocaleTitle = "Berkeley";
  getLocationUsingCityName("Berkeley, CA, USA");

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateTimeThisDay();
}


//=======================
// Set location and timezone to Kansas City, MO
//  
function setKansasCity() {
  IsTimezoneMismatch = false; // User manually selected location
  CityNameInput.value("Kansas City, MO, USA");
  LocaleTitle = "Kansas City";
  getLocationUsingCityName("Kansas City, MO, USA");

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  console.log("Kansas City date test");
  //tempTest = true;
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Melbourne
//  
function setMelbourne() {
  IsTimezoneMismatch = false; // User manually selected location
  CityNameInput.value("Melbourne, AU");
  LocaleTitle = "Melbourne";
  getLocationUsingCityName("Melbourne, AU");

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }

  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;
  //tempTest = true; 
  updateTimeThisDay();
}

// ========================================
// Set location and timezone to San Diego
function setSanDiego() {
  IsTimezoneMismatch = false; // User manually selected location
  CityNameInput.value("San Diego, CA, USA");
  LocaleTitle = "San Diego";
  getLocationUsingCityName("San Diego, CA, USA");

  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }
  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = Latitude;

  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = Longitude;

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

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
    updateTimeThisDay();
  }

}


// ==230112a
//findme
// ==240120d
// handler for the Submit button that enters a city name
// The entered city name may contain additional fields such as state/province and 
// country, comma separated.
function handleCitySubmit() {
  CityName = CityNameInput.value();
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
    loadJSON(apiUrl, gotCityLocationDataOpenStMap);

    // Clear the input field
    CityNameInput.value('');
  }
  else // no city name was found
  {
    LoaleTitle = PrevLocaleTitle;
  }

  // ALT way to get lat/long
  //let geoApiUrl = 
  // `https://secure.geonames.org/searchJSON?q=${CityName}&maxRows=1&username=charliewallace`; 
  //loadJSON(geoApiUrl, gotCityLocationDataGeoNames);
}

// ==============
// Alternate way to set location, timezone, and IsDst using passed city name.
function getLocationUsingCityName(passedCityName) {
  CityName = passedCityName;

  // url used for OpenStreetmap (Nominatim)
  let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${CityName}`;

  // Make a GET request to the Nominatim API (OpenStreetMap)
  // ATTN: the gotCityLocationDataOpenStMap() fcn will be called a bit later, when the  
  // response to the url call comes in.  We won't know the lat/lon until then.
  //  THis means the subsequent API call to get the time zone can't happen until then.
  loadJSON(apiUrl, gotCityLocationDataOpenStMap);

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
function gotCityLocationDataOpenStMap(data) {
  //console.log("Entering gotCityLocationDataOpenStMap().");

  // Check if the response contains any results
  var isError = false;
  if (data.length != 0) {
    console.log("City location data from OpenStreetMap:")
    console.log(data[0]);

    let result = data[0]; // Take the first result

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
      loadJSON(timezoneUrl, gotCityTzData);
    }
  }
  else {
    console.log(`No results found for ${CityName}`);
    alert(`Could not find location for: ${CityName}`);
    CityNameInput.value('');
    LocaleTitle = PrevLocaleTitle;
    clearLoadingState();
  }

}


// using GeoNames service.  Handler for fetching timezone.
// The response to the API call to get the city's time zone offset has arrived.
// There is a time delay between this and the code above where
// loadJSON is called.
function gotCityTzData(data) {
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
    TzInput.value(tzString);
    LatInput.value(str(Latitude));
    LngInput.value(str(Longitude));

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


// Instead of using city name, use GeoNames to get the tz and IsDst based on
// a known lat/long
// using Nominatim OpenStreetMap API
// The response to the API call for the city name has arrived.
function getTzUsingLatLong(lat, lon) {
  console.log("Entering getTzUsingLatLong().");
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
    loadJSON(timezoneUrl, gotCityTzData);
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
function draw() {

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


  if (NewLatitude != 99999 || NewLongitude != 99999) {
    // We are partway through update of location via web service call
    // caused by the user entering a city name.
    // The new lat/long have been fetched but we're still waiting 
    // for the new time zone.
    // If we draw now, we'll have incorrect draw.
    return; // bail out
  }

  // Draw the clock background
  // we redo this below after successfully getting the lat/long
  background(BkColor);

  fill(100);  // gray

  noStroke();
  ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);

  // NOTE: Title, description, version, and other UI text are now in HTML
  // Update HTML elements with current data
  updateUIElements();

  // Draw outer clock face ================

  // draw ellipse to fill entire face, will end up
  // as background for the hour labels on outside.

  strokeWeight(0)
  fill(255); // background for the hour labels
  ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);

  fill(120);  // Color of bkgnd behind spiral
  ellipse(CenterX, CenterY, InnerFaceRadius * 2, InnerFaceRadius * 2);

  // Draw the hour ticks
  stroke(255)
  strokeWeight(SpiralStrokeWeightSecondary * 0.8);
  beginShape(POINTS);
  for (var b = 0; b < 360; b += 30) {
    var angle = radians(b);
    var x = CenterX + cos(angle) * (InnerFaceRadius * 0.977);
    var y = CenterY + sin(angle) * (InnerFaceRadius * 0.977);
    vertex(x, y);
  }
  endShape();

  noStroke();


  // Draw hour labels =====================

  CurrentFontSize = RefFontSize * FontScaleFactor;

  // Specify font to be used
  textSize(CurrentFontSize * 0.4);
  textFont("Arial");
  textAlign(CENTER, CENTER);

  fill(HourDigitColor);   // Specify font color

  textSize(CurrentFontSize * 0.98);

  textStyle(BOLD);

  numString = "12";
  text(numString, TheWidth / 2, TheHeight / 2 - HourNumbersRadius);

  numString = "1";
  var xOffset1 = HourNumbersRadius * cos(2 * PI / 6);
  var yOffset1 = HourNumbersRadius * sin(2 * PI / 6);
  text(numString, TheWidth / 2 + xOffset1, TheHeight / 2 - yOffset1);

  numString = "2";
  var xOffset2 = HourNumbersRadius * cos(PI / 6);
  var yOffset2 = HourNumbersRadius * sin(PI / 6);
  text(numString, TheWidth / 2 + xOffset2, TheHeight / 2 - yOffset2);

  numString = "3";
  numHeight = CurrentFontSize;//f.getSize();
  text(numString, TheWidth / 2 + HourNumbersRadius, TheHeight / 2);

  numString = "4";
  text(numString, TheWidth / 2 + xOffset2, TheHeight / 2 + yOffset2);

  numString = "5";
  text(numString, TheWidth / 2 + xOffset1, TheHeight / 2 + yOffset1);

  numString = "6";
  text(numString, TheWidth / 2, TheHeight / 2 + HourNumbersRadius);

  numString = "7";
  text(numString, TheWidth / 2 - xOffset1, TheHeight / 2 + yOffset1);

  numString = "8";
  text(numString, TheWidth / 2 - xOffset2, TheHeight / 2 + yOffset2);

  numString = "9";
  text(numString, TheWidth / 2 - HourNumbersRadius, TheHeight / 2);

  numString = "10";
  text(numString, TheWidth / 2 - xOffset2, TheHeight / 2 - yOffset2);

  numString = "11";
  text(numString, TheWidth / 2 - xOffset1, TheHeight / 2 - yOffset1);

  // restore text style
  textStyle(NORMAL);


  //==========================================
  // time calcs: sets IHour, IMin, ISec, and IMsSinceDayStart
  //   <<< beware, IMsSinceDayStart is ms since start of day, not start of last sec!
  // This also calculates the "DayState" that indicates
  // if it's (1) before sunrise, (2) during daylight, or (3) after sunset
  updateTimeThisDay();  // set baseMs to ms since start of this day  

  var thisMillis = IMsSinceDayStart;
  var msSinceLastDraw = thisMillis - LastMillisec;
  LastMillisec = thisMillis;

  // calc the current second including the fraction of upcoming second
  var theSec = float(ISec)// + float(remainderMs)/1000; 
  var currentSecDegree = theSec * 6;

  var theMin = float(IMin) + theSec / 60;
  var currentMinDegree = theMin * 6;

  var theHour = float(IHour) + theMin / 60;
  var currentHourDegree = theHour * 30;

  // Angles for sin() and cos() start at 3 o'clock;
  // subtract HALF_PI to make them start at the top
  // These are angles in radians, used for hands
  var secRads = map(theSec, 0, 60, 0, TWO_PI) - HALF_PI;
  var minRads = map(theMin, 0, 60, 0, TWO_PI) - HALF_PI;

  var hourRads = map(theHour, 0, 24, 0, TWO_PI * 2) - HALF_PI;

  if (hourRads > TWO_PI) {
    hourRads -= TWO_PI
  }

  var iiSpiral = 0;

  // Calc index into radius array for the current time.
  //  taking into acct that there are two turns per day for each AM/PM.
  // Always Day Spiral logic
  iiSpiral = int((theHour / 24) * NumSpiralPointsPerTurn * 2);

  if (iiSpiral < NumSpiralPointsPerTurn * NumSpiralTurns) // if index is valid
  {
    HoursRadius = RadiusSpiralArray[iiSpiral];  //wc5
  }
  else {
    print("ERROR: Illegal index into the RadiusSpiralArray=" + str(iiSpiral) + " for IDow=" + str(IDow));
    print("theHour=" + str(theHour) + " NumSpiralPointsPerTurn=" + str(NumSpiralPointsPerTurn));
    print("IHour=" + str(IHour));
    print("NumSpiralTurns=" + str(NumSpiralTurns));

    HoursRadius = ClockDiameter / 4; // fallback in case iiSpiral was not valid
  }


  noStroke();

  // NOTE: Location info (time, date, sunrise/sunset, VPN warning) are now in HTML
  // The updateUIElements() call above handles updating those elements

  textAlign(LEFT, TOP);
  stroke(255);
  strokeCap(SQUARE);
  noFill();

  // set font size of day-of-week labels
  var dowLabelSizeDsktp = 0.;
  var dowLabelSizeMobl = 0.3;
  var dowLabelSizeDsktpBoost = 0.57;
  var dowLabelSizeMoblBoost = 0.4;
  if (IsDesktop) {
    textSize(RefFontSize * dowLabelSizeDsktp);
  }
  else {
    textSize(RefFontSize * dowLabelSizeMobl);
  }

  // Draw the spiral ================

  var vv;
  var vvBase;
  var vvRise;
  var secToRise;
  var vvSet;
  var secToSet;

  var dw = IDow;
  var dayColor = color(0x84, 0xd2, 0xf1);
  var nightColor = color(20, 80, 100);
  var dayString = getDayStringShort(dw);
  var nextDayString = getDayStringShort(dw + 1);

  // set weight differently when running on phone.  
  //   Should be reduced by about half.
  strokeWeight(SpiralStrokeWeightSecondary);

  // Draw logic for the simple 2-turn case, DaySpiral.  

  // Check if location is available. If not, draw neutral spiral.
  if (IsLoadingLocation || Latitude == 99999 || Longitude == 99999) {
    // location is not available, so draw neutral spiral
    stroke(200); // Neutral light gray
    noFill();

    strokeWeight(SpiralStrokeWeight);
    beginShape();
    for (vv = 0; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
      vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
    }
    endShape();
  }
  else {
    // Draw the day spiral for the current day.
    // Use broader stroke for the day spiral, since it's only 2 turns long
    strokeWeight(SpiralStrokeWeight);

    // ==240125a


    dowLabelSizeDsktpBoost = 0.5;
    dowLabelSizeMoblBoost = 0.4;

    stroke(dayColor);
    vvBase = 0;

    if (SunriseHour != -1) // if not dark-all-day
    {
      // use daytime color, but draw the entire 24hrs for this day.
      // If it's light all day (midnight sun) then this is all we need.
      // Otherwise, we'll draw the night-time part over this.
      beginShape();
      for (vv = 0; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
        //print("for day=" + dw +" color="+ dayColor);
        vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
      }
      endShape();

      if (SunriseHour != -2) // if not all-day-sun
      {
        // now draw in the night portion for this day-of-week.
        stroke(nightColor); // set black color


        // first the part from midnight to sunrise ----------------
        secToRise = SunriseMin * 60 + SunriseHour * 3600;

        // convert seconds to vv offset from start
        vvRise = int((secToRise / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);

        beginShape();
        for (vv = 0; vv < vvRise; vv++) {
          vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
        }
        endShape();

        // Next draw the part from sunset to midnight ----
        // vv at sunset is vvSet, 
        // vv at midnight is NumSpiralPointsPerTurn

        // seconds from midnight to sunset
        secToSet = SunsetMin * 60 + SunsetHour * 3600;
        // convert seconds to vv offset
        vvSet = int((secToSet / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);
        beginShape();

        // NOTE use of <= below, this ensures that the last vertex hooks up with first.
        for (vv = vvSet; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
          vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
        }

        endShape();
      }

    }
    else // is 24hr night
    {
      // use night-time color, but draw the entire 24hrs for this day.
      stroke(nightColor);
      console.log("midnight sun")

      beginShape();
      for (vv = 0; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
        //print("for day=" + dw +" color="+ dayColor);
        vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
      }
      endShape();
    }

    textStyle(BOLD);

    //------------------------
    // Show day of week label next to start of spiral
    // boost text size for emphasis, same for dsktop and mobile

    strokeWeight(0);
    //fill(color(251, 246, 71));  // yellow
    fill(color(255, 245, 0));  // yellow
    let vvEnd = 2 * NumSpiralPointsPerTurn - 1;
    //textAlign(RIGHT, TOP);
    textAlign(LEFT, TOP);

    // Supress the day labels when gmt display is on
    if (!IsGmtShown) {
      textSize(SpiralFontSize);
      text(dayString, CenterX + XSpiralArray[vvBase] + 3, CenterY + YSpiralArray[vvBase] - (SpiralFontSize * 0.5));

      textAlign(LEFT, TOP);
      text(nextDayString, CenterX + XSpiralArray[vvEnd] + 5, CenterY + YSpiralArray[vvEnd] - (SpiralFontSize * 0.5));
    }

    // If display of GMT is enabled, we show on the spiral
    if (IsGmtShown) {
      let gmtHour = 0;
      let theLocalHour = 0;
      let gmtHourIndex = 0;
      let gmtLabelX = 0;
      let gmtLabelY = 0;

      textAlign(CENTER, CENTER);
      textSize(SpiralFontSize);

      // FINDME

      for (theLocalHour = 0; theLocalHour < 24; theLocalHour++) // step thru the gmt hours
      {
        // calculate the gmt equivalent of theLocalHour
        gmtHour = theLocalHour - TzOffset;
        if (gmtHour > 23) {
          gmtHour = gmtHour - 24;
        }
        else if (gmtHour < 0) {
          gmtHour = gmtHour + 24;
        }

        // get the location to place the gmtHour from the spiral arrays
        gmtHourIndex = int((theLocalHour / 24) * NumSpiralPointsPerTurn * 2);
        gmtLabelX = CenterX + XSpiralArray[gmtHourIndex];
        gmtLabelY = CenterY + YSpiralArray[gmtHourIndex];

        text(str(gmtHour), gmtLabelX, gmtLabelY);

        if (theLocalHour == 0) {
          textAlign(RIGHT, CENTER);

          text("GMT", gmtLabelX - 20, gmtLabelY);
          textAlign(CENTER, CENTER);

          // The gmt label for the start of the day is the same as the end
          gmtHourIndex = NumSpiralPointsPerTurn * 2;
          gmtLabelX = CenterX + XSpiralArray[gmtHourIndex];
          gmtLabelY = CenterY + YSpiralArray[gmtHourIndex];

          text(str(gmtHour), gmtLabelX, gmtLabelY);



        }
      }

    }


    textAlign(LEFT, TOP); // restore alignment

    // END of spiral draw for day spiral
  }

  strokeCap(ROUND);
  fill(0);


  // Draw the hands of the clock ===============

  stroke(255);  // set hand color

  // Draw second hand
  strokeWeight(SpiralStrokeWeightSecondary * 0.35);
  line(CenterX, CenterY, CenterX + cos(secRads) * SecondsRadius, CenterY + sin(secRads) * SecondsRadius);

  // draw minute hand
  strokeWeight(SpiralStrokeWeightSecondary * 0.7);
  line(CenterX, CenterY, CenterX + cos(minRads) * MinutesRadius, CenterY + sin(minRads) * MinutesRadius);

  // draw local hour hand
  strokeWeight(SpiralStrokeWeightSecondary);

  // Draw hour hand with square cap so it clearly shows where it's tracking on the
  // spiral.  
  strokeCap(SQUARE);
  let adjustedHourRadius = HoursRadius;
  if (IsGmtShown) {
    adjustedHourRadius = RadiusSpiralArray[iiSpiral] - ClockDiameter * 0.017;  //wc5
  }

  line(CenterX, CenterY, CenterX + cos(hourRads) * adjustedHourRadius,
    CenterY + sin(hourRads) * adjustedHourRadius);

  // Redraw the hour hand at half length to avoid having a square end cap in the center
  //  of the clock
  strokeCap(ROUND); // restore round ends    
  line(CenterX, CenterY, CenterX + cos(hourRads) * HoursRadius / 2, CenterY + sin(hourRads) * HoursRadius / 2);

  // Draw a little circle around the tip of the hour hand to emphasize that it's following
  //   the spiral
  noFill();
  strokeWeight(SpiralStrokeWeightSecondary * 0.5);
  stroke(255); // white

  ellipse(CenterX + cos(hourRads) * HoursRadius,
    CenterY + sin(hourRads) * HoursRadius,
    32 * FontScaleFactor,
    32 * FontScaleFactor);

  // restore text style
  textStyle(NORMAL);
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





