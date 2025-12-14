# Day Spiral Clock

A unique visualization of time using a spiral clock face that shows the full 24 hour day
coiled into a 12-hour clock face.  The spiral is color-coded to show the day and night
segments based on your location, thus indicating sunrise and sunset times.  

## Features

- **Spiral Clock Display**: Time displayed on a spiral that represents 24 hours on a 12-hour clock face.
- **Sunrise/Sunset Visualization**: Color-coded day (light blue) and night (dark blue) segments based on your location.
- **Responsive Mobile Design**: Optimized UI for both portrait and landscape mobile usage, with touch-friendly buttons.
- **Automatic Location**: Uses IP geolocation for seamless startup (no permission prompt)
- **VPN Detection**: Detects when timezone doesn't match browser timezone and prompts user to
      grant browser permission to access location. 
- **Precise Location Option**: Optional GPS coordinates for exact sunrise/sunset times
- **Multiple Locations**: Quick-select buttons for major cities
- **Manual Entry**: Enter custom lat/long or city name
- **GMT Time Display**: Optional GMT hour labels on day spiral

## Available online

Visit [https://www.dayspiral.com](https://charliewallace.github.io)

## Running Locally

1. Clone the repository
2. Start a local web server in the project directory: 
   ```
   python -m http.server 8080
   ```
3. Open [http://localhost:8080](http://localhost:8080) in your browser

## Technologies

- **p5.js**: Canvas rendering and animation
- **IP Geolocation**: ipapi.co for automatic location detection
- **Location Services**: OpenStreetMap (Nominatim) for city lookup
- **Timezone Data**: GeoNames for accurate timezone information 


## Credits

Created by Charlie Wallace of Carlsbad, CA, copyright 2025.
For artwork by Charlie Wallace, see [coolweird.com](https://www.coolweird.com)
