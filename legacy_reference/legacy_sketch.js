/** ===========================================================
 * Day Spiral Clock V3: Sunrise & Sunset shown on 12-hr clock face.
 * This clock shows the current day as a spiral, with 2 turns because
 * of AM and PM on the 12-hour clock face.  
 * This V3 version removes the outer hour labels, instead showing the
 * hour within the now wider spiral, including 0-23 hours in two turns.
...
// (Code continues...)
/** ===========================================================
 * Day Spiral Clock V3: Sunrise & Sunset shown on 12-hr clock face.
 * This clock shows the current day as a spiral, with 2 turns because
 * of AM and PM on the 12-hour clock face.  
 * This V3 version removes the outer hour labels, instead showing the
 * hour within the now wider spiral, including 0-23 hours in two turns.
 *
 * A web service from OpenStreetMap is used to fetch location
 * of a user-entered city. 
 * A separate web servce at GeoNames is used to fetch the time zone.
 * That call requires a free account; if you clone this project, please
 * create your own login and revise the url.  However no API key is needed.
 *
 * By Charlie Wallace coolweird.net
 * 

TODO Fixes & Bugs -----------------------
  * Bug: in top rt of window we show dst status. If dst was set via a city button rather
     than web service call, this looks right, but is wrong when city submit clicked; however
     times are right in both cases.
     When the bad IsDst causes wrong notDst status, I see the following in log, dst *was* detected:
     "fixing IHour due to GeoNames result:
     {IHour: 21} s/b  {HourDstAdj: 22}{TzOffset: -8}
     REASON: the 'new' method of detecting dst fails to set IsDst.
     TODO: in gotCityTzData(): 
       if the (gmt hour + dstOffset) mod 24 == known good hour then IsDst=true else false.
  * Bug: now that it's daylight savngs time here as of 2 days ago, I noticed that the geonames svc call
    is failing to indicate dst for san diego and other usa locations.  The returned gmtOffset and
    rawOffset are the same as of march 12.  ???????????????????????????????????????????
    However it is correct for Sydney, showing raw and gmt offsets different -> dst is in effect.
    London has not crossed over to dst yet, so is correctly showing it's not dst.
    >>>>> LOOKS LIKE a flaw in the geonames service???
    HINT: the time field returned by geoNames DOES show the correct dst-adjusted time, for ex:
    <time: "2024-03-12 18:03">
    ...even though the raw and dst offsets are the same!  <<<<<possible fix
    FIX notes: once correct local time is extracted, look at the hour, compare to the hour
    we thought was correct; if diff, adjst the official hour, and the tz.
  * Issue: minute hand shorter than hour hand - happens when hour hand is placed further
     out on the spiral, like near 13, while min hand is located further in and thus shorter,
     for example near 23. Hmmm, seems hard to fix.  Maybe just make sure the hour hand has 
     a very distinctive look?
     * This is a reason to stay with narrower spiral and tight spacing, tho that's not 
       sufficient to fix the problem
  * Rarely the wev service call to get the city location or tz didn't respond.
     Add var to capture the millis at start of call so can monitor for timeout.
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
  * Implement 24 hour mode, with animated unwrapping of the spiral
 
==== IMPL / FEATURE NOTES  =====
* Added setDstUsa() and setDstUk() and added calls in each city button handler.
      Those no longer call the web service. (ISSUE, web svc gives incorr dst)
* Now attempting the web svc call at start to see if it's up.
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
var TrueCenterX, TrueCenterY;
var SecondsRadius;
var MinutesRadius;
var HoursRadius;
var HourNumbersRadius;
var InnerFaceRadius;
var ClockDiameter;
var SpiralLineWidth;
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
var NewLatLongMillis;
var CheckOpenStMapResultCode;
var CheckOpenStMapMillisStart;
var WebServiceTimeoutHappened;
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
var HourDstAdj; // extracted from web svc call; ignore if -1
var IDow;
var IDowPrevious;
var IHour12;
var IsAM;
var TimeString;
var DateString;
var IMsSinceDayStart;
var TargetDate; // this is the date in the context of the selected city rather than browser location

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

var GmtDisplayButton;
var GmtDisplayButtonLabel;  // needed when button label must change

var Show24TimeButton;
var Show24TimeButtonLabel;  // needed when button label must change

var CitySubmitButton;

var IsDst; // daylight savings time
var IsDstAu; // daylight savings time in AU.  Only used by Melbourne button handler


//var SunsetWeekSecFromSunArray;
//var SunriseWeekHourArray;  // only used to check for no-day or no-night results
//var SunriseWeekSecFromSunArray;

var XSpiralArray;
var YSpiralArray;
var RadiusSpiralArray;
var NumSpiralPointsPerTurn;
var NumSpiralTurns;

var IsWindows;
var IsDesktop;

var IsGmtShown;
var IsOuterClockFaceShown;
var Use12HourLabels;
var ClockMode;


var CityName;

var LocaleTitle;
var PrevLocaleTitle;
//var tempTest = true;  // used only for testing






//=============================================================================
//=============================================================================
// This only runs at startup, see Init() below
function oneTimeInit() {
    // state vars.  Preserve these thru window resize.
    IsGmtShown = false; //true; // false; //
    IsOuterClockFaceShown = false;
    Use12HourLabels = true; // false;//

    ClockMode = 0;


    // Use this to allow customizing layout for windows vs mobile
    IsWindows = (window.navigator.platform == "Win32");

    /**************
    if (IsWindows)
    {
      window.alert('Windows detected.');
    }
    else
    {
      window.alert('Windows not detected.');
    }
    //*******/

    IsDesktop = IsWindows ||
        (window.navigator.platform.indexOf("Mac") === 0)
    console.log("IsWindows=" + IsWindows)

    //fullscreen(); 
    createCanvas(window.innerWidth, window.innerHeight);
    //createCanvas(window.innerWidth, window.innerHeight, WEBGL);




    // ==== button and field creation and setup done here only once; ======
    //  but position is set in reInit() since it will change on window resize.
    //

    //     misc buttons
    ResetToLocalButton = createButton('Reset to local');
    ResetToLocalButton.mousePressed(resetToLocal);

    //     mode buttons  


    GmtDisplayButtonLabel = "Show GMT";
    GmtDisplayButton = createButton(GmtDisplayButtonLabel);
    GmtDisplayButton.mousePressed(setGmtDisplay);
    GmtDisplayButton.show();

    Show24TimeButtonLabel = "24-Hour Time";
    Show24TimeButton = createButton(Show24TimeButtonLabel);
    Show24TimeButton.mousePressed(set24Time);
    Show24TimeButton.show();

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
    InputFieldProcessingTimeout = 2000;  // ms

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


    //========= get gps position ==========	
    navigator.geolocation.getCurrentPosition(
        // Success callback.  This runs later, after setup()
        function (position) {
            //console.log(position);
            // ATTN this runs a bit later when the gps comes in...
            background(220);
            textSize(32);
            print("latitude: " + position.coords.latitude);
            Latitude = position.coords.latitude;

            // Round to 3 places after decimal
            Latitude = round(Latitude, 3);
            var latString = str(Latitude);
            LatInput.value(latString);
            LatLocal = Latitude;
            LastLat = Latitude;

            print("longitude: " + position.coords.longitude);
            Longitude = position.coords.longitude;
            // Round to 3 places after decimal
            Longitude = round(Longitude, 3);
            var longString = str(Longitude);
            LngInput.value(longString);
            LngLocal = Longitude;
            LastLong = Longitude;
        },

        // Optional error callback
        function (error) {
            //In the error object is stored the reason for the failed attempt:
            //error = {
            //    code - Error code representing the type of error 
            //            1 - PERMISSION_DENIED
            //            2 - POSITION_UNAVAILABLE
            //            3 - TIMEOUT
            //    message - Details about the error in human-readable format.
            //}

            print("Gps error happened, code=" + error.code + " " + error.code);

            // HACK: default to Melbourne.   
            Latitude = -37.8;
            Longitude = 144.96;
            TzOffset = 10; // assume DST

            latitudeLocal = Latitude;
            longitudeLocal = Longitude;
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

            //  san diego TzOffset -7 DST, -8 STD
            //Latitude = 33.1;
            //longitude = -117.1;
        }
    );  // end of error function
    //============= end of deferred position fetch =========================


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

    console.log(">> Browser DST is ", IsDst);

    // init the time zone field on screen
    TzInput.value(tzString);
    LastTz = TzOffset;

    // init for the week spiral mode
    //SunsetWeekSecFromSunArray = new Array(7);
    //SunriseWeekHourArray = new Array(7);  
    //SunriseWeekSecFromSunArray = new Array(7);

    XSpiralArray = [];
    YSpiralArray = [];
    RadiusSpiralArray = [];
    NumSpiralPointsPerTurn = 120;
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
    Longitude = 99999;
    NewLatitude = 99999;
    NewLongitude = 99999;
    NewLatLongMillis = -1;  // disabled when neg
    CheckOpenStMapResultCode = -1; // The check is passed when == 4, supressed when < -1.
    //  this is set to -2 after the check is passed.
    CheckOpenStMapMillisStart = -1;

    WebServiceTimeoutHappened = false;
    LastLat = 99999;
    LastLong = 99999;
    LatLocal = 99999;
    LngLocal = 99999;

    stroke(255);  // set white stroke color for lines and fonts

    // init last millisec
    // millis is ms since program started
    // (actually since setup was called, so should be 0 ish)
    LastMillisec = millis();

    HourDstAdj = -1;

}  // end of oneTimeInit()  ====================



//============================================================================
//============ Primary Entry Point ===========================================
//
function setup() {
    oneTimeInit();  // init that is not redone on window resize

    reInit();  // all init that must be redone on window resize

    //======================= UPDATE time vars ====================
    updateTimeThisDay();  // sets baseMs and MsFromStartToResetTime

    checkOpenStMap();

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
    SpiralLineWidth = radius * 0.16;

    // radius to centers of numbers
    HourNumbersRadius = radius * 0.83;
    InnerFaceRadius = HourNumbersRadius * 0.93;

    if (!IsOuterClockFaceShown) {
        let mm = (ClockDiameter / 2) / (radius * 0.7719);
        SecondsRadius = radius * 0.73 * mm;
        MinutesRadius = radius * 0.7 * mm;
        HoursRadius = radius * 0.44 * mm;
        ClockDiameter = radius * 1.78;
        HourNumbersRadius = radius; // NA in this mode
        SpiralLineWidth = radius * 0.2;
        InnerFaceRadius = ClockDiameter / 2;
    }

    CenterX = TheWidth / 2;  // center
    CenterY = TheHeight / 2; // center
    TrueCenterX = CenterX;
    TrueCenterY = CenterY;

    //CenterX = CenterX * 0.9;

    genSpiral();  // pre-calc arrays used to size and position the spiral.
    // Above call depends on current CenterX/Y, nSpiralTurns, etc. 

    RefFontSize = 40;
    FontScaleFactor = smallerDim / 900; //240;

    CurrentFontSize = RefFontSize;

    // ==== (re)set button and field positions ========

    ResetToLocalButton.position(10, CenterY * 2 - 160);

    //    mode buttons
    GmtDisplayButton.position(CenterX * 0.02, CenterY * 0.4);

    Show24TimeButton.position(CenterX * 0.02, CenterY * 0.33);

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
    let startFrac = 0.24;
    let endFrac = 0.6;


    if (!IsOuterClockFaceShown) {
        startFrac = 0.39;
        endFrac = 0.81;
    }


    var smallerCenter = CenterX;
    if (CenterX > CenterY) {
        smallerCenter = CenterY;
    }

    var startRadius = smallerCenter * startFrac;
    var endRadius = smallerCenter * endFrac;
    var nTurns = NumSpiralTurns; //2 per day! //wc4 // ==240123a
    var deltaRadiusPerTurn = (endRadius - startRadius) / nTurns;

    // NOTE use of <= below, so the array lengths are 1+NumSpiralPointsPerTurn*nTurns
    for (let ii = 0; ii <= NumSpiralPointsPerTurn * nTurns; ii++) {
        var iiRadians = TWO_PI * (ii / NumSpiralPointsPerTurn) - HALF_PI;
        // example, for nTurns==2, iiRadians varies from -pi/2 to (4pi - pi/2), 2 full turns.
        // THe -pi/2 corrects the rotation so the spiral starts from the top rather than the right.
        var iiRadius = endRadius - deltaRadiusPerTurn * (ii / NumSpiralPointsPerTurn);
        RadiusSpiralArray[ii] = iiRadius;
        XSpiralArray[ii] = iiRadius * cos(iiRadians);
        YSpiralArray[ii] = iiRadius * sin(iiRadians);
    }

}


//==========================================
// Color depicting daytime.

function getDayColor(dow) // range 0-6
{
    var iColor = color(0, 0, 0);

    //iColor = color(0x74, 0xc0, 0xff);  // sky blue
    //iColor = color(0x64, 0xb2, 0xf1);
    iColor = color(0x54, 0xa2, 0xe8);


    return iColor;
}


//==========================================
// Color depicting night.

function getNightColor(dow) // range 0-6
{
    var iColor = color(0, 0, 0);

    iColor = color(20, 80, 100); // darker blue 32, 60, 98

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
    //let dateRollbackNeeded = false;
    //let dateAdvanceNeeded = false;

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

        // Capture the new target date into global var for use when figuring dst & etc.
        // I try to avoid changing the global to any intermed value like is done with currDate.
        TargetDate = currDate;

        // Update day of week and hour based on corrected date currDate
        IDow = currDate.getDay(); // 0 is sunday 
        IHour = currDate.getHours();
    }

    // Sometimes the GeoNames web service fails to detect daylight savings correctly
    // via the usual diff between returned gmtOffset and rawOffset.  The following 
    // implements an alt method that pulls the dst-adjusted hour HourDstAdj from the
    // 'date' field in the getCityTzData() fn called earlier in response to the 
    // web svc call triggered by clicking Submit. This is the guaranteed correct hour.
    // Here we check if we got the IHour right; if not, TzOffset will need adjusting.
    // IMPORTANT: we must reset HourDstAdj to -1 here so it's only processed once.

    var iHourSave = IHour; // preserve
    if (HourDstAdj != -1) {
        if (IHour != HourDstAdj)  // the known good hour from web svc doesn't match IHour
        {
            // We have detected that the known good hour returned by the GeoNames web svc call
            // doesn't match IHour, so we fix IHour here, and also TzOffset.
            console.log("fixing IHour due to GeoNames result:", { IHour }, " s/b ", { HourDstAdj }, { TzOffset });
            IHour = HourDstAdj;
            TzOffset++;

            // Update the on-screen time zone offset
            var tzString;
            // Create string version of tz. Add a leading plus sign if not negative
            if (TzOffset > 0) {
                let timeZoneOffset = int(TzOffset); // round downward
                tzString = "+" + str(timeZoneOffset);
            }
            else {
                let timeZoneOffset = -int(-TzOffset); // round upward      
                tzString = str(timeZoneOffset);
            }

            // Update fields on-screen.
            TzInput.value(tzString);
        }

        // Make sure the HourDstAdj flag gets reset   
        HourDstAdj = -1;
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
    //IHour12 = int(IHour12);
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



//-----------------------------------------------------------------
// Handler for the toggling SetGmtDisplay button
function setGmtDisplay()  // Toggling mode button
{
    if (IsGmtShown) {
        IsGmtShown = false;
        //IsOuterClockFaceShown = false;
        GmtDisplayButtonLabel = "Show GMT";
        Show24TimeButton.show();
    }
    else {
        IsGmtShown = true;
        //IsOuterClockFaceShown = true;
        GmtDisplayButtonLabel = "Hide GMT";
        Show24TimeButton.hide();
    }

    // update button label
    GmtDisplayButton.html(GmtDisplayButtonLabel); // Change the button's HTML content
    reInit();
}

//-----------------------------------------------------------------
// Handler for the toggling SetGmtDisplay button
function set24Time()  // Toggling mode button
{
    if (Use12HourLabels) {
        Use12HourLabels = false;
        Show24TimeButtonLabel = "12-Hour Time";
    }
    else {
        Use12HourLabels = true;
        Show24TimeButtonLabel = "24-Hour Time";
    }

    // update button label
    Show24TimeButton.html(Show24TimeButtonLabel); // Change the button's HTML content
    reInit();
}


//-----------------------------------------------------------------
// Handler for the ResetToLocal button
function resetToLocal() {

    if (new Date().dst())  // if daylight savings is in effect at browser location
    {
        IsDst = true;
    }

    TzOffset = TzOffsetLocal;  // this takes dst into acct
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

    //CityNameInput.value("Current Location");
    LocaleTitle = "Local Time";

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
    IsSunRiseSetObtained = false;
    updateTimeThisDay()
}


/***********************************
Button handlers for the city buttons
------------------------------------
These are provided for convenience of friends and family.
These buttons don't use the web service call to set the location or time zone,
in order to avoid problems when the service provider is down, as has happened recently.
This includes determination of daylight savings; currently all the cities in the northern
hemisphere use the same dst as the browser location.  For AU, we call the SetIsDstAu() method.
ISSUE: if the browser is located in the southern hemisphere, this logic breaks... FORNOW FINDME
***********************************/

//=======================
// Set location and timezone to Silverado
//  
function setSilverado() {
    Latitude = 33.74;
    Longitude = -117.64;
    TzOffset = -8;
    updateTimeThisDay();
    setIsDstUsa();  // Sets IsDst flag based on USA rules.
    if (IsDst) {
        TzOffset++;
    }

    CityNameInput.value("Silverado, CA, USA");
    LocaleTitle = "Silverado";

    // Earlier was getting the location/TZ via web service call, but
    //  since this doesn't always work, I reverted to setting the 
    //  loc/TZ explicitly above.  Uncomment below if desired
    //  to restore use of the web service.
    //if (!WebServiceTimeoutHappened)
    //{
    //  getLocationUsingCityName("Silverado, CA, USA");
    //}

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
    IsSunRiseSetObtained = false;

    updateTimeThisDay();

    var tzString = str(TzOffset);
    // Add in a plus sign if not negative
    if (TzOffset > 0) {
        tzString = "+" + str(TzOffset);
    }
    //console.log(tzString);

    // init the UI field
    TzInput.value(tzString);
    LastTz = TzOffset;

    var latString = str(Latitude);
    LatInput.value(latString);
    LastLat = Latitude;

    var longString = str(Longitude);
    LngInput.value(longString);
    LastLong = Longitude;

}


//=======================
// Set location and timezone to London England
//  
function setLondon() {
    Latitude = 51.5;
    Longitude = -0.127;
    TzOffset = 0;
    updateTimeThisDay();
    setIsDstUk();  // Sets IsDst flag based on Uk rules.
    if (IsDst) {
        TzOffset++;
    }

    CityNameInput.value("London, UK");
    LocaleTitle = "London";

    // Earlier was getting the location/TZ via web service call, but
    //  since this doesn't always work, I reverted to setting the 
    //  loc/TZ explicitly above.  Uncomment below if desired
    //  to restore use of the web service.
    //getLocationUsingCityName("London, UK");

    // Location may have changed, so need to regen spiral point array.
    // Clear flag that's checked in updateTimeThisDay()
    IsSunRiseSetObtained = false;

    updateTimeThisDay();

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

}


//=======================
// Set location and timezone to Berkeley
//  
function setBerkeley() {
    Latitude = 37.87;
    Longitude = -122.27;
    TzOffset = -8;
    updateTimeThisDay();
    setIsDstUsa();  // Sets IsDst flag based on USA rules.
    if (IsDst) {
        TzOffset++;
    }

    CityNameInput.value("Berkeley, CA, USA");
    LocaleTitle = "Berkeley";

    // Earlier was getting the location/TZ via web service call, but
    //  since this doesn't always work, I reverted to setting the 
    //  loc/TZ explicitly above.  Uncomment below if desired
    //  to restore use of the web service.
    //getLocationUsingCityName("Berkeley, CA, USA");  

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
    Latitude = 39.1;
    Longitude = -94.578;
    TzOffset = -6;
    updateTimeThisDay();
    setIsDstUsa();  // Sets IsDst flag based on USA rules.
    if (IsDst) {
        TzOffset++;
    }

    CityNameInput.value("Kansas City, MO, USA");
    LocaleTitle = "Kansas City";

    // Earlier was getting the location/TZ via web service call, but
    //  since this doesn't always work, I reverted to setting the 
    //  loc/TZ explicitly above.  Uncomment below if desired
    //  to restore use of the web service.
    //getLocationUsingCityName("Kansas City, MO, USA");  

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
// Set location and timezone to Melbourne
//  
function setMelbourne() {
    Latitude = -37.8;
    Longitude = 144.96;
    TzOffset = 10;
    updateTimeThisDay();
    setIsDstAu();  // Sets IsDst flag based on USA rules.
    if (IsDstAu) {
        TzOffset++;
    }

    CityNameInput.value("Melbourne, AU");
    LocaleTitle = "Melbourne";

    // Earlier was getting the location/TZ via web service call, but
    //  since this doesn't always work, I reverted to setting the 
    //  loc/TZ explicitly above.  Uncomment below if desired
    //  to restore use of the web service.
    //getLocationUsingCityName("Melbourne, AU");    

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
    Latitude = 33.15;
    Longitude = -117.3;
    TzOffset = -8;
    updateTimeThisDay();
    setIsDstUsa();  // Sets IsDst flag based on USA rules.
    if (IsDst) {
        TzOffset++;
    }

    CityNameInput.value("San Diego, CA, USA");
    LocaleTitle = "San Diego";

    // Earlier was getting the location/TZ via web service call, but
    //  since this doesn't always work, I reverted to setting the 
    //  loc/TZ explicitly above.  Uncomment below if desired
    //  to restore use of the web service.
    //getLocationUsingCityName("San Diego, CA, USA");    

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
    console.log('LatInputTimestampMs=' + str(LatInputTimestampMs));

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


// ==============
// Perform a test access to Open Street Map to see if it's up.
function checkOpenStMap() {
    // url used for OpenStreetmap (Nominatim)
    let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${"San Diego"}`;
    CheckOpenStMapMillisStart = millis();  // time since sketch started running


    // Make a GET request to the Nominatim API (OpenStreetMap)
    // ATTN: the gotResponseOpenStMap() fcn will be called a bit later, when the  
    // response to the url call comes in.  We won't know the lat/lon until then.
    //  THis means the subsequent API call to get the time zone can't happen until then.
    loadJSON(apiUrl, gotResponseCheckOpenStMap);
}

// using Nominatim OpenStreetMap API
// The response to the API call for the city name has arrived.
function gotResponseCheckOpenStMap(data) {
    console.log("Entering gotResponseCheckOpenStMap().");

    CheckOpenStMapResultCode = 1;  // flags that location response happened; 
    // on good data, we'll set it to 2 below, then will trigger time zone service

    // Check if the response contains any results
    var isError = false;
    if (data.length != 0) {
        console.log("Results of check: City location data from OpenStreetMap:")
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
            print("CheckOpenStMap failure, invalid lat or long.  Lat=" + str(lat) + " Long=" + str(lon))
        }
        else // looks like a valid offset
        {
            // set to > -1 using current millisec since start of app. Indicating that response was valid.
            //  This allows response time to be calculated.
            CheckOpenStMapResultCode = 2;  // indicates location data valid

            console.log("Check OpenStMap: lat=" + str(lat) + " lon=" + str(lon));

            // Now that we have the lat/lon, we need one more API call to geonames
            // in order to fetch the time zone offset.    
            // GeoNames API URL for timezone lookup
            let timezoneUrl =
                `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=charliewallace`;
            console.log('timezoneUrl=' + timezoneUrl);

            // Make a GET request using Geonames to get timezone details.
            // The gotCityTzData() fcn will run a bit later when the response arrives.
            loadJSON(timezoneUrl, gotTzResponseGeonamesCheck);
        }
    }
    else {
        console.log(`Open St Map Check: No results found for San Diego; FAILED.`);
        CityNameInput.value("City lookup failed.");
    }
}


//============= 
// test fcn for checking web svc to get time zone 
//
function gotTzResponseGeonamesCheck(data) {
    console.log("Entering gotTzResponseGeonamesCheck().");
    CheckOpenStMapResultCode = 3;  // indicates timezone geoNames callback happened

    // Check if the response contains any results
    if (data.length != 0) {
        console.log('gotTzResponseGeonamesCheck() did return data:')
        console.log(data);  // dump the returned data

        // Extract time zone offset.  This takes daylight savings into acct.
        let timeZoneOffset = data.gmtOffset;

        console.log('Geonames tz offset = ' + str(timeZoneOffset));

        if (timeZoneOffset > -12 && timeZoneOffset < 12) {
            CheckOpenStMapResultCode = 4;  // indicates timezone data is valid - OVERALL SUCCESS
        }

        // SInce this is just checking that tz fetch works, we 
        //  don't update TzOffset; instead this will be set elsewhere based on 
        //  the browser's location
        //TzOffset = timeZoneOffset;    // store into global
    }
    else {
        console.log(
            `gotTzResponseGeonamesCheck() call happened but did not deliver timezone data from GeoNames.`);
    }

}



// handler for the Submit button that enters a city name
// The entered city name may contain additional fields such as state/province and 
// country, comma separated.
function handleCitySubmit() {
    CityName = CityNameInput.value();
    PrevLocaleTitle = LocaleTitle;

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
            NewLatLongMillis = millis();  // time since sketch started running

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
        // BUG: this rawOffset vs gmtOffset method doesn't always work to detect DST!  FINDME
        let rawOffset = data.rawOffset;
        if (rawOffset == timeZoneOffset) {
            IsDst = false;
        }
        else {
            IsDst = true;
        }

        // New approach to detect DST since above raw vs gmt offset method is unreliable:
        // The "Time" param in the returned data has the correct hour, extract it.

        // Extract the "time" param from returned data:
        var webSvcDateTime = data.time;
        let dstOffset = data.dstOffset;


        // Extract the last space-delim field, = the local dst-adjusted time in 24-hr fmt:
        let splitString = split(webSvcDateTime, ' ');
        let targetTime24hr = splitString[1];  // this is in hh:mm format
        //console.log(targetTime24hr); // FINDME

        // We only need the hour, so this time use the colon as the delimiter.
        splitString = split(targetTime24hr, ':'); // pull out the hour field before the ':'

        // ATTN: this is handled later in updateTimeThisDay() where it's reset to -1.
        HourDstAdj = int(splitString[0]); // convert to a number 

        console.log("Known good hour taking daylight savings into acct = ", HourDstAdj);

        // if the (gmt hour + dstOffset) mod 24 == known good hour then set IsDst 
        var d = new Date();
        var gmtHour = d.getUTCHours();
        console.log(">>>> gmt hour = ", gmtHour);

        var calcdDstHour = gmtHour + dstOffset;
        if (calcdDstHour < 0) {
            calcdDstHour += 24;
        }
        else if (calcdDstHour >= 24) {
            calcdDstHour -= 24;
        }
        console.log("Calcd Dst adjusted hour is ", calcdDstHour);
        if (calcdDstHour == HourDstAdj) // known good hour matches calcd dst adj hour
        {
            IsDst = true;
        }
        else {
            IsDst = false;
        }
        // LEFTOFF - issue - above doesn't work for Melbourne; calcdDstHour is 15, one too small


        // later in updateTimeThisDay() we calculate IHour; if diff from HourDstAdj must fix 
        // IHour and TzOffset.
        // Since we don't have IHour yet, it's too early to update it or TzOffset;
        // so instead we set HourDstAdj to a non-neg value that is picked up
        // by updateTimeThisDay() in the next pass, and there we correct IHour if needed,
        // and also adjust TzOffset.  At that point we also need to correct the displayed
        // offset in field TzInput.  Then must reset HourDstAdj to -1.

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
        NewLatLongMillis = -1;  // disabled


        // Update the GMT offset (tz) field on screen.
        // May need to redo this in updateTimeThisDay() if HourDstAdj was set above,
        //  thus changing the tz.
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
        NewLatLongMillis = -1; // disabled

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
        NewLatLongMillis = millis();  // time since sketch started running


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
// The main draw routine that is called continuously FINDME
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

    // First time only - detect if the check of the open street map service call timed out.
    // THis is a prelim service call to assess if the external web service is up and running.
    // It shouldn't run any more after it suceeds or fails below.
    // NOTE that there are a series of two callbacks. 
    //   If the first one (the open st map callback) hasn't happened yet, the result code
    // will be -1; if the second (the geoNames callback for time zone) hasn't happened, 
    // the code could be 1 (1st callback happened but bad data) or 2 (1st happened and good data).
    // Following the geoNames Tz callback the code could be 3 (2nd happened and bad data) or 
    // 4 (2nd happened and good data);
    // after this check succeeds below with code 4, the code is set to -2.
    // 
    if (CheckOpenStMapResultCode != -2 && // skip this check if the test was already passed below.
        !WebServiceTimeoutHappened && // skip this check if timeout already happened
        CheckOpenStMapResultCode != 4 && // timezone (geonames) callback didn't happen or had no data
        (millis() - CheckOpenStMapMillisStart > 3000) // 3 seconds timeout
    ) {
        WebServiceTimeoutHappened = true;

        console.log("Open St Map city location or Geonames TZ check failed due to timeout.");
        if (CheckOpenStMapResultCode == -1) {
            console.log("Open St Map web service callback for city location never happened.")
        }
        else if (CheckOpenStMapResultCode == 1) {
            console.log("OpenStMap callback didn't return loc data or it was invalid.")
        }
        else if (CheckOpenStMapResultCode == 2) {
            console.log("GeoNames web service callback for Tz never happened.")
        }
        else if (CheckOpenStMapResultCode == 3) {
            console.log("Geonames didn't return time zone data.")
        }

        console.log("We reset to local time and location.");
        NewLatitude = 99999;
        NewLongitude = 99999;
        NewLatLongMillis = -1;
        resetToLocal();
        CityNameInput.hide();   // since web service is down, hide the city field
        CitySubmitButton.hide();
    }

    // Handle successful GeoNames Tz callback.
    // NOTE: for the test we use a known good city name San Diego, so a good time zone is expected.
    //  however when the user enters a city, a good loc or tz is not guaranteed.
    if (!WebServiceTimeoutHappened && // no timeout yet
        (CheckOpenStMapResultCode != -2) // This test hasn't passed yet
    ) {
        // GeoNames Tz callback happened and returned good data
        if (CheckOpenStMapResultCode == 4) {
            console.log("Open St Map check and GeoNames check SUCCESS.");
            console.log("Open St Map check plus GeoNames check response time in ms = " +
                str(millis() - CheckOpenStMapMillisStart));
            CheckOpenStMapResultCode = -2;
            // -2 indicates the check is complete, so this code won't run again.
        }
    }  // =========== end of start-time-only web svc checkout

    // Check if we are waiting for lat/long; happens anytime we use the
    // web svs to get city location.
    if (!WebServiceTimeoutHappened && (NewLatitude != 99999 || NewLongitude != 99999)) {
        // We are partway through update of location via web service call
        // caused by the user entering a city name. 
        // The new lat/long have been fetched but we're still waiting 
        // for the new time zone.
        // If we draw now, we'll have incorrect draw.

        // CHECK FOR TIMEOUT:
        // TEST shows typical delay is from 520 to 540 ms
        let msSinceCall = millis() - NewLatLongMillis;  // time since sketch started running
        if (msSinceCall < 2000) {
            if (msSinceCall > 500) {
                console.log(">>>>>>>> Ms since loc call = " + msSinceCall);
            }

            // Still waiting, not timed out yet - exit from draw(). 
            // We'll continue to monitor for arrival of new lat/long in later calls to draw().
            return; // <<<<<<<<<<<<<<<<<<<<<<<< BAIL OUT <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<     

        }
        else // We have waited too long
        {
            // Call return timeout happened - the web service call didn't return as it usually does.
            // We don't provide a way for the web service to recover, but we do cancel the wait
            // for lat/long and reset to local location/time zone, so the clock still works.
            // The field where the city name is entered is hidden until the sketch is restarted.
            WebServiceTimeoutHappened = true;
            console.log("TIMEOUT - web service call to fetch city location timed out at 2 sec.");

            // Our main way of updating time zone using web service call has failed.
            // Instead, reset to local lat/long and time zone.
            console.log("Our usual web sevice call failed to deliver the time zone, so ");
            console.log("we reset to local time and location.");
            NewLatitude = 99999;
            NewLongitude = 99999;
            NewLatLongMillis = -1;
            resetToLocal();
            CityNameInput.hide();   // since web service is down, hide the city field
            CitySubmitButton.hide();
        }
    }

    // Draw the clock background
    // we redo this below after successfully getting the lat/long
    background(BkColor);

    fill(100);  // gray

    noStroke();
    if (IsOuterClockFaceShown) {
        ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);
    }
    else {
        ellipse(CenterX, CenterY * 0.95, ClockDiameter, ClockDiameter);
    }

    fill(255)
    textFont("Arial");

    // Sometimes on phones there's a delay before the clock face is drawn, so...
    // ON first run of this app, the browser will show a warning
    // that it will get the user's location.  Kind of scary, so
    // show this explanation.    
    textAlign(CENTER, TOP);
    text("Look for location permission popup!", CenterX, CenterY - 40);
    text("Browser needs location only", CenterX, CenterY - 20);
    text("to calculate sunrise/sunset,", CenterX, CenterY);
    text("it is not stored!", CenterX, CenterY + 20);

    textAlign(LEFT, TOP);

    // Draw clock title
    if (IsDesktop) {
        textSize(CurrentFontSize * 0.8);
    }
    else {
        textSize(CurrentFontSize * 1.4);
    }
    text("Day Spiral Clock", CenterX * 0.02, CenterY * 0.03)

    // draw description text under clock title
    if (IsDesktop) {
        textSize(CurrentFontSize * 0.38);
    }
    else {
        textSize(CurrentFontSize * 0.68);
    }

    text("Hour hand tip follows the day spiral,", CenterX * 0.02, CenterY * 0.12)
    text("making 1 turn for AM and 1 for PM.", CenterX * 0.02, CenterY * 0.17)
    text("Dark part of spiral indicates night.", CenterX * 0.02, CenterY * 0.22)
    text("(C)2024 by Charlie Wallace", CenterX * 0.02, CenterY * 0.27)


    // Bail out if lat/long is not set yet.  >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    if (Latitude == 99999 || Longitude == 99999) {
        return;  // <<<<<<<<<<<<<<<< bail out early >>>>>>>>>>>>>>>>
    }

    // 
    // Redraw the clock background - this hides the "Please Wait" message
    // Re-display everything except the warning about allowing location access.
    background(BkColor);

    fill(255)


    // Draw clock title
    if (IsDesktop) {
        textSize(CurrentFontSize * 0.8);
    }
    else {
        textSize(CurrentFontSize * 1.4);
    }
    text("Day Spiral Clock", CenterX * 0.02, CenterY * 0.03)

    // draw description text under clock title
    if (IsDesktop) {
        textSize(CurrentFontSize * 0.38);
    }
    else {
        textSize(CurrentFontSize * 0.68);
    }

    text("Hour hand tip follows the day spiral,", CenterX * 0.02, CenterY * 0.12)
    text("making 1 turn for AM and 1 for PM.", CenterX * 0.02, CenterY * 0.17)
    text("Dark part of spiral indicates night.", CenterX * 0.02, CenterY * 0.22)
    text("(C)2024 by Charlie Wallace", CenterX * 0.02, CenterY * 0.27)




    noStroke();

    fill(255);

    textAlign(LEFT, BOTTOM);
    textSize(RefFontSize * 0.38);

    text("GMT offset:", 10, CenterY * 2 - 110);

    text("Latitude:", 10, CenterY * 2 - 80);

    text("Longitude:", 10, CenterY * 2 - 50);

    if (WebServiceTimeoutHappened) {
        text("City location web service is down.", 10, CenterY * 2 - 20);
    }
    else {
        text("City:", 10, CenterY * 2 - 20);
    }

    fill(0);  // black


    // Draw outer clock face ================

    // draw ellipse to fill entire face, will end up
    // as background for the hour labels on outside.

    strokeWeight(0)
    fill(255); //60)
    //ellipse(CenterX, CenterY*0.95, ClockDiameter, ClockDiameter);
    if (IsOuterClockFaceShown) {
        ellipse(CenterX, CenterY, ClockDiameter, ClockDiameter);
    }
    else {
        ellipse(CenterX, CenterY * 0.95, ClockDiameter, ClockDiameter);
    }

    fill(120);  // Color of bkgnd behind spiral
    if (IsOuterClockFaceShown) {
        ellipse(CenterX, CenterY, InnerFaceRadius * 2, InnerFaceRadius * 2);
    }
    else {
        fill(0);  // Color of bkgnd behind spiral
        ellipse(CenterX, CenterY * 0.95, InnerFaceRadius * 2, InnerFaceRadius * 2);
    }
    //ellipse(CenterX, CenterY*0.95, InnerFaceRadius*2, InnerFaceRadius*2);


    CurrentFontSize = RefFontSize * FontScaleFactor;

    if (IsOuterClockFaceShown) {
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
    }

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
    iiSpiral = int((theHour / 24) * NumSpiralPointsPerTurn * 2);

    if (iiSpiral < NumSpiralPointsPerTurn * NumSpiralTurns) // if index is valid
    {
        HoursRadius = RadiusSpiralArray[iiSpiral] - ClockDiameter * 0.035;  //wc5
    }
    else {
        print("ERROR: Illegal index into the RadiusSpiralArray=" + str(iiSpiral) + " for IDow=" + str(IDow));
        print("theHour=" + str(theHour) + " NumSpiralPointsPerTurn=" + str(NumSpiralPointsPerTurn));
        print("IHour=" + str(IHour));
        print("NumSpiralTurns=" + str(NumSpiralTurns));

        HoursRadius = ClockDiameter / 4; // fallback in case iiSpiral was not valid
    }

    // Calculate length for minute hand
    iiSpiral = int((theMin / 60) * NumSpiralPointsPerTurn);
    if (!IsAM)  // In the PM, track the inner part of the spiral, else outer.
    {
        iiSpiral += NumSpiralPointsPerTurn;
    }
    if (iiSpiral < NumSpiralPointsPerTurn * NumSpiralTurns) // if index is valid
    {
        MinutesRadius = RadiusSpiralArray[iiSpiral] + 0.4 * SpiralLineWidth / 2;
    }

    // Calculate length for second hand
    iiSpiral = int((theSec / 60) * NumSpiralPointsPerTurn);
    if (!IsAM) {
        iiSpiral += NumSpiralPointsPerTurn;
    }

    if (iiSpiral < NumSpiralPointsPerTurn * NumSpiralTurns) // if index is valid
    {
        SecondsRadius = RadiusSpiralArray[iiSpiral] + 0.7 * SpiralLineWidth / 2;
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
    text(TimeString + amPmString, CenterX * 2 - 19, CenterY * 0.12);
    text(DateString, CenterX * 2 - 19, CenterY * 0.17); // 75);
    text(getDayStringLong(IDow), CenterX * 2 - 19, CenterY * 0.22);

    if (IsDst) {
        text("Daylight Savings", CenterX * 2 - 19, CenterY * 0.27);
    }
    else {
        text("Not Daylight Savings", CenterX * 2 - 19, CenterY * 0.27);
    }

    if (SunriseHour >= 0) {
        text("Sunrise: " + SunriseHourString + ":" + SunriseMinString +
            SunriseAmpmString, CenterX * 2 - 19, CenterY * 0.32);

        text("Sunset: " + SunsetHourString + ":" + SunsetMinString +
            SunsetAmpmString, CenterX * 2 - 19, CenterY * 0.37);
    }
    else if (SunriseHour == -2) {
        text("Light All Day", CenterX * 2 - 19, CenterY * 0.32);
    }
    else if (SunriseHour == -1) {
        text("Dark All Day", CenterX * 2 - 19, CenterY * 0.32);
    }

    //textAlign(LEFT, TOP);
    //stroke(255);
    //strokeCap(SQUARE);
    //noFill();

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

    //'''''
    // Draw the spiral clock face with hour labels etc for AM and PM
    // separately, in different order depending on am/pm.
    // This was done to support the depricated isMobius mode where they
    // could overlap; during AM, draw AM second so it's on top.
    //  Uses the extracted drawSpiral() method defined below.======================
    if (IsAM) {
        drawSpiral("pm"); // draw AM
        drawSpiral("am"); // draw PM
    }
    else {
        drawSpiral("am"); // draw AM
        drawSpiral("pm"); // draw PM    
    }



    // Draw the hands of the clock ===============

    stroke(255);  // set hand color

    // Draw second hand
    strokeWeight(4 * FontScaleFactor);
    line(CenterX, CenterY, CenterX + cos(secRads) * SecondsRadius, CenterY + sin(secRads) * SecondsRadius);

    // draw minute hand
    strokeWeight(8 * FontScaleFactor);
    line(CenterX, CenterY, CenterX + cos(minRads) * MinutesRadius, CenterY + sin(minRads) * MinutesRadius);

    // draw hour hand
    strokeWeight(19 * FontScaleFactor);

    // Draw hour hand  
    strokeCap(ROUND)
    let adjustedHourRadius = HoursRadius;

    line(CenterX, CenterY, CenterX + cos(hourRads) * HoursRadius,
        CenterY + sin(hourRads) * adjustedHourRadius);

    // Redraw the hour hand at half length to avoid having a square end cap in the center
    //  of the clock
    //strokeCap(ROUND); // restore round ends    
    //line(CenterX, CenterY, CenterX + cos(hourRads) * HoursRadius/2, CenterY + sin(hourRads) * HoursRadius/2);

    // Draw a little circle around the tip of the hour hand to emphasize that it's following
    //   the week spiral
    noFill();
    strokeWeight(3)

    stroke(255); // white

    //ellipse(CenterX + cos(hourRads) * HoursRadius, 
    //        CenterY + sin(hourRads) * HoursRadius,
    //        32*FontScaleFactor, 
    //        32*FontScaleFactor);  

    // restore text style
    textStyle(NORMAL);
}





// Draw the AM or PM part of the spiral =================================
//'''''
function drawSpiral(amPmString) {
    // default to AM case
    let startIndex = 0;
    let endIndex = NumSpiralPointsPerTurn;
    let startHour = 0;
    let endHour = 12; // inclusive; really ends at end of 11th hour.
    amPmString = amPmString.toUpperCase();

    if (amPmString == "PM") {
        startIndex = NumSpiralPointsPerTurn;
        endIndex = NumSpiralPointsPerTurn * 2;
        startHour = 12;
        endHour = 24; // inclusive; really ends at end of 23rd hour.
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

    var smallerDim = min(TheWidth, TheHeight);
    var radius = smallerDim / 2;

    // Draw the day spiral for the current day, AM or PM. =========================

    // set stroke weight differently when running on phone.  
    //   Should be reduced by about half.
    strokeWeight(14); // for phone
    if (!IsOuterClockFaceShown) {
        strokeWeight(48); // for phone
    }

    if (IsDesktop) {
        strokeWeight(30);
        if (!IsOuterClockFaceShown) {
            strokeWeight(110);
        }
    }

    dayColor = getDayColor(dw);
    nightColor = getNightColor(dw);

    dowLabelSizeDsktpBoost = 0.5;
    dowLabelSizeMoblBoost = 0.4;

    vvBase = 0;
    var rads;
    var axi, ayi, bxi, byi;
    var ri;
    var ww = SpiralLineWidth; //110;
    var theta;
    noStroke();

    if (SunriseHour != -1) // if not dark-all-day
    {
        // use daytime color, but draw the entire requested portion of this day.
        // If it's light all day (midnight sun) then this is all we need.
        // Otherwise, we'll draw the night-time part over this.

        fill(dayColor);

        beginShape();
        for (vv = startIndex; vv <= endIndex; vv++) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2)) * cos(theta);
            ayi = (ri + (ww / 2)) * sin(theta);

            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + axi, CenterY + ayi);
        }
        for (vv = endIndex; vv >= startIndex; vv--) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

            bxi = (ri - (ww / 2)) * cos(theta);
            byi = (ri - (ww / 2)) * sin(theta);
            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + bxi, CenterY + byi);
        }
        endShape();

        if (SunriseHour != -2) // if not all-day-sun
        {
            // first the part from midnight to sunrise ----------------
            secToRise = SunriseMin * 60 + SunriseHour * 3600;

            // convert seconds to vv offset from start
            vvRise = int((secToRise / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);

            // after that, draw the part from sunset to midnight ----
            // vv at sunset is vvSet, 
            // vv at midnight is NumSpiralPointsPerTurn

            // seconds from midnight to sunset
            secToSet = SunsetMin * 60 + SunsetHour * 3600;
            // convert seconds to vv offset
            vvSet = int((secToSet / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);

            fill(nightColor);

            // draw in the midnight-to-sunrise portion in the nighttime color.
            // but only if it ovelaps with the passed index range.
            if (startIndex <= vvRise) {
                noStroke();

                beginShape();
                for (vv = startIndex; vv <= vvRise; vv++) {
                    ri = RadiusSpiralArray[vv];
                    theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
                    axi = (ri + (ww / 2)) * cos(theta);
                    ayi = (ri + (ww / 2)) * sin(theta);
                    vertex(CenterX + axi, CenterY + ayi);
                }
                for (vv = vvRise; vv >= startIndex; vv--) {
                    ri = RadiusSpiralArray[vv];
                    theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

                    bxi = (ri - (ww / 2)) * cos(theta);
                    byi = (ri - (ww / 2)) * sin(theta);
                    vertex(CenterX + bxi, CenterY + byi);
                }
                endShape();
            }

            // draw in the sunset-to-midnight portion in the nighttime color.
            // but only if it ovelaps with the passed index range.

            if (vvSet >= startIndex && vvSet < endIndex) {
                beginShape();
                for (vv = vvSet; vv <= endIndex; vv++) {
                    ri = RadiusSpiralArray[vv];
                    theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
                    axi = (ri + (ww / 2)) * cos(theta);
                    ayi = (ri + (ww / 2)) * sin(theta);

                    //print("for day=" + dw +" color="+ dayColor);
                    vertex(CenterX + axi, CenterY + ayi);
                }
                for (vv = endIndex; vv >= vvSet; vv--) {
                    ri = RadiusSpiralArray[vv];
                    theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

                    bxi = (ri - (ww / 2)) * cos(theta);
                    byi = (ri - (ww / 2)) * sin(theta);
                    //print("for day=" + dw +" color="+ dayColor);
                    vertex(CenterX + bxi, CenterY + byi);
                }
                endShape();
            }
        }

    }
    else // is 24hr night
    {
        // use night-time color, but draw the entire requested range for this day.
        fill(nightColor);

        beginShape();
        for (vv = startIndex; vv <= endIndex; vv++) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2)) * cos(theta);
            ayi = (ri + (ww / 2)) * sin(theta);

            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + axi, CenterY + ayi);
        }
        for (vv = endIndex; vv >= startIndex; vv--) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

            bxi = (ri - (ww / 2)) * cos(theta);
            byi = (ri - (ww / 2)) * sin(theta);
            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + bxi, CenterY + byi);
        }
        endShape();
    }

    stroke(nightColor);

    //===========  Spiral draw complete, now handle ticks and labels

    textStyle(BOLD);

    strokeWeight(0);

    fill(color(255, 245, 0));  // yellow

    let vvEnd = 2 * NumSpiralPointsPerTurn - 1;
    textAlign(LEFT, TOP);

    let gmtHour = 0;
    let theLocalHour = 0;
    let gmtHourIndex = 0;
    let gmtLabelX = 0;
    let gmtLabelY = 0;



    // If display of outer clock face (with hour labels) is disabled, we show local
    // hours on the spiral, along with hour and minute ticks.
    if (!IsOuterClockFaceShown) {
        let firstLocalHour = 0;
        let theLocalHour = 0;
        let localHourIndex = 0;
        let localLabelX = 0;
        let localLabelY = 0;

        textAlign(CENTER, CENTER);
        if (IsDesktop) {
            textSize(RefFontSize * dowLabelSizeDsktpBoost * 1.9); // boosted text scale for desktop
        }
        else {
            textSize(RefFontSize * dowLabelSizeMoblBoost * 1.4);  // boosted text scale for mobile      
        }

        stroke(230);  // tone down the tick color from white to light gray

        // Draw the minute ticks
        strokeWeight(2 * FontScaleFactor);
        strokeCap(SQUARE);
        for (vv = startIndex; vv <= endIndex; vv += 2) {

            beginShape(LINES);
            ri = RadiusSpiralArray[vv];

            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2.1)) * cos(theta);
            ayi = (ri + (ww / 2.1)) * sin(theta);
            vertex(CenterX + axi, CenterY + ayi);

            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2.5)) * cos(theta);
            ayi = (ri + (ww / 2.5)) * sin(theta);
            vertex(CenterX + axi, CenterY + ayi);
            endShape();
        }

        // Draw the hour ticks and the hour labels     
        strokeWeight(8 * FontScaleFactor);

        for (vv = startIndex; vv <= endIndex; vv += 10) {
            theLocalHour = vv / 10;

            // calculate the gmt equivalent of theLocalHour.
            // This is only used when IsGmtShown is true.
            gmtHour = theLocalHour - TzOffset;
            if (gmtHour > 23) {
                gmtHour = gmtHour - 24;
            }
            else if (gmtHour < 0) {
                gmtHour = gmtHour + 24;
            }

            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2.24)) * cos(theta);
            ayi = (ri + (ww / 2.24)) * sin(theta);

            //print("for day=" + dw +" color="+ dayColor);
            stroke(230);  // tone down the tick color from white to light gray
            strokeWeight(8 * FontScaleFactor);

            beginShape(POINTS);

            vertex(CenterX + axi, CenterY + ayi);
            endShape();

            noStroke();


            // Display hour labels ============
            var ri2;  // tweak to move hour labels a bit outward  

            if (Use12HourLabels && !IsGmtShown) {
                if (IsDesktop) {
                    let outwardShift = RadiusSpiralArray[0] * 0.005;
                    ri2 = ri + outwardShift;
                }
                else // on phone
                {
                    //ri2 = ri * 1.0;  
                    // tweak to move hour labels a bit outward            
                    let outwardShift = RadiusSpiralArray[0] * 0.0;
                    ri2 = ri + outwardShift;
                }

                let xTweak = 1.013;
                let yTweak = 1;
                let hourStr = str(theLocalHour);
                let amPm = "A"
                if (theLocalHour == 0) {
                    hourStr = "12";
                }
                else if (theLocalHour < 12) // instead of 24, use hour 0
                {
                    hourStr = str(theLocalHour);
                }
                else if (theLocalHour == 12) {
                    hourStr = str(theLocalHour);
                    amPm = "P"
                }
                else if (theLocalHour < 24) {
                    hourStr = str(theLocalHour - 12);
                    amPm = "P"
                }
                else {
                    hourStr = "12";
                }

                if (IsDesktop) {
                    if (hourStr > 9) {
                        xTweak = 1.033;
                    }
                }
                else // on phone
                {
                    if (hourStr > 9) {
                        xTweak = 1.045;
                    }
                }

                // Display the hour number ===================
                if (IsDesktop) {
                    textSize(RefFontSize * dowLabelSizeDsktpBoost * 2.5); // boosted text scale for desktop
                }
                else {
                    textSize(RefFontSize * dowLabelSizeMoblBoost * 1.68);  // boosted text scale for mobile      
                }

                // display the hour
                textAlign(RIGHT, CENTER);

                textStyle(BOLD);
                text(hourStr,
                    ri2 * cos(theta) + CenterX * xTweak,
                    ri2 * sin(theta) + CenterY);

                // display the am or pm =============
                if (IsDesktop) {
                    textSize(RefFontSize * dowLabelSizeDsktpBoost * 0.5);//67); // boosted text scale for desktop
                }
                else {
                    textSize(RefFontSize * dowLabelSizeMoblBoost * 0.86);  // boosted text scale for mobile      
                    yTweak = 0.994;
                }

                textAlign(LEFT, TOP);
                //textStyle(NORMAL);

                text("M",//amPm, 
                    ri2 * cos(theta) + CenterX * xTweak,
                    ri2 * sin(theta) + CenterY * yTweak);//*1.006);  
                textAlign(LEFT, BOTTOM);
                text(amPm,
                    ri2 * cos(theta) + CenterX * xTweak * 1.001, // extra x tweak to center over "M" 
                    ri2 * sin(theta) + CenterY * yTweak);//*1.007);  // lower slightly for better kerning
            }
            else // using 0-23 hour labels
            {
                ri2 = ri * 1.008;  // tweak to move hour labels a bit outward  

                // set font size & alignment for GMT 24-hour style numbers
                if (IsDesktop) {
                    textSize(RefFontSize * dowLabelSizeDsktpBoost * 2.5); // boosted text scale for desktop
                }
                else {
                    textSize(RefFontSize * dowLabelSizeMoblBoost * 1.4);  // boosted text scale for mobile      
                }
                textAlign(CENTER, CENTER);

                if (IsGmtShown) {
                    // When at the top, display the GMT label
                    if (theLocalHour == 0) {
                        // temporarily change font size for GMT label
                        if (IsDesktop) {
                            textSize(RefFontSize * dowLabelSizeDsktpBoost * 1.4); // boosted text scale for desktop
                        }
                        else {
                            textSize(RefFontSize * dowLabelSizeMoblBoost * 1.4);  // boosted text scale for mobile      
                        }
                        textAlign(RIGHT, CENTER); // temporarily change alignment

                        text("GMT",// gmtLabelX-20, gmtLabelY+inwardShift); 
                            ri2 * cos(theta) + CenterX - 30,
                            ri2 * sin(theta) + CenterY);

                        // Restore alignment and text size
                        if (IsDesktop) {
                            textSize(RefFontSize * dowLabelSizeDsktpBoost * 2.5); // boosted text scale for desktop
                        }
                        else {
                            textSize(RefFontSize * dowLabelSizeMoblBoost * 1.4);  // boosted text scale for mobile      
                        }
                        textAlign(CENTER, CENTER);
                    }



                    if (gmtHour == 0) {
                        text("0",
                            ri2 * cos(theta) + CenterX,
                            ri2 * sin(theta) + CenterY);
                    }
                    else if (gmtHour != 24) {
                        text(str(gmtHour),
                            ri2 * cos(theta) + CenterX,
                            ri2 * sin(theta) + CenterY);
                    }
                    else // instead of 24, use hour 0
                    {
                        text("0",
                            ri2 * cos(theta) + CenterX,
                            ri2 * sin(theta) + CenterY);
                    }
                    stroke(230);  // tone down the tick color from white to light gray        
                }
                else {
                    if (theLocalHour == 0) {
                        text(str("0"),
                            ri2 * cos(theta) + CenterX,
                            ri2 * sin(theta) + CenterY);
                    }
                    else if (theLocalHour != 24) {
                        text(str(theLocalHour),
                            ri2 * cos(theta) + CenterX,
                            ri2 * sin(theta) + CenterY);
                    }
                    else // instead of 24, use hour 0
                    {
                        text("0",
                            ri2 * cos(theta) + CenterX,
                            ri2 * sin(theta) + CenterY);
                        stroke(230);  // tone down the tick color from white to light gray        
                    }
                }
            }
        }

        stroke(230);  // tone down the tick color from white to light gray

        noStroke();

    }

    textAlign(LEFT, TOP); // restore alignment

    // END of spiral draw for day spiral

    strokeCap(ROUND);
    fill(0);

}
//endDrawSpiral




// save orig vers of drawSpiral() <<<<<<<<<<<<<<<<<<<<

// Draw the specified part of the spiral =================================
function drawSpiralOrig(startIndex, endIndex) {

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


    // Draw logic for the simple 2-turn case, DaySpiral.  

    // Draw the day spiral for the current day.
    // Use broader stroke for the day spiral, since it's only 2 turns long
    strokeWeight(14); // for phone
    if (!IsOuterClockFaceShown) {
        strokeWeight(48);
    }

    if (IsDesktop) {
        strokeWeight(30);
        if (!IsOuterClockFaceShown) {
            strokeWeight(110);
        }
    }

    // ==240125a
    dayColor = getDayColor(dw);
    nightColor = getNightColor(dw);

    dowLabelSizeDsktpBoost = 0.5;
    dowLabelSizeMoblBoost = 0.4;

    //stroke(dayColor);
    vvBase = 0;
    var rads;
    var axi, ayi, bxi, byi;
    var ri;
    var ww = SpiralLineWidth; //110;
    var theta;
    noStroke();

    if (SunriseHour != -1) // if not dark-all-day
    {
        // use daytime color, but draw the entire 24hrs for this day.
        // If it's light all day (midnight sun) then this is all we need.
        // Otherwise, we'll draw the night-time part over this.

        // New impl: now drawing outline and using fill, rather than
        //   drawing a line and using line width

        fill(dayColor);

        beginShape();
        for (vv = 0; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2)) * cos(theta);
            ayi = (ri + (ww / 2)) * sin(theta);

            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + axi, CenterY + ayi);
        }
        for (vv = 2 * NumSpiralPointsPerTurn; vv >= 0; vv--) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

            bxi = (ri - (ww / 2)) * cos(theta);
            byi = (ri - (ww / 2)) * sin(theta);
            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + bxi, CenterY + byi);
        }
        endShape();

        if (SunriseHour != -2) // if not all-day-sun
        {
            // first the part from midnight to sunrise ----------------
            secToRise = SunriseMin * 60 + SunriseHour * 3600;

            // convert seconds to vv offset from start
            vvRise = int((secToRise / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);

            // after that, draw the part from sunset to midnight ----
            // vv at sunset is vvSet, 
            // vv at midnight is NumSpiralPointsPerTurn

            // seconds from midnight to sunset
            secToSet = SunsetMin * 60 + SunsetHour * 3600;
            // convert seconds to vv offset
            vvSet = int((secToSet / (60 * 60 * 24)) * NumSpiralPointsPerTurn * 2);


            // draw in the midnight-to-sunrise portion in the nighttime color.
            noStroke();
            fill(nightColor);

            beginShape();
            for (vv = 0; vv <= vvRise; vv++) {
                ri = RadiusSpiralArray[vv];
                theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
                axi = (ri + (ww / 2)) * cos(theta);
                ayi = (ri + (ww / 2)) * sin(theta);
                vertex(CenterX + axi, CenterY + ayi);
            }
            for (vv = vvRise; vv >= 0; vv--) {
                ri = RadiusSpiralArray[vv];
                theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

                bxi = (ri - (ww / 2)) * cos(theta);
                byi = (ri - (ww / 2)) * sin(theta);
                vertex(CenterX + bxi, CenterY + byi);
            }
            endShape();

            // draw in the sunset-to-midnight portion in the nighttime color.
            beginShape();
            for (vv = vvSet; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
                ri = RadiusSpiralArray[vv];
                theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
                axi = (ri + (ww / 2)) * cos(theta);
                ayi = (ri + (ww / 2)) * sin(theta);

                //print("for day=" + dw +" color="+ dayColor);
                vertex(CenterX + axi, CenterY + ayi);
            }
            for (vv = 2 * NumSpiralPointsPerTurn; vv >= vvSet; vv--) {
                ri = RadiusSpiralArray[vv];
                theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

                bxi = (ri - (ww / 2)) * cos(theta);
                byi = (ri - (ww / 2)) * sin(theta);
                //print("for day=" + dw +" color="+ dayColor);
                vertex(CenterX + bxi, CenterY + byi);
            }
            endShape();
        }

    }
    else // is 24hr night
    {
        // use night-time color, but draw the entire 24hrs for this day.
        fill(nightColor);

        beginShape();
        for (vv = 0; vv <= 2 * NumSpiralPointsPerTurn; vv++) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2)) * cos(theta);
            ayi = (ri + (ww / 2)) * sin(theta);

            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + axi, CenterY + ayi);
        }
        for (vv = 2 * NumSpiralPointsPerTurn; vv >= 0; vv--) {
            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;

            bxi = (ri - (ww / 2)) * cos(theta);
            byi = (ri - (ww / 2)) * sin(theta);
            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + bxi, CenterY + byi);
        }
        endShape();
    }

    noFill();
    stroke(nightColor);

    //=-=-=-=

    textStyle(BOLD);

    //------------------------
    // boost text size for emphasis, same for dsktop and mobile

    strokeWeight(0);

    //fill(color(251, 246, 71));  // yellow
    fill(color(255, 245, 0));  // yellow

    let vvEnd = 2 * NumSpiralPointsPerTurn - 1;
    textAlign(LEFT, TOP);

    if (!IsGmtShown && IsOuterClockFaceShown) {
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

    let gmtHour = 0;
    let theLocalHour = 0;
    let gmtHourIndex = 0;
    let gmtLabelX = 0;
    let gmtLabelY = 0;

    // If display of GMT is enabled, we show on the spiral
    if (IsGmtShown) {
        textAlign(CENTER, CENTER);
        if (IsDesktop) {
            textSize(RefFontSize * dowLabelSizeDsktpBoost); // boosted text scale for desktop
        }
        else {
            textSize(RefFontSize * dowLabelSizeMoblBoost);  // boosted text scale for mobile      
        }

        // Display GMT hours on top of the spiral

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


    // If display of outer clock face (with hour labels) is disabled, we show local
    // hours on the spiral, along with hour and minute ticks.
    if (!IsOuterClockFaceShown && !IsGmtShown) {
        let firstLocalHour = 0;
        let theLocalHour = 0;
        let localHourIndex = 0;
        let localLabelX = 0;
        let localLabelY = 0;

        textAlign(CENTER, CENTER);
        if (IsDesktop) {
            textSize(RefFontSize * dowLabelSizeDsktpBoost * 1.9); // boosted text scale for desktop
        }
        else {
            textSize(RefFontSize * dowLabelSizeMoblBoost * 1.4);  // boosted text scale for mobile      
        }

        for (theLocalHour = 0; theLocalHour < 24; theLocalHour++) // step thru the hours
        {
            // get the location to place the hour label from the spiral arrays
            localHourIndex = int((theLocalHour / 24) * NumSpiralPointsPerTurn * 2);
            localLabelX = CenterX + XSpiralArray[localHourIndex];
            localLabelY = CenterY + YSpiralArray[localHourIndex];

            //text(str(theLocalHour), localLabelX, localLabelY); 

            if (theLocalHour == firstLocalHour) {
                // generate the end-of-day hour label by simply 
                //  duplicating the start-of-day label, but shifting
                //  downwards by the spiral spacing.
                textAlign(CENTER, CENTER);

                // The hour label for the start of the day is the same as the end
                localHourIndex = NumSpiralPointsPerTurn * 2;
                localLabelX = CenterX + XSpiralArray[localHourIndex];
                localLabelY = CenterY + YSpiralArray[localHourIndex];

                text(str(firstLocalHour), localLabelX, localLabelY);
            }
        }

        stroke(230);  // tone down the tick color from white to light gray

        // Draw the minute ticks
        strokeWeight(2 * FontScaleFactor);
        strokeCap(SQUARE);
        for (vv = 0; vv <= 2 * NumSpiralPointsPerTurn; vv += 2) {

            beginShape(LINES);
            ri = RadiusSpiralArray[vv];

            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2.1)) * cos(theta);
            ayi = (ri + (ww / 2.1)) * sin(theta);
            vertex(CenterX + axi, CenterY + ayi);

            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2.5)) * cos(theta);
            ayi = (ri + (ww / 2.5)) * sin(theta);
            vertex(CenterX + axi, CenterY + ayi);
            endShape();


        }

        // Draw the hour ticks      
        strokeWeight(8 * FontScaleFactor);
        beginShape(POINTS);
        for (vv = 0; vv < 2 * NumSpiralPointsPerTurn; vv += 10) {
            theLocalHour = vv / 10;

            ri = RadiusSpiralArray[vv];
            theta = (TWO_PI * (vv / NumSpiralPointsPerTurn)) - HALF_PI;
            axi = (ri + (ww / 2.24)) * cos(theta);
            ayi = (ri + (ww / 2.24)) * sin(theta);

            //print("for day=" + dw +" color="+ dayColor);
            vertex(CenterX + axi, CenterY + ayi);

            noStroke();
            text(str(theLocalHour),
                ri * cos(theta) + CenterX,
                ri * sin(theta) + CenterY);
            stroke(230);  // tone down the tick color from white to light gray

        }
        endShape();

        noStroke();

    }



    textAlign(LEFT, TOP); // restore alignment

    // END of spiral draw for day spiral



    strokeCap(ROUND);
    fill(0);

}



// ===============================================
// Calculate the time of sunset or sunrise.
// Results are returned in globals OutputHour, OutputMin;
// Returns OutputHour = -1 if it's always dark, = -2 if always light
// The result applies to the current time zone.

function calcRiseSetTime(
    isCalculatingSunrise,  // true = sunrise, false = sunset
    passedLatitude,
    Longitude,
    gmto,     // GMT offset (not the same as time zone)
    passedDST)      // daylight savings flag
{
    var fLati = radians(passedLatitude);    // convert to radians
    var fLongi = radians(Longitude);  // convert to radians

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

    // Calculate the current values of the hour, min, and second members of the
    //  CClockView class. A clock class can get at these via its pView_ pointer.
    //
    da = day();

    mo = month();

    yr = year();

    // calcs from astronomy mag 1984 article
    tmp = int((mo + 9) / 12);
    if ((yr / 4) - int(yr / 4) != 0) {
        tmp *= 2;
    }

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


    var todayDate = new Date();
    var dateMs = todayDate.getTime() + dayOffset * 86400000;
    var shiftedDate = new Date(dateMs);

    da = shiftedDate.getDate(); // note, getDay fetches doy
    mo = shiftedDate.getMonth() + 1; // note, getMonth is zero-based
    yr = shiftedDate.getFullYear();


    // If dayOffset is not 0, adjust to yesterday or tomorrow.
    // Tricky cuz could cross month and year boundaries.
    if (dayOffset < 0)  // ===== yesterday
    {
        if (da > 1) {
            da = da - 1;
        }
        else // must back into previous month
        {
            if (mo > 1)  // NOT January
            {
                mo = mo - 1;
                if (mo == 1 || mo == 3 || mo == 5 || mo == 7 ||
                    mo == 8 || mo == 10) {
                    da = 31;
                }
                else {
                    da = 30;
                    if (mo == 2) {
                        da = 28;
                        if (yr % 4 == 0) {
                            // leap year. Ignore century years.
                            da = 29;
                        }
                    }
                }
            }
            else // backing into previous year
            {
                mo = 1;
                yr = yr - 1;
                da = 31;
            }
        }
    }
    else if (dayOffset > 0) // ====== tomorrow
    {
        if (mo < 12)  // NOT Dec
        {
            // if it's a long month
            if (mo == 1 || mo == 3 || mo == 5 || mo == 7 ||
                mo == 8 || mo == 10) {
                if (da == 31) {
                    mo = mo + 1;
                    da = 1;
                }
                else {
                    da = da + 1;
                }
            }
            else // it's  a short month
            {
                if (mo == 2)  // Feb
                {
                    var febLen = 28;
                    if (yr % 4 == 0) // if leap year
                    {
                        // leap year. Ignore century years.
                        febLen = 29;
                    }

                    if (da >= febLen) {
                        // ignore leap years; jumps over feb 29th
                        mo = mo + 1;
                        da = 1;
                    }
                    else {
                        da = da + 1;
                    }
                }
                else // short month other than feb
                {
                    if (da == 30)  // if last day
                    {
                        mo = mo + 1;
                        da = 1;
                    }
                    else {
                        da = da + 1;
                    }
                }
            } // end of short month block

        }  // === end of not-dec block
        else // it's dec
        {
            if (da == 31) // last day
            {
                // roll into next year
                mo = 1;
                da = 1;
                yr = yr + 1;
            }
            else {
                da = da + 1;
            }
        }
    } // end of tomorrow block =================

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

//=========================================================
// Figure out if it's currently daylight savings time in Australia.
// Daylight Saving Time begins at 2am (AEST) on the first Sunday in October and 
//  ends at 3am (Australian Eastern Daylight Time) on the first Sunday in April
//  Note, the GMT offset for AEDT is +9. 
function setIsDstAu() {


    var todayAu = new Date();//TargetDate;  // gets current date/time in target tz


    var da = todayAu.getDate(); //day();

    var mo = todayAu.getMonth(); //month();
    mo++;  // Note that the provided month is zero-based, so we incr to make it 1-based.
    var yr = todayAu.getFullYear(); //year();
    var todayDow = todayAu.getDay();  // gets day of week, where 0 is sunday.

    IsDstAu = false;
    IsDst = false;

    if (mo < 4 || mo > 10) {
        IsDstAu = true;
        IsDst = true;
    }
    else if (mo < 10 && mo > 4) {
        IsDstAu = false;
        IsDst = false;
    }
    else {
        // month is either april or october.

        var dow = -1;
        var dd = 0;

        if (mo == 10)  // october
        {
            // daylight savings in AU begins at 2am (AEST) on the first Sunday in October

            var dstStartAu = new Date(yr, 9, 1, 2);  //2am of oct 1st (month is 0-based) in local tz

            var firstDstDay = 0;
            for (dd = 1; dd < 31; dd++) {
                dstStartAu.setDate(dd);  // set the day within October
                dow = dstStartAu.getDay();
                if (dow == 0) {
                    // found the first sunday
                    firstDstDay = dd;
                    break;
                }
            }
            // we found the first day of daylight savings, dstStartAu
            // ATTN: since we are using local timezone, the actual dividing line
            //  for DST will be off by the time difference. FORNOW
            if (todayAu >= dstStartAu) // (da >= firstDstDay) // 
            {
                IsDstAu = true;
                IsDst = true;
            }
            else {
                IsDstAu = false;
                IsDst = false;
            }
        }
        else // must be april
        {
            // dst ends at 3am (Australian Eastern Daylight Time) on the first Sunday in April

            // we need to create a Date representing the start of April this year in AU time zone.
            var dstEndAu = new Date(yr, 3, 1, 3);  //3am of oct 1st (month is 0-based) in local tz

            var lastDstDay = 0;
            for (dd = 1; dd < 31; dd++) {
                dstEndAu.setDate(dd);  // set the day within April
                dow = dstEndAu.getDay();
                if (dow == 0) {
                    // found the first sunday in april
                    lastDstDay = dd;
                    break;
                }
            }
            // we found the last day of daylight savings, dstEndAu
            // ATTN: since we are using local timezone, the actual dividing line
            //  for DST will be off by the time difference. FORNOW
            if (todayAu >= dstEndAu) //da > lastDstDay)
            {
                IsDstAu = false;
                IsDst = false;
            }
            else {
                IsDstAu = true;
                IsDst = true;
            }

        }
    }

    if (IsDstAu) {
        print("Is AU Daylight Savings Time.")
    }
    else {
        print("Is NOT AU Daylight Savings Time.")
    }

}



//==============================================
//  Sets global flag IsDst using Uk rules. Not applicable for AZ or HI
//
function setIsDstUk() {
    /*
    in USA:
    DST begins at 2 AM on the second Sunday of March
    DST ends at 2 AM on the first Sunday of November
    
    For comparison, in Australia, 
    DST begins at 2am (AEST) on the first Sunday in October and 
    ends at 3am on the first Sunday in April
    
    In the UK the clocks go forward 1 hour at 1am on the last Sunday in March, 
    and back 1 hour at 2am on the last Sunday in October
    */

    var todayUk = TargetDate;  // gets current date/time in target tz


    var da = todayUk.getDate(); //day();
    var mo = todayUk.getMonth(); //month();
    mo++; // the provided month is zero-based, switch to 1-based.
    var yr = todayUk.getFullYear(); //year();
    var todayDow = todayUk.getDay();  // gets day of week, where 0 is sunday.
    //console.log({yr},{mo},{da},{todayDow})

    if (mo < 10 && mo > 3) // months apr-sep
    {
        IsDst = true;
    }
    else if (mo < 3 || mo > 10) // months nov-feb
    {
        IsDst = false;
    }
    else {
        // month is either march or oct.

        var dow = -1;
        var dd = 0;
        var sundayCount = 0;
        var firstDstDay = 0;

        let tzDiffHours = TzOffset - TzOffsetLocal;
        let tzDiffMs = tzDiffHours * 60 * 60 * 1000;

        if (mo == 3)  // today falls within march
        {
            // daylight savings in UK begins at 1am on the LAST Sunday in March.
            // This date is created in the context of the browser's time zone initially...
            var dstStartUk = new Date(yr, 2, 31, 1);  //1am of march 31st (month is 0-based) in local tz

            // Rotate the date by the time zone difference, so it's now in context of 
            //  the target time zone.
            dstStartUk = new Date(dstStartUk.getTime() + tzDiffMs);

            // starting with nov 31, step back thru the days until sunday is found.
            for (dd = 31; dd > 0; dd--) {
                dstStartUk.setDate(dd);  // set the day within March
                dow = dstStartUk.getDay();
                if (dow == 0) {
                    // found the first sunday while stepping backwards
                    firstDstDay = dd;
                    break;
                }
            }

            // we found the first day of daylight savings, dstStartUsa
            if (todayUk >= dstStartUk) {
                IsDst = true;
            }
            else {
                IsDst = false;
            }
        }
        else // must be october
        {
            // dst ends at 2am on the first Sunday in November.
            // This date is created in the context of the browser's time zone initially...
            var dstEndUk = new Date(yr, 9, 31, 2);  //2am of oct 31st (month is 0-based) in local tz

            // Rotate the date by the time zone difference, so it's now in context of 
            //  the target time zone.
            dstEndUk = new Date(dstEndUsa.getTime() + tzDiffMs);

            // ISSUE: I think rotating the date (as done just above) could shift the starting date into
            //  a different day.  ? 
            // SEEMS ok since the search is happening within the context of the target day...?

            // starting with oct 31, step backwards thru the month until the first sunday is found.
            var lastDstDay = 0;
            for (dd = 31; dd < 0; dd--) {
                dstEndUk.setDate(dd);  // set the day within Oct
                dow = dstEndUk.getDay();
                if (dow == 0) {
                    // found the last sunday in oct
                    lastDstDay = dd;
                    break;
                }
            }
            // we found the last day of daylight savings, dstEndUk
            // ATTN: since we are using local timezone, the actual dividing line
            //  for DST will be off by the time difference. FORNOW
            if (todayUk >= dstEndUk) {
                IsDst = false;
            }
            else {
                IsDst = true;
            }
        }
    }

    if (IsDst) {
        print("Is UK Daylight Savings Time.")
    }
    else {
        print("Is NOT UK Daylight Savings Time.")
    }
}


//==============================================
//  Sets global flag IsDst using USA rules. Not applicable for AZ or HI
//
function setIsDstUsa() {
    /*
    in USA:
    DST begins at 2 AM on the second Sunday of March
    DST ends at 2 AM on the first Sunday of November
    
    For comparison, in Australia, 
    DST begins at 2am (AEST) on the first Sunday in October and 
    ends at 3am on the first Sunday in April
    
    In the UK the clocks go forward 1 hour at 1am on the last Sunday in March, 
    and back 1 hour at 2am on the last Sunday in October
    */

    var todayUsa = TargetDate;  // gets current date/time in target tz


    var da = todayUsa.getDate(); //day();
    var mo = todayUsa.getMonth(); //month();
    mo++; // the provided month is zero-based, switch to 1-based.
    var yr = todayUsa.getFullYear(); //year();
    var todayDow = todayUsa.getDay();  // gets day of week, where 0 is sunday.
    //console.log({yr},{mo},{da},{todayDow})

    if (mo < 11 && mo > 3) // months apr-oct  (mo<4 || mo>10)
    {
        IsDst = true;
    }
    else if (mo < 3 || mo > 11) // months dec-feb
    {
        IsDst = false;
    }
    else {
        // month is either march or november.

        var dow = -1;
        var dd = 0;
        var sundayCount = 0;
        var firstDstDay = 0;

        let tzDiffHours = TzOffset - TzOffsetLocal;
        let tzDiffMs = tzDiffHours * 60 * 60 * 1000;

        if (mo == 3)  // today falls witthin march
        {
            // daylight savings in USA begins at 2am on the SECOND Sunday in March.
            // This date is created in the context of the browser's time zone initially...
            var dstStartUsa = new Date(yr, 2, 1, 2);  //2am of march 1st (month is 0-based) in local tz

            // Rotate the date by the time zone difference, so it's now in context of 
            //  the target time zone.
            dstStartUsa = new Date(dstStartUsa.getTime() + tzDiffMs);

            // starting with nov 1, advance the days until the second sunday is found.
            for (dd = 1; dd < 31; dd++) {
                dstStartUsa.setDate(dd);  // set the day within March
                dow = dstStartUsa.getDay();
                if (dow == 0) {
                    sundayCount++;
                    if (sundayCount == 2) {
                        // found the second sunday
                        firstDstDay = dd;
                        break;
                    }
                }
            }

            // we found the first day of daylight savings, dstStartUsa
            if (todayUsa >= dstStartUsa) {
                IsDst = true;
            }
            else {
                IsDst = false;
            }
        }
        else // must be november
        {
            // dst ends at 2am on the first Sunday in November.
            // This date is created in the context of the browser's time zone initially...
            var dstEndUsa = new Date(yr, 10, 1, 2);  //2am of nov 1st (month is 0-based) in local tz

            // Rotate the date by the time zone difference, so it's now in context of 
            //  the target time zone.
            dstEndUsa = new Date(dstEndUsa.getTime() + tzDiffMs);

            // ISSUE: I think rotating the date (as done just above) could shift the starting date into
            //  a different day.  So in the loop below, where I start with 1 when changing the day 
            //  while searching thru nov, is this valid? 
            // SEEMS ok since the search is happening within the context of the target day...?

            // starting with nov 1, advance the days until the first sunday is found.
            var lastDstDay = 0;
            for (dd = 1; dd < 31; dd++) {
                dstEndUsa.setDate(dd);  // set the day within Nov
                dow = dstEndUsa.getDay();
                if (dow == 0) {
                    // found the first sunday in nov
                    lastDstDay = dd;
                    break;
                }
            }
            // we found the last day of daylight savings, dstEndUsa
            // ATTN: since we are using local timezone, the actual dividing line
            //  for DST will be off by the time difference. FORNOW
            if (todayUsa >= dstEndUsa) {
                IsDst = false;
            }
            else {
                IsDst = true;
            }

        }
    }

    if (IsDst) {
        print("Is USA Daylight Savings Time.")
    }
    else {
        print("Is NOT USA Daylight Savings Time.")
    }
}

