# Day Spiral Clock

A unique visualization of time using a spiral clock face that shows both the current time and sunrise/sunset information.

## Features

- **Spiral Clock Display**: Time displayed on a spiral that represents 24 hours on a 12-hour clock face.
- **Day/Week Modes**: Toggle between single-day spiral and week-long spiral views
- **Sunrise/Sunset Visualization**: Color-coded day and night segments based on your location
- **Automatic Location**: Uses IP geolocation for seamless startup (no permission prompt)
- **VPN Detection**: Warns when timezone mismatch is detected
- **Precise Location Option**: Optional GPS coordinates for exact sunrise/sunset times
- **Multiple Locations**: Quick-select buttons for major cities
- **Manual Entry**: Enter custom lat/long and timezone
- **GMT Time Display**: Optional GMT hour labels on day spiral

## Live Demo

Visit [https://charliewallace.github.io](https://coolweird.net)

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

## License

[Add your license here]

## Credits

Created by Charlie Wallace of Carlsbad, CA, copyright 2025.
