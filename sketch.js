/** ===========================================================
 * Day Spiral Clock V2: Sunrise & Sunset shown on 12-hr clock face.
 * This clock initially shows the current day as a spiral, with 2 turns because
 * of AM and PM on the 12-hour clock face.  
 * It also provides week mode via button at upper left.
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

var InputFieldProcessingTimeout; // processing of field contents happens on timeout

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

var DaySpiralButton;
var DaySpiralButtonLabel;  // needed when button label must change

var ColorfulModeButton;
var ColorfulModeButtonLabel;  // needed when button label must change

var GmtDisplayButton;
var GmtDisplayButtonLabel;  // needed when button label must change

var CitySubmitButton;

var IsDst; // daylight savings time

var SunsetWeekSecFromSunArray;
var SunriseWeekHourArray;  // only used to check for no-day or no-night results
var SunriseWeekSecFromSunArray;

var XSpiralArray;
var YSpiralArray;
var RadiusSpiralArray;
var NumSpiralPointsPerTurn;
var NumSpiralTurns;

var IsWindows;
var IsDesktop;

var IsOnlyTodayInColor;
var IsDaySpiral;
var IsGmtShown;
var ClockMode;


var CityName;

var LocaleTitle;
var PrevLocaleTitle;
//var tempTest = true;  // used only for testing


// This only runs at startup, see Init() below
function oneTimeInit() {
  // state vars.  Preserve these thru window resize.
  IsOnlyTodayInColor = true; // false; //
  IsDaySpiral = true;
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

  IsDesktop = IsWindows ||
    (window.navigator.platform.indexOf("Mac") === 0)
  console.log("IsWindows=" + IsWindows)

  //fullscreen(); 
  createCanvas(window.innerWidth, window.innerHeight);


  //========= Get approximate location from IP geolocation API ==========
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
      console.log("IP geolocation failed:", error);
      console.log("Using fallback location (Melbourne)");

      // Fallback to Melbourne
      Latitude = -37.8;
      Longitude = 144.96;
      TzOffset = 10; // assume DST

      LatLocal = Latitude;
      LngLocal = Longitude;
      TzOffsetLocal = TzOffset;

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
  //============= end of IP geolocation =========================


  // ==== button and field creation and setup done here only once; ======
  //  but position is set in reInit() since it will change on window resize.
  //

  //     misc buttons
  ResetToLocalButton = createButton('Reset to local');
  ResetToLocalButton.mousePressed(resetToLocal);

  //     mode buttons  
  DaySpiralButtonLabel = "Week Spiral";
  DaySpiralButton = createButton(DaySpiralButtonLabel);
  DaySpiralButton.mousePressed(setDaySpiral);

  ColorfulModeButtonLabel = "More Colorful";
  ColorfulModeButton = createButton(ColorfulModeButtonLabel);
  ColorfulModeButton.mousePressed(setColorfulMode);
  ColorfulModeButton.hide();

  GmtDisplayButtonLabel = "Show GMT";
  GmtDisplayButton = createButton(GmtDisplayButtonLabel);
  GmtDisplayButton.mousePressed(setGmtDisplay);
  GmtDisplayButton.show();

  //    Location buttons
  SilveradoButton = createButton('Silverado');
  SilveradoButton.mousePressed(setSilverado);

  BerkeleyButton = createButton('Berkeley');
  BerkeleyButton.mousePressed(setBerkeley);

  LondonButton = createButton('San Diego');
  LondonButton.mousePressed(setSanDiego);

  KansasCityButton = createButton('Kansas City');
  KansasCityButton.mousePressed(setKansasCity);

  MelbourneButton = createButton('Melbourne');
  MelbourneButton.mousePressed(setMelbourne);

  SanDiegoButton = createButton('London');
  SanDiegoButton.mousePressed(setLondon);

  //     Input fields setup
  TzInput = createInput('');
  TzInput.value("100")
  TzInput.input(tzInputEvent);

  LatInput = createInput('');
  LatInput.input(latInputEvent);

  LngInput = createInput('');
  LngInput.input(longInputEvent);

  //    Create field for entering name of a city    
  CityNameInput = createInput('');
  //    Create button for submitting city
  CitySubmitButton = createButton('Submit');
  CitySubmitButton.mousePressed(handleCitySubmit);

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

  // init for the week spiral mode
  SunsetWeekSecFromSunArray = new Array(7);
  SunriseWeekHourArray = new Array(7);
  SunriseWeekSecFromSunArray = new Array(7);

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

  stroke(255);  // set white stroke color for lines and fonts

  // init last millisec
  // millis is ms since program started
  // (actually since setup was called, so should be 0 ish)
  LastMillisec = millis();

}  // end of oneTimeInit()  ====================



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
  FontScaleFactor = smallerDim / 900; //240;

  CurrentFontSize = RefFontSize;

  // ==== (re)set button and field positions ========

  ResetToLocalButton.position(10, CenterY * 2 - 160);

  //    mode buttons
  DaySpiralButton.position(CenterX * 0.02, CenterY * 0.33);
  ColorfulModeButton.position(CenterX * 0.02, CenterY * 0.395);
  GmtDisplayButton.position(CenterX * 0.02, CenterY * 0.395);

  //    Location buttons
  SilveradoButton.position(CenterX * 2 - 115, CenterY * 2 - 160);
  BerkeleyButton.position(CenterX * 2 - 115, CenterY * 2 - 135);
  LondonButton.position(CenterX * 2 - 115, CenterY * 2 - 110);
  KansasCityButton.position(CenterX * 2 - 115, CenterY * 2 - 85);
  MelbourneButton.position(CenterX * 2 - 115, CenterY * 2 - 60);
  SanDiegoButton.position(CenterX * 2 - 115, CenterY * 2 - 35);

  //    Input fields
  TzInput.position(110, CenterY * 2 - 130);//CenterY* 1.75);
  TzInput.size(35);
  LatInput.position(110, CenterY * 2 - 100);//CenterY* 1.83);
  LatInput.size(60);
  LngInput.position(110, CenterY * 2 - 70);//CenterY* 1.9);
  LngInput.size(60);

  //    button for entering name of a city    
  CityNameInput.position(50, CenterY * 2 - 40);
  CitySubmitButton.position(223, CenterY * 2 - 40);
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

  if (IsDaySpiral) {
    startFrac = 0.24;
    endFrac = 0.6;
  }
  else {
    startFrac = 0.1;
    endFrac = 0.72;
  }

  var smallerDim = CenterX;
  if (CenterX > CenterY) {
    smallerDim = CenterY;
  }

  var startRadius = smallerDim * startFrac;
  var endRadius = smallerDim * endFrac;
  var nTurns = NumSpiralTurns; //2 per day! //wc4 // ==240123a
  var deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;

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

//==========================================
// Custom mapping of color depicting daytime to the 7 days of the week,
// progressing from red thru violet for the week spiral mode,
// but for IsOnlyTodayInColor mode, only the current day is in color, all 
// the others are monochrome to be less distracting.
function getDayColor(dow) // range 0-6
{
  //III
  var iColor = color(0, 0, 0);
  if (IsDaySpiral) {
    dow = IDow;
  }
  switch (dow) {

    case 0:
      // r
      //iColor = color(0xcd, 0x48, 0x49);
      iColor = color(216, 96, 87);
      break;

    case 1:
      // o
      iColor = color(0xe0, 0x94, 0x35);
      //iColor = color(234, 191, 115);
      break;

    case 2:
      // y
      //iColor = color(0xfc, 0xfb, 0x46);
      iColor = color(251, 246, 71);
      break;

    case 3:
      // g
      //iColor = color(0x7c, 0xc4, 0x39);
      iColor = color(156, 250, 92);
      break;

    case 4:
      // b
      iColor = color(0x84, 0xd2, 0xf1);
      break;

    case 5:
      // v
      //iColor = color(0xa8, 0x82, 0xf1);
      iColor = color(139, 140, 250);
      break;

    case 6:
      // lt gray/purple
      iColor = color(190, 160, 190);  //(230, 200, 230)
      break;

    case 12:
      // r - <<< same as case 0
      //iColor = color(0xcd, 0x48, 0x49);
      iColor = color(215, 86, 80);

      break;
    default:
      iColor = color(0, 0, 0);
      break;
  }

  if (IsOnlyTodayInColor || IsDaySpiral) {
    if (dow != IDow) {
      iColor = color(210, 210, 210);
    }
    else {
      iColor = color(0x84, 0xd2, 0xf1);
      iColor = color(0x74, 0xc0, 0xff);
      //iColor = color(0x8a, 0xc7, 0xdb);
      //iColor = color(0xad, 0xd8, 0xe6);

    }
  }
  return iColor;
}


//==========================================
// Custom mapping of color depicting night to the 7 days of the week,
// progressing from red thru violet for the week spiral mode,
// but for IsOnlyTodayInColor mode, only the current day is in color, all 
// the others are monochrome to be less distracting.
function getNightColor(dow) // range 0-6
{
  var iColor = color(0, 0, 0);
  if (IsDaySpiral) {
    dow = IDow;
  }

  switch (dow) {

    case 0:
      // r
      iColor = color(108, 48, 43);
      break;

    case 1:
      // o
      iColor = color(112, 74, 26);
      break;

    case 2:
      // y
      //iColor = color(125, 123, 35); // a bit too light...
      iColor = color(112, 102, 31);
      break;

    case 3:
      // g
      iColor = color(78, 125, 46);
      break;

    case 4:
      // b
      iColor = color(66, 105, 120);
      break;

    case 5:
      // v
      iColor = color(69, 70, 125); // too dark
      iColor = color(73, 85, 137);
      break;

    case 6:
      // lt gray/purple
      iColor = color(95, 80, 95);
      break;

    case 12:
      // r - <<< same as case 0
      iColor = color(108, 48, 43);

      break;
    default:
      iColor = color(0, 0, 0);
      break;
  }

  if (IsOnlyTodayInColor || IsDaySpiral) {
    if (dow != IDow) {
      //iColor = color(90,90,90);
      iColor = color(70, 70, 70);
    }
    else {
      //iColor = color(112, 102, 31);
      //iColor = color(66, 105, 120);
      if (IsDaySpiral) {
        iColor = color(20, 80, 100); // darker blue 32, 60, 98
      }
      else {
        //iColor = color(66, 105, 120); // light blue
        iColor = color(20, 80, 100); // darker blue 32, 60, 98
      }
    }
  }

  return iColor;
}


//==========================================
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
// Short label for the 7 days of the week
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
  //let dateRollbackNeeded = false;
  //let dateAdvanceNeeded = false;

  // Start with local hour and day of week
  IDow = currDate.getDay(); // 0 is sunday 
  IHour = hour();

  // if time zone GMT offset differs from local,
  //  adjust the hour and day-of-week accordingly.
  if (TzOffset != TzOffsetLocal) {

    /****************************************************************************
    
    //Old logic for day of week and hour correction logic - save ==240203a
    
    // this block tests new approach that was eventually adopted. <<<<<<<<<<<
    
    if (tempTest) // Test: this was set in SetMelbourne() and SetKansasCity() and cleard below
    {
      let tempDate = new Date();

      //    currDate = new Date(currDate.getTime() + 86400000); 
      // figure out how much to rotate the date based on time zone diff
      if (TzOffset != TzOffsetLocal)
      {
        console.log(`Time Zone Offset: ${TzOffset}  TzOffsetLocal= ${TzOffsetLocal}`);
        let TzDiffHours = TzOffset - TzOffsetLocal;
        let TzDiffMs = TzDiffHours * 60 * 60 * 1000;
        tempDate = new Date(tempDate.getTime() + TzDiffMs); 
        // what's needed: Hour, IDow
        console.log("Hour is " + str(currDate.getHours()) + " Rotated hour is " + str(tempDate.getHours()));
        let testIDow =  tempDate.getDay(); // 0 is sunday 
        console.log("IDow is " + str(IDow) + " Rotated Day is " + str(testIDow));
        console.log(tempDate.toLocaleDateString(
          'en-us', { year:"numeric", month:"short", day:"numeric"}) );
      }
      tempTest = false;
    }  

    // Below is the old logic.  This worked but was over complicated. =================
    
    var hourDiff = TzOffset - TzOffsetLocal;
    IHour += hourDiff;
    if (IHour < 0)
    {
      dateRollbackNeeded = true;
      IHour += 24;
      // we passed into the previous day
      IDow--;
      if (IDow < 0)
      {
        IDow = 6;
      }
    }
    else if (IHour > 23)
    {
      dateAdvanceNeeded = true;
      IHour -= 24;  
      // we passed into the next day.
      IDow++;
      if (IDow > 6)
      {
        IDow = 0;
      }
    }
    //  Check if changing to new tz has shifted
    //  us into the next or previous day.
    if (dateAdvanceNeeded) // we're in the next day
    {
      // advance the date by one day
      currDate = new Date(currDate.getTime() + 86400000); 
    }  

    if (dateRollbackNeeded) // we're in the previous day
    {
      // roll back the date by one day
      currDate = new Date(current.getTime() - 86400000); 
    }      
    ****** End of old tz logic *******************************************/

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

    // populate the sunrise and sunset arrays for the current week.
    // Needed only for the week spiral mode.
    // NOTE, the OutputHour may be -1 (no day) or -2 (no night)
    var secFromSunday;
    for (var dd = 0; dd <= 6; dd++) // loop from sunday to saturday
    {
      calcRiseSetTimeWithOffset(
        true,  // calc sunrise
        dd - IDow,  // offset from current day-of-week
        Latitude,
        -Longitude,
        TzOffset,
        false);  // always set dst false since Tz offset takes dst into acct

      // only used to check for -1 or -2 indicating no day or no night.
      SunriseWeekHourArray[dd] = OutputHour;

      secFromSunday = OutputMin * 60 + OutputHour * 3600 + dd * 60 * 60 * 24; //III
      SunriseWeekSecFromSunArray[dd] = secFromSunday;

      calcRiseSetTimeWithOffset(
        false,  // calc sunset
        dd - IDow,  // offset from current day-of-week
        Latitude,
        -Longitude,
        TzOffset,
        false);  // always set dst false since Tz offset takes dst into acct

      secFromSunday = OutputMin * 60 + OutputHour * 3600 + dd * 60 * 60 * 24;
      SunsetWeekSecFromSunArray[dd] = secFromSunday;
    }

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
function setDaySpiral()  // Toggling mode button
{
  if (IsDaySpiral) {
    IsDaySpiral = false;
    DaySpiralButtonLabel = "Day Spiral";
    NumSpiralTurns = 14; // a week of am/pm's    
    genSpiral();

    // show the colorful mode button
    ColorfulModeButton.show();
    GmtDisplayButton.hide();
  }
  else {
    IsDaySpiral = true;
    DaySpiralButtonLabel = "Week Spiral";
    NumSpiralTurns = 2; // one for am, one for pm
    genSpiral();
    //DaySpiralButton.attribute('disabled', DaySpiralButtonLabel);

    // hide the colorful mode button
    ColorfulModeButton.hide();
    GmtDisplayButton.show();
  }

  // update button label
  DaySpiralButton.html(DaySpiralButtonLabel); // Change the button's HTML content
}


//-----------------------------------------------------------------
// Handler for the toggling SetColorfulMode button
function setColorfulMode()  // Toggling mode button
{
  if (IsOnlyTodayInColor) {
    IsOnlyTodayInColor = false;
    ColorfulModeButtonLabel = "Less Colorful";
  }
  else {
    IsOnlyTodayInColor = true;
    ColorfulModeButtonLabel = "More Colorful";
  }

  // update button label
  ColorfulModeButton.html(ColorfulModeButtonLabel); // Change the button's HTML content
}


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
}


//-----------------------------------------------------------------
// Handler for the ResetToLocal button
function resetToLocal() {

  TzOffset = TzOffsetLocal;
  var tzString = str(TzOffset);
  // Add in a plus sign if not negative
  if (TzOffset > 0) {
    tzString = "+" + str(TzOffset);
  }
  // init the UI field
  TzInput.value(tzString);
  LastTz = TzOffset;

  Latitude = LatLocal;
  var latString = str(Latitude);
  LatInput.value(latString);
  LastLat = LatLocal;

  Longitude = LngLocal;
  var longString = str(Longitude);
  LngInput.value(longString);
  LastLong = LngLocal;

  CityNameInput.value("Current Location");
  LocaleTitle = "Local Time";

  // Location may have changed, so need to regen spiral point array.
  // Clear flag that's checked in updateTimeThisDay()
  IsSunRiseSetObtained = false;

  updateTimeThisDay();
}




//=======================
// Set location and timezone to Silverado
//  
function setSilverado() {
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
  TzInputTimestampMs = millis();
}

//==== delayed processing of tz input allows user to finish
//  typing, avoiding temporarily invalid numbers like "-"
function processTzInputEvent() {
  TzInputTimestampMs = -1;
  TzOffset = Number(TzInput.value());

  if (isNaN(TzOffset)) {
    // can't convert to a float, restore to previous
    TzOffset = LastTz;
    var tzString = str(TzOffset);
    // Add in a plus sign if not negative
    if (TzOffset > 0) {
      tzString = "+" + str(TzOffset);
    }
    TzInput.value(tzString);
  }
  else {
    LastTz = TzOffset;

    CityNameInput.value("");
    LocaleTitle = "Entered Location";

    //calcSunRiseSet();   

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
    IsSunRiseSetObtained = false;

    updateTimeThisDay();
  }

}

// ===== keystroke detected in Latitude field
function latInputEvent() {
  console.log('you are typing latitude=', this.value());
  LatInputTimestampMs = millis();
}

// == delayed processing done after user finishes entering latitude
function processLatInputEvent() {
  LatInputTimestampMs = -1;

  //Latitude = float(this.value());
  // NOTE: using float above is too tolerant,
  //  it only fails if the non-numeric char is the first,
  //  else just stops parsing 
  Latitude = Number(LatInput.value());

  if (isNaN(Latitude)) {
    // can't convert to a float, restore to previous
    Latitude = LastLat;
    LatInput.value(LastLat);
  }
  else {
    LastLat = Latitude;

    CityNameInput.value("");
    LocaleTitle = "Entered Location";

    //calcSunRiseSet();   

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
    IsSunRiseSetObtained = false;

    updateTimeThisDay();
  }
  //print("lat=" + Latitude)
}



// ===== keystroke detected in longitude field
function longInputEvent() {
  console.log('you are typing longitude=', this.value());
  LngInputTimestampMs = millis();
}

// == delayed processing done after user finishes entering longitude
function processLongInputEvent() {
  LngInputTimestampMs = -1;
  Longitude = Number(LngInput.value());

  if (isNaN(Longitude)) {
    // can't convert to a float, restore to previous
    Longitude = LastLong;
    LngInput.value(LastLong);
  }
  else {
    LastLong = Longitude;

    CityNameInput.value("");
    LocaleTitle = "Entered Location";

    //calcSunRiseSet();   

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
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

    // Make a GET request to the Nominatim API (OpenStreetMap)
    // ATTN: the gotCityLocationDataOpenStMap() fcn will be called a bit later, when the  
    // response to the url call comes in.  We won't know the lat/lon until then.
    //  THis means the subsequent API call to get the time zone can't happen until then.
    loadJSON(apiUrl, gotCityLocationDataOpenStMap);
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
    }
    //else if (timeZoneOffset/3600 > 13 || timeZoneOffset/3600 < -13) 
    else if (timeZoneOffset > 13 || timeZoneOffset < -13) {
      isError = true;
      print("Error, invalid time zone offest=" + str(timeZoneOffset));
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
    CityNameInput.value(CityName + " not found");
    LocaleTitle = PrevLocaleTitle;
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
  }
  else if (timeZoneOffset > 13 || timeZoneOffset < -13) {
    isError = true;
    print("Error, invalid time zone offest=" + str(timeZoneOffset));
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

  if (IsDaySpiral) {
    fill(100);  // gray
  }
  else {
    fill(40);  // dark gray
  }

  noStroke();
  ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);

  fill(255)
  textFont("Arial");

  // Sometimes there's a delay before the location is fetched, so show a loading message
  textAlign(CENTER, TOP);
  text("Loading your approximate location...", CenterX, CenterY - 20);
  text("(Based on your IP address)", CenterX, CenterY);
  text("Location is not stored!", CenterX, CenterY + 40);

  textAlign(LEFT, TOP);

  // Draw clock title
  if (IsDesktop) {
    textSize(CurrentFontSize * 0.8);
  }
  else {
    textSize(CurrentFontSize * 1.4);
  }

  if (IsDaySpiral) {
    text("Day Spiral Clock", CenterX * 0.02, CenterY * 0.03)
  }
  else {
    text("Week Spiral Clock", CenterX * 0.02, CenterY * 0.03)
  }

  // draw description text under clock title
  if (IsDesktop) {
    textSize(CurrentFontSize * 0.38);
  }
  else {
    textSize(CurrentFontSize * 0.68);
  }

  if (IsDaySpiral) {
    text("Hour hand tip follows the day spiral,", CenterX * 0.02, CenterY * 0.12)
    text("making 1 turn for AM and 1 for PM.", CenterX * 0.02, CenterY * 0.17)
  }
  else // is week spiral
  {
    text("Hour hand tip follows the week spiral,", CenterX * 0.02, CenterY * 0.12)
    text("making 2 turns per day for AM and PM.", CenterX * 0.02, CenterY * 0.17)
  }

  text("Dark part of spiral indicates night.", CenterX * 0.02, CenterY * 0.22)
  text("(C)2024 by Charlie Wallace", CenterX * 0.02, CenterY * 0.27)


  // Bail out if lat/long is not set yet.
  if (Latitude == 99999 || Longitude == 99999) {
    return;
  }

  // ==240124a
  // Redraw the clock background - this hides the "Please Wait" message
  if (IsDaySpiral) {
    fill(100);  // med gray
  }
  else  // is week spiral
  {
    fill(40);  // dark gray    
  }

  noStroke();
  ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);
  fill(255);

  textAlign(LEFT, BOTTOM);
  textSize(RefFontSize * 0.38);

  //var tzOffsetString = str(TzOffset);
  // Add in a plus sign if not negative
  //if (TzOffset > 0)
  //{
  //  tzOffsetString = "+" + str(TzOffset);
  //}

  text("GMT offset:", 10, CenterY * 2 - 110);

  text("Latitude:", 10, CenterY * 2 - 80);

  text("Longitude:", 10, CenterY * 2 - 50);

  text("City:", 10, CenterY * 2 - 20);

  fill(0);  // black


  // Draw outer clock face ================

  // draw ellipse to fill entire face, will end up
  // as background for the hour labels on outside.

  strokeWeight(0)
  fill(255); //60)
  ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);

  fill(120);  // Color of bkgnd behind spiral
  ellipse(CenterX, CenterY, InnerFaceRadius * 2, InnerFaceRadius * 2);

  // Draw the hour ticks
  stroke(255)
  strokeWeight(8 * FontScaleFactor);
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

  //-------------------------------------------------------
  // Set length of hour hand to fall on the week spiral
  // appropriately for the current day and am/pm.
  // note that there are 2 turns per day
  var iiSpiral = 0;

  // Calc index into radius array for the current time.
  //  taking into acct that there are two turns per day for each AM/PM.
  if (IsDaySpiral) {
    iiSpiral = int((theHour / 24) * NumSpiralPointsPerTurn * 2);
  }
  else // is week spiral
  {
    iiSpiral = int(IDow * NumSpiralPointsPerTurn * 2) +
      int((theHour / 24) * NumSpiralPointsPerTurn * 2);
  }

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

  //===============================================================
  // Display info for the selected location in upper rt corner of window.
  // This is NOT necessarily the browser's location.
  // Includes  time, date, day, dst status, sunrise and sunset.

  fill(255);
  if (IsDesktop) {
    textSize(CurrentFontSize * 0.8);
  }
  else {
    textSize(CurrentFontSize * 1.4);
  }
  textAlign(RIGHT, TOP);
  text(LocaleTitle, CenterX * 2 - 19, 12);

  if (IsDesktop) {
    textSize(CurrentFontSize * 0.38);
  }
  else {
    textSize(CurrentFontSize * 0.68);
  }


  var amPmString = " PM";
  if (IsAM) {
    amPmString = " AM";
  }

  textAlign(RIGHT, TOP);
  text(TimeString + amPmString, CenterX * 2 - 19, CenterY * 0.12); // 53);
  text(DateString, CenterX * 2 - 19, CenterY * 0.17); // 75);
  text(getDayStringLong(IDow), CenterX * 2 - 19, CenterY * 0.22); // 98);
  text("Daylight Savings: " + IsDst, CenterX * 2 - 19, CenterY * 0.27); // 121);

  if (SunriseHour >= 0) {
    text("Sunrise: " + SunriseHourString + ":" + SunriseMinString
      + SunriseAmpmString, CenterX * 2 - 19, CenterY * 0.32);
    text("Sunset: " + SunsetHourString + ":" + SunsetMinString
      + SunsetAmpmString, CenterX * 2 - 19, CenterY * 0.37);
  }
  else if (SunriseHour == -2) {
    text("Light All Day", CenterX * 2 - 19, CenterY * 0.32);
  }
  else if (SunriseHour == -1) {
    text("Dark All Day", CenterX * 2 - 19, CenterY * 0.32);
  }

  /*** Old formatting  *******************
  
  text(TimeString + amPmString, CenterX*2-19, 12);
  text(DateString, CenterX*2-19, 35);
  text(getDayStringLong(IDow), CenterX*2-19, 58);
  text("Daylight Savings: " + IsDst, CenterX*2-19, 81);
 
  if (SunriseHour >=0)
  {
    text("Sunrise: " + SunriseHourString + ":" + SunriseMinString 
      + SunriseAmpmString, CenterX*2-19, 104);
    text("Sunset: " + SunsetHourString + ":" + SunsetMinString 
      + SunsetAmpmString, CenterX*2-19, 127);
  }
  else if (SunriseHour==-2)
  {
    text("Light All Day", CenterX*2-19, 104);
  }
  else if (SunriseHour==-1)
  {
    text("Dark All Day", CenterX*2-19, 104);
  }  
  ***********************/

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
  var dayColor = getDayColor(dw);
  var nightColor = getNightColor(dw);
  var dayString = getDayStringShort(dw);
  var nextDayString = getDayStringShort(dw + 1);

  // set weight differently when running on phone.  
  //   Should be reduced by about half.
  strokeWeight(6); //Note, 6/12 is max on phone/desktop
  if (IsDesktop) {
    strokeWeight(10);
  }

  // Draw logic for the simple 2-turn case, DaySpiral.  See below for 
  // more complex week spiral code...
  if (IsDaySpiral) {
    // Draw the day spiral for the current day.
    // Use broader stroke for the day spiral, since it's only 2 turns long
    strokeWeight(14); // for phone
    if (IsDesktop) {
      strokeWeight(30);
    }

    // ==240125a
    dayColor = getDayColor(dw);
    nightColor = getNightColor(dw);

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
      if (IsDesktop) {
        textSize(RefFontSize * dowLabelSizeDsktpBoost); // boosted text scale for desktop
        text(dayString, CenterX + XSpiralArray[vvBase] + 3, CenterY + YSpiralArray[vvBase] - 9);

        textAlign(LEFT, TOP);
        text(nextDayString, CenterX + XSpiralArray[vvEnd] + 5, CenterY + YSpiralArray[vvEnd] - 11);
        textSize(RefFontSize * dowLabelSizeDsktp); // Restore text size

      }
      else // on phone
      {
        textSize(RefFontSize * dowLabelSizeMoblBoost);  // boosted text scale for mobile  
        text(dayString,
          CenterX + XSpiralArray[vvBase] + 1,
          CenterY + YSpiralArray[vvBase] - 7);

        textAlign(LEFT, TOP);
        text(nextDayString, CenterX + XSpiralArray[vvEnd] + 5, CenterY + YSpiralArray[vvEnd] - 9);
        textSize(RefFontSize * dowLabelSizeMobl); // Restore text size        
      }
    }

    // If display of GMT is enabled, we show on the spiral
    if (IsGmtShown) {
      let gmtHour = 0;
      let theLocalHour = 0;
      let gmtHourIndex = 0;
      let gmtLabelX = 0;
      let gmtLabelY = 0;

      textAlign(CENTER, CENTER);
      if (IsDesktop) {
        textSize(RefFontSize * dowLabelSizeDsktpBoost); // boosted text scale for desktop
      }
      else {
        textSize(RefFontSize * dowLabelSizeMoblBoost);  // boosted text scale for mobile      
      }

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
  else  // Draw logic for 14-turn week spiral ============================
  {

    for (dw = 0; dw < 7; dw++) // step thru the days of the week
    {
      dayColor = getDayColor(dw);
      nightColor = getNightColor(dw);
      dayString = getDayStringShort(dw);

      stroke(dayColor);

      vvBase = dw * NumSpiralPointsPerTurn * 2;

      if (SunriseWeekHourArray[dw] != -1) // if not dark-all-day
      {
        // use daytime color, but draw the entire 24hrs for this day.
        // If it's light all day (midnight sun) then this is all we need.
        // Otherwise, we'll draw the night-time part over this.
        beginShape();
        for (vv = vvBase; vv <= vvBase + 2 * NumSpiralPointsPerTurn; vv++) {
          //print("for day=" + dw +" color="+ dayColor);
          vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
        }
        endShape();

        if (SunriseWeekHourArray[dw] != -2) // if not all-day-sun
        {
          // now draw in the night portion for this day-of-week.
          stroke(nightColor); // set black color

          // first the part from midnight to sunrise ----------------
          // vv at midnight is vvBase; vv at sunrise is needed = vvRise.

          // seconds from midnight on day dw to sunrise that day
          secToRise = SunriseWeekSecFromSunArray[dw] -
            (60 * 60 * 24 * dw);
          // convert seconds to vv offset from start of day dw
          vvRise = int((secToRise / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);

          beginShape();
          for (vv = vvBase; vv < vvBase + vvRise; vv++) {
            vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
          }
          endShape();

          // Next draw the part from sunset to midnight ----
          // vv at sunset is vvSet, 
          // vv at midnight is vvBase+NumSpiralPointsPerTurn

          // seconds from midnight on day dw to sunset that day
          secToSet = SunsetWeekSecFromSunArray[dw] -
            (60 * 60 * 24 * dw);
          // convert seconds to vv offset
          vvSet = int((secToSet / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);
          beginShape();

          // NOTE use of <= below, this ensures that the last vertex hooks up with first.
          for (vv = vvBase + vvSet; vv <= vvBase + 2 * NumSpiralPointsPerTurn; vv++) {
            vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
          }

          endShape();
        }
      }
      else // midnight sun
      {
        // use night-time color, but draw the entire 24hrs for this day.
        stroke(nightColor);

        beginShape();
        for (vv = vvBase; vv <= vvBase + 2 * NumSpiralPointsPerTurn; vv++) {
          vertex(CenterX + XSpiralArray[vv], CenterY + YSpiralArray[vv]);
        }
        endShape();
      }

      // Add day-of-week label just after midnight 
      fill(255);
      noStroke();

      // Draw in the day-of-week label, in a column under the 12. Make the current day bold/larger.
      if (dw == IDow) {
        textStyle(BOLD);
        fill(color(251, 246, 71));  // yellow

        // boost text size for emphasis, same for dsktop and mobile
        if (IsDesktop) {
          textSize(RefFontSize * dowLabelSizeDsktpBoost); // boosted text scale for desktop
          text(dayString,
            CenterX + XSpiralArray[vvBase] + 3,
            CenterY + YSpiralArray[vvBase] - 11);
        }
        else {
          textSize(RefFontSize * dowLabelSizeMoblBoost);  // boosted text scale for mobile  
          text(dayString,
            CenterX + XSpiralArray[vvBase] + 3,
            CenterY + YSpiralArray[vvBase] - 8);
        }
      }
      else  // is NOT the current day of the week.
      {
        textStyle(NORMAL);
        if (IsDesktop) {
          text(dayString,
            CenterX + XSpiralArray[vvBase] + 3,
            CenterY + YSpiralArray[vvBase] - 5);
        }
        else {
          text(dayString,
            CenterX + XSpiralArray[vvBase] + 3,
            CenterY + YSpiralArray[vvBase] - 5);
        }
      }

      // Restore text size
      if (IsDesktop) {
        textSize(RefFontSize * dowLabelSizeDsktp);
      }
      else {
        textSize(RefFontSize * dowLabelSizeMobl);
      }

      textStyle(NORMAL);

      noFill();
    }
  }

  strokeCap(ROUND);
  fill(0);


  // Draw the hands of the clock ===============

  stroke(255);  // set hand color

  // Draw second hand
  strokeWeight(5 * FontScaleFactor);
  line(CenterX, CenterY, CenterX + cos(secRads) * SecondsRadius, CenterY + sin(secRads) * SecondsRadius);

  // draw minute hand
  strokeWeight(10 * FontScaleFactor);
  line(CenterX, CenterY, CenterX + cos(minRads) * MinutesRadius, CenterY + sin(minRads) * MinutesRadius);

  // draw hour hand
  strokeWeight(17 * FontScaleFactor);

  // Draw hour hand with square cap so it clearly shows where it's tracking on the
  // week spiral.  
  strokeCap(SQUARE);
  let adjustedHourRadius = HoursRadius;
  if (IsGmtShown && IsDaySpiral) {
    adjustedHourRadius = RadiusSpiralArray[iiSpiral] - ClockDiameter * 0.017;  //wc5
  }

  line(CenterX, CenterY, CenterX + cos(hourRads) * adjustedHourRadius,
    CenterY + sin(hourRads) * adjustedHourRadius);

  // Redraw the hour hand at half length to avoid having a square end cap in the center
  //  of the clock
  strokeCap(ROUND); // restore round ends    
  line(CenterX, CenterY, CenterX + cos(hourRads) * HoursRadius / 2, CenterY + sin(hourRads) * HoursRadius / 2);

  // Draw a little circle around the tip of the hour hand to emphasize that it's following
  //   the week spiral
  noFill();
  strokeWeight(3)

  stroke(255); // white


  if (IsDaySpiral) {
    ellipse(CenterX + cos(hourRads) * HoursRadius,
      CenterY + sin(hourRads) * HoursRadius,
      32 * FontScaleFactor,
      32 * FontScaleFactor);
  }
  else // for week spiral use smaller diameter circle
  {
    ellipse(CenterX + cos(hourRads) * HoursRadius,
      CenterY + sin(hourRads) * HoursRadius,
      27 * FontScaleFactor,
      27 * FontScaleFactor);
  }

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


