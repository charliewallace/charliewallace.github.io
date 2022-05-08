 
/** ===========================================================
 * Day Spiral Clock: Sunrise & Sunset shown on 12-hr clock face.
 *  
 * By Charlie Wallace coolweird.com
 * 
 
TODO -----------------------
 * Add display of current time at upper rt
 * Change layout of buttons from proportional to fixed
 * Redo lower left layout - smaller font
 * Reorder cities at lower rt, maybe add Irvine, Auckland
 * Add Save Location button, makes cookie
 * Add code to calc SunsetYesterday and SunriseTomorrow, instead
     of assuming same as today
 * Revise to allow window resizing
 * Fix to update time of sunRiseSet on transition to new day
 * Fix to recalc the isDst / isDstAu state on new day
 * Implement 24 hour mode
 * fix bug at exreme latitude where sunset passes noon due to daylight savings
 
Bug Notes -----------------

* Bug when sunset passes noon (only possible in daylight savings).  
This only happens within band about a quarter degree wide, after 
 that it's 24 hours day. PLAN: don't fix.
While current time was 1:27 pm, 
I gradually increase latitude up to 75.754, gives sunset of 12pm sunrise 1:52am,
strip is all white except for bit just after midnight. Was ok - but going to 
lat 75.755 causes strip to go black, sunset time went to 0:00 am,
rise is still 1:52am.  Date is 220424. 
Note, due to daylight savings, this puts sunrise and set both just after midnight,
a weird state. Transition to No-Daylight is at 76.04 -> 76.05, last sunset/rise is
at 0:40Am/1:32AM.   Example, on 4/26 5:22pm, lat 75.101 is ok, 
with sunset == 12 pm, but 75.102 flips to dark, sunset goes to 0 AM

* FAILED TEST in melbourne - gmt offset of +11 was correct, but I see 
 the lat/long of San Diego, meaning the position error function was called

Concept: -----------------

This 12-hour clock includes a spiral outer band that indicates if it's
dark or light, and showing sunset and sunrise. This band is wrapped in an
overlapping way so that it shows 12 hours of past and 12 hours of future.
The band is fully overlapped at the current hour location, pointed to
by the hour hand, thus clearly indicating if it's dark or light. 
Following the band clockwise (into the future) we can scan forward
to find the next sunset/sunrise; and following counter clockwise into
the past, we can see the previous sunrise/sunset. At the point opposite
the current time the past and future branches of the band meet, offset
so they don't overlap; from this point on they continue to get narrower 
in order to fit within the outer circle.  This results in a spiral shape.

The logic depends on the GMT offset that it fetches to be auto-adjusted
for daylight savings time.

On first launch it will ask for permission to get the location in order
to fetch the lat/long needed for sunrise/sunset calcs.

IMPL NOTES  -------------------

* FEATURE: input field validation via delay - when I immediately remove invalid numbers,
   this doesn't allow temporarily wrong content, like a minus sign with nothing else. 
   FIX: allow invalid content to sit for a 2 seconds before overwriting, so the 
   user has time to fix typos etc.
* now validating the lat/long and gmt offset fields.
* now calculating isDst and isDstAu, this allows use of buttons to set cities
* Added buttons for Melbourne AU, Boulder, Berkeley, San Diego, London, Kansas City
* Added fields allowing manual entry of lat/long/GMT, with button to reset to local.
   
 ============================================================== */


var cx, cy;
var secondsRadius;
var minutesRadius;
var hoursRadius;
var hourNumbersRadius;
var stripRadius;
var minuteNumbersRadius;
var clockDiameter;
var bkColor;

var fontScaleFactor;
var refFontSize;
var currentFontSize;

var lastMillisec;
var lastSec;

var hourDigitColor;

// for monitoring window size
var mywidth, myheight;
var theHeight, theWidth;

var speedIncrement;
var msSoFar;  // ms since start of am or pm 
var secondsSoFar;
var msFromStartToResetTime;

var latitude, longitude;
var lastLat, lastLong;
var latLocal, longLocal;
var tzOffset, tzOffsetLocal;
var lastTz;
var isSunRiseSetObtained;

var outputHour, outputMin;
var sunsetHour, sunsetMin, secondsToSunset, baseMsSunset;
var sunsetHourYesterday, sunsetMinYesterday;
var secondsToSunsetYesterday; // starting at midnight yesterday
var sunriseHour, sunriseMin, secondsToSunrise, baseMsSunrise;
var sunriseHourTomorrow, sunriseMinTomorrow;
var secondsToSunriseTomorrow; // starting at midnight tomorrow

var sunriseMinString;  
var sunriseAmpmString;
var sunriseHourString;

var sunsetMinString; 
var sunsetAmpmString;
var sunsetHourString;

var isDaylightSavings;
var isDay;
var dayState;
var iSec, iMin, iHour;
var iHour12;
var isAM;
var timeString;
var iMs;

var tzInput;
var tzInputTimestampMs;  // ms since pgm start when input happened
var latInput;
var latInputTimestampMs;  // ms since pgm start when input happened

var longInput;
var longInputTimestampMs;  // ms since pgm start when input happened

var autoButton;

var melbourneButton;
var sanDiegoButton;
var kansasCityButton;
var londonButton;
var boulderButton;
var berkeleyButton;
var irvineButton;
var stLouisButton;
var auburnButton;

var isDst;
var isDstAu;


function setup() {
  initializeFields();
  
  //fullscreen(); 
  createCanvas(window.innerWidth, window.innerHeight);
  //createCanvas(400,400); // for mobile
  
  mywidth = width;
  myheight = height;
  
  //========= get gps position ==========	
  navigator.geolocation.getCurrentPosition(
    // Success callback.  This runs later, after setup()
    function(position) 
    {
	  background(220);
	  textSize(32);
      print("latitude: " + position.coords.latitude);
      latitude = position.coords.latitude;
      // Round to 3 places after decimal
      latitude = round(latitude, 3);
      var latString = str(latitude);
      latInput.value(latString);
      latLocal = latitude;
      lastLat = latitude;
      
	  print("longitude: " + position.coords.longitude);
      longitude = position.coords.longitude;
      // Round to 3 places after decimal
      longitude = round(longitude, 3);
      var longString = str(longitude);
      longInput.value(longString);
      longLocal = longitude;
      lastLong = longitude;
    },

    // Optional error callback
    function(error)
    {
      //In the error object is stored the reason for the failed attempt:
      //error = {
      //    code - Error code representing the type of error 
      //            1 - PERMISSION_DENIED
      //            2 - POSITION_UNAVAILABLE
      //            3 - TIMEOUT
      //    message - Details about the error in human-readable format.
      //}

      print("Gps error happened, code=" + error.code + " " + error.code);
      
      // default to Melbourne
      latitude = -37.8;
      longitude = 144.96;
      tzOffset = 10; // assume DST
     
      latitudeLocal = latitude;
      longitudeLocal = longitude;
      tzOffsetLocal = tzOffset;
      
      var tzString = str(tzOffset);
      // Add in a plus sign if not negative
      if (tzOffset > 0)
      {
        tzString = "+" + String(tzOffset);
      }
      // init the UI field
      tzInput.value(tzString);
      lastTz = tzOffset;

      var latString = str(latitude);
      latInput.value(latString);
      lastLat = latitude;

      var longString = str(longitude);
      longInput.value(longString); 
      lastLong = longitude;
        
      //  san diego tzOffset -7 DST, -8 STD
      //latitude = 33.1;
      //longitude = -117.1;
    }
  );  // end of error function
	  
  //============= end of position fetch =========================
   
  stroke(255);  // set white stroke color for lines and fonts
  
  // On phones, height looks ok, but width is too big
  theHeight = window.innerHeight; //*0.8; //height * 0.7;
  theWidth = window.innerWidth; //*0.9; //width * 0.7;
  
  var smallerDim = min(theWidth, theHeight);
  var radius = smallerDim / 2;
  
  secondsRadius = radius * 0.73;
  minutesRadius = radius * 0.65;
  hoursRadius = radius * 0.44;
  clockDiameter = radius * 1.78;
  
  // radius to centers of numbers
  hourNumbersRadius = radius * 0.8;
  stripRadius = hourNumbersRadius * 0.85;
  
  cx = theWidth / 2;  // center
  cy = theHeight / 2; // center
    
  refFontSize = 60;
  fontScaleFactor = smallerDim / 900; //240;
  
  currentFontSize = refFontSize;
  
  // init last millisec
  // millis is ms since program started
  // (actually since setup was called, so should be 0 ish)
  lastMillisec = millis(); 
  
// EEE 
  autoButton = createButton('Reset to local');
  //autoButton.position(cx * 0.02, cy* 1.67);
  autoButton.position(10, cy*2 - 140);
  autoButton.mousePressed(resetToCurrent);
  
  //----------- Location buttons
  
  // First column
  auburnButton = createButton('Auburn');
  auburnButton.position(cx*2 - 195, cy*2 - 110);  
  auburnButton.mousePressed(setAuburn);  

  stLouisButton = createButton('St Louis');
  stLouisButton.position(cx*2 - 195, cy*2 - 85);  
  stLouisButton.mousePressed(setStLouis);

  irvineButton = createButton('Irvine');
  irvineButton.position(cx*2 - 195, cy*2 - 60);  
  irvineButton.mousePressed(setIrvine);
  
  boulderButton = createButton('Boulder');
  boulderButton.position(cx*2 - 195, cy*2 - 35);  
  boulderButton.mousePressed(setBoulder); 
 
  // second column
  berkeleyButton = createButton('Berkeley');
  berkeleyButton.position(cx*2 - 115, cy*2 - 135);  
  berkeleyButton.mousePressed(setBerkeley); 
  
  londonButton = createButton('San Diego');
  londonButton.position(cx*2 - 115, cy*2 - 110);  
  londonButton.mousePressed(setSanDiego);
    
  kansasCityButton = createButton('Kansas City');
  kansasCityButton.position(cx*2 - 115, cy*2 - 85);  
  kansasCityButton.mousePressed(setKansasCity);
  
  melbourneButton = createButton('Melbourne');
  melbourneButton.position(cx*2 - 115, cy*2 - 60);  
  melbourneButton.mousePressed(setMelbourne);  
  
  sanDiegoButton = createButton('London');
  sanDiegoButton.position(cx*2 - 115, cy*2 - 35);  
  sanDiegoButton.mousePressed(setLondon);  
  


//var boulderButton; 
  
  //tzInput.position(cx * 0.27, cy* 1.75);
  tzInput.position(110, cy*2 - 100);//cy* 1.75);
  tzInput.size(20);
  tzInput.value("100")
  tzInput.input(tzInputEvent);  
    
  latInput.position(110, cy*2 - 70);//cy* 1.83);
  latInput.size(60);
  //latInput.value("100")
  latInput.input(latInputEvent);
    
  longInput.position(110, cy*2 - 40);//cy* 1.9);
  longInput.size(60);
  //longInput.value("200")
  longInput.input(longInputEvent);
  
  // keep this false, the GMT offset is adjusted to compensate
  isDaylightSavings = false; 
  
  updateTimeThisDay();  // sets baseMs and msFromStartToResetTime
  //document.cookie = "a cookie"
  
  speedIncr = 0.25;
  
  // get time zone.
  // ATTN: for some reason this returns positive value when
  //   it should be negative. Returns minutes, must convert to hours.
  // ATTN: We assume that the returned gmt offset takes daylight savings
  //   into account.  Thus we don't need to know if it's dst or not.
  tzOffset = (-new Date().getTimezoneOffset())/60;
  tzOffsetLocal = tzOffset;
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  setIsDst();  // sets global isDst, applies to northern hemisphere
  setIsDstAu(); // set global isDstAu
  
  
  // NOTE: we can't update the sunrise/sunset times here
  // because the call to navigator.geolocation.getCurrentPosition()
  // has not yet happened.  Must do it later in updateTimeThisDay()
  // after we have the lat/long.

}


//=========================================================
// Figure out if it's currently daylight savings time in the USA.
// daylight savings in the USA begins on the second Sunday of March 
// and ends on the first Sunday of November.
function setIsDst()
{

  var da = day();
  var mo = month();
  var yr = year();
  var todayDate = new Date();
  var todayDow = todayDate.getDay();  // gets day of week, where 0 is sunday.
  
  isDst = false;
  
  if (mo<3 || mo > 11)
  {
    isDst = false;
  }  
  else if (mo<11 && mo>3)
  {
    isDst = true;
  }
  else
  {
    // month is either march or november.

    var dow = -1;
    var dd = 0;

    if (mo == 3)
    {
      // daylight savings in the USA begins on the second Sunday of March

      // we need to create a Date representing the start of March this year.
      var dstStart = new Date(yr, 2, 1, 2);  // 2am of march 1st (month is 0-based)
      var numSundays = 0;
      var firstDstDay = 0;  
      for (dd = 1; dd<31; dd++)
      {
        dstStart.setDate(dd);  // set the day within March
        dow = dstStart.getDay();
        if (dow==0)
        {
          // found a sunday
          numSundays++;
        }
        if (numSundays >=2)
        {
          // found the second sunday in March
          firstDstDay = dd;
          break;      
        }
      }
      // we found the first day of daylight savings, dstDtart
      if (todayDate >= dstStart) // (da >= firstDstDay) // 
      {
        isDst = true;
      }
      else
      {
        isDst = false;
      }
    }
    else // must be november
    {
      // dst ends on the first Sunday of November

      // we need to create a Date representing the start of November this year.
      var dstEnd = new Date(yr, 10, 1, 2);  //2am of nov 1st (month is 0-based)
      var lastDstDay = 0;  
      for (dd = 1; dd<31; dd++)
      {
        dstEnd.setDate(dd);  // set the day within March
        dow = dstEnd.getDay();
        if (dow==0)
        {
          // found the first sunday in nov
          lastDstDay = dd;
          break;      
        }
      }
      // we found the last day of daylight savings, dstEnd
      if (todayDate >= dstEnd) //da > lastDstDay)
      {
        isDst = false;
      }
      else
      {
        isDst = true;
      }

    }
  }
  
  if (isDst)
  {
    print("Is Daylight Savings Time.")
  }
  else
  {
    print("Is NOT Daylight Savings Time.")    
  }
  
}

//=========================================================
// Figure out if it's currently daylight savings time in Australia.
// Daylight Saving Time begins at 2am (AEST) on the first Sunday in October and 
//  ends at 3am (Australian Eastern Daylight Time) on the first Sunday in April
//  Note, the GMT offset for AEDT is +9. 
function setIsDstAu()
{
  //var todayAu = new Date().toLocaleString("en-US", {timeZone: 'Australia/Melbourne'});
  // NOTE, I had trouble creating a date using AU time zone, so just use local FORNOW.
  
  var todayAu = new Date();  // gets current date/time in current tz


  var da = todayAu.getDate(); //day();
  var mo = todayAu.getMonth(); //month();
  var yr = todayAu.getFullYear(); //year();
  var todayDow = todayAu.getDay();  // gets day of week, where 0 is sunday.
  
  isDstAu = false;
  
  if (mo<4 || mo>10)
  {
    isDstAu = true;
  }  
  else if (mo<10 && mo>4)
  {
    isDstAu = false;
  }
  else
  {
    // month is either april or october.

    var dow = -1;
    var dd = 0;

    if (mo == 10)
    {
      // daylight savings in AU begins at 2am (AEST) on the first Sunday in October

      /*  >>>> Had trouble creating a date in a non-local timezone, so just use local FORNOW.
      // we need to create a Date representing the start of October this year in AU time zone.
      // To ensure the time zone is set, first create an AU date at current time/date:
      var dstStartAu = new Date().toLocaleString("en-US", {timeZone: 'Australia/Melbourne'});
      
      // Next change it to the start of October; next we will search for the first sunday.  
      dstStartAu.SetMonth(9); //(month is 0-based)
      dstStartAu.SetDate(1);
      dstStartAu.SetHour(2);
      dstStartAu.SetMinute(0);
      */
      var dstStartAu = new Date(yr, 9, 1, 2);  //2am of oct 1st (month is 0-based) in local tz


      var firstDstDay = 0;  
      for (dd = 1; dd<31; dd++)
      {
        dstStartAu.setDate(dd);  // set the day within October
        dow = dstStartAu.getDay();
        if (dow==0)
        {
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
        isDstAu = true;
      }
      else
      {
        isDstAu = false;
      }
    }
    else // must be april
    {
      // dst ends at 3am (Australian Eastern Daylight Time) on the first Sunday in April

      // we need to create a Date representing the start of April this year in AU time zone.
      // To ensure the time zone is set, first create an AU date at current time/date:
      /*
      var dstEndAu = new Date().toLocaleString("en-US", {timeZone: 'Australia/Melbourne'});
      
      // Next change it to the start of October; next we will search for the first sunday.  
      dstEndAu.SetMonth(3); //(month is 0-based)
      dstEndAu.SetDate(1);
      dstEndAu.SetHour(3);
      dstEndAu.SetMinute(0);   
      */
      var dstEndAu = new Date(yr, 3, 1, 3);  //2am of nov 1st (month is 0-based) in local tz

      
      var lastDstDay = 0;  
      for (dd = 1; dd<31; dd++)
      {
        dstEndAu.setDate(dd);  // set the day within April
        dow = dstEndAu.getDay();
        if (dow==0)
        {
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
        isDstAu = false;
      }
      else
      {
        isDstAu = true;
      }

    }
  }
  
  if (isDstAu)
  {
    print("Is AU Daylight Savings Time.")
  }
  else
  {
    print("Is NOT AU Daylight Savings Time.")    
  }
  
}


//==============================================================
function calcSunRiseSet()
{
  // calc sunrise
  calcRiseSetTime(
    true,  // calc sunrise
    latitude,
    -longitude,
    tzOffset,
    isDaylightSavings);
  sunriseHour = outputHour;
  sunriseMin = outputMin;
  if (sunriseHour >=0)
  {
    secondsToSunrise = sunriseMin*60 + sunriseHour*3600;
    baseMsSunrise = secondsToSunrise * 1000;
  }
  else
  {
    secondsToSunrise = sunriseHour;
    baseMsSunrise = sunriseHour;  // -1 no night -2 no day  
  }

  // calc sunset
  calcRiseSetTime(
    false,  // calc sunset
    latitude,
    -longitude, // ??? passing neg longitude gives wrong answer
    tzOffset,
    isDaylightSavings);
  sunsetHour = outputHour;
  sunsetMin = outputMin; 

  if (sunsetHour >=0)
  {
    secondsToSunset = sunsetMin*60 + sunsetHour*3600;
    baseMsSunset = secondsToSunset * 1000;
  }
  else
  {
    secondsToSunset = sunsetHour;
    baseMsSunset = sunsetHour;  // -1 no night -2 no day  
  }    


  // FORNOW, 'cuz I'm lazy, just assume rise/set times don't change
  //  much from day to day.
  // TODO fix this.
  sunsetHourYesterday = sunsetHour;
  sunsetMinYesterday = sunsetMin;
  secondsToSunsetYesterday = secondsToSunset;

  sunriseHourTomorrow = sunriseHour;
  sunriseMinTomorrow = sunriseMin;
  secondsToSunriseTomorrow = secondsToSunrise;

  // Create formatted strings for sunrise and set times 
  sunriseMinString = String(sunriseMin);
  if (sunriseMin < 10)
  {
    sunriseMinString = "0" + sunriseMinString;
  }
  sunriseAmpmString = " AM";
  sunriseHourString = nf(sunriseHour,2,0);//String(sunriseHour);
  if (sunriseHour > 12)
  {
    sunriseAmpmString = " PM"
    sunriseHourString = nf(sunriseHour-12,2,0);
  }

  sunsetMinString = String(sunsetMin);
  if (sunsetMin < 10)
  {
    sunsetMinString = "0" + sunsetMinString;
  }

  sunsetAmpmString = " AM";
  sunsetHourString = nf(sunsetHour,2,0);
  if (sunsetHour > 12)
  {
    sunsetAmpmString = " PM"
    sunsetHourString = nf(sunsetHour-12,2,0);
  }  
  
  //sunsetHour = -1; // TTT
  print("Sunrise = " + sunriseHour + ":" + sunriseMin);
  print("Sunset = " + sunsetHour + ":" + sunsetMin);    

}

// ========================================================
// TTT
function updateTimeThisDay() {
  iHour = hour(); //EEE
  // if user has changed the time zone GMT offset,
  //  adjust the hour accordingly.
  if (tzOffset != tzOffsetLocal)
  {
    iHour += (tzOffset - tzOffsetLocal);
    if (iHour < 0)
    {
      iHour += 24;
    }
    else if (iHour > 23)
    {
      iHour -= 24;  
    }
  } 
  iMin = minute();
  iSec = second();
  iMs = millis();
  var hoursSoFar = iHour;  // range 0-23
  msFromStartToResetTime = iMs;
  var msSinceSecond = 
      int(fract(msFromStartToResetTime/1000) * 1000);
  secondsSoFar = iSec + iMin*60 + hoursSoFar*3600
    + msSinceSecond/1000;
  msSoFar = secondsSoFar * 1000 + msSinceSecond;
  
  iHour12 = iHour;
  isAM = true;
  if (iHour == 0)
  {
    iHour12 = 12;
  }
  else if (iHour >= 12)
  {
    isAM = false;
    if (iHour > 12)
    {
      iHour12 -= 12;
    }
  }
  timeString = nf(iHour12,2,0) + ":" + nf(iMin,2,0);

  
  // Delay updating the rise/set times until both lat and long are obtained.
  // This isn't until sometime after the setup() method completes.
  // Once it's done, no need to redo on each pass.
  if (!isSunRiseSetObtained && latitude!=-1 && longitude!=-1)
  {
    calcSunRiseSet();  // also call this later if lat/long changed
    
    // init latitude field
    var latString = str(latitude);
    latInput.value(latString);
    lastLat = latitude;
    
    // init longitude field
    var longString = str(longitude);
    longInput.value(longString);
    lastLong = longitude;
    
    isSunRiseSetObtained = true;
  }
  
  if (isSunRiseSetObtained)
  {
    isDay = true;

    if (secondsSoFar < secondsToSunrise)
    {
      isDay = false;
    }
    else if (secondsSoFar > secondsToSunset)
    {
      isDay = false;
    }

    //print(isDay)


    // Possible dayStates:
    // 1 - Midnight to sunrise.  Second half of a night
    // 2 - Sunrise to noon to sunset 
    // 3 - Sunset to midnight: first half of the night


    dayState = 2;
    if (secondsSoFar < secondsToSunrise)
    {
      dayState = 1;
    }
    else if (secondsSoFar > secondsToSunset)
    {
      dayState = 3;
    }

    //print(secondsToSunset)
    //print(dayState)
    
  }

  
} // END OF updateTimeThisDay()



// EEE ========================================================
function resetToCurrent() {
  
  tzOffset = tzOffsetLocal;
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  latitude = latLocal;
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latLocal;
  
  longitude = longLocal;
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longLocal;
  
  calcSunRiseSet();
  updateTimeThisDay();
}




//=======================
// Set location and timezone to Auburn
//  
function setAuburn()
{
  latitude = 38.89;
  longitude = -121.07;
  tzOffset = -8;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}

//=======================
// Set location and timezone to St Louis
//  
function setStLouis()
{
  latitude = 38.627;
  longitude = -90.199;
  tzOffset = -6;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}

//=======================
// Set location and timezone to Irvine
//  
function setIrvine()
{
  latitude = 33.74;
  longitude = -117.64;
  tzOffset = -8;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}



//=======================
// Set location and timezone to Boulder CO
//  
function setBoulder()
{
  latitude = 40.015;
  longitude = -105.27;
  tzOffset = -7;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}

//=======================
// Set location and timezone to Auburn CA
//  
function setLondon()
{
  latitude = 51.5;
  longitude = -0.127;
  tzOffset = 0;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Berkeley
//  
function setBerkeley()
{
  latitude = 37.87;
  longitude = -122.27;
  tzOffset = -8;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Kansas City, MO
//  
function setKansasCity()
{
  latitude = 39.1;
  longitude = -94.578;
  tzOffset = -6;  
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}


//=======================
// Set location and timezone to Melbourne
//  
function setMelbourne()
{
  latitude = -37.8;
  longitude = 144.96;
  tzOffset = 10;  
  if (isDstAu)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);
  lastLong = longitude;
    
  calcSunRiseSet();
  updateTimeThisDay();
}

// ========================================
// Set location and timezone to San Diego
function setSanDiego()
{
  latitude = 33.15;
  longitude = -117.3;
  tzOffset = -8;
  if (isDst)
  {
    tzOffset++;
  }
  
  var tzString = str(tzOffset);
  // Add in a plus sign if not negative
  if (tzOffset > 0)
  {
    tzString = "+" + String(tzOffset);
  }
  // init the UI field
  tzInput.value(tzString);
  lastTz = tzOffset;
  
  var latString = str(latitude);
  latInput.value(latString);
  lastLat = latitude;
  
  var longString = str(longitude);
  longInput.value(longString);   
  lastLong = longitude;
  
  calcSunRiseSet();
  updateTimeThisDay();
}

// ========================================================
function tzInputEvent() {
  console.log('you are typing tz=', this.value());
  tzInputTimestampMs = millis();  
}  

//==== delayed processing of tz input allows user to finish
//  typing, avoiding temporarily invalid numbers like "-"
function processTzInputEvent() {  
  tzInputTimestampMs = -1;
  tzOffset = Number(tzInput.value());
  
  if (isNaN(tzOffset))
  {
    // can't convert to a float, restore to previous
    tzOffset = lastTz;
    var tzString = str(tzOffset);
    // Add in a plus sign if not negative
    if (tzOffset > 0)
    {
      tzString = "+" + String(tzOffset);
    }
    tzInput.value(tzString);
  }
  else
  {    
    lastTz = tzOffset;
    calcSunRiseSet();   
    updateTimeThisDay();
  }  

}

// ========================================================
function latInputEvent() 
{
  console.log('you are typing latitude=', this.value());
  latInputTimestampMs = millis();  
}  

// ========== delayed processing
function processLatInputEvent() 
{
  latInputTimestampMs = -1;  

  //latitude = float(this.value());
  // NOTE: using float above is too tolerant,
  //  it only fails if the non-numeric char is the first,
  //  else just stops parsing 
  latitude = Number(latInput.value());
  
  if (isNaN(latitude))
  {
    // can't convert to a float, restore to previous
    latitude = lastLat;
    latInput.value(lastLat);
  }
  else
  {    
    lastLat = latitude;
    calcSunRiseSet();   
    updateTimeThisDay();
  }
  //print("lat=" + latitude)
}



// ========================================================
function longInputEvent() {
  console.log('you are typing longitude=', this.value());
  longInputTimestampMs = millis();  
}  

// ========== delayed processing
function processLongInputEvent() {
  longInputTimestampMs = -1; 
  longitude = Number(longInput.value());
  
  if (isNaN(longitude))
  {
    // can't convert to a float, restore to previous
    longitude = lastLong;
    longInput.value(lastLong);
  }
  else
  {    
    lastLong = longitude;
    calcSunRiseSet();   
    updateTimeThisDay();
  }  

}


// =====================================
// The main draw routine that is called continuously
// 
function draw() {
  
    // handle delayed processing of position & gmt offset fields
    if (tzInputTimestampMs > 0 && millis() - tzInputTimestampMs > 2000)
    {
      processTzInputEvent();
    }
  
    if (latInputTimestampMs > 0 && millis() - latInputTimestampMs > 2000)
    {
      processLatInputEvent();
    }   
  
    if (longInputTimestampMs > 0 && millis() - longInputTimestampMs > 2000)
    {
      processLongInputEvent();
    }   
  
    // Draw the clock background
    background(bkColor);
    fill(80);  // dark gray
    noStroke();
    ellipse(cx, cy, clockDiameter, clockDiameter);
  
    fill(255)
    textFont("Arial");
    textAlign(LEFT, TOP);

    textSize(refFontSize * 0.45);

    text("Day Spiral Clock", 10, 15);
  
    textSize(refFontSize*0.28);
    text("© Charlie Wallace 2022", 10, 50);
   
    // Bail out if lat/long not set yet.
    if (latitude==-1 && longitude==-1)
    {
        return;
    }
  
    textAlign(LEFT, BOTTOM);
    var tzOffsetString = String(tzOffset);
  
    // Add in a plus sign if not negative
    if (tzOffset > 0)
    {
      tzOffsetString = "+" + String(tzOffset);
    }
    
    //text("GMT offset:", cx * 0.02, cy* 1.8);
  //  londonButton.position(cx*2 - 115, cy*2 - 110);  //cy* 1.75);  

    text("GMT offset:", 10, cy*2 - 80);
  
  	//text("latitude: " + latitude, cx * 0.02, cy* 1.88);
  	text("latitude:", 10, cy*2 - 50);//cy* 1.88);
  
    //	text("longitude: " + longitude, cx * 0.02, cy* 1.95);
    text("longitude:", 10, cy*2 - 20);//cy* 1.95);

    fill(0);  // black
    
    // time calcs: sets iHour, iMin, iSec, and iMs
      // beware, iMs is ms since start of day, not start of last sec.
    // This also calculates the "dayState" that indicates
    // if it's (1) before sunrise, (2) during daylight, or (3) after sunset
    updateTimeThisDay();  // set baseMs to ms since start of this day
  
  
    var thisMillis = iMs;
    var msSinceLastDraw = thisMillis - lastMillisec;
    lastMillisec = thisMillis;
  
    // calc the current second including the fraction of upcoming second
    var theSec = float(iSec)// + float(remainderMs)/1000; 
    var currentSecDegree = theSec * 6;

    var theMin = float(iMin) + theSec / 60;
    var currentMinDegree = theMin * 6;
  
    var theHour = float(iHour) + theMin / 60;
    var currentHourDegree = theHour * 30;
   
    // Angles for sin() and cos() start at 3 o'clock;
    // subtract HALF_PI to make them start at the top
    // These are angles in radians, used for hands
    var secRads = map(theSec, 0, 60, 0, TWO_PI) - HALF_PI;
    var minRads = map(theMin, 0, 60, 0, TWO_PI) - HALF_PI;
    var hourRads = map(theHour, 0, 24, 0, TWO_PI * 2) - HALF_PI;
  //EEE
    if (hourRads > TWO_PI)
    {
      hourRads -= TWO_PI
    }
  
  
    // display night or day
    noStroke();

    // Display the current time
    fill(255);
    var amPmString = " PM";
    if (isAM)
    {
      amPmString = " AM";
    }
    text("Current time: " + timeString + amPmString, cx*2-194, 32);
  
    // If there's no day or night due to high/low latitude, 
    // don't draw day/night indication code. 
    // note, -1 means all day, -2 means all night
    if (sunsetHour >= 0)
    {  
      textAlign(RIGHT, TOP);
      fill(255)     
      text("Sunrise: " + sunriseHourString + 
             ":" + sunriseMinString + sunriseAmpmString, 
             cx*2 - 20, 42);
             //cx * 1.95, cy* 0.03);
      text("Sunset: " + sunsetHourString + ":" + 
             sunsetMinString + sunsetAmpmString, 
           cx*2 - 20, 70);
             //cx * 1.95, cy* 0.11);    
      
      var secondsIn6Hours = 60*60*6;
      var secondsIn18Hours = 60*60*18;
      var secondsIn12Hours = 60*60*12;
      var seconds6amToSunrise = secondsToSunrise - secondsIn6Hours;
      var secondsSunsetTo6pm = secondsIn18Hours - secondsToSunset;
      var seconds6pmToSunsetYesterday = 
            secondsToSunsetYesterday - secondsIn18Hours;
      var secondsSunriseTo6amTomorrow = 
            secondsIn6Hours - secondsToSunriseTomorrow;

      var dayStartRads = HALF_PI;
      var dayEndRads = HALF_PI + 2 * PI;
      var nightStartRads = HALF_PI;
      var nightEndRads = HALF_PI + 2 * PI;


      // FINDME AAA - 

      // Need to find the previous and next rise/set events. 
      //    If was yesterday, Make neg seconds offset 
      //    If was tomorrow, mike seconds offset > secondsPerDay

      var previousRiseSetSeconds;
      var previousRiseSetSecondsRads;
      var isPreviousRiseSetWithin12Hr = true;

      var nextRiseSetSeconds;
      var nextRiseSetSecondsRads;
      var isNextRiseSetWithin12Hr = true;
      var secondsPerDay = 60*60*24;
      var fillColor = 0; // black
      var antiFillColor = 255;
      if (dayState == 1) // curr time is between start of 24-hr day and sunrise
      {
        // All seconds are relative to start of this day, 
        //   so this will be negative:
        previousRiseSetSeconds = secondsToSunsetYesterday - secondsPerDay; 

        nextRiseSetSeconds = secondsToSunrise;
      }
      else if (dayState == 2) // curr time is between sunrise and sunset
      {
        previousRiseSetSeconds = secondsToSunrise;

        nextRiseSetSeconds = secondsToSunset;
        fillColor = 255; // white
      }
      else // curr time is between sunset and end of 24-hr day
      {
        previousRiseSetSeconds = secondsToSunset;

        // All seconds are relative to start of this day, 
        //   so this will be > secondsPerDay:
        nextRiseSetSeconds = secondsToSunriseTomorrow + secondsPerDay;
      }      
//print("ds=" + dayState + " nx=" + nextRiseSetSeconds + " pv=" + previousRiseSetSeconds + " now=" + secondsSoFar)
      
      // Check if the previous rise/set is so far back that we can't display it.
      if (secondsSoFar - previousRiseSetSeconds > secondsIn12Hours)
      {
        isPreviousRiseSetWithin12Hr = false;
      }
      
      // Check if the next rise/set is so far ahead that we can't display it.
      if (nextRiseSetSeconds - secondsSoFar > secondsIn12Hours)
      {
        isNextRiseSetWithin12Hr = false;
      }
//print("prevWithinRange=" + isPreviousRiseSetWithin12Hr + " nxWithinRange=" + isNextRiseSetWithin12Hr)
      
      // Convert seconds into radians.
      // Might be less than zero, so map onto range -2pi to 2pi
      previousRiseSetSecondsRads = 
        map(previousRiseSetSeconds, -secondsPerDay, secondsPerDay, 
            -TWO_PI * 2, TWO_PI * 2) - HALF_PI;

      // Might be > secondsPerDay, to map onto range 0 to 4 PI
      nextRiseSetSecondsRads = 
        map(nextRiseSetSeconds, 0, secondsPerDay, 0, TWO_PI*2) - HALF_PI;


      if (fillColor == 255)
      {
        antiFillColor = 0;
      }

      var stripWidth = stripRadius*0.25;
      var r2 = stripRadius - stripWidth;

      var r5 = stripRadius - stripWidth * 0.75;
      var c5x = cx - cos(hourRads) * stripWidth * 0.25;
      var c5y = cy - sin(hourRads) * stripWidth * 0.25 ;
      var c6x = cx + cos(hourRads) * stripWidth * 0.25 ;
      var c6y = cy + sin(hourRads) * stripWidth * 0.25 ;
      var r6 = stripRadius - stripWidth/4;

      stroke(80);  // set gray edge color  
      strokeWeight(2*fontScaleFactor); 

      fill(0);  // set default fill to black

      //==========================
      // We need to fill in the past and future parts of the day/night strip with 
      // light and dark based on the times of sunset and sunrise. 
      // Must be done in the correct order so the outer arcs are drawn first.
      // "Now" is secondsSoFar
      // The outer arcs indicate future time, so draw the following:
      
      // === Pseudocode for future 2-pi radians =============:
      // Let nextRiseSetSeconds be the seconds-to value for the upcoming rise or set.
      //      (nextRiseSetSeconds starts at the previous midnight)
      // Let color fillColor be white if isDay, else black.
      // All future arcs use cx,cy as center.
      // IF nextRiseSetSeconds falls within the first pi radians following Now:
      //    Using color opposite of fillColor, draw arc over the first PI radians
      //      after Now.
      //    Draw arc from Now to nextRiseSetSeconds, using fillColor.
      //    Draw arc from Now+PI to Now+TWO_PI using opposite of fillColor.
      // ELSE (assume nextRiseSetSeconds falls within the second pi radians following Now)
      //    Using color fillColor, draw arc over the first PI radians
      //      after Now.
      //    Draw arc from Now+PI to nextRiseSetSeconds, using fillColor.
      //    Draw arc from nextRiseSetSeconds to Now+TWO_PI using color opposite of fillColor

      // First half of upcoming 12 hours
      fill(0)
      //arc(cx, cy, stripRadius*2, stripRadius*2, hourRads, hourRads+PI);

      // Second half of upcoming 12 hours
      //arc(cx, cy, stripRadius*2, stripRadius*2, hourRads+PI, hourRads+TWO_PI);
//EEE
      //if ((nextRiseSetSeconds > secondsSoFar) && 
      if (nextRiseSetSeconds <= secondsSoFar + (secondsPerDay/4)) 
      {
        fill(antiFillColor); 
        arc(cx, cy, stripRadius*2, stripRadius*2, hourRads, hourRads+PI);
        fill(fillColor);
        arc(cx, cy, stripRadius*2, stripRadius*2, hourRads, nextRiseSetSecondsRads);
        fill(antiFillColor);
        arc(cx, cy, stripRadius*2, stripRadius*2, hourRads+PI, hourRads+TWO_PI);
      }
      else
      {
        fill(fillColor);
        arc(cx, cy, stripRadius*2, stripRadius*2, hourRads, hourRads+PI);
        
        if (isNextRiseSetWithin12Hr)
        {
          arc(cx, cy, stripRadius*2, stripRadius*2, hourRads+PI, nextRiseSetSecondsRads);
          fill(antiFillColor);
          // only draw the following if "now" does NOT fall within the overlap
          //   of the ends of the spiral.  Overlap only happens when the day (or night) is
          //   longer than 12 hours
          if (secondsSoFar<previousRiseSetSeconds ||
             secondsSoFar > (nextRiseSetSeconds-(secondsPerDay/2)))
          {
            arc(cx, cy, stripRadius*2, stripRadius*2, nextRiseSetSecondsRads, hourRads+TWO_PI);
          }
        }
        else
        {
          arc(cx, cy, stripRadius*2, stripRadius*2, hourRads+PI, hourRads+TWO_PI);
        }
      }


      // === Pseudocode for past 2-pi radians ============
      // Let T2 be the seconds-to value for the previous rise/set event.
      // Let color fillColor be white if isDay, else black.
      // IF T2 falls in range from Now to Now-PI:
      //    Using center c6x,c6y, shifted from cx,cy by stripWidth/4
      //      Draw arc from Now to Now-PI using color anti-fillColor
      //      Draw arc from Now to T2 using fillColor
      //    Using center c5x,c5y, anti-shifted from cx,cy by stripWidth/4
      //      Draw arc from Now to Now+PI using color anti-fillColor
      // ELSE (assume T2 falls before Now-PI)
      //    Using center c6x,c6y, shifted from cx,cy by stripWidth/4
      //      Draw arc from Now to Now-PI using color fillColor
      //    Using center c5x,c5y, anti-shifted from cx,cy by stripWidth/4
      //      Draw arc from Now-PI to Now-TWO_PI using color anti-fillColor  
      //      Draw arc from Now-PI to T2 using color fillColor

      // Most recent half of preceding 12 hours
      fill(0)
      //arc(c6x, c6y, r6*2, r6*2, hourRads-PI, hourRads);

      // Earlier half of preceding 12 hours
      fill(0)
      //arc(c5x, c5y, r5*2, r5*2, hourRads, hourRads+PI);
      strokeWeight(2*fontScaleFactor);

      //if ((previousRiseSetSeconds < secondsSoFar) && 
      if (previousRiseSetSeconds >= secondsSoFar - (secondsPerDay/4))//)
      {
        fill(antiFillColor); 
        arc(c6x, c6y, r6*2, r6*2, hourRads-PI, hourRads);
        fill(fillColor);
        arc(c6x, c6y, r6*2, r6*2, previousRiseSetSecondsRads, hourRads );
        fill(antiFillColor);
        arc(c5x, c5y, r5*2, r5*2, hourRads, hourRads+PI);
      }
      else
      {
        fill(fillColor);
        arc(c6x, c6y, r6*2, r6*2, hourRads-PI, hourRads);
        
        //EEE
        //if (previousRiseSetSecondsRads > hourRads)
        // If arc from pt opposite current hour position to time of 
        //  the last rise/set covers more than half the circle,
        //  that means we would draw over the previous arc, 
        //  we need to avoid that.
        //if (hourRads+PI - previousRiseSetSecondsRads < PI)
        if (isPreviousRiseSetWithin12Hr)
        {
          // Next sunset/rise falls within the first PI
          // radians after the point opposite current hour pos.
          // Thus we do need to pre-fill with opposite color, 
          // then draw up to the prev rise/set using fill color.
          
          //print(previousRiseSetSecondsRads + " " + hourRads)
          fill(antiFillColor);
          arc(c5x, c5y, r5*2, r5*2, hourRads, hourRads+PI);
          fill(fillColor);
          arc(c5x, c5y, r5*2, r5*2, previousRiseSetSecondsRads, hourRads+PI);
        } 
        else           
        {
          // the prev rise/set is so far back that it would require
          // drawing more than half the circle back before the point
          // opposite the current time.  That farther than needed,
          // so we just fill in the fill color.
          arc(c5x, c5y, r5*2, r5*2, hourRads, hourRads+PI);
          //print("EEE")
        }
      }
    } // end of block that doesn't run when it's all night or all day
  
    // Finally - draw in the center ellipse in grey fill(80)
    // BBB
    fill(80); // normally center is medium gray
    if (sunsetHour == -1) // all day
    {
      textAlign(RIGHT, TOP);
      fill(255)     
      text("No Night", cx * 1.96, cy* 0.03);
    }
    else if (sunsetHour == -2) // all  night 
    {
      textAlign(RIGHT, TOP);
      fill(255)     
      text("No Daylight", cx * 1.96, cy* 0.03);
      fill(0);
    }
    ellipse(cx, cy, r2*2 , r2*2);
      
    fill(0);
  

    // Draw the hands of the clock ===============
  
    stroke(180);  // set white color  
    strokeWeight(5*fontScaleFactor);
    line(cx, cy, cx + cos(secRads) * secondsRadius, cy + sin(secRads) * secondsRadius);
    strokeWeight(10*fontScaleFactor);
    line(cx, cy, cx + cos(minRads) * minutesRadius, cy + sin(minRads) * minutesRadius);
    strokeWeight(20*fontScaleFactor);
    line(cx, cy, cx + cos(hourRads) * hoursRadius, cy + sin(hourRads) * hoursRadius);

      
    // Draw in hour ticks ================
      
    stroke(180);
    strokeWeight(1)
    noFill();
    ellipse(cx, cy, hourNumbersRadius*2 * 0.85, hourNumbersRadius*2 * 0.85);
    // Draw the hour ticks
    stroke(255)
    strokeWeight(8*fontScaleFactor);
    beginShape(POINTS);
    for (var b = 0; b < 360; b+=30) {
    var angle = radians(b);
    var x = cx + cos(angle) * hourNumbersRadius * 0.85;
    var y = cy + sin(angle) * hourNumbersRadius * 0.85;
    vertex(x, y);
    }
    endShape();
    
    noStroke();
  
      
    // Draw hour labels =====================
      
    currentFontSize = refFontSize * fontScaleFactor;
  
    // Specify font to be used
    textSize(currentFontSize * 0.4);
    textFont("Arial");
    textAlign(CENTER, CENTER);

    fill(200);                         // Specify font color
  
    textSize(currentFontSize * 0.8);

    numString = "12";
    text(numString, theWidth/2, theHeight/2 - hourNumbersRadius); 
  
    numString = "1";
    var xOffset1 = hourNumbersRadius * cos(2*PI/6);
    var yOffset1 = hourNumbersRadius * sin(2*PI/6);
    text(numString, theWidth/2 + xOffset1, theHeight/2 - yOffset1); 
  
    numString = "2";
    var xOffset2 = hourNumbersRadius * cos(PI/6);
    var yOffset2 = hourNumbersRadius * sin(PI/6);
    text(numString, theWidth/2 + xOffset2, theHeight/2 - yOffset2); 
  
    numString = "3";
    numHeight = currentFontSize;//f.getSize();
    text(numString, theWidth/2 + hourNumbersRadius, theHeight/2); 
   
    numString = "4";
    text(numString, theWidth/2 + xOffset2, theHeight/2 + yOffset2); 
   
    numString = "5";
    text(numString, theWidth/2 + xOffset1, theHeight/2 + yOffset1); 
 
    numString = "6";

    text(numString, theWidth/2, theHeight/2 + hourNumbersRadius); 
   
    numString = "7";
    text(numString, theWidth/2 - xOffset1, theHeight/2 + yOffset1); 
    
    numString = "8";
    text(numString, theWidth/2 - xOffset2, theHeight/2 + yOffset2); 
   
    numString = "9";
    text(numString, theWidth/2 - hourNumbersRadius, theHeight/2); 

    numString = "10";
    text(numString, theWidth/2 - xOffset2, theHeight/2 - yOffset2); 

    numString = "11";
    text(numString, theWidth/2 - xOffset1, theHeight/2 - yOffset1); 
}


// ===============================================
// Calculate the time of sunset or sunrise.
// Results are returned in globalse sunsetHour, sunsetMin;
// Returns sunsetHour = -1 if it's always dark, = -2 if always light

function calcRiseSetTime(
				isCalculatingSunrise,  // true = sunrise, false = sunset
				latitude, 
				longitude, 
				gmto,     // GMT offset (not the same as time zone)
				isDaylightSavings)      // daylight savings flag
		{                                     			
			var fLati = radians(latitude);    // convert to radians
			var fLongi = radians(longitude);  // convert to radians
          
			var fGmto;  // GMT Offset in radians
			// convert the offset from GMT time (in hours) to radians:
			if (isDaylightSavings)
			{	// compensate for daylight savings time
    			fGmto = (-gmto-1) * 2*PI/24;  // convert to radians
			}
			else
			{
    			fGmto = -gmto * 2*PI/24;  // convert to radians
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
		                    
			outputHour = 0;
			outputMin = 0;
		   
			// Calculate the current values of the hour, min, and second members of the
			//  CClockView class. A clock class can get at these via its pView_ pointer.
			//
			da = day();

			mo = month();

			yr = year();
		           
			// calcs from astronomy mag 1984 article
			tmp = int((mo+9)/12);
			if ((yr/4) - int(yr/4) != 0)
			{
				tmp *= 2;
			}
			
			daynum = int(275*mo/9) + da - tmp - 30;

			if (isCalculatingSunrise)   // if sunrise
			{
				jj = PI/2;
			}
			else
			{
				jj = PI*2;
			}
		    
			kk = daynum + ((jj+fLongi)/(2*PI));
			ll = kk * 0.017202 - 0.0574039;
			mm = ll + 0.0334405*sin(ll) + 0.000349066*sin(2*ll) + 4.93289;
		    
			// normalize mm
			while (mm < 0)
			{
    			mm += 2*PI;
			}
			while (mm >= 2*PI)
			{
    			mm -= 2*PI;
			}

			if (2 * mm / PI - int(2 * mm / PI) == 0)
    		{
				mm += 4.84814E-06; //0.00000484814
			}
		    
			pp = atan(0.91746 * (sin(mm)/cos(mm)));   
		    
			if (mm > PI/2)
			{
    			if (mm > 3*PI/2)
    			{
    				pp += 2*PI;
    			}
    			else
    			{
    				pp += PI;
    			}
			}
		    
			qq = 0.39782 * sin(mm);
			qq = atan(qq /sqrt(1 - (qq * qq)));
		    
			ss = (-0.014539 - (sin(qq) * sin(fLati)))/(cos(qq) * cos(fLati));

			// DEBUG PRINTOUT //////////////////////////////////////
			//	char tbuf[80];
			//	_snprintf(tbuf, 79, "ss = %12.8f", ss );
			//	AfxMessageBox(tbuf);   

			if (ss > 1)  
			{   
				// There is no sunset/sunrise, it is always dark
    			outputMin = 0;
   				outputHour = -1;
    			return;	 
			}
			else if (ss < -1)  
			{
				// There is no sunset/sunrise, it is always light
    			outputMin = 0;
   				outputHour = -2;
    			return;	 
			}

			ss = -atan(ss / sqrt(1 - ss * ss)) + PI / 2;

			if (isCalculatingSunrise)
			{
    			ss = 2*PI - ss;
			}
		    
			// tt is local apparent time
			tt = ss + pp - 0.0172028*kk - 1.73364;
		    
			// vv is wall clock time in radians unrounded
			vv = tt + fLongi - fGmto;
		    
			zz = vv;
		    
			// normalize zz
			while (zz < 0)
			{
    			zz += 2*PI;
			}
			while (zz >= 2*PI)
			{
    			zz -= 2*PI;
			}

			zz  *= 24/(2*PI);  // convert from radians to hours
			vv = int(zz);		// vv = hours
			
			ww = (zz-vv) * 60;	// ww = minutes unrounded
			
			xx = int(ww);
			yy = ww-xx; // yy is the frction of a minute
			              
			// round minute up if needed
			if (yy >= 0.5)
			{
				xx += 1;
			}

			// if rounding up the minute caused the hour bound to be passed, fix hour
			if (xx >= 60)
			{
				vv += 1;
				xx = 0;
			}

			// Set output variables
			outputHour = int(vv);
			outputMin = int(xx);
		}

function initializeFields() {
    cx = 0;
    cy = 0;
    secondsRadius = 0;
    minutesRadius = 0;
    hoursRadius = 0;
    hourNumbersRadius = 0;
    minuteNumbersRadius = 0;
    clockDiameter = 0;
    bkColor = 0;
    myFont = null;
    fNarrow = null;
    fontScaleFactor = 0;
    refFontSize = 0;
    currentFontSize = 0;
    lastMillisec = 0;
    lastSec = 0;
    doColorCycling = null;
    hourDigitColor = color(0xe8, 0xe0, 0x22);
    mywidth = 0;
    myheight = 0;
    theWidth = 0;
    theHeight = 0;  

  speedIncrement = 0.2;
  msSoFar = 0;

  
  secondsSoFar = 0;
  msFromStartToResetTime = 0;
  
  // init to unique value to allow detection when set properly
  latitude = -1;
  longitude = -1;
  lastLat = -1;
  lastLong = -1;
  latLocal = -1;
  longLocal = -1;
  tzOffset = 0;
  tzOffsetLocal = 0;
  lastTz = 0;
  isSunRiseSetObtained=false;
  
  // Default position is san diego
  //latitude = 33.1;
  //longitude = -117.1;
  //tzOffset = -7;
  
  outputHour = 0;
  outputMin = 0;
  sunriseHour = 0;
  sunriseMin = 0;
  secondsToSunrise = 0;
  baseMsSunrise = 0;
  secondsToSunsetYesterday = 0;
  
  sunsetHour = 0;
  sunsetMin = 0;
  secondsToSunset = 0;
  baseMsSunset = 0;
  secondsToSunriseTomorrow = 0;
  
  sunriseMinString = "";  
  sunriseAmpmString = "";
  sunriseHourString = "";
  sunsetMinString = "";  
  sunsetAmpmString = "";
  sunsetHourString = "";
  
  sunsetHourYesterday = 0;
  sunsetMinYesterday = 0;
  sunriseHourTomorrow = 0;
  sunriseMinTomorrow = 0;
  isDaylightSavings = false;
  isDay = false;
  dayState = 1;
  
  tzInput = createInput('');
  tzInputTimestampMs = -1;
  
  latInput = createInput('');
  latInputTimestampMs = -1;  // ms since pgm start when input happened

  longInput = createInput('');
  longInputTimestampMs = -1;  // ms since pgm start when input happened
  
  isDst = false;
  isDstAu = false;
}

